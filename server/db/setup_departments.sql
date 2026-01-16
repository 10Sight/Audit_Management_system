CREATE TABLE IF NOT EXISTS departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  description VARCHAR(200),
  isActive BOOLEAN DEFAULT TRUE,
  unit VARCHAR(255),       -- MongoDB ObjectId
  created_by_id INT,
  employeeCount INT DEFAULT 0,
  staffByShift JSON,       -- Stores array of objects: { shift, lineLeaders: [], shiftIncharges: [] }
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (created_by_id) REFERENCES employees(id) ON DELETE SET NULL,
  
  INDEX idx_unit (unit),
  INDEX idx_isActive (isActive)
);

-- Unique name per unit constraint (handled via unique index)
-- Note: In MySQL, NULL values in unique index are treated as distinct (multiple NULLs allowed).
-- If unit is NULL, we might have multiple departments with same name? 
-- The original Mongo schema had: unique: true, partialFilterExpression: { unit: { $exists: true, $ne: null } }
-- We can simulate this with a UNIQUE INDEX on (name, unit). 
-- If unit is NULL, standard SQL usually allows duplicates. If we want to prevent that or replicate exact Mongo behavior is tricky.
-- Given 'unit' is usually required in practice or we can make it part of Unique Index.
CREATE UNIQUE INDEX idx_name_unit ON departments (name, unit);
