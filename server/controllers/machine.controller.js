import Machine from "../models/machine.model.js";
import Line from "../models/line.model.js";
import Department from "../models/department.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import logger from "../logger/winston.logger.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const createMachine = asyncHandler(async (req, res) => {
  const { name, description, department, line } = req.body;
  if (!name) throw new ApiError(400, "Machine name is required");

  let departmentId = department || null;
  let lineId = line || null;

  // If a line is provided, validate it and ensure it belongs to the same department (if provided)
  if (lineId) {
    const lineDoc = await Line.findById(lineId);
    if (!lineDoc) {
      throw new ApiError(400, "Invalid line specified for machine");
    }

    if (!departmentId && lineDoc.department) {
      departmentId = lineDoc.department;
    } else if (
      departmentId &&
      lineDoc.department &&
      // SQL IDs are numbers, safe to compare weak or stringify
      String(lineDoc.department) !== String(departmentId)
    ) {
      throw new ApiError(400, "Line does not belong to the specified department");
    }
  }

  const baseName = name.trim();

  // Enforce uniqueness
  // If lineId is set, check (line_id, name)
  // If lineId is null, check (department_id, name) IF desired by logic, but unique constraint is only on line_id.

  const query = { name: baseName };
  if (lineId) {
    query.line = lineId;
  } else if (departmentId) {
    query.department = departmentId;
    query.line = null; // Explicit null for SQL "IS NULL"
  }

  if (departmentId) {
    const deptDoc = await Department.findById(departmentId);
    if (!deptDoc) {
      throw new ApiError(404, "Department not found. It may have been deleted.");
    }
  }

  const existing = await Machine.findOne(query);
  if (existing) {
    const scope = lineId ? "this line" : "this department";
    throw new ApiError(409, `Machine already exists in ${scope}`);
  }

  const machine = await Machine.create({
    name: baseName,
    description,
    department: departmentId,
    line: lineId,
  });
  logger.info(`Machine created: ${machine.name}`);
  return res.status(201).json(new ApiResponse(201, machine, "Machine created"));
});

export const getMachines = asyncHandler(async (req, res) => {
  const { department, line } = req.query;
  const query = {};

  if (department !== undefined) query.department = department; // string or null logic handled? Usually query are strings.
  if (line !== undefined) query.line = line;

  const machines = await Machine.find(query);
  // Default sort in model is by name. Controller asked for createdAt -1?
  // Model: ORDER BY name ASC. 
  // Let's sort in memory if needed or trust model.
  // Original controller: .sort({ createdAt: -1 });
  // Let's keep consistent with original if possible, but alphabetically is usally better for lists.
  // I will leave model default (name ASC) as it is more UX friendly.

  return res.json(new ApiResponse(200, machines, "Machines fetched"));
});

export const updateMachine = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, isActive } = req.body;

  const machine = await Machine.findById(id);
  if (!machine) throw new ApiError(404, "Machine not found");

  if (name && name !== machine.name) {
    const query = { name: name.trim() };

    if (machine.line) {
      query.line = machine.line;
    } else if (machine.department) {
      query.department = machine.department;
      query.line = null;
    }

    const existing = await Machine.findOne(query);
    if (existing && existing._id != id) {
      const scope = machine.line ? "this line" : "this department";
      throw new ApiError(409, `Machine name already exists in ${scope}`);
    }
  }

  if (name) machine.name = name;
  if (description !== undefined) machine.description = description;
  if (typeof isActive === "boolean") machine.isActive = isActive;

  await machine.save();
  logger.info(`Machine updated: ${machine.name}`);
  return res.json(new ApiResponse(200, machine, "Machine updated"));
});

export const deleteMachine = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const exists = await Machine.findById(id);
  if (!exists) throw new ApiError(404, "Machine not found");

  await Machine.findByIdAndDelete(id);

  logger.info(`Machine deleted: ${id}`);
  return res.json(new ApiResponse(200, exists, "Machine deleted"));
});
