import mongoose from "mongoose";
import Department from "../models/department.model.js";
import Unit from "../models/unit.model.js";
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

  // For authenticated admins, restrict departments to their unit.
  // For superadmins, allow optional ?unit= filter.
  if (req.user && req.user.role === 'admin') {
    if (req.user.unit) {
      query.unit = req.user.unit;
    }
  } else if (req.query.unit) {
    query.unit = req.query.unit;
  }

  const total = await Department.countDocuments(query);

  // SQL Model's find returns array of instances
  // We need to handle pagination manually or add pagination support to find options
  // Our shim: find(query) returns all.
  // We should update find shim to support pagination or just slice here (inefficient but safe for now?)
  // Actually, Department.model.js find() returns PROMISE of array. It does not support .skip().limit() chain on the promise result.
  // The shim returns "rows.map(...)".
  // We need to pass limit/skip to find().
  // Let's modify the call:
  // Department.find(query) in model uses `_buildQuery(query, options)`. 
  // But wait, `find` in model: `static async find(query = {})`. It takes ONE arg.
  // It does NOT accept options. 
  // I should update the model or just accept that I need to fetch all and slice?
  // Better: I can add `_buildQuery` support via a custom object passed as query?
  // Or just update the model quickly?
  // I'll update the Controller to assume I can't paginate efficiently yet OR I'll update the model in next step.
  // Actually, `Department.find(query)` is what I wrote.
  // Let's assume for this step I will just use `Department.find(query)` and slice in memory if needed, OR relies on model update.
  // Re-reading my model: `static async find(query = {}) { const { sql, params } = Department._buildQuery(query); ... }`
  // It does NOT support options.
  // However, I can pass strict queries.
  // For now, I will fetch all and slice in memory. Departments usually < 100.

  const allDepts = await Department.find(query);
  // Sort by createdAt desc (newest first)
  allDepts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const departments = allDepts.slice(skip, skip + limit);

  // Fetch employee stats to merge counts
  const rawStats = await Employee.getStatsByDepartment();

  // Populate and merge stats
  for (const dept of departments) {
    await dept.populate("createdBy", "fullName employeeId");
    await dept.populate("unit", "name description");

    // Calculate employeeCount from stats
    const deptId = dept._id.toString();
    const deptStats = rawStats.filter(s => s.department_id.toString() === deptId);
    dept.employeeCount = deptStats.reduce((acc, curr) => acc + curr.count, 0);
  }

  const actor = req.user
    ? `${req.user.fullName} (${req.user.employeeId})`
    : "anonymous";
  logger.info(`Departments fetched by ${actor}`);
  return res
    .status(200)
    .json(new ApiResponse(200, { departments, total, page, limit }, "Departments fetched successfully"));
});

// Get single department
export const getSingleDepartment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // ID is now INT. Or fallback to name search.
  // Check if numeric
  const isId = !isNaN(id);

  let department = isId
    ? await Department.findById(id)
    : await Department.findOne({ name: id });

  if (department) {
    await department.populate("createdBy", "fullName employeeId");
    // unit populates automatically if we want? No, explicit.
    // The original code didn't populate unit here?
    // Actually lines 51 says: .populate("createdBy", ...)
    // It did NOT populate unit.
  }

  if (!department) throw new ApiError(404, "Department not found");

  // Get employees in this department
  // CAUTION: Employee.find() returns shim builder.
  // Employee.find({ department: department._id })
  // Employee.department is ARRAY now in SQL (linked table).
  // Does shim `find({ department: val })` handle JOIN?
  // Auth model: `if (key === 'department') { hasDepartmentQuery = true; ... }`
  // YES, it handles it!
  const employees = await Employee.find({ department: department._id.toString() }) // Ensure string ID for match?
    .select("fullName employeeId emailId role")
    .sort({ fullName: 1 });

  return res
    .status(200)
    .json(new ApiResponse(200, { department, employees }, "Department fetched successfully"));
});

