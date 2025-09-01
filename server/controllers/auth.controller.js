import mongoose from "mongoose";
import Employee from "../models/auth.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import logger from "../logger/winston.logger.js";
import {asyncHandler} from "../utils/asyncHandler.js";
import EVN from "../config/env.config.js";

export const registerEmployee = asyncHandler(async (req, res) => {
  const { fullName, emailId, department, employeeId, phoneNumber, password, role } = req.body;

  const existingUser = await Employee.findOne({
    $or: [{ emailId }, { phoneNumber }, { employeeId }],
  });
  if (existingUser) throw new ApiError(409, "User already exists with given Email / Phone / Employee ID");

  const employee = await Employee.create({
    fullName,
    emailId,
    department,
    employeeId,
    phoneNumber,
    password,
    role,
  });

  logger.info(`New employee registered: ${employee.fullName} (${employee.employeeId})`);
  return res.status(201).json(new ApiResponse(201, { employee }, "Employee registered successfully"));
});

export const loginEmployee = asyncHandler(async (req, res) => {
  const { employeeId, role, department, password } = req.body;

  let query = { employeeId, role };
  if (role === "employee") query.department = department;

  const employee = await Employee.findOne(query).select("+password");
  if (!employee) throw new ApiError(401, "Invalid credentials");

  const isMatch = await employee.comparePassword(password);
  if (!isMatch) throw new ApiError(401, "Invalid credentials");

  const token = employee.generateJWT();
  res.cookie("accessToken", token, {
    httpOnly: true,
    secure: EVN.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.status(200).json(new ApiResponse(200, { employee }, "Login successful"));
});

export const logoutEmployee = asyncHandler(async (_req, res) => {
  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: EVN.NODE_ENV === "production",
    sameSite: "strict",
  });
  logger.info("Employee logged out");
  return res.status(200).json(new ApiResponse(200, null, "Logout successful"));
});

export const getEmployees = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const total = await Employee.countDocuments();
  const employees = await Employee.find().select("-password").skip(skip).limit(limit).sort({ createdAt: -1 });

  logger.info(`Employees fetched by ${req.user.fullName} (${req.user.employeeId})`);
  return res
    .status(200)
    .json(new ApiResponse(200, { employees, total, page, limit }, "Employees fetched successfully"));
});

export const getSingleEmployee = asyncHandler(async (req, res) => {
  const { id } = req.params;

  let employee = mongoose.Types.ObjectId.isValid(id)
    ? await Employee.findById(id).select("-password")
    : await Employee.findOne({ employeeId: id }).select("-password");

  if (!employee) throw new ApiError(404, "Employee not found");
  return res.status(200).json(new ApiResponse(200, { employee }, "Employee fetched successfully"));
});

export const updateEmployee = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { fullName, emailId, department, phoneNumber, role } = req.body;

  const employee = await Employee.findById(id);
  if (!employee) throw new ApiError(404, "Employee not found");

  const isAdmin = req.user.role === "admin";
  const isSelf = String(req.user.id) === String(id);

  if (!isAdmin && !isSelf) throw new ApiError(403, "Only admin or owner can update this employee");
  if (!isAdmin && role && role !== employee.role) throw new ApiError(403, "Employees cannot change role");

  if (fullName) employee.fullName = fullName;
  if (emailId) employee.emailId = emailId;
  if (department) employee.department = department;
  if (phoneNumber) employee.phoneNumber = phoneNumber;
  if (isAdmin && role) employee.role = role;

  await employee.save();

  logger.info(
    `Employee updated: ${employee.fullName} (${employee.employeeId}) by ${req.user.fullName} (${req.user.employeeId})`
  );
  return res.status(200).json(new ApiResponse(200, { employee }, "Employee updated successfully"));
});

export const deleteEmployee = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") throw new ApiError(403, "Only admin can delete employees");

  const { id } = req.params;
  const employee = await Employee.findByIdAndDelete(id);
  if (!employee) throw new ApiError(404, `Employee with ID ${id} not found`);

  logger.info(
    `Employee deleted: ${employee.fullName} (${employee.employeeId}) by ${req.user.fullName} (${req.user.employeeId})`
  );
  return res.status(200).json(new ApiResponse(200, null, `Employee ${employee.fullName} deleted successfully`));
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const employee = await Employee.findById(userId).select("-password");
  if (!employee) throw new ApiError(404, "User not found");
  return res.status(200).json(new ApiResponse(200, { employee }, "User fetched successfully"));
});
