import { pool } from "../db/connectDB.js";
import Department from "./department.model.js";
import Machine from "./machine.model.js";
import Line from "./line.model.js";
import Process from "./process.model.js";
import Unit from "./unit.model.js";

class QuestionQueryBuilder {
  constructor(query = {}, options = {}) {
    this.query = query;
    this.options = options;
    this.populatePaths = new Set();
  }

  populate(path) {
    if (typeof path === "string") {
      path.split(" ").forEach((p) => this.populatePaths.add(p.trim()));
    } else if (Array.isArray(path)) {
      path.forEach((p) => this.populatePaths.add(p));
    }
    return this;
  }

  sort(sortOptions) {
    this.options.sort = sortOptions;
    return this;
  }

  limit(val) {
    this.options.limit = val;
    return this;
  }

  async exec() {
    const { sql, params } = Question._buildQuery(this.query, this.options);
    const [rows] = await pool.query(sql, params);
    const instances = rows.map((r) => new Question(r));

    if (this.populatePaths.size > 0 && instances.length > 0) {
      // Group population for better performance
      for (const path of this.populatePaths) {
        if (path === "department") {
          const deptIds = [...new Set(instances.map((i) => i.department).filter(Boolean))];
          if (deptIds.length > 0) {
            const departments = await Department.find({ _id: { $in: deptIds } });
            const deptMap = new Map(departments.map((d) => [String(d._id), d]));
            instances.forEach((i) => {
              if (i.department) i.department = deptMap.get(String(i.department)) || i.department;
            });
          }
        } else if (path === "units") {
          const unitIds = [...new Set(instances.flatMap((i) => i.units || []).filter(Boolean))];
          if (unitIds.length > 0) {
            const units = await Unit.find({ _id: { $in: unitIds } });
            const unitMap = new Map(units.map((u) => [String(u._id), u]));
            instances.forEach((i) => {
              if (Array.isArray(i.units)) {
                i.units = i.units.map((uid) => unitMap.get(String(uid)) || uid);
              }
            });
          }
        } else if (path === "lines") {
          const lineIds = [...new Set(instances.flatMap((i) => i.lines || []).filter(Boolean))];
          if (lineIds.length > 0) {
            const lines = await Line.find({ _id: { $in: lineIds } });
            const lineMap = new Map(lines.map((l) => [String(l._id), l]));
            instances.forEach((i) => {
              if (Array.isArray(i.lines)) {
                i.lines = i.lines.map((lid) => lineMap.get(String(lid)) || lid);
              }
            });
          }
        } else if (path === "machines") {
          const machineIds = [...new Set(instances.flatMap((i) => i.machines || []).filter(Boolean))];
          if (machineIds.length > 0) {
            const machines = await Machine.find({ _id: { $in: machineIds } });
            const machineMap = new Map(machines.map((m) => [String(m._id), m]));
            instances.forEach((i) => {
              if (Array.isArray(i.machines)) {
                i.machines = i.machines.map((mid) => machineMap.get(String(mid)) || mid);
              }
            });
          }
        } else if (path === "processes") {
          const processIds = [...new Set(instances.flatMap((i) => i.processes || []).filter(Boolean))];
          if (processIds.length > 0) {
            const procs = await Process.find({ _id: { $in: processIds } });
            const procMap = new Map(procs.map((p) => [String(p._id), p]));
            instances.forEach((i) => {
              if (Array.isArray(i.processes)) {
                i.processes = i.processes.map((pid) => procMap.get(String(pid)) || pid);
              }
            });
          }
        }
      }
    }

    return this.options.isOne ? instances[0] || null : instances;
  }

  // To support thenable/await
  async then(resolve, reject) {
    try {
      resolve(await this.exec());
    } catch (err) {
      reject(err);
    }
  }
}

