CREATE TABLE IF NOT EXISTS audit_email_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  primary_recipients TEXT, -- mapped from 'to'
  cc_recipients TEXT,      -- mapped from 'cc'
  department_recipients JSON, -- stores array of objects
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
