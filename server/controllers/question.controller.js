import Question from "../models/question.model.js";
import QuestionCategory from "../models/questionCategory.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import logger from "../logger/winston.logger.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose"; // Still needed for QuestionCategory and Unit?
// Remove mongoose dependency if possible, but QuestionCategory is Mongoose.

export const createQuestion = asyncHandler(async (req, res) => {
  const questions = Array.isArray(req.body) ? req.body : req.body.questions;

  if (!questions || !questions.length)
    throw new ApiError(400, "Questions are required");

  const createdQuestions = [];

  for (const q of questions) {
    if (!q.questionText) throw new ApiError(400, "Question text is required");

    const isGlobal = !!q.isGlobal;

    // Normalize question type
    const questionType = q.questionType || q.type || "yes_no";
    const allowedTypes = ["yes_no", "mcq", "short_text", "image", "dropdown"];
    if (!allowedTypes.includes(questionType)) {
      throw new ApiError(400, `Invalid question type: ${questionType}`);
    }

    const options = Array.isArray(q.options)
      ? q.options.map((opt) => (typeof opt === "string" ? opt.trim() : "")).filter(Boolean)
      : [];

    let correctOptionIndex;
    if (["mcq", "dropdown"].includes(questionType)) {
      if (q.correctOptionIndex !== undefined && q.correctOptionIndex !== null) {
        const idx = Number(q.correctOptionIndex);
        if (!Number.isInteger(idx) || idx < 0 || idx >= options.length) {
          throw new ApiError(400, "Invalid correct option index");
        }
        correctOptionIndex = idx;
      }
    }

    const imageUrl = typeof q.imageUrl === "string" ? q.imageUrl.trim() : undefined;

    const base = {
      questionText: q.questionText,
      questionType,
      isGlobal,
      createdBy: req.user.id,
      templateTitle: q.templateTitle && typeof q.templateTitle === "string" ? q.templateTitle.trim() : undefined,
      department: q.department,
      options: options.length && ["mcq", "dropdown"].includes(questionType) ? options : [],
      correctOptionIndex,
      imageUrl: imageUrl && questionType === "image" ? imageUrl : undefined
    };

    if (!isGlobal) {
      if (q.machine) base.machines = [q.machine];
      if (q.line) base.lines = [q.line];
      if (q.process) base.processes = [q.process];
      if (q.unit) base.units = [q.unit];
    }

    const question = await Question.create(base);
    createdQuestions.push(question);
  }

  logger.info(`Created ${createdQuestions.length} questions by user ${req.user.id}`);

  return res.status(201).json(new ApiResponse(201, createdQuestions, "Questions created"));
});

export const getQuestions = asyncHandler(async (req, res) => {
  const lineId = req.query.lineId || req.query.line;
  const machineId = req.query.machineId || req.query.machine;
  const processId = req.query.processId || req.query.process;
  const unitId = req.query.unitId || req.query.unit;
  const includeGlobal = req.query.includeGlobal === "true" || req.query.includeGlobal === undefined;
  const fetchAll = req.query.fetchAll === "true";
  const departmentId = req.query.departmentId || req.query.department;

  if (fetchAll) {
    const questions = await Question.find({});
    return res.json({ status: "success", data: questions });
  }

  // Build the restrictive filter for scoped questions
  const scopeFilter = {};
  if (unitId) scopeFilter.units = unitId;
  if (departmentId) scopeFilter.department = departmentId;
  if (lineId) scopeFilter.lines = lineId;
  if (machineId) scopeFilter.machines = machineId;
  if (processId) scopeFilter.processes = processId;

  let query;
  if (Object.keys(scopeFilter).length > 0) {
    if (includeGlobal) {
      // Show questions that match the scope OR are global
      query = {
        $or: [
          { isGlobal: true },
          scopeFilter
        ]
      };
    } else {
      // Strictly matching the scope
      query = scopeFilter;
    }
  } else {
    // No specific scope filters, show global questions by default or as requested
    query = includeGlobal ? { $or: [{ isGlobal: true }, { isGlobal: false }] } : { isGlobal: true };
  }

  const questions = await Question.find(query).populate("department units lines machines processes");

  return res.json({ status: "success", data: questions });
});

export const deleteQuestion = asyncHandler(async (req, res) => {
  const { id } = req.params;
  // ID is generic now
  const question = await Question.findByIdAndDelete(id);
  if (!question) throw new ApiError(404, "Question not found");

  logger.info(`Question deleted: ${id} by user ${req.user.id}`);
  return res.json(new ApiResponse(200, question, "Question deleted"));
});

export const updateQuestion = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const updates = {};
  if (req.body.questionText) updates.questionText = req.body.questionText.trim();
  if (req.body.templateTitle !== undefined) updates.templateTitle = req.body.templateTitle;
  if (req.body.department !== undefined) updates.department = req.body.department;

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, "No valid fields provided to update");
  }

  const question = await Question.findByIdAndUpdate(id, updates, { new: true });
  if (!question) throw new ApiError(404, "Question not found");

  logger.info(`Question updated: ${id} by user ${req.user.id}`);
  return res.json(new ApiResponse(200, question, "Question updated"));
});

export const deleteQuestionsByTemplateTitle = asyncHandler(async (req, res) => {
  const { title } = req.params;
  if (!title || typeof title !== "string") {
    throw new ApiError(400, "Template title is required");
  }

  const result = await Question.deleteMany({ templateTitle: title });

  if (!result.deletedCount) throw new ApiError(404, "No questions found");

  logger.info(`Deleted ${result.deletedCount} questions for template "${title}" by user ${req.user.id}`);

  return res.json(new ApiResponse(200, { deletedCount: result.deletedCount }, "Template questions deleted"));
});
