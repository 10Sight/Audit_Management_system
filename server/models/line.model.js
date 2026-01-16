import { pool } from "../db/connectDB.js";
import Department from "./department.model.js";

class Line {
  constructor(data) {
    this._id = data.id; // Compatibility
    this.name = data.name;
    this.department = data.department_id; // Store ID
    this.order = data.order || 0; // "order" from DB
    this.description = data.description;
    this.isActive = !!data.isActive;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  // --- Static Methods ---

  static async create(data) {
    const name = data.name;
    const department = data.department ? (typeof data.department === 'object' ? data.department.id : data.department) : null;
    const order = data.order || 0;
    const description = data.description;
    const isActive = data.isActive !== undefined ? data.isActive : true;

    // Use quotes for `order` or map from schema if changed to line_order
    // Schema used `order` with backticks.
    const sql = `
        INSERT INTO \`lines\` (name, department_id, \`order\`, description, isActive)
        VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await pool.query(sql, [name, department, order, description, isActive]);

    return new Line({
      id: result.insertId,
      ...data,
      department_id: department
    });
  }

  static async find(query = {}) {
    const { sql, params } = Line._buildQuery(query);
    const [rows] = await pool.query(sql, params);
    return rows.map(r => new Line(r));
  }

  static async findById(id) {
    if (!id) return null;
    const [rows] = await pool.query("SELECT * FROM `lines` WHERE id = ?", [id]);
    if (rows.length === 0) return null;
    return new Line(rows[0]);
  }

  static async findOne(query) {
    const { sql, params } = Line._buildQuery(query, { limit: 1 });
    const [rows] = await pool.query(sql, params);
    if (rows.length === 0) return null;
    return new Line(rows[0]);
  }

  static async findByIdAndUpdate(id, update, options) {
    const setClause = [];
    const values = [];

    if (update.name !== undefined) { setClause.push("name = ?"); values.push(update.name); }
    if (update.department !== undefined) {
      setClause.push("department_id = ?");
      values.push(update.department ? (typeof update.department === 'object' ? update.department.id : update.department) : null);
    }
    if (update.order !== undefined) { setClause.push("\`order\` = ?"); values.push(update.order); }
    if (update.description !== undefined) { setClause.push("description = ?"); values.push(update.description); }
    if (update.isActive !== undefined) { setClause.push("isActive = ?"); values.push(update.isActive); }

    if (setClause.length === 0) return Line.findById(id);

    values.push(id);
    await pool.query(`UPDATE \`lines\` SET ${setClause.join(', ')} WHERE id = ?`, values);

    return Line.findById(id);
  }

  static async findByIdAndDelete(id) {
    await pool.query("DELETE FROM \`lines\` WHERE id = ?", [id]);
    return true;
  }

  static async countDocuments(query) {
    const { sql, params } = Line._buildQuery(query, { isCount: true });
    const [rows] = await pool.query(sql, params);
    return rows[0].count;
  }

  // --- Instance Methods ---

  async save() {
    const sql = `
        UPDATE \`lines\` 
        SET name = ?, department_id = ?, \`order\` = ?, description = ?, isActive = ?
        WHERE id = ?
      `;
    const deptId = this.department ? (typeof this.department === 'object' ? this.department.id : this.department) : null;
    await pool.query(sql, [this.name, deptId, this.order, this.description, this.isActive, this._id]);
    return this;
  }

  async populate(path, select) {
    if (path === 'department' && this.department) {
      // If department is already an ID (int)
      try {
        // Department.findById uses SQL
        const dept = await Department.findById(this.department);
        // Select? Naive implementation
        if (dept) this.department = dept;
      } catch (e) { }
    }
    return this;
  }

  // --- Helpers ---

  static _buildQuery(query, options = {}) {
    let where = [];
    let params = [];

    if (query.name) { where.push("name = ?"); params.push(query.name); }
    if (query.department !== undefined) {
      if (query.department === null) {
        where.push("department_id IS NULL");
      } else {
        where.push("department_id = ?");
        params.push(query.department instanceof Department ? query.department._id : query.department);
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

    // Handle regex name search (used in controller often)
    if (query.name && query.name instanceof RegExp) {
      // Not supported directly in params default above.
      // Would need custom handling. Assuming simple string for now or strict check.
      // If we pass RegExp object to DB it fails.
      // Mongoose shim needed in Controller or here?
      // Actually, standard pattern is to use builder if complex.
      // For simplicity: query.name is assumed exact unless special logic exists.
    }

    let sql = options.isCount ? "SELECT COUNT(*) as count FROM \`lines\`" : "SELECT * FROM \`lines\`";
    if (where.length > 0) {
      sql += " WHERE " + where.join(" AND ");
    }

    if (!options.isCount) {
      sql += " ORDER BY \`order\` ASC, name ASC"; // Default sort
    }

    if (options.limit) {
      sql += ` OFFSET 0 ROWS FETCH NEXT ${options.limit} ROWS ONLY`;
    }

    return { sql, params };
  }
}

export default Line;
