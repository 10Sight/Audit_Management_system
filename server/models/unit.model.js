import { pool } from "../db/connectDB.js";

class Unit {
  constructor(data) {
    this._id = data.id; // Compatibility
    this.name = data.name;
    this.description = data.description;
    this.order = data.order;
    this.isActive = !!data.isActive;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  // --- Static Methods ---

  static async create(data) {
    const name = data.name;
    const description = data.description;
    const order = data.order !== undefined ? data.order : 0;
    const isActive = data.isActive !== undefined ? data.isActive : true;

    const sql = `
        INSERT INTO units (name, description, \`order\`, isActive)
        VALUES (?, ?, ?, ?)
    `;
    const [result] = await pool.query(sql, [name, description, order, isActive]);

    return new Unit({
      id: result.insertId,
      ...data,
      order,
      isActive
    });
  }

  static async find(query = {}) {
    const { sql, params } = Unit._buildQuery(query);
    const [rows] = await pool.query(sql, params);
    return rows.map(r => new Unit(r));
  }

  static async findById(id) {
    if (!id) return null;
    const [rows] = await pool.query("SELECT * FROM units WHERE id = ?", [id]);
    if (rows.length === 0) return null;
    return new Unit(rows[0]);
  }

  static async findOne(query) {
    const { sql, params } = Unit._buildQuery(query, { limit: 1 });
    const [rows] = await pool.query(sql, params);
    if (rows.length === 0) return null;
    return new Unit(rows[0]);
  }

  static async findByIdAndUpdate(id, update, options) {
    const setClause = [];
    const values = [];

    if (update.name !== undefined) { setClause.push("name = ?"); values.push(update.name); }
    if (update.description !== undefined) { setClause.push("description = ?"); values.push(update.description); }
    if (update.order !== undefined) { setClause.push("`order` = ?"); values.push(update.order); }
    if (update.isActive !== undefined) { setClause.push("isActive = ?"); values.push(update.isActive); }

    if (setClause.length === 0) return Unit.findById(id);

    values.push(id);
    await pool.query(`UPDATE units SET ${setClause.join(', ')} WHERE id = ?`, values);

    return Unit.findById(id);
  }

  static async findByIdAndDelete(id) {
    await pool.query("DELETE FROM units WHERE id = ?", [id]);
    return true;
  }

  static async countDocuments(query) {
    const { sql, params } = Unit._buildQuery(query, { isCount: true });
    const [rows] = await pool.query(sql, params);
    return rows[0].count;
  }

  // --- Instance Methods ---

  async save() {
    const sql = `
        UPDATE units 
        SET name = ?, description = ?, \`order\` = ?, isActive = ?
        WHERE id = ?
      `;
    await pool.query(sql, [this.name, this.description, this.order, this.isActive, this._id]);
    return this;
  }

  // --- Helpers ---

  static _buildQuery(query, options = {}) {
    let where = [];
    let params = [];

    if (query.name) {
      if (query.name instanceof RegExp) {
        // Not supported
      } else {
        where.push("name = ?"); params.push(query.name);
      }
    }
    if (query._id) {
      if (typeof query._id === 'object') {
        if (query._id.$in) {
          const ids = query._id.$in;
          if (ids.length > 0) {
            where.push(`id IN (${ids.map(() => '?').join(',')})`);
            params.push(...ids);
          } else {
            where.push("1=0");
          }
        } else if (query._id.$ne) {
          where.push("id != ?"); params.push(query._id.$ne);
        }
      } else {
        where.push("id = ?"); params.push(query._id);
      }
    }
    if (query.isActive !== undefined) { where.push("isActive = ?"); params.push(query.isActive); }

    let sql = options.isCount ? "SELECT COUNT(*) as count FROM units" : "SELECT * FROM units";
    if (where.length > 0) {
      sql += " WHERE " + where.join(" AND ");
    }

    if (!options.isCount) {
      // Sorting support wrapper
      // Unit.find({}).sort({ order: 1 })
      // I will assume simple sort by order if not specified differently via some method I can't easily intercept here.
      // BUT, find() usually returns a Query object in Mongoose.
      // In my code, find returns Promise<Array>.
      // So .sort() on the RESULT array in controller is easiest.
      // However, default sort in Mongoose model was likely insertion order or ID.
      // The controller calls .sort({ order: 1 }) which is array sort on the result if I return array.
      // BUT wait, `await Unit.find({}).sort(...)` means `find` must return a thenable that has `sort`.
      // My `find` returns `Promise`. Promise does NOT have `.sort`. Array has `.sort` but that is synchronous.
      // I need to support sorting in `_buildQuery` OR controller refactor.
      // Controller: `const units = await Unit.find({}).sort({ order: 1, createdAt: 1 });`
      // This will CRASH if `Unit.find` returns a native Promise.
      // Options:
      // 1. Return a custom Query/Promise object that supports `.sort()`.
      // 2. Refactor controller to `(await Unit.find({})).sort(...)`.
      // Refactoring controller is standard approach here.

      sql += " ORDER BY `order` ASC, createdAt ASC";
    }

    if (options.limit) {
      sql += " LIMIT " + options.limit;
    }

    return { sql, params };
  }

  // To prevent crash if controller calls .sort() on the promise (which replaces it typically in Mongoose)
  // I should Refactor Controller to await first, then sort array, OR move sort to SQL.
  // Ideally move sort to SQL.
  // But controller usage `await Unit.find().sort()` expects valid chain.
  // My `find` is async. `await` waits for it.
  // `Unit.find().sort()` -> `(Promise).sort()` -> Not function.
  // I MUST refactor controller.
}

export default Unit;
