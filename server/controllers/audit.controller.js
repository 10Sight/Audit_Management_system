import Audit from "../models/audit.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import logger from "../logger/winston.logger.js";
import {asyncHandler} from "../utils/asyncHandler.js";

export const createAudit = asyncHandler(async (req, res) => {
  const { date, line, machine, process, lineLeader, shiftIncharge, answers } = req.body;

  if (!date || !line || !machine || !process || !lineLeader || !shiftIncharge) {
    throw new ApiError(400, "All required fields must be filled");
  }

  const today = new Date().toISOString().split("T")[0];
  const enteredDate = new Date(date).toISOString().split("T")[0];
  if (today !== enteredDate) {
    throw new ApiError(400, "Audit date must be today");
  }

  answers.forEach((ans) => {
    if (ans.answer === "No" && !ans.remark) {
      throw new ApiError(400, `Remark required for question ${ans.question}`);
    }
  });

  const audit = await Audit.create({
    date,
    line,
    machine,
    process,
    lineLeader,
    shiftIncharge,
    auditor: req.user.id,     
    createdBy: req.user.id, 
    answers,
  });

  logger.info(`Audit created by ${req.user.id}`);
  return res.status(201).json(new ApiResponse(201, audit, "Audit submitted"));
});

export const getAudits = asyncHandler(async (req, res) => {
  let query = {};

  if (req.user.role === "employee") {
    query = { auditor: req.user._id };
  } 
  else if (req.query.auditor) {
    query = { auditor: req.query.auditor };
  }

  const audits = await Audit.find(query)
    .populate("line", "name")
    .populate("machine", "name")
    .populate("process", "name")
    .populate("auditor", "fullName emailId")
    .populate("answers.question", "questionText")
    .populate("createdBy", "fullName employeeId");

  return res.json(new ApiResponse(200, audits, "Audits fetched successfully"));
});

export const getAuditById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const audit = await Audit.findById(id)
    .populate("line", "name")
    .populate("machine", "name")
    .populate("process", "name")
    .populate("auditor", "fullName emailId")
    .populate("answers.question", "questionText")
    .populate("createdBy", "fullName employeeId"); 

  if (!audit) throw new ApiError(404, "Audit not found");

  return res.json(new ApiResponse(200, audit, "Audit fetched"));
});

export const updateAudit = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { line, machine, process, lineLeader, shiftIncharge, answers } = req.body;

  const audit = await Audit.findById(id);
  if (!audit) throw new ApiError(404, "Audit not found");

  if (req.user.role === "employee" && audit.auditor.toString() !== req.user._id) {
    throw new ApiError(403, "You are not authorized to update this audit");
  }

  if (line) audit.line = line;
  if (machine) audit.machine = machine;
  if (process) audit.process = process;
  if (lineLeader) audit.lineLeader = lineLeader;
  if (shiftIncharge) audit.shiftIncharge = shiftIncharge;

  if (answers) {
    if (!Array.isArray(answers) || answers.length === 0) {
      throw new ApiError(400, "Answers must be a non-empty array");
    }

    answers.forEach((ans) => {
      if (ans.answer === "No" && !ans.remark) {
        throw new ApiError(400, `Remark required for question ${ans.question}`);
      }
    });

    audit.answers = answers;
  }
  await audit.save();

  logger.info(`Audit ${id} updated by ${req.user._id}`);
  return res.json(new ApiResponse(200, audit, "Audit updated successfully"));
});

export const deleteAudit = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const audit = await Audit.findById(id);
  if (!audit) throw new ApiError(404, "Audit not found");

  await audit.deleteOne();

  return res.json(new ApiResponse(200, null, "Audit deleted successfully"));
});
