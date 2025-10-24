import mongoose from "mongoose";
import Question from "../models/question.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import logger from "../logger/winston.logger.js";
import {asyncHandler} from "../utils/asyncHandler.js";

export const createQuestion = asyncHandler(async (req, res) => {
  const questions = Array.isArray(req.body) ? req.body : req.body.questions;

  if (!questions || !questions.length)
    throw new ApiError(400, "Questions are required");

  const createdQuestions = [];

  for (const q of questions) {
    if (!q.questionText) throw new ApiError(400, "Question text is required");

    const isGlobal = !!q.isGlobal;
    const base = {
      questionText: q.questionText,
      isGlobal,
      createdBy: req.user.id,
    };

    // Only attach scoping fields when NOT global
    if (!isGlobal) {
      if (q.machine) base.machines = [q.machine];
      if (q.line) base.lines = [q.line];
      if (q.process) base.processes = [q.process];
    }

    const question = await Question.create(base);
    createdQuestions.push(question);
  }

  logger.info(`Created ${createdQuestions.length} questions by user ${req.user.id}`);

  return res
    .status(201)
    .json(new ApiResponse(201, createdQuestions, "Questions created"));
});

export const getQuestions = asyncHandler(async (req, res) => {
  // Accept both old and new query params
  const lineId = req.query.lineId || req.query.line;
  const machineId = req.query.machineId || req.query.machine;
  const processId = req.query.processId || req.query.process;
  const includeGlobal = req.query.includeGlobal;

  const orConditions = [];
  const andConditions = [];

  // Line/Machine/Process filters
  if (lineId) andConditions.push({ lines: lineId });
  if (machineId) andConditions.push({ machines: machineId });
  if (processId) andConditions.push({ processes: processId });

  // Include global questions only if explicitly true (default: true)
  if (includeGlobal === undefined || includeGlobal === "true") {
    orConditions.push({ isGlobal: true });
  }

  // Combine AND conditions if present
  if (andConditions.length > 0) {
    orConditions.push({ $and: andConditions });
  }

  // If no filters, return all questions
  const filter = orConditions.length > 0 ? { $or: orConditions } : {};

  const questions = await Question.find(filter)
    .populate("lines machines processes", "name")
    .lean(); // lean() makes objects simple JS objects, easier for frontend

  return res.json({ status: "success", data: questions });
});

export const deleteQuestion = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid question id");
  }

  const question = await Question.findByIdAndDelete(id);
  if (!question) throw new ApiError(404, "Question not found");

  logger.info(`Question deleted: ${id} by user ${req.user.id}`);

  return res.json(new ApiResponse(200, question, "Question deleted"));
});

