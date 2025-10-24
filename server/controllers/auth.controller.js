import mongoose from "mongoose";
import Employee from "../models/auth.model.js";
import Department from "../models/department.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import logger from "../logger/winston.logger.js";
import {asyncHandler} from "../utils/asyncHandler.js";
import EVN from "../config/env.config.js";

export const registerEmployee = asyncHandler(async (req, res) => {
  const { fullName, emailId, department, employeeId, username, phoneNumber, password, role } = req.body;

  // Validate department exists
  if (department) {
    const departmentExists = await Department.findById(department);
    if (!departmentExists) throw new ApiError(400, "Invalid department selected");
  }

  const existingUser = await Employee.findOne({
    $or: [{ emailId }, { phoneNumber }, { employeeId }, { username }],
  });
  if (existingUser) throw new ApiError(409, "User already exists with given Email / Phone / Employee ID / Username");

  const employee = await Employee.create({
    fullName,
    emailId,
    department,
    employeeId,
    username,
    phoneNumber,
    password,
    role,
  });

  // Update department employee count
  if (department) {
    await Department.findByIdAndUpdate(department, { $inc: { employeeCount: 1 } });
  }

  // Populate department info for response
  await employee.populate('department', 'name description');

  logger.info(`New employee registered: ${employee.fullName} (${employee.employeeId})`);
  return res.status(201).json(new ApiResponse(201, { employee }, "Employee registered successfully"));
});

export const loginEmployee = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  console.log('Login attempt:', { username, password: password ? '***' : 'missing' });

  // Try to find user by username first, then fallback to employeeId for backward compatibility
  let employee = await Employee.findOne({
    username: username.toLowerCase()
  })
  .select("+password")
  .populate('department', 'name description');
  
  // If not found by username, try by employeeId (for existing users)
  if (!employee) {
    console.log('User not found by username, trying employeeId...');
    employee = await Employee.findOne({
      employeeId: username.toUpperCase()
    })
    .select("+password")
    .populate('department', 'name description');
  }
  
  console.log('Employee found:', employee ? 'Yes' : 'No');
  if (!employee) {
    // Get some info about available users for debugging
    const totalUsers = await Employee.countDocuments();
    const userSample = await Employee.findOne({}, 'employeeId username fullName').exec();
    console.log(`Total users in DB: ${totalUsers}`);
    if (userSample) {
      console.log('Sample user:', {
        employeeId: userSample.employeeId,
        username: userSample.username,
        fullName: userSample.fullName
      });
    }
    throw new ApiError(401, "User not found. Try using your Employee ID as username if you're an existing user.");
  }

  const isMatch = await employee.comparePassword(password);
  console.log('Password match:', isMatch);
  if (!isMatch) throw new ApiError(401, "Invalid password");

  const token = employee.generateJWT();
  res.cookie("accessToken", token, {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  console.log('Login successful for:', employee.fullName);
  return res.status(200).json(new ApiResponse(200, { employee }, "Login successful"));
});

export const logoutEmployee = asyncHandler(async (_req, res) => {
  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: true,
    sameSite: "None",
  });
  logger.info("Employee logged out");
  return res.status(200).json(new ApiResponse(200, null, "Logout successful"));
});

export const getEmployees = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  const search = req.query.search || '';

  // Build query - only get employees with role 'employee'
  let query = { role: 'employee' };

  // Add search functionality
  if (search) {
    query.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { emailId: { $regex: search, $options: 'i' } },
      { employeeId: { $regex: search, $options: 'i' } },
      { phoneNumber: { $regex: search, $options: 'i' } }
    ];
  }

  const total = await Employee.countDocuments(query);
  let employees;
  try {
    employees = await Employee.find(query)
      .select("-password")
      .populate('department', 'name description')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();
  } catch (err) {
    if (err?.name === 'CastError') {
      // Fallback without populate for legacy records where department is a string
      employees = await Employee.find(query)
        .select("-password")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean();
    } else {
      throw err;
    }
  }

  logger.info(`Employees fetched by ${req.user.fullName} (${req.user.employeeId})`);
  return res
    .status(200)
    .json(new ApiResponse(200, { employees, total, page, limit }, "Employees fetched successfully"));
});

export const getSingleEmployee = asyncHandler(async (req, res) => {
  const { id } = req.params;

  let employee = mongoose.Types.ObjectId.isValid(id)
    ? await Employee.findById(id).select("-password").populate('department', 'name description')
    : await Employee.findOne({ employeeId: id }).select("-password").populate('department', 'name description');

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
  const employee = await Employee.findById(userId).select("-password").populate('department', 'name description');
  if (!employee) throw new ApiError(404, "User not found");
  return res.status(200).json(new ApiResponse(200, { employee }, "User fetched successfully"));
});

// Utility function to populate usernames for existing users (migration)
export const populateUsernames = asyncHandler(async (req, res) => {
  try {
    // Find all users without username
    const usersWithoutUsername = await Employee.find({ 
      $or: [{ username: { $exists: false } }, { username: null }, { username: '' }] 
    });
    
    console.log(`Found ${usersWithoutUsername.length} users without username`);
    
    let updated = 0;
    for (const user of usersWithoutUsername) {
      // Create username from employeeId (converted to lowercase)
      const username = user.employeeId.toLowerCase();
      
      // Check if username already exists
      const existingUser = await Employee.findOne({ username });
      if (!existingUser) {
        user.username = username;
        await user.save();
        updated++;
        console.log(`Updated username for ${user.fullName}: ${username}`);
      } else {
        console.log(`Username ${username} already exists for ${user.fullName}`);
      }
    }
    
    return res.status(200).json(new ApiResponse(200, 
      { totalFound: usersWithoutUsername.length, updated }, 
      `Migration completed. Updated ${updated} users with usernames`
    ));
  } catch (error) {
    console.error('Migration error:', error);
    throw new ApiError(500, 'Failed to populate usernames');
  }
});

// Get all users (admins, supervisors, employees) for admin management
export const getAllUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  const search = req.query.search || '';

  // Build query - get all users
  let query = {};

  // Add search functionality
  if (search) {
    query.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { emailId: { $regex: search, $options: 'i' } },
      { employeeId: { $regex: search, $options: 'i' } },
      { phoneNumber: { $regex: search, $options: 'i' } }
    ];
  }

  const total = await Employee.countDocuments(query);
  let users;
  try {
    users = await Employee.find(query)
      .select("-password")
      .populate('department', 'name description')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();
  } catch (err) {
    if (err?.name === 'CastError') {
      users = await Employee.find(query)
        .select("-password")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean();
    } else {
      throw err;
    }
  }

  logger.info(`All users fetched by ${req.user.fullName} (${req.user.employeeId})`);
  return res
    .status(200)
    .json(new ApiResponse(200, { users, total, page, limit }, "All users fetched successfully"));
});
