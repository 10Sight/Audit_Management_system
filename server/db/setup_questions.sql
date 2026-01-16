CREATE TABLE IF NOT EXISTS questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  questionText TEXT NOT NULL,
  templateTitle VARCHAR(255),
  department_id INT,
  questionType ENUM('yes_no', 'mcq', 'short_text', 'image', 'dropdown') DEFAULT 'yes_no',
  options JSON,
  correctOptionIndex INT,
  imageUrl VARCHAR(255),
  isGlobal BOOLEAN DEFAULT FALSE,
  created_by_id INT,
  
  -- Relationship Arrays stored as JSON
  machine_ids JSON,
  line_ids JSON,
  process_ids JSON,
  unit_ids JSON,
  
  isActive BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by_id) REFERENCES employees(id) ON DELETE SET NULL,
  
  INDEX idx_template_title (templateTitle),
  INDEX idx_question_type (questionType),
  INDEX idx_is_global (isGlobal)
);
