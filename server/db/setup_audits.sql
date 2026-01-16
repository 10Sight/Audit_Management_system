CREATE TABLE IF NOT EXISTS audits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date DATE NOT NULL,
  line VARCHAR(255), -- MongoDB ObjectId
  machine VARCHAR(255), -- MongoDB ObjectId
  process VARCHAR(255), -- MongoDB ObjectId
  unit VARCHAR(255), -- MongoDB ObjectId
  department VARCHAR(255), -- MongoDB ObjectId
  
  lineRating INT,
  machineRating INT,
  processRating INT,
  unitRating INT,
  
  lineLeader VARCHAR(255) NOT NULL,
  shift ENUM('Shift 1', 'Shift 2', 'Shift 3') NOT NULL,
  shiftIncharge VARCHAR(255) NOT NULL,
  
  auditor_id INT NOT NULL,
  created_by_id INT NOT NULL,
  
  answers JSON, -- Stores array of objects: { question, answer, remark, photos }
  
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (auditor_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_id) REFERENCES employees(id) ON DELETE CASCADE,
  
  INDEX idx_date (date),
  INDEX idx_line (line),
  INDEX idx_unit (unit),
  INDEX idx_department (department),
  INDEX idx_auditor (auditor_id),
  INDEX idx_created_by (created_by_id)
);