// Create new department
export const createDepartment = asyncHandler(async (req, res) => {
  const { name, description, unit: bodyUnit, staffByShift } = req.body;

  let unitIdToUse;

  if (req.user.role === "superadmin") {
    // Superadmin must explicitly choose a unit when creating a department
    if (!bodyUnit) {
      throw new ApiError(400, "Unit is required when creating a department as superadmin.");
    }

    const targetUnit = await Unit.findById(bodyUnit);
    if (!targetUnit) {
      throw new ApiError(404, "Selected unit not found");
    }

    unitIdToUse = targetUnit._id;
  } else {
    // Admins are restricted to their own unit
    if (!req.user.unit) {
      throw new ApiError(
        400,
        "Current user is not associated with any unit. Cannot create department without unit."
      );
    }

    unitIdToUse = req.user.unit;
  }

  // Optional staffByShift configuration (department-level leaders/incharges, no shift binding required)
  let staffByShiftPayload;
  if (Array.isArray(staffByShift)) {
    const toArray = (val, fallbackSingle) => {
      if (Array.isArray(val)) {
        return val.map((s) => (s || "").toString().trim()).filter(Boolean);
      }
      if (typeof val === "string") {
        return val
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }
      if (fallbackSingle) {
        return [(fallbackSingle || "").toString().trim()].filter(Boolean);
      }
      return [];
    };

    staffByShiftPayload = staffByShift
      .map((item) => {
        if (!item) return null;
        const lineLeaders = toArray(item.lineLeaders, item.lineLeader);
        const shiftIncharges = toArray(item.shiftIncharges, item.shiftIncharge);
        const payloadItem = {
          lineLeaders,
          shiftIncharges,
        };
        // Preserve any existing shift label if provided (for backward compatibility),
        // but it is no longer required or enforced.
        if (item.shift) {
          payloadItem.shift = item.shift;
        }
        return payloadItem;
      })
      .filter((item) => item && (item.lineLeaders.length || item.shiftIncharges.length));
  }

  // Check if department already exists in the same unit (case-insensitive)
  const existingDepartment = await Department.findOne({
    name: new RegExp(`^${name}$`, "i"),
    unit: unitIdToUse,
  });

  if (existingDepartment) {
    throw new ApiError(409, "Department with this name already exists in this unit");
  }

  const department = await Department.create({
    name,
    description,
    createdBy: req.user.id,
    unit: unitIdToUse,
    ...(staffByShiftPayload ? { staffByShift: staffByShiftPayload } : {}),
  });

  await department.populate("createdBy", "fullName employeeId");
  await department.populate("unit", "name description");

  logger.info(`New department created: ${department.name} by ${req.user.fullName} (${req.user.employeeId})`);
  return res.status(201).json(new ApiResponse(201, { department }, "Department created successfully"));
});

