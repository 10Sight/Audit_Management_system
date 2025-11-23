import Audit from "../models/audit.model.js";
import Employee from "../models/auth.model.js";
import sendMail from "../utils/mail.util.js";
import logger from "../logger/winston.logger.js";
import EVN from "../config/env.config.js";

const REMINDER_EMAIL_LOGO_URL = EVN.CLIENT_URL
  ? `${EVN.CLIENT_URL.replace(/\/+$/, "")}/motherson+marelli.png`
  : null;

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

          const logoImgHtml = REMINDER_EMAIL_LOGO_URL
            ? '<img src="' +
              REMINDER_EMAIL_LOGO_URL +
              '" alt="Company Logo" style="max-width:200px;height:auto;margin-bottom:12px;" />'
            : "";

          const html = `
            <div style="background-color:#f3f4f6;padding:24px 16px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827;">
              <div style="max-width:640px;margin:0 auto;background-color:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;box-shadow:0 10px 25px rgba(15,23,42,0.08);">
                <div style="padding:20px 24px 12px 24px;text-align:center;border-bottom:1px solid #e5e7eb;">
                  ${logoImgHtml}
                  <h2 style="margin:0;font-size:20px;line-height:1.4;color:#111827;">Audit target reminder</h2>
                  <p style="margin:6px 0 0 0;font-size:13px;color:#4b5563;">Dear ${emp.fullName},</p>
                </div>

                <div style="padding:18px 24px 12px 24px;">
                  <p style="margin:0 0 10px 0;font-size:13px;color:#374151;">
                    This is a friendly reminder about your current audit target window:
                  </p>
                  <table style="width:100%;border-collapse:collapse;font-size:13px;color:#111827;">
                    <tbody>
                      <tr>
                        <td style="padding:4px 8px;width:45%;color:#6b7280;">Target audits</td>
                        <td style="padding:4px 8px;font-weight:500;">${total}</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 8px;color:#6b7280;">Completed in window</td>
                        <td style="padding:4px 8px;font-weight:500;">${completed}</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 8px;color:#6b7280;">Pending</td>
                        <td style="padding:4px 8px;font-weight:500;color:#dc2626;">${pending}</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 8px;color:#6b7280;">Target period</td>
                        <td style="padding:4px 8px;font-weight:500;">${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div style="padding:0 24px 20px 24px;">
                  <p style="margin:8px 0 6px 0;font-size:13px;color:#374151;">
                    Please complete the remaining audits within the target period.
                  </p>
                  <p style="margin:0;font-size:13px;color:#374151;">
                    Regards,<br />
                    <span style="font-weight:600;">10Sight Technologies</span>
                  </p>
                </div>
              </div>

              <p style="margin-top:12px;font-size:11px;color:#9ca3af;text-align:center;">
                Developed by 10Sight Technologies.
              </p>
            </div>
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
