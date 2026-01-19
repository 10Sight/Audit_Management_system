IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'questions')
BEGIN
CREATE TABLE questions (
  id INT IDENTITY(1,1) PRIMARY KEY,
  questionText NVARCHAR(MAX) NOT NULL,
  templateTitle VARCHAR(255),
  department_id INT,
  questionType VARCHAR(50) DEFAULT 'yes_no' CHECK (questionType IN ('yes_no', 'mcq', 'short_text', 'image', 'dropdown')),
  options NVARCHAR(MAX),
  correctOptionIndex INT,
  imageUrl VARCHAR(255),
  isGlobal BIT DEFAULT 0,
  created_by_id INT,
  
  machine_ids NVARCHAR(MAX),
  line_ids NVARCHAR(MAX),
  process_ids NVARCHAR(MAX),
  unit_ids NVARCHAR(MAX),
  
  isActive BIT DEFAULT 1,
  createdAt DATETIME2 DEFAULT GETDATE(),
  updatedAt DATETIME2 DEFAULT GETDATE(),
  
  FOREIGN KEY (department_id) REFERENCES departments(id),
  FOREIGN KEY (created_by_id) REFERENCES employees(id)
);

CREATE INDEX idx_template_title ON questions(templateTitle);
CREATE INDEX idx_question_type ON questions(questionType);
CREATE INDEX idx_is_global ON questions(isGlobal);
END
