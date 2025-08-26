import Line from "../models/line.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import logger from "../logger/winston.logger.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const createLine = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name) throw new ApiError(400, "Line name is required");

  const existing = await Line.findOne({ name });
  if (existing) throw new ApiError(409, "Line already exists");

  const line = await Line.create({ name });
  logger.info(`Line created: ${line.name}`);
  return res.status(201).json(new ApiResponse(201, line, "Line created"));
});

export const getLines = asyncHandler(async (req, res) => {
  const lines = await Line.find({});
  return res.json(new ApiResponse(200, lines, "Lines fetched"));
});

export const deleteLine = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const line = await Line.findByIdAndDelete(id);
  if (!line) throw new ApiError(404, "Line not found");

  logger.info(`Line deleted: ${id}`);
  return res.json(new ApiResponse(200, line, "Line deleted"));
});
