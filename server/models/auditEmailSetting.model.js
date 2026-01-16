import { pool } from "../db/connectDB.js";
import Department from "./department.model.js";

class AuditEmailSetting {
  constructor(data) {
    this._id = data.id; // Compatibility
    this.to = data.primary_recipients;
    this.cc = data.cc_recipients;
    // Parse JSON if needed (though mysql2 usually handles it)
    this.departmentRecipients = typeof data.department_recipients === 'string'
      ? JSON.parse(data.department_recipients || "[]")
      : (data.department_recipients || []);

    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  // --- Static Methods ---

  static findOne(query) {
    return new SettingsQueryBuilder();
  }

  static findOneAndUpdate(query, update, options) {
    // This one is typically awaited directly in the controller code shown:
    // await AuditEmailSetting.findOneAndUpdate(...)
    return new SettingsUpdateBuilder(query, update, options);
  }
}

class SettingsQueryBuilder {
  constructor() {
    this.populatedFields = [];
  }

  sort(arg) { return this; } // No-op, we always get latest
  lean() { return this; }

  populate(path, select) {
    this.populatedFields.push({ path, select });
    return this;
  }

  async exec() {
    const [rows] = await pool.query("SELECT TOP 1 * FROM audit_email_settings ORDER BY id DESC");
    if (rows.length === 0) return null;

    const doc = new AuditEmailSetting(rows[0]);

    // Manual Populate
    // departmentRecipients.department -> MongoDB Department
    // The structure is: departmentRecipients: [ { department: "ID", to: "", cc: "" } ]
    // We need to fetch Deparments and replace IDs with objects { _id: ID, name: "Name" }

    if (doc.departmentRecipients && doc.departmentRecipients.length > 0) {
      const deptIds = doc.departmentRecipients.map(dr => dr.department).filter(Boolean);
      if (deptIds.length > 0) {
        const depts = await Department.find({ _id: { $in: deptIds } }).select("name").lean();

        doc.departmentRecipients.forEach(dr => {
          const match = depts.find(d => d._id.toString() === dr.department.toString());
          if (match) {
            dr.department = match;
          }
        });
      }
    }

    return doc;
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }
}

class SettingsUpdateBuilder {
  constructor(query, update, options) {
    this.query = query;
    this.update = update;
    this.options = options;
    this.populated = false;
  }

  populate(path, select) {
    this.populated = true;
    return this;
  }

  lean() { return this; }

  async exec() {
    // Perform Update
    const [rows] = await pool.query("SELECT TOP 1 * FROM audit_email_settings ORDER BY id DESC");
    let recordId = rows.length > 0 ? rows[0].id : null;

    const { to, cc, departmentRecipients } = this.update;

    const primaryRecipients = to;
    const ccRecipients = cc;
    // departmentRecipients here comes from the controller as array of objects
    // stored as JSON
    const deptRecipientsJson = JSON.stringify(departmentRecipients || []);

    if (recordId) {
      const sql = `
                UPDATE audit_email_settings 
                SET primary_recipients = ?, cc_recipients = ?, department_recipients = ?
                WHERE id = ?
            `;
      await pool.query(sql, [primaryRecipients, ccRecipients, deptRecipientsJson, recordId]);
    } else {
      const sql = `
                INSERT INTO audit_email_settings (primary_recipients, cc_recipients, department_recipients)
                VALUES (?, ?, ?)
            `;
      const [result] = await pool.query(sql, [primaryRecipients, ccRecipients, deptRecipientsJson]);
      recordId = result.insertId;
    }

    // Return updated doc (re-using QueryBuilder logic for populating)
    const qb = new SettingsQueryBuilder();
    if (this.populated) {
      qb.populate("departmentRecipients.department", "name");
    }
    return await qb.exec();
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }
}

export default AuditEmailSetting;
