IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'departments')
BEGIN
CREATE TABLE departments (
  id INT IDENTITY(1,1) PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  description VARCHAR(200),
  isActive BIT DEFAULT 1,
  unit VARCHAR(255),       -- MongoDB ObjectId
  created_by_id INT,
  employeeCount INT DEFAULT 0,
  staffByShift NVARCHAR(MAX),       -- Stores array of objects: { shift, lineLeaders: [], shiftIncharges: [] }
  createdAt DATETIME2 DEFAULT GETDATE(),
  updatedAt DATETIME2 DEFAULT GETDATE(),
  
  FOREIGN KEY (created_by_id) REFERENCES employees(id)
);

CREATE INDEX idx_unit ON departments(unit);
CREATE INDEX idx_isActive ON departments(isActive);
CREATE UNIQUE INDEX idx_name_unit ON departments (name, unit);
END
