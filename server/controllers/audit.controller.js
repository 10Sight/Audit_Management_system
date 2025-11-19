import Audit from "../models/audit.model.js";
import AuditEmailSetting from "../models/auditEmailSetting.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import logger from "../logger/winston.logger.js";
import {asyncHandler} from "../utils/asyncHandler.js";
import { invalidateCache } from "../middlewares/cache.middleware.js";
import sendMail from "../utils/mail.util.js";

// Normalize a comma-separated email string into a clean list
const normalizeEmailList = (raw) => {
  return (raw || "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean)
    .join(", ");
};

export const createAudit = asyncHandler(async (req, res) => {
  const { date, line, machine, process, unit, lineLeader, shift, shiftIncharge, answers, lineRating, machineRating, processRating, unitRating, department } = req.body;

  if (!date || !line || !machine || !process || !lineLeader || !shift || !shiftIncharge) {
    throw new ApiError(400, "All required fields must be filled");
  }

  const allowedShifts = ["Shift 1", "Shift 2", "Shift 3"];
  if (!allowedShifts.includes(shift)) {
    throw new ApiError(400, "Shift must be one of Shift 1, Shift 2, or Shift 3");
  }

  const today = new Date().toISOString().split("T")[0];
  const enteredDate = new Date(date).toISOString().split("T")[0];
  if (today !== enteredDate) {
    throw new ApiError(400, "Audit date must be today");
  }

  // Validate ratings (1-10)
  const parseRating = (value, label) => {
    if (value === undefined || value === null || value === "") {
      throw new ApiError(400, `${label} is required`);
    }
    const num = Number(value);
    if (!Number.isFinite(num) || num < 1 || num > 10) {
      throw new ApiError(400, `${label} must be a number between 1 and 10`);
    }
    return num;
  };

  const normalizedLineRating = parseRating(lineRating, "Line rating");
  const normalizedMachineRating = parseRating(machineRating, "Machine rating");
  const normalizedProcessRating = parseRating(processRating, "Process rating");
  const normalizedUnitRating = parseRating(unitRating, "Unit rating");

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
    department: department || req.user.department || undefined,
    lineLeader,
    shift,
    shiftIncharge,
    lineRating: normalizedLineRating,
    machineRating: normalizedMachineRating,
    processRating: normalizedProcessRating,
    unitRating: normalizedUnitRating,
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

  // Optional filters: line, machine, process, unit, shift, department
  if (req.query.line) query.line = req.query.line;
  if (req.query.machine) query.machine = req.query.machine;
  if (req.query.process) query.process = req.query.process;
  if (req.query.unit) query.unit = req.query.unit;
  if (req.query.shift) query.shift = req.query.shift;
  if (req.query.department) query.department = req.query.department;

  // Result filter: allYes or allNo
  if (req.query.result === 'allYes') {
    query.answers = { $not: { $elemMatch: { answer: 'No' } } };
  } else if (req.query.result === 'allNo') {
    query.answers = { $not: { $elemMatch: { answer: 'Yes' } } };
  }

  let audits;
  try {
    audits = await Audit.find(query)
      .select('date line machine process unit department lineLeader shift shiftIncharge lineRating machineRating processRating unitRating auditor createdBy createdAt answers')
      .populate("line", "name")
      .populate("machine", "name")
      .populate("process", "name")
      .populate("unit", "name")
      .populate("department", "name")
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
        .select('date line machine process unit department lineLeader shift shiftIncharge lineRating machineRating processRating unitRating auditor createdBy createdAt answers')
        .populate("line", "name")
        .populate("machine", "name")
        .populate("process", "name")
        .populate("unit", "name")
        .populate("department", "name")
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

const buildAuditQueryForExport = (req) => {
  let query = {};

  if (req.user.role === "employee") {
    query = { auditor: req.user._id };
  } else if (req.query.auditor) {
    query = { auditor: req.query.auditor };
  }

  if (req.query.startDate || req.query.endDate) {
    const start = req.query.startDate ? new Date(req.query.startDate) : null;
    const end = req.query.endDate ? new Date(req.query.endDate) : null;

    const dateRange = {};
    const createdAtRange = {};
    if (start) { dateRange.$gte = start; createdAtRange.$gte = start; }
    if (end) { dateRange.$lte = end; createdAtRange.$lte = end; }

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

  if (req.query.line) query.line = req.query.line;
  if (req.query.machine) query.machine = req.query.machine;
  if (req.query.process) query.process = req.query.process;
  if (req.query.unit) query.unit = req.query.unit;
  if (req.query.shift) query.shift = req.query.shift;
  if (req.query.department) query.department = req.query.department;

  if (req.query.result === 'allYes') {
    query.answers = { $not: { $elemMatch: { answer: 'No' } } };
  } else if (req.query.result === 'allNo') {
    query.answers = { $not: { $elemMatch: { answer: 'Yes' } } };
  }

  return query;
};

const escapeCsv = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
};

export const exportAudits = asyncHandler(async (req, res) => {
  const query = buildAuditQueryForExport(req);

  const limit = Math.min(parseInt(req.query.limit) || 100000, 200000);

  let audits;
  try {
    audits = await Audit.find(query)
      .select('date line machine process unit department lineLeader shift shiftIncharge lineRating machineRating processRating unitRating auditor createdBy createdAt answers')
      .populate("line", "name")
      .populate("machine", "name")
      .populate("process", "name")
      .populate("unit", "name")
      .populate("department", "name")
      .populate("auditor", "fullName emailId")
      .populate("createdBy", "fullName employeeId")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  } catch (err) {
    if (err?.name === 'CastError') {
      audits = await Audit.find(query)
        .select('date line machine process unit department lineLeader shift shiftIncharge lineRating machineRating processRating unitRating auditor createdBy createdAt answers')
        .populate("line", "name")
        .populate("machine", "name")
        .populate("process", "name")
        .populate("unit", "name")
        .populate("department", "name")
        .populate("auditor", "fullName emailId")
        .populate("createdBy", "fullName employeeId")
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
    } else {
      throw err;
    }
  }

  const headers = [
    'Date',
    'Created At',
    'Department',
    'Line',
    'Machine',
    'Process',
    'Unit',
    'Shift',
    'Line Leader',
    'Shift Incharge',
    'Auditor Name',
    'Auditor Email',
    'Created By',
    'Line Rating',
    'Machine Rating',
    'Process Rating',
    'Unit Rating',
    'Yes Count',
    'No Count',
    'Total Answers',
  ];

  const rows = audits.map((audit) => {
    const dateStr = audit.date ? new Date(audit.date).toISOString().split('T')[0] : '';
    const createdAtStr = audit.createdAt ? new Date(audit.createdAt).toISOString() : '';

    const answers = Array.isArray(audit.answers) ? audit.answers : [];
    const yes = answers.filter((a) => a.answer === 'Yes').length;
    const no = answers.filter((a) => a.answer === 'No').length;
    const total = answers.length;

    return [
      dateStr,
      createdAtStr,
      audit.department?.name || '',
      audit.line?.name || '',
      audit.machine?.name || '',
      audit.process?.name || '',
      audit.unit?.name || '',
      audit.shift || '',
      audit.lineLeader || '',
      audit.shiftIncharge || '',
      audit.auditor?.fullName || '',
      audit.auditor?.emailId || '',
      audit.createdBy?.fullName || '',
      audit.lineRating ?? '',
      audit.machineRating ?? '',
      audit.processRating ?? '',
      audit.unitRating ?? '',
      yes,
      no,
      total,
    ];
  });

  const csvLines = [];
  csvLines.push(headers.map(escapeCsv).join(','));
  for (const row of rows) {
    csvLines.push(row.map(escapeCsv).join(','));
  }

  const csv = csvLines.join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="audits_export_${new Date().toISOString().slice(0, 10)}.csv"`);
  return res.status(200).send(csv);
});

export const getAuditById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const audit = await Audit.findById(id)
    .populate("line", "name")
    .populate("machine", "name")
    .populate("process", "name")
    .populate("unit", "name")
    .populate("department", "name")
    .populate("auditor", "fullName emailId")
    .populate("answers.question", "questionText")
    .populate("createdBy", "fullName employeeId"); 

  if (!audit) throw new ApiError(404, "Audit not found");

  return res.json(new ApiResponse(200, audit, "Audit fetched"));
});

export const shareAuditByEmail = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { note } = req.body || {};

  // Load email settings configured by admin (global + optional per-department overrides)
  const emailSetting = await AuditEmailSetting.findOne().sort({ createdAt: -1 }).lean();
  if (!emailSetting) {
    throw new ApiError(400, "Audit email recipients are not configured. Please contact your administrator.");
  }

  const audit = await Audit.findById(id)
    .populate("line", "name")
    .populate("machine", "name")
    .populate("process", "name")
    .populate("unit", "name")
    .populate("department", "name")
    .populate("auditor", "fullName emailId")
    .populate({ path: "answers.question", select: "questionText questionType" })
    .populate("createdBy", "fullName employeeId");

  if (!audit) {
    throw new ApiError(404, "Audit not found");
  }

  // Determine recipients based on audit department (if configured)
  const departmentId = audit.department?._id?.toString?.() || audit.department?.toString?.();
  let primaryRecipients = emailSetting.to || "";
  let ccRecipients = emailSetting.cc || "";

  if (departmentId && Array.isArray(emailSetting.departmentRecipients) && emailSetting.departmentRecipients.length) {
    const deptConfig = emailSetting.departmentRecipients.find((cfg) => {
      const cfgDeptId = cfg.department?._id?.toString?.() || cfg.department?.toString?.();
      return cfgDeptId === departmentId;
    });

    if (deptConfig) {
      primaryRecipients = deptConfig.to || primaryRecipients;
      ccRecipients = deptConfig.cc || ccRecipients;
    }
  }

  if (!primaryRecipients || !primaryRecipients.trim()) {
    throw new ApiError(400, "Audit email recipients are not configured for this department. Please contact your administrator.");
  }

  const normalizedPrimaryRecipients = normalizeEmailList(primaryRecipients);
  const normalizedCcRecipients = normalizeEmailList(ccRecipients) || undefined;

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
  const departmentName = audit.department?.name || "N/A";
  const auditorName = audit.auditor?.fullName || "N/A";

  const totalQuestions = Array.isArray(audit.answers) ? audit.answers.length : 0;
  const yesNoAnswers = Array.isArray(audit.answers)
    ? audit.answers.filter((a) => {
        const qType = a.question?.questionType;
        // Treat undefined type as legacy yes/no question
        return !qType || qType === "yes_no" || qType === "image";
      })
    : [];
  const yesNoTotal = yesNoAnswers.length;
  const noCount = yesNoAnswers.filter((a) => a.answer === "No").length;
  const yesCount = yesNoAnswers.filter((a) => a.answer === "Yes").length;
  const otherCount = Math.max(0, totalQuestions - yesNoTotal);

  const lineRatingValue = audit.lineRating ?? null;
  const machineRatingValue = audit.machineRating ?? null;
  const processRatingValue = audit.processRating ?? null;
  const unitRatingValue = audit.unitRating ?? null;

  const subject = `Audit Result - ${dateStr} - ${lineName}`;

  const rowsHtml = (audit.answers || [])
    .map((ans, idx) => {
      const rawQuestionText = ans.question?.questionText || ans.questionText || `Q${idx + 1}`;
      const qType = ans.question?.questionType;
      let typeLabel = "";
      if (qType === "mcq") typeLabel = "MCQ";
      else if (qType === "dropdown") typeLabel = "Dropdown";
      else if (qType === "short_text") typeLabel = "Short description";
      else if (qType === "image") typeLabel = "Image + Yes/No";
      else if (qType === "yes_no") typeLabel = "Yes/No";
      const qText = typeLabel ? `${rawQuestionText} (${typeLabel})` : rawQuestionText;

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
        <p style="margin:0 0 4px 0;font-size:13px;"><strong>Department:</strong> ${departmentName}</p>
        <p style="margin:0 0 4px 0;font-size:13px;"><strong>Line:</strong> ${lineName}</p>
        <p style="margin:0 0 4px 0;font-size:13px;"><strong>Machine:</strong> ${machineName}</p>
        <p style="margin:0 0 4px 0;font-size:13px;"><strong>Process:</strong> ${processName}</p>
        <p style="margin:0 0 4px 0;font-size:13px;"><strong>Unit:</strong> ${unitName}</p>
        <p style="margin:0 0 4px 0;font-size:13px;"><strong>Shift:</strong> ${
          audit.shift || "N/A"
        }</p>
        <p style="margin:0 0 4px 0;font-size:13px;"><strong>Line Rating:</strong> ${
          lineRatingValue !== null ? `${lineRatingValue}/10` : "N/A"
        }</p>
        <p style="margin:0 0 4px 0;font-size:13px;"><strong>Machine Rating:</strong> ${
          machineRatingValue !== null ? `${machineRatingValue}/10` : "N/A"
        }</p>
        <p style="margin:0 0 4px 0;font-size:13px;"><strong>Process Rating:</strong> ${
          processRatingValue !== null ? `${processRatingValue}/10` : "N/A"
        }</p>
        <p style="margin:0 0 4px 0;font-size:13px;"><strong>Unit Rating:</strong> ${
          unitRatingValue !== null ? `${unitRatingValue}/10` : "N/A"
        }</p>
        <p style="margin:0 0 4px 0;font-size:13px;"><strong>Line Leader:</strong> ${
          audit.lineLeader || "N/A"
        }</p>
        <p style="margin:0 0 4px 0;font-size:13px;"><strong>Shift Incharge:</strong> ${
          audit.shiftIncharge || "N/A"
        }</p>
        <p style="margin:0;font-size:13px;"><strong>Auditor:</strong> ${auditorName}</p>
      </div>

      <div style="margin-bottom:16px;">
        <p style="margin:0 0 4px 0;font-size:13px;"><strong>Total Questions:</strong> ${totalQuestions}</p>
        <p style="margin:0 0 4px 0;font-size:13px;"><strong>Yes/No Questions:</strong> ${yesNoTotal}</p>
        <p style="margin:0 0 4px 0;font-size:13px;"><strong>YES (Yes/No only):</strong> ${yesCount}</p>
        <p style="margin:0 0 4px 0;font-size:13px;"><strong>NO (Yes/No only):</strong> ${noCount}</p>
        ${otherCount > 0 ? `<p style="margin:0 0 4px 0;font-size:13px;"><strong>Other Question Types:</strong> ${otherCount}</p>` : ""}
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

  // Respond immediately and send the email in the background
  res.json(new ApiResponse(200, null, "Audit share request received. Email will be sent shortly."));

  sendMail(normalizedPrimaryRecipients, subject, html, normalizedCcRecipients)
    .then(() => {
      logger.info(`Audit ${id} shared via email to ${normalizedPrimaryRecipients}${normalizedCcRecipients ? ` (cc: ${normalizedCcRecipients})` : ""} by ${req.user._id}`);
    })
    .catch((error) => {
      logger.error(`Failed to send audit ${id} email to ${normalizedPrimaryRecipients}${normalizedCcRecipients ? ` (cc: ${normalizedCcRecipients})` : ""}: ${error?.message || error}`);
    });
});

// ===== Audit Email Settings (Admin) =====

export const getAuditEmailSettings = asyncHandler(async (req, res) => {
  const setting = await AuditEmailSetting.findOne()
    .sort({ createdAt: -1 })
    .populate("departmentRecipients.department", "name")
    .lean();

  return res.json(new ApiResponse(200, setting, "Audit email settings fetched"));
});

export const updateAuditEmailSettings = asyncHandler(async (req, res) => {
  const { to, cc, departmentRecipients } = req.body || {};

  if (!to || !to.trim()) {
    throw new ApiError(400, "Primary recipient email(s) are required");
  }

  const normalizedTo = normalizeEmailList(to);
  const normalizedCc = normalizeEmailList(cc);

  let normalizedDepartmentRecipients = [];
  if (Array.isArray(departmentRecipients)) {
    normalizedDepartmentRecipients = departmentRecipients
      .filter((item) => item && item.department && item.to && String(item.to).trim())
      .map((item) => ({
        department: item.department,
        to: normalizeEmailList(item.to),
        cc: normalizeEmailList(item.cc),
      }));
  }

  const setting = await AuditEmailSetting.findOneAndUpdate(
    {},
    { to: normalizedTo, cc: normalizedCc, departmentRecipients: normalizedDepartmentRecipients },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  )
    .populate("departmentRecipients.department", "name")
    .lean();

  return res.json(new ApiResponse(200, setting, "Audit email settings updated"));
});

export const updateAudit = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { line, machine, process, unit, lineLeader, shift, shiftIncharge, answers, lineRating, machineRating, processRating, unitRating } = req.body;

  const audit = await Audit.findById(id);
  if (!audit) throw new ApiError(404, "Audit not found");

  if (req.user.role === "employee" && audit.auditor.toString() !== req.user._id) {
    throw new ApiError(403, "You are not authorized to update this audit");
  }

  const normalizeRating = (value, label) => {
    if (value === undefined || value === null || value === "") return undefined;
    const num = Number(value);
    if (!Number.isFinite(num) || num < 1 || num > 10) {
      throw new ApiError(400, `${label} must be a number between 1 and 10`);
    }
    return num;
  };

  const updatedLineRating = normalizeRating(lineRating, "Line rating");
  const updatedMachineRating = normalizeRating(machineRating, "Machine rating");
  const updatedProcessRating = normalizeRating(processRating, "Process rating");
  const updatedUnitRating = normalizeRating(unitRating, "Unit rating");

  if (line) audit.line = line;
  if (machine) audit.machine = machine;
  if (process) audit.process = process;
  if (unit) audit.unit = unit;
  if (lineLeader) audit.lineLeader = lineLeader;
  if (shift) {
    const allowedShifts = ["Shift 1", "Shift 2", "Shift 3"];
    if (!allowedShifts.includes(shift)) {
      throw new ApiError(400, "Shift must be one of Shift 1, Shift 2, or Shift 3");
    }
    audit.shift = shift;
  }
  if (shiftIncharge) audit.shiftIncharge = shiftIncharge;
  if (updatedLineRating !== undefined) audit.lineRating = updatedLineRating;
  if (updatedMachineRating !== undefined) audit.machineRating = updatedMachineRating;
  if (updatedProcessRating !== undefined) audit.processRating = updatedProcessRating;
  if (updatedUnitRating !== undefined) audit.unitRating = updatedUnitRating;

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
