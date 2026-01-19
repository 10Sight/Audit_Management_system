IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'audit_email_settings')
BEGIN
CREATE TABLE audit_email_settings (
  id INT IDENTITY(1,1) PRIMARY KEY,
  primary_recipients NVARCHAR(MAX), -- mapped from 'to'
  cc_recipients NVARCHAR(MAX),      -- mapped from 'cc'
  department_recipients NVARCHAR(MAX), -- stores array of objects
  createdAt DATETIME2 DEFAULT GETDATE(),
  updatedAt DATETIME2 DEFAULT GETDATE()
);
END
