IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'units')
BEGIN
CREATE TABLE units (
  id INT IDENTITY(1,1) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255),
  [order] INT DEFAULT 0,
  isActive BIT DEFAULT 1,
  createdAt DATETIME2 DEFAULT GETDATE(),
  updatedAt DATETIME2 DEFAULT GETDATE()
);

CREATE INDEX idx_name ON units(name);
CREATE INDEX idx_order ON units([order]);
END
