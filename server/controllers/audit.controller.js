import Audit from "../models/audit.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import logger from "../logger/winston.logger.js";
import {asyncHandler} from "../utils/asyncHandler.js";

// ➕ Create Audit
// ➕ Create Audit
export const createAudit = asyncHandler(async (req, res) => {
  const { date, line, machine, process, lineLeader, shiftIncharge, answers } = req.body;

  if (!date || !line || !machine || !process || !lineLeader || !shiftIncharge) {
    throw new ApiError(400, "All required fields must be filled");
  }

  // ✅ Enforce date = today
  const today = new Date().toISOString().split("T")[0];
  const enteredDate = new Date(date).toISOString().split("T")[0];
  if (today !== enteredDate) {
    throw new ApiError(400, "Audit date must be today");
  }

  // ✅ Check answers validity
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
    auditor: req.user.id,      // currently logged-in auditor
    createdBy: req.user.id,    // ✅ assign logged-in user as creator
    answers,
  });

  logger.info(`Audit created by ${req.user.id}`);
  return res.status(201).json(new ApiResponse(201, audit, "Audit submitted"));
});


// 📄 Get All Audits (admin)
export const getAudits = asyncHandler(async (req, res) => {
  const audits = await Audit.find({})
    .populate("line", "name")            // line object with only name
    .populate("machine", "name")         // machine object with only name
    .populate("process", "name")         // process object with only name
    .populate("auditor", "fullName emailId") // auditor with fullName and emailId
    .populate("answers.question", "questionText") // populate question text
    .populate("createdBy", "fullName employeeId"); // if you track who created the audit

  return res.json(new ApiResponse(200, audits, "Audits fetched"));
});
// 📄 Get Audit By ID
// 📄 Get Audit By ID
export const getAuditById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const audit = await Audit.findById(id)
    .populate("line", "name")
    .populate("machine", "name")
    .populate("process", "name")
    .populate("auditor", "fullName emailId")
    .populate("answers.question", "questionText")
    .populate("createdBy", "fullName employeeId"); // ✅ populate createdBy

  if (!audit) throw new ApiError(404, "Audit not found");

  return res.json(new ApiResponse(200, audit, "Audit fetched"));
});

// 📄 Delete Audit By ID
export const deleteAudit = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const audit = await Audit.findById(id);
  if (!audit) throw new ApiError(404, "Audit not found");

  await audit.deleteOne(); // remove from DB

  return res.json(new ApiResponse(200, null, "Audit deleted successfully"));
});
