import Audit from "../models/audit.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import logger from "../logger/winston.logger.js";
import {asyncHandler} from "../utils/asyncHandler.js";
import { invalidateCache } from "../middlewares/cache.middleware.js";

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

  // Parse answers if it's a string (from form data)
  let parsedAnswers;
  try {
    parsedAnswers = typeof answers === 'string' ? JSON.parse(answers) : answers;
  } catch (error) {
    throw new ApiError(400, "Invalid answers format");
  }

  // Validate answers and attach photos if uploaded
  if (req.files && req.files.auditPhotos) {
    const uploadedPhotos = req.files.auditPhotos;
    
    // Group photos by question ID (assuming filename contains question ID)
    const photosByQuestion = {};
    uploadedPhotos.forEach(file => {
      const questionId = file.fieldname.split('_')[1]; // Assuming fieldname like "photo_questionId"
      if (!photosByQuestion[questionId]) {
        photosByQuestion[questionId] = [];
      }
      photosByQuestion[questionId].push({
        url: file.path,
        publicId: file.filename,
        originalName: file.originalname,
        size: file.size,
        uploadedAt: new Date(),
      });
    });

    // Attach photos to corresponding answers
    parsedAnswers.forEach((ans) => {
      if (ans.answer === "No") {
        if (!ans.remark) {
          throw new ApiError(400, `Remark required for question ${ans.question}`);
        }
        // Attach photos if available
        if (photosByQuestion[ans.question]) {
          ans.photos = photosByQuestion[ans.question];
        }
      }
    });
  } else {
    // Validate answers without photos
    parsedAnswers.forEach((ans) => {
      if (ans.answer === "No" && !ans.remark) {
        throw new ApiError(400, `Remark required for question ${ans.question}`);
      }
    });
  }

  const audit = await Audit.create({
    date,
    line,
    machine,
    process,
    lineLeader,
    shiftIncharge,
    auditor: req.user.id,     
    createdBy: req.user.id, 
    answers: parsedAnswers,
  });

  // Invalidate related cache
  await invalidateCache('/api/audits');
  
  // Send real-time notification
  const io = req.app.get('io');
  if (io) {
    io.emit('audit-created', {
      auditId: audit._id,
      auditor: req.user.fullName,
      line: line,
      machine: machine,
      timestamp: new Date().toISOString(),
      message: 'New audit submitted'
    });
  }

  logger.info(`Audit created by ${req.user.id}`);
  return res.status(201).json(new ApiResponse(201, audit, "Audit submitted"));
});

export const getAudits = asyncHandler(async (req, res) => {
  let query = {};
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  if (req.user.role === "employee") {
    query = { auditor: req.user._id };
  } 
  else if (req.query.auditor) {
    query = { auditor: req.query.auditor };
  }

  // Add date range filter if provided
  if (req.query.startDate || req.query.endDate) {
    query.date = {};
    if (req.query.startDate) query.date.$gte = new Date(req.query.startDate);
    if (req.query.endDate) query.date.$lte = new Date(req.query.endDate);
  }

  const audits = await Audit.find(query)
    .select('date line machine process lineLeader shiftIncharge auditor createdBy createdAt answers')
    .populate("line", "name")
    .populate("machine", "name")
    .populate("process", "name")
    .populate("auditor", "fullName emailId")
    .populate("createdBy", "fullName employeeId")
    .populate("answers.question", "questionText")
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean(); // Use lean for better performance

  const total = await Audit.countDocuments(query);

  return res.json(new ApiResponse(200, {
    audits,
    pagination: {
      current: page,
      total: Math.ceil(total / limit),
      count: audits.length,
      totalRecords: total
    }
  }, "Audits fetched successfully"));
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

  // Invalidate cache and send real-time notification
  await invalidateCache('/api/audits');
  const io = req.app.get('io');
  if (io) {
    io.emit('audit-updated', {
      auditId: id,
      updatedBy: req.user.fullName,
      timestamp: new Date().toISOString(),
      message: 'Audit updated'
    });
  }

  logger.info(`Audit ${id} updated by ${req.user._id}`);
  return res.json(new ApiResponse(200, audit, "Audit updated successfully"));
});

export const deleteAudit = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const audit = await Audit.findById(id);
  if (!audit) throw new ApiError(404, "Audit not found");

  await audit.deleteOne();

  // Invalidate cache and send real-time notification
  await invalidateCache('/api/audits');
  const io = req.app.get('io');
  if (io) {
    io.emit('audit-deleted', {
      auditId: id,
      timestamp: new Date().toISOString(),
      message: 'Audit deleted'
    });
  }

  return res.json(new ApiResponse(200, null, "Audit deleted successfully"));
});
