import Audit from "../models/audit.model.js";
import Employee from "../models/auth.model.js";
import sendMail from "../utils/mail.util.js";
import logger from "../logger/winston.logger.js";

// Setup a simple in-process reminder job that checks frequently and
// sends exactly one email per day within the target window, at the
// time configured by the admin (HH:mm on the employee's targetAudit).
// In production, a dedicated scheduler (cron/worker) is recommended.
export const setupTargetAuditReminders = (app) => {
  const io = app.get("io");
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const CHECK_INTERVAL_MS = 10 * 1000; // check every 10 seconds for tighter timing
  const SAFETY_OFFSET_MS = 15 * 1000; // don't send earlier than 15s after configured time

  const runOnce = async () => {
    try {
      const now = new Date();
      // Start of "today" in server local time (avoids UTC offset issues)
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Employees with an active target whose window includes "now",
      // who have a reminderTime configured, and who have not yet
      // received a reminder today.
      const employees = await Employee.find({
        role: "employee",
        "targetAudit.total": { $gt: 0 },
        "targetAudit.startDate": { $lte: now },
        "targetAudit.endDate": { $gte: now },
        "targetAudit.reminderTime": { $exists: true, $ne: "" },
        $or: [
          { "targetAudit.lastReminderDate": { $exists: false } },
          { "targetAudit.lastReminderDate": { $lt: startOfDay } },
        ],
      }).select("fullName emailId targetAudit");

      for (const emp of employees) {
        const { total, startDate, endDate, reminderTime } = emp.targetAudit || {};
        if (!total || !startDate || !endDate || !reminderTime) continue;

        const [h, m] = reminderTime.split(":").map((v) => parseInt(v, 10));
        if (Number.isNaN(h) || Number.isNaN(m)) continue;

        // Today's target reminder Date object (in server local time)
        const targetToday = new Date(startOfDay.getTime());
        targetToday.setHours(h, m, 0, 0);

        // Don't send before the configured time. We also add a small safety
        // buffer so the reminder never appears slightly "early" compared to
        // clocks that may be a few seconds behind the server time.
        if (now.getTime() < targetToday.getTime() + SAFETY_OFFSET_MS) {
          continue;
        }

        const completed = await Audit.countDocuments({
          auditor: emp._id,
          date: { $gte: startDate, $lte: endDate },
        });

        const pending = Math.max(0, total - completed);
        if (pending <= 0) continue;

        const message = `${emp.fullName}, you have ${pending} pending audits out of a target of ${total}.`;

        // Socket notification (broadcast). Clients can show as toast.
        if (io) {
          io.emit("audit-notification", {
            type: "target-audit-reminder",
            employeeId: emp._id,
            message,
            timestamp: new Date().toISOString(),
          });
        }

        // Email reminder (if email configured)
        if (emp.emailId) {
          const subject = "Audit Target Reminder";
          const html = `
            <p>Dear ${emp.fullName},</p>
            <p>This is a friendly reminder about your audit target:</p>
            <ul>
              <li>Target audits: <strong>${total}</strong></li>
              <li>Completed in window: <strong>${completed}</strong></li>
              <li>Pending: <strong>${pending}</strong></li>
              <li>Period: <strong>${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}</strong></li>
            </ul>
            <p>Please complete the remaining audits within the target period.</p>
            <p>Regards,<br/>Audit Management System</p>
          `;

          try {
            await sendMail(emp.emailId, subject, html);
            logger.info(`Target audit reminder email sent to ${emp.emailId}`);
          } catch (err) {
            logger.error(`Failed to send target audit reminder to ${emp.emailId}: ${err?.message || err}`);
          }
        }

        // Mark that we've sent a reminder for this employee for today so we don't
        // send duplicates if the job runs again later in the same day.
        try {
          await Employee.updateOne(
            { _id: emp._id },
            { "targetAudit.lastReminderDate": now }
          );
        } catch (err) {
          logger.error(`Failed to update lastReminderDate for ${emp._id}: ${err?.message || err}`);
        }
      }
    } catch (err) {
      logger.error(`Target audit reminder job failed: ${err?.message || err}`);
    }
  };

  // Run once at startup and then at the configured interval.
  runOnce();
  setInterval(runOnce, CHECK_INTERVAL_MS);
};
