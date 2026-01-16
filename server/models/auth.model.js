import { pool } from "../db/connectDB.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import EVN from "../config/env.config.js";
import logger from "../logger/winston.logger.js";

// Import other models for manual population
import Department from "./department.model.js";
import Unit from "./unit.model.js";

// Helper to ensure tables exist removed. Rely on init_sql.js
// const ensureTables = ...

class EmployeeDocument {
  constructor(data) {
    Object.assign(this, data);
    // Convert JSON fields if string
    if (typeof this.targetAudit === 'string') {
      try { this.targetAudit = JSON.parse(this.targetAudit); } catch (e) { }
    }
    // Ensure department is array
    if (!this.department) this.department = [];
  }

  async comparePassword(enteredPassword) {
    if (!this.password) return false;
    return await bcrypt.compare(enteredPassword, this.password);
  }

  generateJWT() {
    return jwt.sign(
      {
        id: this.id || this._id,
        role: this.role,
        employeeId: this.employeeId,
      },
      EVN.JWT_ACCESS_SECRET,
      { expiresIn: EVN.JWT_EXPIRY || "7d" }
    );
  }

  async save() {
    // If id exists, update. Else insert.
    if (this.id) {
      // Update logic
      const allowedFields = ['fullName', 'emailId', 'password', 'employeeId', 'username', 'phoneNumber', 'role', 'unit', 'targetAudit'];
      const updates = [];
      const values = [];

      for (const field of allowedFields) {
        if (this[field] !== undefined) {
          let val = this[field];
          if (field === 'targetAudit' && typeof val === 'object') val = JSON.stringify(val);
          updates.push(`${field} = ?`);
          values.push(val);
        }
      }

      if (updates.length > 0) {
        values.push(this.id);
        await pool.query(`UPDATE employees SET ${updates.join(', ')} WHERE id = ?`, values);
      }

      // Handle departments independently
      if (this.department && Array.isArray(this.department)) {
        await pool.query('DELETE FROM employee_departments WHERE employee_id = ?', [this.id]);
        if (this.department.length > 0) {
          // Deduplicate and ensure strings
          const uniqueDepts = [...new Set(this.department.map(d =>
            (typeof d === 'object' && d !== null ? d._id : d).toString()
          ))];
          const deptValues = uniqueDepts.map(d => [this.id, d]);
          await pool.query('INSERT IGNORE INTO employee_departments (employee_id, department_id) VALUES ?', [deptValues]);
        }
      }

    } else {
      // Insert
      // Hash password if present
      if (this.password && !this.password.startsWith('$2a$')) { // Check if already hashed to avoid double hash
        this.password = await bcrypt.hash(this.password, 12);
      }

      const fields = ['fullName', 'emailId', 'password', 'employeeId', 'username', 'phoneNumber', 'role', 'unit', 'targetAudit'];
      const columns = [];
      const placeholders = [];
      const values = [];

      for (const field of fields) {
        if (this[field] !== undefined) {
          columns.push(field);
          placeholders.push('?');
          let val = this[field];
          if (field === 'targetAudit' && typeof val === 'object') val = JSON.stringify(val);
          values.push(val);
        }
      }

      const [result] = await pool.query(
        `INSERT INTO employees (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`,
        values
      );
      this.id = result.insertId;
      this._id = result.insertId; // Alias for mongo compatibility

      // Insert departments
      if (this.department && Array.isArray(this.department) && this.department.length > 0) {
        // Deduplicate and ensure strings
        const uniqueDepts = [...new Set(this.department.map(d =>
          (typeof d === 'object' && d !== null ? d._id : d).toString()
        ))];
        const deptValues = uniqueDepts.map(d => [this.id, d]);
        await pool.query('INSERT IGNORE INTO employee_departments (employee_id, department_id) VALUES ?', [deptValues]);
      }
    }
    return this;
  }

