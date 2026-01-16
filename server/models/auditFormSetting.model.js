import { pool } from "../db/connectDB.js";

class AuditFormSetting {
  constructor(data) {
    this._id = data.id; // Compatibility
    this.unit = data.unit;
    this.department = data.department;
    this.formTitle = data.form_title;

    // Parse JSON
    this.lineField = typeof data.line_field === 'string'
      ? JSON.parse(data.line_field || "{}")
      : (data.line_field || { label: "Line", placeholder: "Select Line", enabled: true });

    this.machineField = typeof data.machine_field === 'string'
      ? JSON.parse(data.machine_field || "{}")
      : (data.machine_field || { label: "Machine", placeholder: "Select Machine", enabled: true });

    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  // --- Static Methods ---

  static findOne(query) {
    return new FormSettingsQueryBuilder(query);
  }

  static async findOneAndUpdate(filter, update, options) {
    // 1. Check if exists based on filter
    const department = filter.department;

    let sql = "SELECT * FROM audit_form_settings WHERE department = ? ORDER BY id DESC LIMIT 1";
    let [rows] = await pool.query(sql, [department]);

    let recordId = rows.length > 0 ? rows[0].id : null;

    const { formTitle, unit, lineField, machineField } = update;

    const lineFieldJson = JSON.stringify(lineField || {});
    const machineFieldJson = JSON.stringify(machineField || {});

    if (recordId) {
      // Update
      const updateSql = `
            UPDATE audit_form_settings 
            SET form_title = ?, unit = ?, line_field = ?, machine_field = ?
            WHERE id = ?
        `;
      await pool.query(updateSql, [formTitle, unit, lineFieldJson, machineFieldJson, recordId]);
    } else {
      // Insert
      const insertSql = `
            INSERT INTO audit_form_settings (department, unit, form_title, line_field, machine_field)
            VALUES (?, ?, ?, ?, ?)
        `;
      await pool.query(insertSql, [department, unit, formTitle, lineFieldJson, machineFieldJson]);
    }

    // Return updated
    return AuditFormSetting.findOne({ department }).exec();
  }
}

class FormSettingsQueryBuilder {
  constructor(query) {
    this.conditions = query || {};
    this.isLean = false;
  }

  // Chainable methods
  sort() { return this; } // No-op, we always get latest by ID DESC
  lean() {
    this.isLean = true;
    return this;
  }

  async exec() {
    let sql = "SELECT * FROM audit_form_settings";
    let params = [];
    let where = [];

    if (this.conditions && this.conditions.department) {
      where.push("department = ?");
      params.push(this.conditions.department.toString());
    }

    if (where.length > 0) {
      sql += " WHERE " + where.join(" AND ");
    }

    // Always sort by latest like Mongoose code did
    sql += " ORDER BY id DESC LIMIT 1";

    const [rows] = await pool.query(sql, params);
    if (rows.length === 0) return null;

    const row = rows[0];
    if (this.isLean) {
      // Return POJO with _id for compatibility
      return {
        ...row,
        _id: row.id,
        lineField: typeof row.line_field === 'string' ? JSON.parse(row.line_field || "{}") : row.line_field,
        machineField: typeof row.machine_field === 'string' ? JSON.parse(row.machine_field || "{}") : row.machine_field,
        formTitle: row.form_title
      };
    }

    return new AuditFormSetting(row);
  }

  // Resolvable
  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }
}

export default AuditFormSetting;
