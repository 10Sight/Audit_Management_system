CREATE TABLE IF NOT EXISTS `lines` (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  department_id INT,
  `order` INT DEFAULT 0,  -- Quoted to allow usage, or we can use line_order. Let's use `order` with backticks in queries or map it.
  description VARCHAR(255),
  isActive BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  
  INDEX idx_department (department_id),
  INDEX idx_order (`order`)
);

-- Unique name per department
CREATE UNIQUE INDEX idx_dept_name ON `lines` (department_id, name);
