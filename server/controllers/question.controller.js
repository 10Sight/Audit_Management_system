import mongoose from "mongoose";
import Question from "../models/question.model.js";
import QuestionCategory from "../models/questionCategory.model.js";
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

    // Normalize question type and extra configuration fields
    const questionType = q.questionType || q.type || "yes_no";
    const allowedTypes = ["yes_no", "mcq", "short_text", "image", "dropdown"];
    if (!allowedTypes.includes(questionType)) {
      throw new ApiError(400, `Invalid question type: ${questionType}`);
    }

    const options = Array.isArray(q.options)
      ? q.options.map((opt) => (typeof opt === "string" ? opt.trim() : "")).filter(Boolean)
      : [];

    // Optional correct option index for MCQ/dropdown questions
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
    };

    if (q.templateTitle && typeof q.templateTitle === "string") {
      base.templateTitle = q.templateTitle.trim();
    }

    if (q.department) {
      base.department = q.department;
    }

    if (options.length && ["mcq", "dropdown"].includes(questionType)) {
      base.options = options;
      if (correctOptionIndex !== undefined) {
        base.correctOptionIndex = correctOptionIndex;
      }
    }

    if (imageUrl && questionType === "image") {
      base.imageUrl = imageUrl;
    }

    // Only attach scoping fields when NOT global
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

  return res
    .status(201)
    .json(new ApiResponse(201, createdQuestions, "Questions created"));
});

export const getQuestions = asyncHandler(async (req, res) => {
  // Accept both old and new query params
  const lineId = req.query.lineId || req.query.line;
  const machineId = req.query.machineId || req.query.machine;
  const processId = req.query.processId || req.query.process;
  const unitId = req.query.unitId || req.query.unit;
  const includeGlobal = req.query.includeGlobal;
  const fetchAll = req.query.fetchAll === "true";
  const departmentId = req.query.departmentId || req.query.department;

  // Fast path: explicitly request all questions (global + scoped), ignoring filters
  if (fetchAll) {
    const questions = await Question.find({})
      .populate("lines machines processes units department", "name")
      .lean();

    return res.json({ status: "success", data: questions });
  }

  const orConditions = [];
  const andConditions = [];

  // Line/Machine/Process/Unit filters
  if (lineId) andConditions.push({ lines: lineId });
  if (machineId) andConditions.push({ machines: machineId });
  if (processId) andConditions.push({ processes: processId });
  if (unitId) andConditions.push({ units: unitId });

  // Include global questions only if explicitly true (default: true)
  if (includeGlobal === undefined || includeGlobal === "true") {
    orConditions.push({ isGlobal: true });
  }

  // Combine AND conditions if present
  if (andConditions.length > 0) {
    orConditions.push({ $and: andConditions });
  }

  // Base filter for scoped/global questions
  const baseFilter = orConditions.length > 0 ? { $or: orConditions } : {};

  let questions = await Question.find(baseFilter)
    .populate("lines machines processes units department", "name")
    .lean();

  // Department-based categories: include any questions that belong to a category assigned to this department
  if (departmentId && mongoose.Types.ObjectId.isValid(departmentId)) {
    const categories = await QuestionCategory.find({ departments: departmentId })
      .select("questions")
      .lean();

    const departmentQuestionIds = [
      ...new Set(
        categories.flatMap((cat) =>
          Array.isArray(cat.questions) ? cat.questions.map((q) => q.toString()) : []
        )
      ),
    ];

    if (departmentQuestionIds.length > 0) {
      const extraQuestions = await Question.find({ _id: { $in: departmentQuestionIds } })
        .populate("lines machines processes units department", "name")
        .lean();

      const seen = new Set(questions.map((q) => q._id.toString()));
      for (const q of extraQuestions) {
        if (!seen.has(q._id.toString())) {
          seen.add(q._id.toString());
          questions.push(q);
        }
      }
    }

    // Also include any questions scoped directly to this department (optionally with context)
    const deptFilter = { department: departmentId };
    if (lineId) deptFilter.lines = lineId;
    if (machineId) deptFilter.machines = machineId;
    if (processId) deptFilter.processes = processId;
    if (unitId) deptFilter.units = unitId;

    const deptQuestions = await Question.find(deptFilter)
      .populate("lines machines processes units department", "name")
      .lean();

    if (deptQuestions.length) {
      const seen = new Set(questions.map((q) => q._id.toString()));
      for (const q of deptQuestions) {
        if (!seen.has(q._id.toString())) {
          seen.add(q._id.toString());
          questions.push(q);
        }
      }
    }
  }

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

