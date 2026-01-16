CREATE TABLE IF NOT EXISTS employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fullName VARCHAR(255) NOT NULL,
  emailId VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  employeeId VARCHAR(255) NOT NULL UNIQUE,
  username VARCHAR(255),
  phoneNumber VARCHAR(20),
  role ENUM('SuperSuperadmin', 'superadmin', 'admin', 'employee') DEFAULT 'employee',
  unit VARCHAR(255), -- Storing Unit ObjectId as string
  targetAudit JSON,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (emailId),
  INDEX idx_username (username),
  INDEX idx_role (role)
);

CREATE TABLE IF NOT EXISTS employee_departments (
  employee_id INT,
  department_id VARCHAR(255), -- Storing Department ObjectId as string
  PRIMARY KEY (employee_id, department_id),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);
