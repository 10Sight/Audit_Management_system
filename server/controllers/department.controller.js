import mongoose from "mongoose";
import Department from "../models/department.model.js";
import Employee from "../models/auth.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import logger from "../logger/winston.logger.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Get all departments
export const getDepartments = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  const includeInactive = req.query.includeInactive === "true";

  let query = includeInactive ? {} : { isActive: true };

  const total = await Department.countDocuments(query);
  const departments = await Department.find(query)
    .populate("createdBy", "fullName employeeId")
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  logger.info(`Departments fetched by ${req.user.fullName} (${req.user.employeeId})`);
  return res
    .status(200)
    .json(new ApiResponse(200, { departments, total, page, limit }, "Departments fetched successfully"));
});

// Get single department
export const getSingleDepartment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  let department = mongoose.Types.ObjectId.isValid(id)
    ? await Department.findById(id).populate("createdBy", "fullName employeeId")
    : await Department.findOne({ name: new RegExp(id, "i") }).populate("createdBy", "fullName employeeId");

  if (!department) throw new ApiError(404, "Department not found");

  // Get employees in this department
  const employees = await Employee.find({ department: department._id })
    .select("fullName employeeId emailId role")
    .sort({ fullName: 1 });

  return res
    .status(200)
    .json(new ApiResponse(200, { department, employees }, "Department fetched successfully"));
});

// Create new department
export const createDepartment = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  // Check if department already exists (case-insensitive)
  const existingDepartment = await Department.findOne({
    name: new RegExp(`^${name}$`, "i"),
  });

  if (existingDepartment) {
    throw new ApiError(409, "Department with this name already exists");
  }

  const department = await Department.create({
    name,
    description,
    createdBy: req.user.id,
  });

  await department.populate("createdBy", "fullName employeeId");

  logger.info(`New department created: ${department.name} by ${req.user.fullName} (${req.user.employeeId})`);
  return res.status(201).json(new ApiResponse(201, { department }, "Department created successfully"));
});

// Update department
export const updateDepartment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, isActive } = req.body;

  const department = await Department.findById(id);
  if (!department) throw new ApiError(404, "Department not found");

  // Check if new name conflicts with existing department (excluding current one)
  if (name && name !== department.name) {
    const existingDepartment = await Department.findOne({
      name: new RegExp(`^${name}$`, "i"),
      _id: { $ne: id },
    });

    if (existingDepartment) {
      throw new ApiError(409, "Department with this name already exists");
    }
  }

  // Update fields
  if (name) department.name = name;
  if (description !== undefined) department.description = description;
  if (typeof isActive === "boolean") department.isActive = isActive;

  await department.save();
  await department.populate("createdBy", "fullName employeeId");

  logger.info(
    `Department updated: ${department.name} by ${req.user.fullName} (${req.user.employeeId})`
  );
  return res.status(200).json(new ApiResponse(200, { department }, "Department updated successfully"));
});

// Delete department
export const deleteDepartment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { transferToDepartmentId } = req.body;

  const department = await Department.findById(id);
  if (!department) throw new ApiError(404, "Department not found");

  // Check if department has employees
  const employeeCount = await Employee.countDocuments({ department: id });

  if (employeeCount > 0) {
    if (!transferToDepartmentId) {
      throw new ApiError(400, 
        "Cannot delete department with employees. Please specify transferToDepartmentId to transfer employees to another department."
      );
    }

    // Verify transfer department exists
    const transferDepartment = await Department.findById(transferToDepartmentId);
    if (!transferDepartment) {
      throw new ApiError(404, "Transfer department not found");
    }

    // Transfer all employees to the new department
    await Employee.updateMany(
      { department: id },
      { department: transferToDepartmentId }
    );

    // Update employee counts
    await transferDepartment.updateOne({ 
      $inc: { employeeCount: employeeCount } 
    });

    logger.info(
      `Transferred ${employeeCount} employees from ${department.name} to ${transferDepartment.name}`
    );
  }

  await Department.findByIdAndDelete(id);

  logger.info(
    `Department deleted: ${department.name} by ${req.user.fullName} (${req.user.employeeId})`
  );
  return res.status(200).json(new ApiResponse(200, null, `Department ${department.name} deleted successfully`));
});

// Assign employee to department
export const assignEmployeeToDepartment = asyncHandler(async (req, res) => {
  const { employeeId, departmentId } = req.body;

  // Validate inputs
  if (!employeeId || !departmentId) {
    throw new ApiError(400, "Employee ID and Department ID are required");
  }

  // Find employee
  const employee = await Employee.findById(employeeId);
  if (!employee) throw new ApiError(404, "Employee not found");

  // Find new department
  const newDepartment = await Department.findById(departmentId);
  if (!newDepartment) throw new ApiError(404, "Department not found");

  // Get old department if exists
  let oldDepartment = null;
  if (employee.department) {
    oldDepartment = await Department.findById(employee.department);
  }

  // Update employee department
  const previousDepartment = employee.department;
  employee.department = departmentId;
  await employee.save();

  // Update department employee counts
  if (oldDepartment && oldDepartment._id.toString() !== departmentId) {
    await oldDepartment.decrementEmployeeCount();
  }

  if (!previousDepartment || previousDepartment.toString() !== departmentId) {
    await newDepartment.incrementEmployeeCount();
  }

  await employee.populate("department", "name");

  logger.info(
    `Employee ${employee.fullName} (${employee.employeeId}) assigned to department ${newDepartment.name} by ${req.user.fullName} (${req.user.employeeId})`
  );

  return res
    .status(200)
    .json(new ApiResponse(200, { employee }, "Employee assigned to department successfully"));
});

// Get department statistics
export const getDepartmentStats = asyncHandler(async (req, res) => {
  // Use Promise.all to run queries concurrently for better performance
  const [stats, totalDepartments, activeDepartments, totalEmployees] = await Promise.all([
    Department.aggregate([
      {
        $lookup: {
          from: "employees",
          localField: "_id",
          foreignField: "department",
          as: "employees",
          pipeline: [
            {
              $project: {
                role: 1
              }
            }
          ]
        }
      },
      {
        $project: {
          name: 1,
          description: 1,
          isActive: 1,
          employeeCount: { $size: "$employees" },
          adminCount: {
            $size: {
              $filter: {
                input: "$employees",
                cond: { $eq: ["$$this.role", "admin"] }
              }
            }
          },
          employeeRoleCount: {
            $size: {
              $filter: {
                input: "$employees",
                cond: { $eq: ["$$this.role", "employee"] }
              }
            }
          },
          createdAt: 1
        }
      },
      {
        $sort: { employeeCount: -1, name: 1 }
      }
    ]),
    Department.countDocuments(),
    Department.countDocuments({ isActive: true }),
    Employee.countDocuments()
  ]);

  logger.info(`Department statistics fetched by ${req.user.fullName} (${req.user.employeeId})`);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        stats,
        summary: {
          totalDepartments,
          activeDepartments,
          totalEmployees
        }
      },
      "Department statistics fetched successfully"
    )
  );
});
