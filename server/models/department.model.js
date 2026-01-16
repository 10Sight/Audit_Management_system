import { pool } from "../db/connectDB.js";
import Unit from "./unit.model.js";

class Department {
  constructor(data) {
    this._id = data.id; // Compatibility
    this.name = data.name;
    this.description = data.description;
    this.isActive = !!data.isActive;
    this.unit = data.unit; // Stored as string format of ObjectId
    this.createdBy = data.created_by_id;
    this.employeeCount = data.employeeCount || 0;

    this.staffByShift = typeof data.staffByShift === 'string'
      ? JSON.parse(data.staffByShift || "[]")
      : (data.staffByShift || []);

    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  // --- Static Methods ---

  static async create(data) {
    const name = data.name;
    const description = data.description;
    const isActive = data.isActive !== undefined ? data.isActive : true;
    const unit = data.unit ? data.unit.toString() : null;
    const createdBy = data.createdBy;
    const staffByShift = JSON.stringify(data.staffByShift || []);

    const sql = `
        INSERT INTO departments (name, description, isActive, unit, created_by_id, staffByShift)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.query(sql, [name, description, isActive, unit, createdBy, staffByShift]);

    return new Department({
      id: result.insertId,
      ...data,
      staffByShift: data.staffByShift || []
    });
  }

  static async find(query = {}) {
    const { sql, params } = Department._buildQuery(query);
    const [rows] = await pool.query(sql, params);
    return rows.map(r => new Department(r));
  }

  static async findById(id) {
    if (!id) return null;
    const [rows] = await pool.query("SELECT * FROM departments WHERE id = ?", [id]);
    if (rows.length === 0) return null;
    return new Department(rows[0]);
  }

  static async findOne(query) {
    // Basic support for findOne({ name, unit }) used in checks
    const { sql, params } = Department._buildQuery(query, { limit: 1 });
    const [rows] = await pool.query(sql, params);
    if (rows.length === 0) return null;
    return new Department(rows[0]);
  }

  static async findByIdAndUpdate(id, update, options) {
    const setClause = [];
    const values = [];

    if (update.name !== undefined) { setClause.push("name = ?"); values.push(update.name); }
    if (update.description !== undefined) { setClause.push("description = ?"); values.push(update.description); }
    if (update.isActive !== undefined) { setClause.push("isActive = ?"); values.push(update.isActive); }
    if (update.unit !== undefined) { setClause.push("unit = ?"); values.push(update.unit ? update.unit.toString() : null); }
    if (update.staffByShift !== undefined) { setClause.push("staffByShift = ?"); values.push(JSON.stringify(update.staffByShift)); }

    // Manual increment handling? usually handled logically in controller, 
    // but if $inc is passed (Mongoose style), we'd need to handle it.
    // For now, assuming controller passes full values or we handle specific fields.
    // NOTE: incrementEmployeeCount logic below uses save().

    if (setClause.length === 0) return Department.findById(id);

    values.push(id);
    await pool.query(`UPDATE departments SET ${setClause.join(', ')} WHERE id = ?`, values);

    return Department.findById(id);
  }

  static async countDocuments(query) {
    const { sql, params } = Department._buildQuery(query, { isCount: true });
    const [rows] = await pool.query(sql, params);
    return rows[0].count;
  }

  static getActiveDepartments() {
    // Returns a Promise<Department[]> directly
    // Sort logic handled in _buildQuery? basic name sort here.
    return pool.query("SELECT * FROM departments WHERE isActive = 1 ORDER BY name ASC")
      .then(([rows]) => rows.map(r => new Department(r)));
  }

  // --- Instance Methods ---

  async save() {
    // Used for updating employeeCount via method
    // We only support updating known fields here essentially
    const sql = `
        UPDATE departments 
        SET name = ?, description = ?, isActive = ?, unit = ?, employeeCount = ?, staffByShift = ?
        WHERE id = ?
      `;
    const staffByShiftJson = JSON.stringify(this.staffByShift);
    await pool.query(sql, [this.name, this.description, this.isActive, this.unit, this.employeeCount, staffByShiftJson, this._id]);
    return this;
  }

  async incrementEmployeeCount() {
    this.employeeCount += 1;
    return this.save();
  }

  async decrementEmployeeCount() {
    if (this.employeeCount > 0) {
      this.employeeCount -= 1;
    }
    return this.save();
  }

  // Mimic Mongoose populate
  async populate(path, select) {
    if (path === 'unit') {
      // Unit is MongoDB model
      // Dynamic import to avoid circular dependency if any? 
      // We imported Unit at top.
      if (this.unit) {
        try {
          const unitDoc = await Unit.findById(this.unit);
          this.unit = unitDoc;
        } catch (e) {
          // ignore
        }
      }
    } else if (path === 'createdBy') {
      // Employee is SQL
      // We need Employee model. Circular dependency risk?
      // Default import at top?
      // Let's use lazy import or direct SQL if easier.
      // Direct SQL is safer for circular deps.
      if (this.createdBy) {
        const [rows] = await pool.query("SELECT * FROM employees WHERE id = ?", [this.createdBy]);
        if (rows.length > 0) {
          const emp = rows[0];
          // If select provided, filter fields? 
          // Naive support: just attach object
          // If we strictly need 'fullName employeeId', we can filter.
          this.createdBy = emp;
        }
      }
    }
    return this;
  }

  // --- Helpers ---

  static _buildQuery(query, options = {}) {
    let where = [];
    let params = [];

    // Mongoose-like query parsing
    // Support: name, unit, isActive

    if (query.name) {
      if (query.name instanceof RegExp) {
        where.push("name REGEXP ?");
        params.push(query.name.source);
      } else {
        where.push("name = ?");
        params.push(query.name);
      }
    }
    if (query.unit) {
      // Ensure string for SQL comparison if DB column is int but we query with string '1' (MySQL handles it)
      // OR handling potential object if something slipped through
      let uVal = query.unit;
      if (typeof uVal === 'object' && uVal.toString) uVal = uVal.toString();
      where.push("unit = ?");
      params.push(uVal);
    }
    if (query.isActive !== undefined) { where.push("isActive = ?"); params.push(query.isActive); }

    if (query._id) {
      if (typeof query._id === 'object') {
        if (query._id.$in && Array.isArray(query._id.$in)) {
          const ids = query._id.$in;
          if (ids.length > 0) {
            where.push(`id IN (${ids.map(() => '?').join(',')})`);
            params.push(...ids);
          } else {
            where.push("1=0");
          }
        } else if (query._id.$ne) {
          where.push("id != ?");
          params.push(query._id.$ne);
        }
      } else {
        where.push("id = ?");
        params.push(query._id);
      }
    }

    let sql = options.isCount ? "SELECT COUNT(*) as count FROM departments" : "SELECT * FROM departments";
    if (where.length > 0) {
      sql += " WHERE " + where.join(" AND ");
    }

    if (!options.isCount) {
      // Default sorts?
      sql += " ORDER BY name ASC";
    }

    if (options.limit) {
      sql += " LIMIT " + options.limit;
    }

    return { sql, params };
  }
}

export default Department;
