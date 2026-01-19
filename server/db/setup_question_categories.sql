IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'question_categories')
BEGIN
CREATE TABLE question_categories (
  id INT IDENTITY(1,1) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255),
  
  questions NVARCHAR(MAX),
  departments NVARCHAR(MAX),
  
  created_by_id INT,
  
  isActive BIT DEFAULT 1,
  createdAt DATETIME2 DEFAULT GETDATE(),
  updatedAt DATETIME2 DEFAULT GETDATE(),
  
  FOREIGN KEY (created_by_id) REFERENCES employees(id) ON DELETE SET NULL
);

CREATE INDEX idx_name ON question_categories(name);
END