  // Method to manually populate
  async populate(path, select) {
    if (path === 'department') {
      // Fetch dept IDs if not already objects
      if (this.department && Array.isArray(this.department) && this.department.length > 0 && typeof this.department[0] === 'string') {
        try {
          const depts = await Department.find({ _id: { $in: this.department } });
          this.department = depts;
        } catch (e) {
          logger.warn("Failed to populate departments", e);
        }
      }
    } else if (path === 'unit') {
      if (this.unit && typeof this.unit === 'string') {
        try {
          const unit = await Unit.findById(this.unit);
          this.unit = unit;
        } catch (e) {
          logger.warn("Failed to populate unit", e);
        }
      }
    }
    return this;
  }

  toObject() {
    // Mimic mongoose structure
    const obj = { ...this };
    if (!obj._id) obj._id = obj.id;
    return obj;
  }

  toJSON() {
    const obj = this.toObject();
    delete obj.password;
    return obj;
  }
}

class QueryBuilder {
  constructor(conditions = {}, op = 'find', updateData = null) {
    this.conditions = conditions;
    this.op = op;
    this.updateData = updateData;
    this.opts = {
      select: [], // Empty means all
      limit: null,
      skip: 0,
      sort: null,
      populate: [],
      lean: false
    };
    this.excludePassword = true;
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
    if (selectStr === '+password') {
      this.excludePassword = false;
    } else if (selectStr === '-password') {
      this.excludePassword = true;
    }
    return this;
  }

  populate(path, select) {
    this.opts.populate.push({ path, select });
    return this;
  }

  lean() {
    this.opts.lean = true;
    return this;
  }

  async exec() {
    // If it's an update operation, perform it first
    if (this.op === 'findOneAndUpdate' && this.updateData) {
      // Find the document(s)
      const { sql, params } = this._buildSql(true); // Pass true to indicate we're building SQL for finding the doc to update
      const [rows] = await pool.query(sql, params);

      if (rows.length > 0) {
        // We only update the first one for findOneAndUpdate/findByIdAndUpdate
        // Fetch existing departments first to prevent overwriting (e.g. $addToSet needs current list)
        const [currentDepts] = await pool.query('SELECT department_id FROM employee_departments WHERE employee_id = ?', [rows[0].id]);
        rows[0].department = currentDepts.map(d => d.department_id);

        const doc = new EmployeeDocument(rows[0]);
        const update = this.updateData;

        // Apply operators logic ($addToSet, $pull etc)
        if (update.$addToSet && update.$addToSet.department) {
          const newDept = update.$addToSet.department;
          if (!Array.isArray(doc.department)) doc.department = [];
          const strDept = doc.department.map(d => d.toString());
          if (!strDept.includes(newDept.toString())) {
            doc.department.push(newDept);
          }
        }

        if (update.$pull && update.$pull.department) {
          const removeDept = update.$pull.department;
          if (Array.isArray(doc.department)) {
            doc.department = doc.department.filter(d => d.toString() !== removeDept.toString());
          }
        }

        // Standard fields
        for (const k of Object.keys(update)) {
          if (!k.startsWith('$')) {
            doc[k] = update[k];
          }
        }

        await doc.save();
      }
    }

    // Now proceed with normal find/fetching logic to return the (possibly updated) doc
    const { sql, params } = this._buildSql();
    const [rows] = await pool.query(sql, params);

    // Scrub passwords if needed
    if (this.excludePassword) {
      rows.forEach(r => delete r.password);
    }

    // Post-process: fetch departments for each user
    if (rows.length > 0) {
      const ids = rows.map(r => r.id);
      const [deptRows] = await pool.query(`SELECT * FROM employee_departments WHERE employee_id IN (?)`, [ids]);

      for (const row of rows) {
        row.department = deptRows.filter(d => d.employee_id === row.id).map(d => d.department_id);
        if (!row._id) row._id = row.id; // Compatibility
      }
    }

    // Map to Document instances
    let results = this.opts.lean ? rows : rows.map(r => new EmployeeDocument(r));

    // Populate logic
    if (this.opts.populate.length > 0) {
      const populateDoc = async (doc) => {
        const instance = (doc instanceof EmployeeDocument) ? doc : new EmployeeDocument(doc);
        for (const pop of this.opts.populate) {
          await instance.populate(pop.path, pop.select);
        }
        if (!(doc instanceof EmployeeDocument)) {
          Object.assign(doc, instance);
        }
      };

      for (const doc of results) {
        await populateDoc(doc);
      }
    }

    if (this.op === 'findOne' || this.op === 'findOneAndUpdate') {
      return results[0] || null;
    }
    return results;
  }

