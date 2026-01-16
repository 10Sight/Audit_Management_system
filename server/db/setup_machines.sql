CREATE TABLE IF NOT EXISTS machines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  department_id INT,
  line_id INT,
  description VARCHAR(255),
  isActive BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (line_id) REFERENCES \`lines\`(id) ON DELETE SET NULL,
  
  INDEX idx_department (department_id),
  INDEX idx_line (line_id)
);

-- Unique name per line
CREATE UNIQUE INDEX idx_line_name ON machines (line_id, name);

-- Unique name per department where line is NULL (simulated)
-- MySQL unique index allows multiple NULLs in standard SQL, but we want uniqueness for "no line".
-- However, if line_id is NULL, we want (department_id, name) to be unique.
-- The existing Mongoose logic:
-- unique: true, partialFilterExpression: { line: { $type: "objectId" } }
-- unique: true, partialFilterExpression: { department: { $type: "objectId" }, line: { $eq: null } }

-- In MySQL, a UNIQUE constraint on (line_id, name) allows multiple (NULL, 'Machine1').
-- To enforce uniqueness when line_id is NULL, we can add a generated column or just rely on application logic + normal unique index if MySQL version supports function-based index (versions 8.0.13+).
-- Assuming standard MySQL 5.7/8.0 without generated column complexity unless critical.
-- We can TRY to create a unique index on (department_id, name, line_id) ? No, that still allows multiple (1, 'M', NULL).
-- ACTUALLY, in MySQL, multiple NULLs are allowed in UNIQUE index.
-- So we cannot strictly enforce the "Unique per department if line is null" at DB level easily without generated columns like `line_id_or_default`.
-- I will add the standard unique index on (line_id, name) and (department_id, name) but usually this might conflict if same name in different lines of same department? No.
-- Wait, if I have Line A and Line B in Dept D.
-- Machine M1 in Line A -> (Line A, M1) unique.
-- Machine M1 in Line B -> (Line B, M1) unique.
-- Machine M1 in Dept D (no line) -> (Dept D, M1).
-- If I add UNIQUE (department_id, name), then M1 in Line A (Dept D) and M1 in Line B (Dept D) would conflict!
-- So I cannot add UNIQUE(department_id, name) globally.
-- I need it ONLY when line_id IS NULL.
-- I will skip the DB-level constraint for the "line is null" case and enforce it in the controller/model, OR use a trick.
-- For now, I'll rely on (line_id, name) unique index (which works for non-null lines) and application logic for null lines.
