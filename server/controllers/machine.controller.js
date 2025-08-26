import Machine from "../models/machine.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import logger from "../logger/winston.logger.js";
import {asyncHandler} from "../utils/asyncHandler.js";

// ➕ Create Machine
export const createMachine = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name) throw new ApiError(400, "Machine name is required");

  const existing = await Machine.findOne({ name });
  if (existing) throw new ApiError(409, "Machine already exists");

  const machine = await Machine.create({ name });
  logger.info(`Machine created: ${machine.name}`);
  return res.status(201).json(new ApiResponse(201, machine, "Machine created"));
});

// 📄 Get All Machines
export const getMachines = asyncHandler(async (req, res) => {
  const machines = await Machine.find({});
  return res.json(new ApiResponse(200, machines, "Machines fetched"));
});

// ❌ Delete Machine
export const deleteMachine = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const machine = await Machine.findByIdAndDelete(id);
  if (!machine) throw new ApiError(404, "Machine not found");

  logger.info(`Machine deleted: ${id}`);
  return res.json(new ApiResponse(200, machine, "Machine deleted"));
});