  // Internal helper to build SELECT sql
  _buildSql(forUpdateFind = false) { // forUpdateFind is true when we're finding the doc to update, so we don't apply limit/skip yet
    let whereClauses = [];
    let params = [];
    let hasDepartmentQuery = false;

    // Handle standard fields in this.conditions
    const conditionsCopy = { ...this.conditions };

    // Handle $or
    if (conditionsCopy.$or) {
      const orParts = conditionsCopy.$or.map(cond => {
        const keys = Object.keys(cond);
        const clauses = keys.map(k => {
          const val = cond[k];
          if (val && val.$regex) {
            params.push(`%${val.$regex}%`);
            return `${k} LIKE ?`;
          } else {
            params.push(val);
            return `${k} = ?`;
          }
        });
        return `(${clauses.join(' AND ')})`;
      });
      whereClauses.push(`(${orParts.join(' OR ')})`);
      delete conditionsCopy.$or;
    }

    for (const [key, val] of Object.entries(conditionsCopy)) {
      if (val === undefined) continue;

      if (key === 'department') {
        hasDepartmentQuery = true;
      } else if (typeof val === 'object' && val !== null) {
        if (val.$regex) {
          whereClauses.push(`${key} LIKE ?`);
          params.push(`%${val.$regex}%`);
        }
      } else {
        whereClauses.push(`${key} = ?`);
        params.push(val);
      }
    }

    let sql = `SELECT e.* FROM employees e`;

    if (hasDepartmentQuery) {
      sql += ` JOIN employee_departments ed ON e.id = ed.employee_id`;
      whereClauses.push(`ed.department_id = ?`);
      params.push(this.conditions.department.toString());
    }

    if (whereClauses.length > 0) {
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    if (hasDepartmentQuery) { // Ensure distinct if joining for departments
      sql = `SELECT DISTINCT e.* FROM employees e JOIN employee_departments ed ON e.id = ed.employee_id WHERE ${whereClauses.join(' AND ')}`;
    }

    if (this.opts.sort) {
      const sortParts = Object.entries(this.opts.sort).map(([k, v]) => {
        return `${k} ${v === -1 || v === 'desc' ? 'DESC' : 'ASC'}`;
      });
      sql += ` ORDER BY ${sortParts.join(', ')}`;
    }

    if (this.opts.limit && !forUpdateFind) { // Only apply limit/skip if not just finding for update
      sql += ` LIMIT ? OFFSET ?`;
      params.push(this.opts.limit, this.opts.skip || 0);
    }

    return { sql, params };
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }
}


const Employee = {
  // Static methods mimicking Mongoose
  find: (query) => new QueryBuilder(query),

  findOne: (query) => {
    return new QueryBuilder(query, 'findOne');
  },

  findById: (id) => {
    return new QueryBuilder({ id }, 'findOne');
  },

  findOneAndUpdate: (query, update, options) => {
    return new QueryBuilder(query, 'findOneAndUpdate', update);
  },

  findByIdAndUpdate: (id, update, options) => {
    return new QueryBuilder({ id }, 'findOneAndUpdate', update).limit(1);
  },

  // Create acts as new + save
  create: async (data) => {
    const doc = new EmployeeDocument(data);
    await doc.save();
    return doc;
  },

  updateMany: async (query, update) => {
    // Naive implementation: Find all, iterate, apply update, save.
    const qb = new QueryBuilder(query);
    const docs = await qb.exec();

    // Applying manually is safer to ensure we use the same logic without re-fetching.
    // But we need to use 'update' object logic.
    // Let's create a helper or just duplicate logic for now (KISS).

    for (const doc of docs) {
      let changed = false;
      if (update.$addToSet && update.$addToSet.department) {
        const newDept = update.$addToSet.department;
        if (!Array.isArray(doc.department)) doc.department = [];
        const strDept = doc.department.map(d => d.toString());
        if (!strDept.includes(newDept.toString())) {
          doc.department.push(newDept);
          changed = true;
        }
      }
      if (update.$pull && update.$pull.department) {
        const removeDept = update.$pull.department;
        if (Array.isArray(doc.department)) {
          const lenBefore = doc.department.length;
          doc.department = doc.department.filter(d => d.toString() !== removeDept.toString());
          if (doc.department.length !== lenBefore) changed = true;
        }
      }

      // Top levels?
      // Typically updateMany isn't used for top levels in this app context (deleteDepartment), 
      // but strictly we should support it.
      for (const k of Object.keys(update)) {
        if (!k.startsWith('$') && doc[k] !== update[k]) {
          doc[k] = update[k];
          changed = true;
        }
      }

      if (changed) await doc.save();
    }
    return { modifiedCount: docs.length }; // Approximation
  },

  findByIdAndDelete: async (id) => {
    await pool.query('DELETE FROM employees WHERE id = ?', [id]);
    return true;
  },

  countDocuments: async (query) => {
    // Naive count
    const qb = new QueryBuilder(query);

    // Use internal optimized SQL if possible, or just exec and count length?
    // The previous implementation constructed SQL manually. Let's keep that pattern if possible,
    // OR just use qb.exec() and length (inefficient but compatible).
    // The previous implementation was:
    // let whereClauses = ...
    // ...
    // const [rows] = await pool.query(sql, params);
    // return rows[0].count;

    // I should ideally NOT replace the existing countDocuments unless I have to.
    // The previous replace_file_content target ENDED at line 480 which is inside `getStatsByDepartment`? 
    // Wait, the START line in my Plan was 412?
    // Let me check existing content again.

    // Line 412 is inside findByIdAndUpdate.
    // Line 441 is countDocuments.
    // Line 476 is getStatsByDepartment.
    // Ending at 480 might cut off getStatsByDepartment.

    // I will include countDocuments and getStatsByDepartment in the replacement content to be safe.

    // Re-implement countDocuments with QB or keep manual?
    // I'll keep manual logic but inside the replaced block.

    let whereClauses = [];
    let params = [];
    let hasDepartmentQuery = false;

    for (const [key, val] of Object.entries(query)) {
      if (val === undefined) continue;
      if (key === 'department') { hasDepartmentQuery = true; }
      else if (typeof val !== 'object') {
        whereClauses.push(`${key} = ?`);
        params.push(val);
      }
    }

    let sql = `SELECT COUNT(*) as count FROM employees e`;
    if (hasDepartmentQuery) {
      sql += ` JOIN employee_departments ed ON e.id = ed.employee_id`;
      whereClauses.push(`ed.department_id = ?`);
      params.push(query.department);
    }
    if (whereClauses.length > 0) sql += ` WHERE ${whereClauses.join(' AND ')}`;

    const [rows] = await pool.query(sql, params);
    return rows[0].count;
  },

  getStatsByDepartment: async () => {
    const sql = `SELECT ed.department_id, e.role, COUNT(*) as count FROM employees e JOIN employee_departments ed ON e.id = ed.employee_id GROUP BY ed.department_id, e.role`;
    const [rows] = await pool.query(sql);
    return rows;
  }
};

export default Employee;
