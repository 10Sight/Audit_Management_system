import { pool } from "../db/connectDB.js";
import Department from "./department.model.js";
import Unit from "./unit.model.js";
import Machine from "./machine.model.js";
import Line from "./line.model.js";
import Process from "./process.model.js";
import Question from "./question.model.js";

// Helper to mimic Mongoose-like chaining
class AuditQueryBuilder {
  constructor(query, options = {}) {
    this.conditions = query || {};
    this.opts = {
      limit: null,
      skip: 0,
      sort: null,
      select: null,
      ...options
    };
    this.populatedFields = [];
  }

  limit(num) {
    this.opts.limit = num;
    return this;
  }

  skip(num) {
    this.opts.skip = num;
    return this;
  }

  sort(sortObj) {
    this.opts.sort = sortObj;
    return this;
  }

  select(selectStr) {
    // Basic select support (often ignored in simple SQL wrappers, but we can try)
    this.opts.select = selectStr;
    return this;
  }

  populate(path, select) {
    this.populatedFields.push({ path, select });
    return this;
  }

  // New: option to return POJO
  lean() {
    return this;
  }

  async exec() {
    const results = await Audit._find(this.conditions, this.opts, this.populatedFields);
    return this.opts.isOne ? (results[0] || null) : results;
  }

  // For compatibility with Mongoose awaitable queries
  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }
}

class Audit {
  constructor(data) {
    Object.assign(this, data);
  }

  // --- Static Methods ---