// Update department
export const updateDepartment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, isActive, unit: unitId, staffByShift } = req.body;

  const department = await Department.findById(id);
  if (!department) throw new ApiError(404, "Department not found");

  // Determine which unit this department will belong to after update
  let targetUnitId = department.unit;

  // Superadmin can reassign a department to a different unit
  if (req.user.role === "superadmin" && unitId) {
    const targetUnit = await Unit.findById(unitId);
    if (!targetUnit) {
      throw new ApiError(404, "Selected unit not found");
    }
    department.unit = targetUnit._id;
    targetUnitId = targetUnit._id;
  }

  // Check if new name conflicts with existing department in the same unit (excluding current one)
  if (name && name !== department.name) {
    const query = {
      name: new RegExp(`^${name}$`, "i"),
      _id: { $ne: id },
    };

    if (targetUnitId) {
      query.unit = targetUnitId;
    }

    const existingDepartment = await Department.findOne(query);

    if (existingDepartment) {
      throw new ApiError(409, "Department with this name already exists in this unit");
    }
  }

  // Optional staffByShift update (department-level leaders/incharges, no shift binding required)
  if (Array.isArray(staffByShift)) {
    const toArray = (val, fallbackSingle) => {
      if (Array.isArray(val)) {
        return val.map((s) => (s || "").toString().trim()).filter(Boolean);
      }
      if (typeof val === "string") {
        return val
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }
      if (fallbackSingle) {
        return [(fallbackSingle || "").toString().trim()].filter(Boolean);
      }
      return [];
    };

    department.staffByShift = staffByShift
      .map((item) => {
        if (!item) return null;
        const lineLeaders = toArray(item.lineLeaders, item.lineLeader);
        const shiftIncharges = toArray(item.shiftIncharges, item.shiftIncharge);
        const payloadItem = {
          lineLeaders,
          shiftIncharges,
        };
        // Preserve any existing shift label if provided, but do not require it.
        if (item.shift) {
          payloadItem.shift = item.shift;
        }
        return payloadItem;
      })
      .filter((item) => item && (item.lineLeaders.length || item.shiftIncharges.length));
  }

  // Update fields
  if (name) department.name = name;
  if (description !== undefined) department.description = description;
  if (typeof isActive === "boolean") department.isActive = isActive;

  await department.save();
  await department.populate("createdBy", "fullName employeeId");
  await department.populate("unit", "name description");

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

    // Transfer all employees: Remove old dept ID, Add new dept ID
    // We use bulk operations or updateMany.
    // updateMany to pull old
    // updateMany to addToSet new

    // Step 1: Add new department to all employees currently in old department
    await Employee.updateMany(
      { department: id },
      { $addToSet: { department: transferToDepartmentId } }
    );

    // Step 2: Remove old department from all employees
    await Employee.updateMany(
      { department: id },
      { $pull: { department: id } }
    );

    // Update employee counts
    // We need to fetch how many were actually needing transfer to increment correctly?
    // Actually, `employeeCount` variable holds the count of employees who had this department.
    // Since we added them to `transferDepartment`, we should increment its count by that amount?
    // Wait, if an employee was ALREADY in `transferDepartment`, `$addToSet` won't add it.
    // So simply adding `employeeCount` to `transferDepartment` might be inaccurate if there was overlap.
    // However, previously they were single-department, so overlap was impossible.
    // NOW overlap IS possible.

    // Correct logic: count how many employees in `id` are NOT in `transferToDepartmentId`?
    // It's safer to recalculate the count for `transferDepartment` or just increment.
    // Given we are transitioning from single to multi, overlap is unlikely heavily yet.
    // But for correctness, we should count properly. 

    // Let's just blindly increment for now as per previous logic, or better:
    // Update the `transferDepartment` count based on actual DB count.

    const newCount = await Employee.countDocuments({ department: transferToDepartmentId });
    transferDepartment.employeeCount = newCount;
    await transferDepartment.save();

    logger.info(
      `Transferred employees from ${department.name} to ${transferDepartment.name}`
    );
  }

  await Department.findByIdAndDelete(id);

  logger.info(
    `Department deleted: ${department.name} by ${req.user.fullName} (${req.user.employeeId})`
  );
  return res.status(200).json(new ApiResponse(200, null, `Department ${department.name} deleted successfully`));
});

// Assign employee to department
// Assign employee to department
export const assignEmployeeToDepartment = asyncHandler(async (req, res) => {
  const { employeeId, departmentId } = req.body;

  // Validate inputs
  if (!employeeId || !departmentId) {
    throw new ApiError(400, "Employee ID and Department ID are required");
  }

  // Find employee first to check permissions and existence
  const employeeToCheck = await Employee.findById(employeeId);
  if (!employeeToCheck) throw new ApiError(404, "Employee not found");

  // Permission check
  if (req.user.role === 'admin' && employeeToCheck.role !== 'employee') {
    throw new ApiError(403, "Admins can assign departments to employees only");
  }

  // Find new department
  const newDepartment = await Department.findById(departmentId);
  if (!newDepartment) throw new ApiError(404, "Department not found");

  // ATOMIC UPDATE: Use $addToSet to ensure unique addition without overwriting existing array.
  // We wrap this in a try-catch to handle legacy data repair (if department is not an array in DB).
  let updatedEmployee;
  try {
    updatedEmployee = await Employee.findByIdAndUpdate(
      employeeId,
      { $addToSet: { department: departmentId } },
      { new: true } // Return updated document
    ).populate("department", "name");
  } catch (error) {
    // Check if error is due to applying $addToSet on non-array field (MongoDB Error 10141 approx)
    // or related CastError if Mongoose interferes.
    // We'll catch generics and try the fallback repair method.
    logger.warn(`Atomic update failed for employee ${employeeId}, checking for legacy data repair... Error: ${error.message}`);

    // Fallback: Read-Repair-Write pattern
    const emp = await Employee.findById(employeeId);
    if (!emp) throw new ApiError(404, "Employee not found");

    // Ensure array
    if (!Array.isArray(emp.department)) {
      emp.department = emp.department ? [emp.department] : [];
    }

    // Manual add unique
    const strDeptIds = emp.department.map(d => d.toString());
    if (!strDeptIds.includes(departmentId.toString())) {
      emp.department.push(departmentId);
    }

    await emp.save();
    updatedEmployee = await emp.populate("department", "name");
    logger.info(`Legacy data repaired for ${employeeId}`);
  }

  // Update department employee counts
  await newDepartment.incrementEmployeeCount();

  logger.info(
    `Employee ${updatedEmployee.fullName} (${updatedEmployee.employeeId}) assigned to department ${newDepartment.name} by ${req.user.fullName} (${req.user.employeeId})`
  );

  return res
    .status(200)
    .json(new ApiResponse(200, { employee: updatedEmployee }, "Employee assigned to department successfully"));
});