class Question {
  constructor(data) {
    this._id = data.id; // Compatibility
    this.questionText = data.questionText;
    this.templateTitle = data.templateTitle;
    this.department = data.department_id;
    this.questionType = data.questionType;

    // Parse JSON fields safely
    this.options = typeof data.options === 'string' ? JSON.parse(data.options || '[]') : (data.options || []);
    this.correctOptionIndex = data.correctOptionIndex;
    this.imageUrl = data.imageUrl;
    this.isGlobal = !!data.isGlobal;
    this.createdBy = data.created_by_id;

    this.machines = typeof data.machine_ids === 'string' ? JSON.parse(data.machine_ids || '[]') : (data.machine_ids || []);
    this.lines = typeof data.line_ids === 'string' ? JSON.parse(data.line_ids || '[]') : (data.line_ids || []);
    this.processes = typeof data.process_ids === 'string' ? JSON.parse(data.process_ids || '[]') : (data.process_ids || []);
    this.units = typeof data.unit_ids === 'string' ? JSON.parse(data.unit_ids || '[]') : (data.unit_ids || []);

    this.isActive = !!data.isActive;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  // --- Static Methods ---

  static async create(data) {
    const questionText = data.questionText;
    const templateTitle = data.templateTitle;
    const department = data.department ? (typeof data.department === 'object' ? data.department._id || data.department.id : data.department) : null;
    const questionType = data.questionType || 'yes_no';

    // Arrays -> JSON string
    const options = JSON.stringify(data.options || []);
    const machine_ids = JSON.stringify(data.machines || []);
    const line_ids = JSON.stringify(data.lines || []);
    const process_ids = JSON.stringify(data.processes || []);
    const unit_ids = JSON.stringify(data.units || []);

    const createdBy = data.createdBy ? (typeof data.createdBy === 'object' ? data.createdBy.id : data.createdBy) : null;
    const correctOptionIndex = data.correctOptionIndex !== undefined ? data.correctOptionIndex : null;
    const imageUrl = data.imageUrl || null;
    const isGlobal = data.isGlobal !== undefined ? data.isGlobal : false;
    const isActive = data.isActive !== undefined ? data.isActive : true;

    const sql = `
        INSERT INTO questions (
            questionText, templateTitle, department_id, questionType, options, 
            correctOptionIndex, imageUrl, isGlobal, created_by_id, 
            machine_ids, line_ids, process_ids, unit_ids, isActive
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.query(sql, [
      questionText, templateTitle, department, questionType, options,
      correctOptionIndex, imageUrl, isGlobal, createdBy,
      machine_ids, line_ids, process_ids, unit_ids, isActive
    ]);

    return new Question({
      id: result.insertId,
      ...data,
      department_id: department,
      created_by_id: createdBy,
      machine_ids: machine_ids, // constructor parses
      line_ids: line_ids,
      process_ids: process_ids,
      unit_ids: unit_ids,
      options: options
    });
  }

  static find(query = {}) {
    return new QuestionQueryBuilder(query);
  }

  static findById(id) {
    if (!id) return new QuestionQueryBuilder({ _id: null }, { isOne: true });
    return new QuestionQueryBuilder({ _id: id }, { isOne: true });
  }

  static findOne(query) {
    return new QuestionQueryBuilder(query, { isOne: true });
  }

  static async findByIdAndUpdate(id, update, options = {}) {
    const setClause = [];
    const values = [];

    if (update.questionText !== undefined) { setClause.push("questionText = ?"); values.push(update.questionText); }
    if (update.templateTitle !== undefined) { setClause.push("templateTitle = ?"); values.push(update.templateTitle); }
    if (update.department !== undefined) {
      setClause.push("department_id = ?");
      values.push(update.department ? (typeof update.department === 'object' ? update.department._id || update.department.id : update.department) : null);
    }
    if (update.questionType !== undefined) { setClause.push("questionType = ?"); values.push(update.questionType); }
    if (update.options !== undefined) { setClause.push("options = ?"); values.push(JSON.stringify(update.options)); }
    if (update.correctOptionIndex !== undefined) { setClause.push("correctOptionIndex = ?"); values.push(update.correctOptionIndex); }
    if (update.imageUrl !== undefined) { setClause.push("imageUrl = ?"); values.push(update.imageUrl); }
    if (update.isGlobal !== undefined) { setClause.push("isGlobal = ?"); values.push(update.isGlobal); }
    if (update.isActive !== undefined) { setClause.push("isActive = ?"); values.push(update.isActive); }

    // Arrays
    if (update.machines !== undefined) { setClause.push("machine_ids = ?"); values.push(JSON.stringify(update.machines)); }
    if (update.lines !== undefined) { setClause.push("line_ids = ?"); values.push(JSON.stringify(update.lines)); }
    if (update.processes !== undefined) { setClause.push("process_ids = ?"); values.push(JSON.stringify(update.processes)); }
    if (update.units !== undefined) { setClause.push("unit_ids = ?"); values.push(JSON.stringify(update.units)); }

    if (setClause.length > 0) {
      values.push(id);
      await pool.query(`UPDATE questions SET ${setClause.join(', ')} WHERE id = ?`, values);
    }

    return Question.findById(id);
  }

  static async findByIdAndDelete(id) {
    await pool.query("DELETE FROM questions WHERE id = ?", [id]);
    return true;
  }

  static async countDocuments(query) {
    const { sql, params } = Question._buildQuery(query, { isCount: true });
    const [rows] = await pool.query(sql, params);
    return rows[0].count;
  }

  // --- Instance Methods ---

  async save() {
    // Full update of current instance
    const sql = `
        UPDATE questions 
        SET questionText = ?, templateTitle = ?, department_id = ?, questionType = ?, options = ?, 
            correctOptionIndex = ?, imageUrl = ?, isGlobal = ?, created_by_id = ?, 
            machine_ids = ?, line_ids = ?, process_ids = ?, unit_ids = ?, isActive = ?
        WHERE id = ?
    `;
    const deptId = this.department ? (typeof this.department === 'object' ? this.department.id : this.department) : null;
    const createdById = this.createdBy ? (typeof this.createdBy === 'object' ? this.createdBy.id : this.createdBy) : null;

    await pool.query(sql, [
      this.questionText, this.templateTitle, deptId, this.questionType, JSON.stringify(this.options),
      this.correctOptionIndex, this.imageUrl, this.isGlobal, createdById,
      JSON.stringify(this.machines), JSON.stringify(this.lines), JSON.stringify(this.processes), JSON.stringify(this.units),
      this.isActive, this._id
    ]);
    return this;
  }

  async populate(path) {
    if (path === 'department' && this.department && typeof this.department !== 'object') {
      try { const d = await Department.findById(this.department); if (d) this.department = d; } catch (e) { }
    }
    if (path === 'units' && Array.isArray(this.units) && this.units.length > 0 && typeof this.units[0] !== 'object') {
      try { const results = await Unit.find({ _id: { $in: this.units } }); this.units = results; } catch (e) { }
    }
    if (path === 'lines' && Array.isArray(this.lines) && this.lines.length > 0 && typeof this.lines[0] !== 'object') {
      try { const results = await Line.find({ _id: { $in: this.lines } }); this.lines = results; } catch (e) { }
    }
    if (path === 'machines' && Array.isArray(this.machines) && this.machines.length > 0 && typeof this.machines[0] !== 'object') {
      try { const results = await Machine.find({ _id: { $in: this.machines } }); this.machines = results; } catch (e) { }
    }
    if (path === 'processes' && Array.isArray(this.processes) && this.processes.length > 0 && typeof this.processes[0] !== 'object') {
      try { const results = await Process.find({ _id: { $in: this.processes } }); this.processes = results; } catch (e) { }
    }
    return this;
  }

  static async deleteMany(query) {
    if (!query || Object.keys(query).length === 0) return { deletedCount: 0 };
    // Only verify if we have simple queries like templateTitle supported
    const { sql, params } = Question._buildQuery(query, { isDelete: true });
    if (!sql.includes('WHERE')) return { deletedCount: 0 }; // Safety

    const [result] = await pool.query(sql, params);
    return { deletedCount: result.affectedRows };
  }

  // --- Helpers ---

  static _buildQuery(query, options = {}) {
    let where = [];
    let params = [];

    const processCondition = (cond, targetWhere, targetParams) => {
      if (!cond) return;

      // Basic fields
      if (cond.department !== undefined && cond.department !== null) {
        targetWhere.push("department_id = ?");
        targetParams.push(cond.department instanceof Department ? cond.department._id : cond.department);
      }
      if (cond._id !== undefined) {
        if (typeof cond._id === 'object' && cond._id.$in) {
          const ids = cond._id.$in;
          if (ids.length > 0) {
            targetWhere.push(`id IN (${ids.map(() => '?').join(',')})`);
            targetParams.push(...ids);
          } else {
            targetWhere.push("1=0");
          }
        } else {
          targetWhere.push("id = ?"); targetParams.push(cond._id);
        }
      }
      if (cond.isActive !== undefined) { targetWhere.push("isActive = ?"); targetParams.push(cond.isActive); }
      if (cond.isGlobal !== undefined) { targetWhere.push("isGlobal = ?"); targetParams.push(cond.isGlobal); }
      if (cond.templateTitle !== undefined) { targetWhere.push("templateTitle = ?"); targetParams.push(cond.templateTitle); }

      // JSON array fields
      const arrayFields = [
        { key: 'machines', col: 'machine_ids' },
        { key: 'lines', col: 'line_ids' },
        { key: 'processes', col: 'process_ids' },
        { key: 'units', col: 'unit_ids' }
      ];

      arrayFields.forEach(({ key, col }) => {
        if (cond[key] !== undefined && cond[key] !== null) {
          const val = cond[key];
          if (!isNaN(Number(val))) {
            targetWhere.push(`(JSON_CONTAINS(${col}, ?, '$') OR JSON_CONTAINS(${col}, ?, '$'))`);
            targetParams.push(JSON.stringify(Number(val)), JSON.stringify(String(val)));
          } else {
            targetWhere.push(`JSON_CONTAINS(${col}, ?, '$')`);
            targetParams.push(JSON.stringify(val));
          }
        }
      });
    };

    // 1. Process top-level simple conditions
    processCondition(query, where, params);

    // 2. Process $or logic
    if (query.$or && Array.isArray(query.$or)) {
      const orParts = [];
      query.$or.forEach(cond => {
        const subWhere = [];
        const subParams = [];

        if (cond.$and && Array.isArray(cond.$and)) {
          const andParts = [];
          cond.$and.forEach(andCond => {
            const aWhere = [];
            const aParams = [];
            processCondition(andCond, aWhere, aParams);
            if (aWhere.length > 0) {
              andParts.push(`(${aWhere.join(" AND ")})`);
              subParams.push(...aParams);
            }
          });
          if (andParts.length > 0) {
            subWhere.push(andParts.join(" AND "));
          }
        } else {
          processCondition(cond, subWhere, subParams);
        }

        if (subWhere.length > 0) {
          orParts.push(`(${subWhere.join(" AND ")})`);
          params.push(...subParams);
        }
      });

      if (orParts.length > 0) {
        where.push(`(${orParts.join(" OR ")})`);
      }
    }

    let sql = "";
    if (options.isDelete) {
      sql = "DELETE FROM questions";
    } else if (options.isCount) {
      sql = "SELECT COUNT(*) as count FROM questions";
    } else {
      sql = "SELECT * FROM questions";
    }

    if (where.length > 0) {
      sql += " WHERE " + where.join(" AND ");
    }

    if (!options.isCount && !options.isDelete) {
      sql += " ORDER BY createdAt DESC";
    }

    if (options.limit && !options.isDelete) {
      if (!sql.toLowerCase().includes("order by")) {
        sql += " ORDER BY (SELECT NULL)";
      }
      sql += ` OFFSET 0 ROWS FETCH NEXT ${options.limit} ROWS ONLY`;
    }

    return { sql, params };
  }
}

export default Question;