  static async create(data) {
    // Handle logic to clean up incoming data for SQL
    const {
      date, line, machine, process, unit, department,
      lineLeader, shift, shiftIncharge,
      lineRating, machineRating, processRating, unitRating,
      auditor, createdBy, answers
    } = data;

    // Convert date string/object to proper MySQL date format
    const dateVal = new Date(date).toISOString().split('T')[0];

    const sql = `
      INSERT INTO audits 
      (date, line, machine, process, unit, department, 
       lineLeader, shift, shiftIncharge, 
       lineRating, machineRating, processRating, unitRating, 
       auditor_id, created_by_id, answers)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      dateVal,
      line?.toString() || null,
      machine?.toString() || null,
      process?.toString() || null,
      unit?.toString() || null,
      department?.toString() || null,
      lineLeader, shift, shiftIncharge,
      lineRating || null, machineRating || null, processRating || null, unitRating || null,
      auditor, createdBy,
      JSON.stringify(answers || [])
    ];

    const [result] = await pool.query(sql, params);

    // Return the created object populated with ID
    return new Audit({
      id: result.insertId,
      _id: result.insertId, // Compat for _id users
      ...data,
      answers: answers || [] // Keep as object in memory
    });
  }

  static findById(id) {
    return new AuditQueryBuilder({ id }, { isOne: true });
  }

  static find(query = {}, opts = {}, prePopulate = []) {
    console.log("Audit.find called!");
    // If called directly via await Audit.find({...}), we need to return a QueryBuilder 
    // BUT typically Mongoose returns a Query object that is then awaited.
    // We will return a QueryBuilder. The QueryBuilder.exec() will call an internal method to actually fetch.
    return new AuditQueryBuilder(query, opts);
  }

  static async countDocuments(query) {
    const { sql, params } = Audit._buildQuery(query, { isCount: true });
    const [rows] = await pool.query(sql, params);
    return rows[0].count;
  }

  // Internal query builder logic
  static _buildQuery(query, options = {}) {
    let whereClauses = [];
    let params = [];

    // Handle specific filters
    // Mongoose query might contain $or, $and, ranges

    const processCondition = (key, val) => {
      if (key === '$or') {
        const orParts = val.map(clause => {
          const parts = [];
          Object.entries(clause).forEach(([k, v]) => {
            // Recursive-ish simple handling
            if (typeof v === 'object' && v.$gte) {
              parts.push(`${k} >= ?`);
              params.push(v.$gte);
              if (v.$lte) { parts.push(`${k} <= ?`); params.push(v.$lte); }
              // Handle date range specifically if needed
            } else if (typeof v === 'object' && v.$lte) {
              parts.push(`${k} <= ?`); params.push(v.$lte);
            } else {
              parts.push(`${k} = ?`);
              params.push(v);
            }
          });
          return `(${parts.join(' AND ')})`;
        });
        return `(${orParts.join(' OR ')})`;
      }

      if (key === '$and') {
        const andParts = val.map(clause => {
          // For now assume simple objects in AND array
          // This is getting complex for a simple regex parser.
          // We'll flatten it blindly for common use cases.
          // If the clause is an object, run processCondition on its keys
          const subParts = [];
          Object.entries(clause).forEach(([k, v]) => {
            const cond = processCondition(k, v);
            if (cond) subParts.push(cond);
          });
          return subParts.join(' AND ');
        });
        return `(${andParts.join(' AND ')})`;
      }

      if (typeof val === 'object' && val !== null) {
        // Handle date ranges { $gte: ..., $lte: ... }
        if (val.$gte || val.$lte) {
          const parts = [];
          if (val.$gte) { parts.push(`${key} >= ?`); params.push(val.$gte); }
          if (val.$lte) { parts.push(`${key} <= ?`); params.push(val.$lte); }
          return parts.join(' AND ');
        }
        // Handle $in
        if (val.$in) {
          const placeholders = val.$in.map(() => '?').join(',');
          val.$in.forEach(v => params.push(v));
          return `${key} IN (${placeholders})`;
        }
        // Handle $elemMatch (PARTIAL SUPPORT using JSON_CONTAINS or manual filter?)
        // Manual filter is safer if volume is low.
        // But we are in SQL generation.
        // If we see 'answers' filtering, we might need JSON_EXTRACT or JSON_SEARCH.
        // For simplicity in this iteration: IGNORE complex JSON filters in SQL 
        // and let the controller/service do in-memory filtering OR basic JSON checks.
        // BUT implementation plan said we'd use JSON functions.
        // Let's try basic JSON searching if key is 'answers'.

      }

      // Default equality
      if (val !== undefined) {
        // Map auditor -> auditor_id
        let dbKey = key;
        if (key === 'auditor') dbKey = 'auditor_id';
        if (key === 'createdBy') dbKey = 'created_by_id';

        params.push(val);
        return `${dbKey} = ?`;
      }
    };

    for (const [key, val] of Object.entries(query)) {
      const clause = processCondition(key, val);
      if (clause) whereClauses.push(clause);
    }

    let sql = options.isCount ? `SELECT COUNT(*) as count FROM audits` : `SELECT * FROM audits`;
    if (whereClauses.length > 0) {
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    if (!options.isCount) {
      // MSSQL Paging requires ORDER BY
      let orderByClause = '';
      if (options.sort) {
        const sortParts = [];
        for (const [k, v] of Object.entries(options.sort)) {
          sortParts.push(`${k} ${v === -1 || v === 'desc' ? 'DESC' : 'ASC'}`);
        }
        if (sortParts.length) orderByClause = ` ORDER BY ${sortParts.join(', ')}`;
      } else {
        // Default sort for paging if none provided
        orderByClause = ` ORDER BY id DESC`;
      }
      sql += orderByClause;

      if (options.limit) {
        // MSSQL OFFSET-FETCH
        sql += ` OFFSET ? ROWS FETCH NEXT ? ROWS ONLY`;
        params.push(parseInt(options.skip || 0), parseInt(options.limit));
      }
    }

    return { sql, params };
  }

  // --- Internal Execution ---
  // Called by QueryBuilder.exec()
  static async _find(query, opts, populatedFields) {
    const { sql, params } = Audit._buildQuery(query, opts);
    const [rows] = await pool.query(sql, params);

    const results = rows.map(r => {
      // Map back DB keys to Model keys
      if (r.auditor_id) { r.auditor = r.auditor_id; delete r.auditor_id; }
      if (r.created_by_id) { r.createdBy = r.created_by_id; delete r.created_by_id; }
      r._id = r.id;

      // Parse JSON
      if (typeof r.answers === 'string') {
        try { r.answers = JSON.parse(r.answers); } catch (e) { r.answers = []; }
      }
      return new Audit(r);
    });

    // Manual Population
    // Fetch data for each populated field unique IDs
    if (results.length > 0 && populatedFields.length > 0) {
      for (const { path, select } of populatedFields) {
        // Collect IDs
        if (['line', 'machine', 'process', 'unit', 'department'].includes(path)) {
          const ids = [...new Set(results.map(r => r[path]).filter(Boolean))];
          let docs = [];
          if (ids.length > 0) {
            // mongo fetch
            let model;
            if (path === 'line') model = Line;
            if (path === 'machine') model = Machine;
            if (path === 'process') model = Process;
            if (path === 'unit') model = Unit;
            if (path === 'department') model = Department;

            if (model) {
              const q = model.find({ _id: { $in: ids } });
              docs = typeof q.exec === 'function' ? await q.exec() : await q;
            }
          }

          // Map back
          results.forEach(r => {
            if (r[path]) {
              const match = docs.find(d => d._id.toString() === r[path].toString());
              r[path] = match || r[path]; // Replace ID with object or leave ID
            }
          });
        }

        if (['auditor', 'createdBy'].includes(path)) {
          // Fetch from MySQL employees
          const ids = [...new Set(results.map(r => r[path]).filter(id => typeof id === 'number'))];
          if (ids.length > 0) {
            const [users] = await pool.query(`SELECT id, fullName, emailId, employeeId FROM employees WHERE id IN (?)`, [ids]);
            results.forEach(r => {
              if (r[path]) {
                const match = users.find(u => u.id === r[path]);
                if (match) {
                  match._id = match.id; // compat
                  r[path] = match;
                }
              }
            });
          }
        }

        // Special case: Populate question inside answers
        if (path === 'answers.question') {
          // Collect question IDs from all answers in all results
          const qIds = [];
          results.forEach(r => {
            if (r.answers && Array.isArray(r.answers)) {
              r.answers.forEach(a => {
                if (a.question) qIds.push(a.question);
              });
            }
          });

          const uniqueQIds = [...new Set(qIds.filter(Boolean))];
          if (uniqueQIds.length > 0) {
            const q = Question.find({ _id: { $in: uniqueQIds } });
            const questions = typeof q.exec === 'function' ? await q.exec() : await q;
            results.forEach(r => {
              if (r.answers) {
                r.answers.forEach(a => {
                  if (a.question) {
                    const match = questions.find(q => q._id.toString() === a.question.toString());
                    if (match) a.question = match;
                  }
                });
              }
            });
          }
        }

      }
    }

    return results;
  }
}

export default Audit;
