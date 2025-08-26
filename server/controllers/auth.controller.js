import mongoose from "mongoose";
import Employee from "../models/auth.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import logger from "../logger/winston.logger.js";

// ================== REGISTER EMPLOYEE ==================
export const registerEmployee = async (req, res, next) => {
  try {
    const { fullName, emailId, department, employeeId, phoneNumber, password, role } = req.body;

    if (!fullName || !emailId || !department || !employeeId || !phoneNumber || !password || !role) {
      throw new ApiError(400, "All fields are required");
    }

    const existingUser = await Employee.findOne({
      $or: [{ emailId }, { phoneNumber }, { employeeId }],
    });

    if (existingUser) {
      throw new ApiError(409, "User already exists with given Email / Phone / Employee ID");
    }

    const employee = await Employee.create({ fullName, emailId, department, employeeId, phoneNumber, password, role });

    logger.info(`New employee registered: ${employee.fullName} (${employee.employeeId})`);

    return res.status(201).json(new ApiResponse(201, { employee }, "Employee registered successfully"));
  } catch (error) {
    logger.error(`Register Error: ${error.message}`);
    next(error);
  }
};

// ================== LOGIN EMPLOYEE ==================
export const loginEmployee = async (req, res, next) => {
  try {
    const { employeeId, role, department, password } = req.body;

    if (!employeeId || !role || !password) {
      throw new ApiError(400, "Employee ID, role, and password are required");
    }

    // For employee role, department is required
    let query = { employeeId, role };
    if (role === "employee") {
      if (!department) throw new ApiError(400, "Department is required for employee");
      query.department = department;
    }

    const employee = await Employee.findOne(query).select("+password");
    if (!employee) throw new ApiError(401, "Invalid credentials");

    const isMatch = await employee.comparePassword(password);
    if (!isMatch) throw new ApiError(401, "Invalid credentials");

    const token = employee.generateJWT();

    res.cookie("accessToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json(new ApiResponse(200, { employee }, "Login successful"));
  } catch (error) {
    logger.error(`Login Error: ${error.message}`);
    return res.status(error.status || 500).json({ message: error.message });
  }
};

// ================== LOGOUT EMPLOYEE ==================
export const logoutEmployee = (req, res, next) => {
  try {
    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    logger.info("Employee logged out");

    return res.status(200).json(new ApiResponse(200, null, "Logout successful"));
  } catch (error) {
    logger.error(`Logout Error: ${error.message}`);
    next(error);
  }
};

// ================== GET ALL EMPLOYEES ==================
export const getEmployees = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const total = await Employee.countDocuments();
    const employees = await Employee.find().select("-password").skip(skip).limit(limit).sort({ createdAt: -1 });

    logger.info(`Employees fetched by ${req.user.fullName} (${req.user.employeeId})`);

    return res.status(200).json(new ApiResponse(200, { employees, total, page, limit }, "Employees fetched successfully"));
  } catch (error) {
    logger.error(`Get Employees Error: ${error.message}`);
    next(error);
  }
};

// ================== GET SINGLE EMPLOYEE ==================
export const getSingleEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;

    let employee = mongoose.Types.ObjectId.isValid(id)
      ? await Employee.findById(id).select("-password")
      : await Employee.findOne({ employeeId: id }).select("-password");

    if (!employee) throw new ApiError(404, "Employee not found");

    return res.status(200).json(new ApiResponse(200, { employee }, "Employee fetched successfully"));
  } catch (error) {
    next(error);
  }
};

// ================== DELETE EMPLOYEE ==================
export const deleteEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) throw new ApiError(400, "Employee ID is required");

    const employee = await Employee.findByIdAndDelete(id); // pass id directly
    if (!employee) throw new ApiError(404, `Employee with ID ${id} not found`);

    logger.info(
      `Employee deleted: ${employee.fullName} (${employee.employeeId}) by ${req.user.fullName} (${req.user.employeeId})`
    );

    return res
      .status(200)
      .json(
        new ApiResponse(200, null, `Employee ${employee.fullName} deleted successfully`)
      );
  } catch (error) {
    logger.error(`Delete Employee Error: ${error.message}`);
    next(error);
  }
};

// ================== GET CURRENT USER (/me) ==================
export const getCurrentUser = async (req, res, next) => {
  try {
    const userId = req.user.id; // from verifyJWT middleware
    const employee = await Employee.findById(userId).select("-password");

    if (!employee) throw new ApiError(404, "User not found");

    return res.status(200).json(new ApiResponse(200, { employee }, "User fetched successfully"));
  } catch (error) {
    next(error);
  }
};
