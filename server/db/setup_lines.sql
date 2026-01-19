IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'lines')
BEGIN
CREATE TABLE [lines] (
  id INT IDENTITY(1,1) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  department_id INT,
  [order] INT DEFAULT 0,
  description VARCHAR(255),
  isActive BIT DEFAULT 1,
  createdAt DATETIME2 DEFAULT GETDATE(),
  updatedAt DATETIME2 DEFAULT GETDATE(),
  
  FOREIGN KEY (department_id) REFERENCES departments(id)
);

CREATE INDEX idx_department ON [lines](department_id);
CREATE INDEX idx_order ON [lines]([order]);
CREATE UNIQUE INDEX idx_dept_name ON [lines] (department_id, name);
END
