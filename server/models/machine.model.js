import { pool } from "../db/connectDB.js";
import Department from "./department.model.js";
import Line from "./line.model.js";

class Machine {
  constructor(data) {
    this._id = data.id; // Compatibility
    this.name = data.name;
    this.department = data.department_id; // Store ID
    this.line = data.line_id; // Store ID
    this.description = data.description;
    this.isActive = !!data.isActive;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  // --- Static Methods ---

  static async create(data) {
    const name = data.name;
    const department = data.department ? (typeof data.department === 'object' ? data.department.id : data.department) : null;
    const line = data.line ? (typeof data.line === 'object' ? data.line.id : data.line) : null;
    const description = data.description;
    const isActive = data.isActive !== undefined ? data.isActive : true;

    const sql = `
        INSERT INTO machines (name, department_id, line_id, description, isActive)
        VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await pool.query(sql, [name, department, line, description, isActive]);

    return new Machine({
      id: result.insertId,
      ...data,
      department_id: department,
      line_id: line
    });
  }

  static async find(query = {}) {
    const { sql, params } = Machine._buildQuery(query);
    const [rows] = await pool.query(sql, params);
    return rows.map(r => new Machine(r));
  }

  static async findById(id) {
    if (!id) return null;
    const [rows] = await pool.query("SELECT * FROM machines WHERE id = ?", [id]);
    if (rows.length === 0) return null;
    return new Machine(rows[0]);
  }

  static async findOne(query) {
    const { sql, params } = Machine._buildQuery(query, { limit: 1 });
    const [rows] = await pool.query(sql, params);
    if (rows.length === 0) return null;
    return new Machine(rows[0]);
  }

  static async findByIdAndUpdate(id, update, options) {
    const setClause = [];
    const values = [];

    if (update.name !== undefined) { setClause.push("name = ?"); values.push(update.name); }
    if (update.department !== undefined) {
      setClause.push("department_id = ?");
      values.push(update.department ? (typeof update.department === 'object' ? update.department.id : update.department) : null);
    }
    if (update.line !== undefined) {
      setClause.push("line_id = ?");
      values.push(update.line ? (typeof update.line === 'object' ? update.line.id : update.line) : null);
    }
    if (update.description !== undefined) { setClause.push("description = ?"); values.push(update.description); }
    if (update.isActive !== undefined) { setClause.push("isActive = ?"); values.push(update.isActive); }

    if (setClause.length === 0) return Machine.findById(id);

    values.push(id);
    await pool.query(`UPDATE machines SET ${setClause.join(', ')} WHERE id = ?`, values);

    return Machine.findById(id);
  }

  static async findByIdAndDelete(id) {
    await pool.query("DELETE FROM machines WHERE id = ?", [id]);
    return true;
  }

  static async countDocuments(query) {
    const { sql, params } = Machine._buildQuery(query, { isCount: true });
    const [rows] = await pool.query(sql, params);
    return rows[0].count;
  }

  // --- Instance Methods ---

  async save() {
    const sql = `
        UPDATE machines 
        SET name = ?, department_id = ?, line_id = ?, description = ?, isActive = ?
        WHERE id = ?
      `;
    const deptId = this.department ? (typeof this.department === 'object' ? this.department.id : this.department) : null;
    const lineId = this.line ? (typeof this.line === 'object' ? this.line.id : this.line) : null;
    await pool.query(sql, [this.name, deptId, lineId, this.description, this.isActive, this._id]);
    return this;
  }

  async populate(path, select) {
    if (path === 'department' && this.department) {
      try {
        const dept = await Department.findById(this.department);
        if (dept) this.department = dept;
      } catch (e) { }
    } else if (path === 'line' && this.line) {
      try {
        const line = await Line.findById(this.line);
        if (line) this.line = line;
      } catch (e) { }
    }
    return this;
  }

  // --- Helpers ---

  static _buildQuery(query, options = {}) {
    let where = [];
    let params = [];

    if (query.name) {
      if (query.name instanceof RegExp) {
        // Regex support wrapper? 
        // Basic support for common use cases or assume exact.
      } else {
        where.push("name = ?"); params.push(query.name);
      }
    }
    if (query._id) {
      if (typeof query._id === 'object' && query._id.$in) {
        const ids = query._id.$in;
        if (ids.length > 0) {
          where.push(`id IN (${ids.map(() => '?').join(',')})`);
          params.push(...ids);
        } else {
          where.push("1=0");
        }
      } else {
        where.push("id = ?");
        params.push(query._id);
      }
    }
    if (query.isActive !== undefined) { where.push("isActive = ?"); params.push(query.isActive); }

    if (query.department !== undefined) {
      if (query.department === null) {
        where.push("department_id IS NULL");
      } else {
        where.push("department_id = ?");
        params.push(query.department instanceof Department ? query.department._id : query.department);
      }
    }

    if (query.line !== undefined) {
      if (query.line === null) {
        where.push("line_id IS NULL");
      } else {
        where.push("line_id = ?");
        params.push(query.line instanceof Line ? query.line._id : query.line);
      }
    }

    // Handle simple $not regex logic if possible or ignore
    // Controller logic might need adaptation.

    let sql = options.isCount ? "SELECT COUNT(*) as count FROM machines" : "SELECT * FROM machines";
    if (where.length > 0) {
      sql += " WHERE " + where.join(" AND ");
    }

    if (!options.isCount) {
      sql += " ORDER BY name ASC";
    }

    if (options.limit) {
      sql += " LIMIT " + options.limit;
    }

    return { sql, params };
  }
}

export default Machine;
