IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'audits')
BEGIN
CREATE TABLE audits (
  id INT IDENTITY(1,1) PRIMARY KEY,
  date DATE NOT NULL,
  line VARCHAR(255), -- MongoDB ObjectId
  machine VARCHAR(255),
  process VARCHAR(255),
  unit VARCHAR(255),
  department VARCHAR(255),
  
  lineRating INT,
  machineRating INT,
  processRating INT,
  unitRating INT,
  
  lineLeader VARCHAR(255) NOT NULL,
  shift VARCHAR(50) NOT NULL CHECK (shift IN ('Shift 1', 'Shift 2', 'Shift 3')),
  shiftIncharge VARCHAR(255) NOT NULL,
  
  auditor_id INT NOT NULL,
  created_by_id INT NOT NULL,
  
  answers NVARCHAR(MAX), -- JSON string
  
  createdAt DATETIME2 DEFAULT GETDATE(),
  updatedAt DATETIME2 DEFAULT GETDATE(),
  
  FOREIGN KEY (auditor_id) REFERENCES employees(id),
  FOREIGN KEY (created_by_id) REFERENCES employees(id)
);

CREATE INDEX idx_date ON audits(date);
CREATE INDEX idx_line ON audits(line);
CREATE INDEX idx_unit ON audits(unit);
CREATE INDEX idx_department ON audits(department);
CREATE INDEX idx_auditor ON audits(auditor_id);
CREATE INDEX idx_created_by ON audits(created_by_id);
END
