import { pool } from "../db/connectDB.js";

class Process {
  constructor(data) {
    this._id = data.id; // Compatibility
    this.name = data.name;
    this.description = data.description;
    this.isActive = !!data.isActive;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  // --- Static Methods ---

  static async create(data) {
    const name = data.name;
    const description = data.description;
    const isActive = data.isActive !== undefined ? data.isActive : true;

    const sql = `
        INSERT INTO processes (name, description, isActive)
        VALUES (?, ?, ?)
    `;
    const [result] = await pool.query(sql, [name, description, isActive]);

    return new Process({
      id: result.insertId,
      ...data
    });
  }

  static async find(query = {}) {
    const { sql, params } = Process._buildQuery(query);
    const [rows] = await pool.query(sql, params);
    return rows.map(r => new Process(r));
  }

  static async findById(id) {
    if (!id) return null;
    const [rows] = await pool.query("SELECT * FROM processes WHERE id = ?", [id]);
    if (rows.length === 0) return null;
    return new Process(rows[0]);
  }

  static async findOne(query) {
    const { sql, params } = Process._buildQuery(query, { limit: 1 });
    const [rows] = await pool.query(sql, params);
    if (rows.length === 0) return null;
    return new Process(rows[0]);
  }

  static async findByIdAndUpdate(id, update, options) {
    const setClause = [];
    const values = [];

    if (update.name !== undefined) { setClause.push("name = ?"); values.push(update.name); }
    if (update.description !== undefined) { setClause.push("description = ?"); values.push(update.description); }
    if (update.isActive !== undefined) { setClause.push("isActive = ?"); values.push(update.isActive); }

    if (setClause.length === 0) return Process.findById(id);

    values.push(id);
    await pool.query(`UPDATE processes SET ${setClause.join(', ')} WHERE id = ?`, values);

    return Process.findById(id);
  }

  static async findByIdAndDelete(id) {
    await pool.query("DELETE FROM processes WHERE id = ?", [id]);
    return true;
  }

  static async countDocuments(query) {
    const { sql, params } = Process._buildQuery(query, { isCount: true });
    const [rows] = await pool.query(sql, params);
    return rows[0].count;
  }

  // --- Instance Methods ---

  async save() {
    const sql = `
        UPDATE processes 
        SET name = ?, description = ?, isActive = ?
        WHERE id = ?
      `;
    await pool.query(sql, [this.name, this.description, this.isActive, this._id]);
    return this;
  }

  // --- Helpers ---

  static _buildQuery(query, options = {}) {
    let where = [];
    let params = [];

    if (query.name) {
      if (query.name instanceof RegExp) {
        // Regex support wrapper? 
        // Assume mostly literal or controlled regex.
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

    let sql = options.isCount ? "SELECT COUNT(*) as count FROM processes" : "SELECT * FROM processes";
    if (where.length > 0) {
      sql += " WHERE " + where.join(" AND ");
    }

    if (!options.isCount) {
      sql += " ORDER BY name ASC";
    }

    if (options.limit) {
      sql += ` OFFSET 0 ROWS FETCH NEXT ${options.limit} ROWS ONLY`;
    }

    return { sql, params };
  }
}

export default Process;
