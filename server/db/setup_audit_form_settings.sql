IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'audit_form_settings')
BEGIN
CREATE TABLE audit_form_settings (
  id INT IDENTITY(1,1) PRIMARY KEY,
  unit VARCHAR(255),       -- MongoDB ObjectId
  department VARCHAR(255), -- MongoDB ObjectId
  form_title VARCHAR(255) DEFAULT 'Part and Quality Audit Performance',
  line_field NVARCHAR(MAX),         -- Stores object: { label, placeholder, enabled }
  machine_field NVARCHAR(MAX),      -- Stores object: { label, placeholder, enabled }
  createdAt DATETIME2 DEFAULT GETDATE(),
  updatedAt DATETIME2 DEFAULT GETDATE()
);

CREATE INDEX idx_unit_department ON audit_form_settings (unit, department);
CREATE INDEX idx_department ON audit_form_settings (department);
END