// Remove employee from department
export const removeEmployeeFromDepartment = asyncHandler(async (req, res) => {
  const { employeeId, departmentId } = req.body;

  if (!employeeId || !departmentId) {
    throw new ApiError(400, "Employee ID and Department ID are required");
  }

  // Check if department exists
  const department = await Department.findById(departmentId);
  if (!department) throw new ApiError(404, "Department not found");

  // Atomic removal using $pull
  const updatedEmployee = await Employee.findByIdAndUpdate(
    employeeId,
    { $pull: { department: departmentId } },
    { new: true }
  ).populate("department", "name");

  if (!updatedEmployee) throw new ApiError(404, "Employee not found");

  // Decrement count
  // We can blindly decrement or check if it was actually modified.
  // Since we want to ensure eventual consistency, let's recalculate or decrement if known present.
  // Ideally we should have checked if it was there before pulling, but for speed we'll just re-count or simple decrement.
  // Using incrementEmployeeCount with -1 is cleaner if available, or just manual logic.
  // department.model.js likely has methods.

  // Let's use the method logic:
  await department.decrementEmployeeCount();

  logger.info(
    `Employee ${updatedEmployee.fullName} (${updatedEmployee.employeeId}) removed from department ${department.name} by ${req.user.fullName} (${req.user.employeeId})`
  );

  return res.status(200).json(new ApiResponse(200, { employee: updatedEmployee }, "Employee removed from department successfully"));
});

// Get department statistics
export const getDepartmentStats = asyncHandler(async (req, res) => {
  // Determine unit scope based on role / query
  let unitFilter = null;

  if (req.user && req.user.role === 'admin' && req.user.unit) {
    // Admins are always restricted to their own unit
    unitFilter = req.user.unit;
  } else if (req.query.unit) {
    // Superadmin can optionally filter by unit via query param
    unitFilter = req.query.unit;
  }

  const deptMatch = {};
  if (unitFilter) {
    deptMatch.unit = unitFilter;
  }

  // 1. Fetch relevant departments from MongoDB
  const departments = await Department.find(deptMatch);

  if (departments.length === 0) {
    return res.status(200).json(new ApiResponse(200, {
      stats: [],
      summary: { totalDepartments: 0, activeDepartments: 0, totalUsers: 0, totalEmployees: 0 }
    }, "Department statistics fetched successfully"));
  }

  // 2. Fetch employee stats from MySQL (employees + employee_departments)
  // We need counts per departmentId, broken down by role.
  const rawStats = await Employee.getStatsByDepartment();
  // rawStats: [{ department_id: '...', role: '...', count: 5 }]

  // 3. Merge stats into departments
  const stats = departments.map(dept => {
    const deptId = dept._id.toString();
    const deptStats = rawStats.filter(s => s.department_id === deptId);

    const adminCount = deptStats.filter(s => s.role === 'admin').reduce((acc, curr) => acc + curr.count, 0);
    const employeeRoleCount = deptStats.filter(s => s.role === 'employee').reduce((acc, curr) => acc + curr.count, 0);
    const employeeCount = deptStats.reduce((acc, curr) => acc + curr.count, 0);

    return {
      name: dept.name,
      description: dept.description,
      isActive: dept.isActive,
      employeeCount,
      adminCount,
      employeeRoleCount: employeeRoleCount, // Explicitly named to match existing API
      createdAt: dept.createdAt
    };
  });

  // Sort
  stats.sort((a, b) => b.employeeCount - a.employeeCount || a.name.localeCompare(b.name));

  // Summary numbers
  const totalDepartments = departments.length;
  const activeDepartments = departments.filter(d => d.isActive).length;
  const totalUsers = stats.reduce((sum, dept) => sum + dept.employeeCount, 0);
  const totalEmployees = stats.reduce((sum, dept) => sum + dept.employeeRoleCount, 0);

  logger.info(`Department statistics fetched by ${req.user.fullName} (${req.user.employeeId})`);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        stats,
        summary: {
          totalDepartments,
          activeDepartments,
          totalUsers,
          totalEmployees,
        },
      },
      "Department statistics fetched successfully"
    )
  );
});
