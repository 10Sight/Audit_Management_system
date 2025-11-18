import Audit from "../models/audit.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import logger from "../logger/winston.logger.js";
import {asyncHandler} from "../utils/asyncHandler.js";
import { invalidateCache } from "../middlewares/cache.middleware.js";
import sendMail from "../utils/mail.util.js";

export const createAudit = asyncHandler(async (req, res) => {
  const { date, line, machine, process, unit, lineLeader, shiftIncharge, answers } = req.body;

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
    unit,
    lineLeader,
    shiftIncharge,
    auditor: req.user.id,     
    createdBy: req.user.id, 
    answers: parsedAnswers,
  });

  // Invalidate related cache
  await invalidateCache('/api/audits');
  
  // Load related docs to get human-readable names for notification
  const populatedAudit = await Audit.findById(audit._id)
    .populate('line', 'name')
    .populate('machine', 'name')
    .populate('process', 'name')
    .populate('unit', 'name')
    .populate('auditor', 'fullName');

  const lineName = populatedAudit?.line?.name || line;
  const machineName = populatedAudit?.machine?.name || machine;
  const processName = populatedAudit?.process?.name || process;
  const unitName = populatedAudit?.unit?.name || unit;
  const auditorName = populatedAudit?.auditor?.fullName || req.user.fullName;

  // Send real-time notification
  const io = req.app.get('io');
  if (io) {
    io.emit('audit-created', {
      auditId: audit._id,
      auditor: auditorName,
      line: { id: audit.line, name: lineName },
      machine: { id: audit.machine, name: machineName },
      process: { id: audit.process, name: processName },
      unit: unit ? { id: audit.unit, name: unitName } : undefined,
      timestamp: new Date().toISOString(),
      message: `Audit created for Line: ${lineName} Employee: ${auditorName}`,
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

  // Add date range filter if provided (match either logical audit date or creation timestamp)
  if (req.query.startDate || req.query.endDate) {
    const start = req.query.startDate ? new Date(req.query.startDate) : null;
    const end = req.query.endDate ? new Date(req.query.endDate) : null;

    const dateRange = {};
    const createdAtRange = {};
    if (start) { dateRange.$gte = start; createdAtRange.$gte = start; }
    if (end) { dateRange.$lte = end; createdAtRange.$lte = end; }

    // Combine with any existing query via $and
    const base = Object.keys(query).length ? [query] : [];
    query = {
      $and: [
        ...base,
        { $or: [
          Object.keys(dateRange).length ? { date: dateRange } : {},
          Object.keys(createdAtRange).length ? { createdAt: createdAtRange } : {}
        ]}
      ]
    };
  }

  // Optional filters: line, machine, process, unit
  if (req.query.line) query.line = req.query.line;
  if (req.query.machine) query.machine = req.query.machine;
  if (req.query.process) query.process = req.query.process;
  if (req.query.unit) query.unit = req.query.unit;

  // Result filter: allYes or allNo
  if (req.query.result === 'allYes') {
    query.answers = { $not: { $elemMatch: { answer: 'No' } } };
  } else if (req.query.result === 'allNo') {
    query.answers = { $not: { $elemMatch: { answer: 'Yes' } } };
  }

  let audits;
  try {
    audits = await Audit.find(query)
      .select('date line machine process unit lineLeader shiftIncharge auditor createdBy createdAt answers')
      .populate("line", "name")
      .populate("machine", "name")
      .populate("process", "name")
      .populate("unit", "name")
      .populate("auditor", "fullName emailId")
      .populate("createdBy", "fullName employeeId")
      .populate({ path: "answers.question", select: "questionText", options: { lean: true } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean(); // Use lean for better performance
  } catch (err) {
    if (err?.name === 'CastError') {
      // Fallback without populating nested answers if legacy data shape
      audits = await Audit.find(query)
        .select('date line machine process unit lineLeader shiftIncharge auditor createdBy createdAt answers')
        .populate("line", "name")
        .populate("machine", "name")
        .populate("process", "name")
        .populate("unit", "name")
        .populate("auditor", "fullName emailId")
        .populate("createdBy", "fullName employeeId")
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean();
    } else {
      throw err;
    }
  }

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
    .populate("unit", "name")
    .populate("auditor", "fullName emailId")
    .populate("answers.question", "questionText")
    .populate("createdBy", "fullName employeeId"); 

  if (!audit) throw new ApiError(404, "Audit not found");

  return res.json(new ApiResponse(200, audit, "Audit fetched"));
});

export const shareAuditByEmail = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { email, note } = req.body || {};

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const audit = await Audit.findById(id)
    .populate("line", "name")
    .populate("machine", "name")
    .populate("process", "name")
    .populate("unit", "name")
    .populate("auditor", "fullName emailId")
    .populate("createdBy", "fullName employeeId");

  if (!audit) {
    throw new ApiError(404, "Audit not found");
  }

  // Only allow the auditor or admins/superadmins to share
  if (
    req.user.role === "employee" &&
    audit.auditor &&
    audit.auditor._id &&
    audit.auditor._id.toString() !== req.user._id.toString()
  ) {
    throw new ApiError(403, "You are not allowed to share this audit");
  }

  const dateStr = audit.date
    ? new Date(audit.date).toISOString().split("T")[0]
    : "N/A";
  const lineName = audit.line?.name || "N/A";
  const machineName = audit.machine?.name || "N/A";
  const processName = audit.process?.name || "N/A";
  const unitName = audit.unit?.name || "N/A";
  const auditorName = audit.auditor?.fullName || "N/A";

  const totalQuestions = Array.isArray(audit.answers) ? audit.answers.length : 0;
  const noCount = Array.isArray(audit.answers)
    ? audit.answers.filter((a) => a.answer === "No").length
    : 0;
  const yesCount = totalQuestions - noCount;

  const subject = `Audit Result - ${dateStr} - ${lineName}`;

  const rowsHtml = (audit.answers || [])
    .map((ans, idx) => {
      const qText = ans.question?.questionText || ans.questionText || `Q${idx + 1}`;
      const remark = ans.remark || "-";
      const answer = ans.answer || "-";
      const photos = Array.isArray(ans.photos) ? ans.photos : [];
      const photosHtml = photos.length
        ? photos
            .map(
              (p, photoIdx) =>
                `<a href="${p.url}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-right:4px;margin-bottom:4px;">
                  <img src="${p.url}" alt="Photo ${photoIdx + 1}" style="width:56px;height:56px;object-fit:cover;border-radius:4px;border:1px solid #e5e7eb;" />
                </a>`
            )
            .join("")
        : "-";

      return `<tr>
        <td style="padding:8px;border:1px solid #e5e7eb;font-size:13px;">${idx + 1}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;font-size:13px;">${qText}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;font-size:13px;">${answer}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;font-size:13px;">${remark}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;font-size:13px;max-width:220px;">${photosHtml}</td>
      </tr>`;
    })
    .join("");

  const extraNote = note ? `<p style="margin:0 0 16px 0;font-size:13px;"><strong>Note from ${
    auditorName || "auditor"
  }:</strong> ${note}</p>` : "";

  const html = `
    <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827;">
      <h2 style="margin-bottom:4px;font-size:20px;">Audit Result Shared</h2>
      <p style="margin:0 0 16px 0;font-size:14px;color:#4b5563;">
        An audit has been completed and shared with you. Below are the details.
      </p>

      <div style="margin-bottom:16px;padding:12px 14px;border-radius:8px;background:#f9fafb;border:1px solid #e5e7eb;">
        <p style="margin:0 0 4px 0;font-size:13px;"><strong>Date:</strong> ${dateStr}</p>
        <p style="margin:0 0 4px 0;font-size:13px;"><strong>Line:</strong> ${lineName}</p>
        <p style="margin:0 0 4px 0;font-size:13px;"><strong>Machine:</strong> ${machineName}</p>
        <p style="margin:0 0 4px 0;font-size:13px;"><strong>Process:</strong> ${processName}</p>
        <p style="margin:0 0 4px 0;font-size:13px;"><strong>Unit:</strong> ${unitName}</p>
        <p style="margin:0 0 4px 0;font-size:13px;"><strong>Line Leader:</strong> ${
          audit.lineLeader || "N/A"
        }</p>
        <p style="margin:0 0 4px 0;font-size:13px;"><strong>Shift Incharge:</strong> ${
          audit.shiftIncharge || "N/A"
        }</p>
        <p style="margin:0;font-size:13px;"><strong>Auditor:</strong> ${auditorName}</p>
      </div>

      <div style="margin-bottom:16px;">
        <p style="margin:0 0 4px 0;font-size:13px;"><strong>Total Questions:</strong> ${
          totalQuestions
        }</p>
        <p style="margin:0 0 4px 0;font-size:13px;"><strong>YES:</strong> ${yesCount}</p>
        <p style="margin:0 0 4px 0;font-size:13px;"><strong>NO:</strong> ${noCount}</p>
      </div>

      ${extraNote}

      <table style="border-collapse:collapse;width:100%;margin-top:12px;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:8px;border:1px solid #e5e7eb;font-size:13px;text-align:left;">#</th>
            <th style="padding:8px;border:1px solid #e5e7eb;font-size:13px;text-align:left;">Question</th>
            <th style="padding:8px;border:1px solid #e5e7eb;font-size:13px;text-align:left;">Answer</th>
            <th style="padding:8px;border:1px solid #e5e7eb;font-size:13px;text-align:left;">Remark</th>
            <th style="padding:8px;border:1px solid #e5e7eb;font-size:13px;text-align:left;">Photos</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <p style="margin-top:16px;font-size:12px;color:#9ca3af;">
        This email was sent automatically by the Audit Management System.
      </p>
    </div>
  `;

  await sendMail(email, subject, html);

  logger.info(`Audit ${id} shared via email to ${email} by ${req.user._id}`);

  return res.json(new ApiResponse(200, null, "Audit shared via email"));
});

export const updateAudit = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { line, machine, process, unit, lineLeader, shiftIncharge, answers } = req.body;

  const audit = await Audit.findById(id);
  if (!audit) throw new ApiError(404, "Audit not found");

  if (req.user.role === "employee" && audit.auditor.toString() !== req.user._id) {
    throw new ApiError(403, "You are not authorized to update this audit");
  }

  if (line) audit.line = line;
  if (machine) audit.machine = machine;
  if (process) audit.process = process;
  if (unit) audit.unit = unit;
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
