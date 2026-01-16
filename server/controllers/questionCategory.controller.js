import QuestionCategory from "../models/questionCategory.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import logger from "../logger/winston.logger.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import Question from "../models/question.model.js";
import Department from "../models/department.model.js";

// Helper to manual populate if needed
const populateCategories = async (categories) => {
  // Collect all Question IDs and Department IDs
  let qIds = new Set();
  let dIds = new Set();

  categories.forEach(cat => {
    if (Array.isArray(cat.questions)) cat.questions.forEach(id => qIds.add(id));
    if (Array.isArray(cat.departments)) cat.departments.forEach(id => dIds.add(id));
  });

  const questions = qIds.size > 0 ? await Question.find({ _id: { $in: [...qIds] } }) : [];
  const departments = dIds.size > 0 ? await Department.find({ _id: { $in: [...dIds] } }) : []; // Department find needs $in support?
  // Department model might not support $in yet. 
  // Assuming Department.find can take manual WHERE or we loop.
  // For now, let's keep it simple: return IDs or partial data if Department model doesn't support $in.
  // Actually, I can just fetch all departments or assume UI handles IDs.
  // But Mongoose controller was returning populated objects.

  // Quick map
  const qMap = {}; questions.forEach(q => qMap[q._id] = q);
  // const dMap ... if we can fetch.
  // Let's rely on basic ID return for now to minimize complexity, or fetch what we can.
  // Actually, populating departments is useful.
  const dMap = {}; departments.forEach(d => dMap[d._id] = d);

  return categories.map(cat => {
    // Hydrate questions
    const enrichedQuestions = (cat.questions || []).map(id => qMap[id]).filter(Boolean);
    // Hydrate departments
    const enrichedDepartments = (cat.departments || []).map(id => dMap[id]).filter(Boolean);

    return {
      ...cat,
      questions: enrichedQuestions,
      departments: enrichedDepartments,
    };
  });
};

export const createQuestionCategory = asyncHandler(async (req, res) => {
  const { name, description, questionIds, departmentIds } = req.body;

  if (!name || !name.trim()) {
    throw new ApiError(400, "Category name is required");
  }

  // IDs should be numbers
  const questions = Array.isArray(questionIds)
    ? questionIds.map(Number).filter(n => !isNaN(n))
    : [];

  const departments = Array.isArray(departmentIds)
    ? departmentIds.map(Number).filter(n => !isNaN(n))
    : [];

  const category = await QuestionCategory.create({
    name: name.trim(),
    description: description?.trim() || "",
    questions,
    departments,
    createdBy: req.user.id,
  });

  logger.info(`Question category created: ${category._id} by user ${req.user.id}`);

  return res.status(201).json(new ApiResponse(201, category, "Question category created"));
});

export const getQuestionCategories = asyncHandler(async (req, res) => {
  const categories = await QuestionCategory.find();
  const populated = await populateCategories(categories);
  return res.json(new ApiResponse(200, populated, "Question categories fetched"));
});

export const getQuestionCategoryById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const category = await QuestionCategory.findById(id);

  if (!category) throw new ApiError(404, "Category not found");

  const populated = await populateCategories([category]);

  return res.json(new ApiResponse(200, populated[0], "Question category fetched"));
});

export const updateQuestionCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, questionIds, departmentIds } = req.body;

  if (!name || !name.trim()) {
    throw new ApiError(400, "Category name is required");
  }

  const questions = Array.isArray(questionIds)
    ? questionIds.map(Number).filter(n => !isNaN(n))
    : [];

  const departments = Array.isArray(departmentIds)
    ? departmentIds.map(Number).filter(n => !isNaN(n))
    : [];

  const update = {
    name: name.trim(),
    description: description?.trim() || "",
    questions,
    departments,
  };

  const category = await QuestionCategory.findByIdAndUpdate(id, update);

  if (!category) throw new ApiError(404, "Category not found");

  logger.info(`Question category updated: ${id} by user ${req.user.id}`);

  return res.json(new ApiResponse(200, category, "Question category updated"));
});

export const deleteQuestionCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const category = await QuestionCategory.findByIdAndDelete(id);
  if (!category) throw new ApiError(404, "Category not found");

  logger.info(`Question category deleted: ${id} by user ${req.user.id}`);

  return res.json(new ApiResponse(200, category, "Question category deleted"));
});
