import Line from "../models/line.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import logger from "../logger/winston.logger.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const createLine = asyncHandler(async (req, res) => {
  const { name, description, department } = req.body;
  if (!name) throw new ApiError(400, "Line name is required");

  // Enforce uniqueness per department
  const baseName = name.trim();
  const depFilter = department || null; // Map undefined/null to null

  const existing = await Line.findOne({ name: baseName, department: depFilter });
  if (existing) throw new ApiError(409, "Line already exists in this department");

  // Get the highest order number and add 1
  // We can't sort by 'order' easily with findOne() in simple shim if not built in?
  // My Line model findOne uses _buildQuery limit 1.
  // I need to provide sort option or manual query.
  // SQL wrapper doesn't support custom sort in findOne params yet.
  // I'll implement a static helper or use direct find() and sort.
  const allLines = await Line.find({ department: depFilter });
  // Sorting in memory for simplicity or update model. 
  // lines table likely small per department.
  allLines.sort((a, b) => b.order - a.order);
  const lastOrder = allLines.length > 0 ? allLines[0].order : 0;
  const order = lastOrder + 1;

  const line = await Line.create({ name: baseName, description, order, department: depFilter });
  logger.info(`Line created: ${line.name}`);
  return res.status(201).json(new ApiResponse(201, line, "Line created"));
});

export const getLines = asyncHandler(async (req, res) => {
  const { department } = req.query;
  // If department is provided string, use it. If undefined, ignore.
  const query = department !== undefined ? { department } : {};

  const lines = await Line.find(query);
  // Default sort in model is order ASC, name ASC.
  return res.json(new ApiResponse(200, lines, "Lines fetched"));
});

export const updateLine = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, isActive } = req.body;

  const line = await Line.findById(id);
  if (!line) throw new ApiError(404, "Line not found");

  if (name && name !== line.name) {
    // Check duplicate
    // Same department as current line
    const depFilter = line.department;

    // Manual check: fetch by name/dep, verify if it's NOT this line
    const existing = await Line.findOne({ name, department: depFilter });

    if (existing && existing._id != id) {
      throw new ApiError(409, "Line name already exists in this department");
    }
  }

  if (name) line.name = name;
  if (description !== undefined) line.description = description;
  if (typeof isActive === "boolean") line.isActive = isActive;

  await line.save();
  logger.info(`Line updated: ${line.name}`);
  return res.json(new ApiResponse(200, line, "Line updated"));
});

export const reorderLines = asyncHandler(async (req, res) => {
  const { lineIds } = req.body;

  if (!Array.isArray(lineIds)) {
    throw new ApiError(400, "lineIds must be an array");
  }

  // Update the order for each line
  const updatePromises = lineIds.map((lineId, index) =>
    Line.findByIdAndUpdate(lineId, { order: index + 1 }, { new: true })
  );

  await Promise.all(updatePromises);

  // Fetch updated lines (no department filter here; used by global lines page?)
  // Actually usually reorder is context specific. If global list used, fetching all is fine.
  const lines = await Line.find({}); // Sorts by default order ASC

  logger.info(`Lines reordered: ${lineIds.length} items`);
  return res.json(new ApiResponse(200, lines, "Lines reordered"));
});

export const deleteLine = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const exists = await Line.findById(id);
  if (!exists) throw new ApiError(404, "Line not found");

  await Line.findByIdAndDelete(id);

  logger.info(`Line deleted: ${id}`);
  return res.json(new ApiResponse(200, exists, "Line deleted"));
});
