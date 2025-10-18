import Machine from "../models/machine.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import logger from "../logger/winston.logger.js";
import {asyncHandler} from "../utils/asyncHandler.js";

export const createMachine = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if (!name) throw new ApiError(400, "Machine name is required");

  const existing = await Machine.findOne({ name });
  if (existing) throw new ApiError(409, "Machine already exists");

  const machine = await Machine.create({ name, description });
  logger.info(`Machine created: ${machine.name}`);
  return res.status(201).json(new ApiResponse(201, machine, "Machine created"));
});

export const getMachines = asyncHandler(async (req, res) => {
  const machines = await Machine.find({}).sort({ createdAt: -1 });
  return res.json(new ApiResponse(200, machines, "Machines fetched"));
});

export const updateMachine = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, isActive } = req.body;

  const machine = await Machine.findById(id);
  if (!machine) throw new ApiError(404, "Machine not found");

  if (name && name !== machine.name) {
    const existing = await Machine.findOne({ name, _id: { $ne: id } });
    if (existing) throw new ApiError(409, "Machine name already exists");
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
  const machine = await Machine.findByIdAndDelete(id);
  if (!machine) throw new ApiError(404, "Machine not found");

  logger.info(`Machine deleted: ${id}`);
  return res.json(new ApiResponse(200, machine, "Machine deleted"));
});
