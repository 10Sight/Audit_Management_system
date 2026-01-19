IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'processes')
BEGIN
CREATE TABLE processes (
  id INT IDENTITY(1,1) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255),
  isActive BIT DEFAULT 1,
  createdAt DATETIME2 DEFAULT GETDATE(),
  updatedAt DATETIME2 DEFAULT GETDATE()
);

CREATE INDEX idx_name ON processes(name);
END
