IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'machines')
BEGIN
CREATE TABLE machines (
  id INT IDENTITY(1,1) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  department_id INT,
  line_id INT,
  description VARCHAR(255),
  isActive BIT DEFAULT 1,
  createdAt DATETIME2 DEFAULT GETDATE(),
  updatedAt DATETIME2 DEFAULT GETDATE(),
  
  FOREIGN KEY (department_id) REFERENCES departments(id),
  FOREIGN KEY (line_id) REFERENCES [lines](id)
);

CREATE INDEX idx_department ON machines(department_id);
CREATE INDEX idx_line ON machines(line_id);
CREATE UNIQUE INDEX idx_line_name ON machines (line_id, name);
END
