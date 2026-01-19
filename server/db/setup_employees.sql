IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'employees')
BEGIN
CREATE TABLE employees (
  id INT IDENTITY(1,1) PRIMARY KEY,
  fullName VARCHAR(255) NOT NULL,
  emailId VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  employeeId VARCHAR(255) NOT NULL UNIQUE,
  username VARCHAR(255),
  phoneNumber VARCHAR(20),
  role VARCHAR(20) DEFAULT 'employee' CHECK (role IN ('SuperSuperadmin', 'superadmin', 'admin', 'employee')),
  unit VARCHAR(255), -- Storing Unit ObjectId as string
  targetAudit NVARCHAR(MAX),
  createdAt DATETIME2 DEFAULT GETDATE(),
  updatedAt DATETIME2 DEFAULT GETDATE()
);

CREATE INDEX idx_email ON employees(emailId);
CREATE INDEX idx_username ON employees(username);
CREATE INDEX idx_role ON employees(role);
END

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'employee_departments')
BEGIN
CREATE TABLE employee_departments (
  employee_id INT,
  department_id VARCHAR(255), -- Storing Department ObjectId as string
  PRIMARY KEY (employee_id, department_id),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);
END
