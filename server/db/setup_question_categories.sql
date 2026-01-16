CREATE TABLE IF NOT EXISTS question_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255),
  
  -- Relationship Arrays stored as JSON
  questions JSON,
  departments JSON,
  
  created_by_id INT,
  
  isActive BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (created_by_id) REFERENCES employees(id) ON DELETE SET NULL,
  
  INDEX idx_name (name)
);
