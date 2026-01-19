import { pool } from "../db/connectDB.js";
import Question from "./question.model.js";
import Department from "./department.model.js";

class QuestionCategory {
  constructor(data) {
    this._id = data.id; // Compatibility
    this.name = data.name;
    this.description = data.description;

    // Parse JSON fields safely
    this.questions = typeof data.questions === 'string' ? JSON.parse(data.questions || '[]') : (data.questions || []);
    this.departments = typeof data.departments === 'string' ? JSON.parse(data.departments || '[]') : (data.departments || []);

    this.createdBy = data.created_by_id;
    this.isActive = !!data.isActive;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  // --- Static Methods ---

  static async create(data) {
    const name = data.name;
    const description = data.description;
    // Arrays -> JSON string
    const questions = JSON.stringify(data.questions || []);
    const departments = JSON.stringify(data.departments || []);

    const createdBy = data.createdBy ? (typeof data.createdBy === 'object' ? data.createdBy.id : data.createdBy) : null;
    const isActive = data.isActive !== undefined ? data.isActive : true;

    const sql = `
        INSERT INTO question_categories(name, description, questions, departments, created_by_id, isActive)
        OUTPUT INSERTED.id
    VALUES(?, ?, ?, ?, ?, ?)
    `;
    const [rows] = await pool.query(sql, [name, description, questions, departments, createdBy, isActive]);
    const newId = (rows && rows.length > 0) ? rows[0].id : null;

    return new QuestionCategory({
      id: newId,
      ...data,
      questions: questions, // will be parsed in constructor if we pass object
      departments: departments,
      created_by_id: createdBy
    });
  }

  static async find(query = {}) {
    const { sql, params } = QuestionCategory._buildQuery(query);
    const [rows] = await pool.query(sql, params);
    return rows.map(r => new QuestionCategory(r));
  }

  static async findById(id) {
    if (!id) return null;
    const [rows] = await pool.query("SELECT * FROM question_categories WHERE id = ?", [id]);
    if (rows.length === 0) return null;
    return new QuestionCategory(rows[0]);
  }

  static async findOne(query) {
    const { sql, params } = QuestionCategory._buildQuery(query, { limit: 1 });
    const [rows] = await pool.query(sql, params);
    if (rows.length === 0) return null;
    return new QuestionCategory(rows[0]);
  }

  static async findByIdAndUpdate(id, update, options) {
    const setClause = [];
    const values = [];

    if (update.name !== undefined) { setClause.push("name = ?"); values.push(update.name); }
    if (update.description !== undefined) { setClause.push("description = ?"); values.push(update.description); }
    if (update.questions !== undefined) { setClause.push("questions = ?"); values.push(JSON.stringify(update.questions)); }
    if (update.departments !== undefined) { setClause.push("departments = ?"); values.push(JSON.stringify(update.departments)); }
    if (update.isActive !== undefined) { setClause.push("isActive = ?"); values.push(update.isActive); }

    if (setClause.length === 0) return QuestionCategory.findById(id);

    values.push(id);
    await pool.query(`UPDATE question_categories SET ${setClause.join(', ')} WHERE id = ? `, values);

    return QuestionCategory.findById(id);
  }

  static async findByIdAndDelete(id) {
    await pool.query("DELETE FROM question_categories WHERE id = ?", [id]);
    return true;
  }

  static async countDocuments(query) {
    const { sql, params } = QuestionCategory._buildQuery(query, { isCount: true });
    const [rows] = await pool.query(sql, params);
    return rows[0].count;
  }

  // --- Instance Methods ---

  async save() {
    const sql = `
        UPDATE question_categories 
        SET name = ?, description = ?, questions = ?, departments = ?, isActive = ?
      WHERE id = ?
        `;
    await pool.query(sql, [
      this.name, this.description,
      JSON.stringify(this.questions), JSON.stringify(this.departments),
      this.isActive, this._id
    ]);
    return this;
  }

  // Custom methods for populate simulation if needed (not standard Mongoose)
  // But controller expects .populate() chaining which is not possible here.
  // We will handle population differently or ignore if just fetching IDs.

  // --- Helpers ---

  static _buildQuery(query, options = {}) {
    let where = [];
    let params = [];

    if (query._id) { where.push("id = ?"); params.push(query._id); }
    if (query.isActive !== undefined) { where.push("isActive = ?"); params.push(query.isActive); }
    if (query.departments) {
      // Departments check: query.departments (ID) in JSON array departments
      const val = query.departments;
      where.push("JSON_CONTAINS(departments, ?, '$')");
      // If we store as numbers, we must query as numbers.
      // query.departments might be string from URL
      const safeVal = isNaN(Number(val)) ? val : Number(val);
      params.push(JSON.stringify(safeVal));
    }

    let selectClause = "SELECT *";
    if (options.limit && !options.skip && !options.isCount) {
      selectClause = `SELECT TOP ${options.limit} *`;
    }

    let sql = options.isCount ? "SELECT COUNT(*) as count FROM question_categories" : `${selectClause} FROM question_categories`;
    if (where.length > 0) {
      sql += " WHERE " + where.join(" AND ");
    }

    if (!options.isCount) {
      sql += " ORDER BY createdAt DESC";
    }

    if (options.skip) {
      sql += ` OFFSET ${options.skip} ROWS`;
      if (options.limit) {
        sql += ` FETCH NEXT ${options.limit} ROWS ONLY`;
      }
    }

    return { sql, params };
  }

  // Method to make .populate() syntax not crash, or we remove it in controller.
  populate() {
    // no-op or throw warning?
    // Better to remove from controller.
    return this;
  }
  lean() {
    return this;
  }
  select() {
    return this;
  }
}

export default QuestionCategory;
