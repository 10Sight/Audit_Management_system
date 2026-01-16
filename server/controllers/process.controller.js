import Process from "../models/process.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import logger from "../logger/winston.logger.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const createProcess = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if (!name) throw new ApiError(400, "Process name is required");

  const existing = await Process.findOne({ name });
  if (existing) throw new ApiError(409, "Process already exists");

  const process = await Process.create({ name, description });
  logger.info(`Process created: ${process.name}`);
  return res.status(201).json(new ApiResponse(201, process, "Process created"));
});

export const getProcesses = asyncHandler(async (req, res) => {
  const processes = await Process.find({});
  // Default sort in model is name ASC. 
  // If we need createdAt desc, we should sort in memory or update model query builder.
  // The original one sorted by createdAt -1.
  // Let's stick to name ASC which is default in SQL model unless specified otherwise?
  // Actually, consistency with UI might prefer createdAt.
  // I will sort in memory for now.
  processes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return res.json(new ApiResponse(200, processes, "Processes fetched"));
});

export const updateProcess = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, isActive } = req.body;

  const process = await Process.findById(id);
  if (!process) throw new ApiError(404, "Process not found");

  if (name && name !== process.name) {
    const existing = await Process.findOne({ name });
    // Check if existing ID differs from current ID
    if (existing && existing._id != id) throw new ApiError(409, "Process name already exists");
  }

  if (name) process.name = name;
  if (description !== undefined) process.description = description;
  if (typeof isActive === "boolean") process.isActive = isActive;

  await process.save();
  logger.info(`Process updated: ${process.name}`);
  return res.json(new ApiResponse(200, process, "Process updated"));
});

export const deleteProcess = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const exists = await Process.findById(id);
  if (!exists) throw new ApiError(404, "Process not found");

  await Process.findByIdAndDelete(id);

  logger.info(`Process deleted: ${id}`);
  return res.json(new ApiResponse(200, exists, "Process deleted"));
});
