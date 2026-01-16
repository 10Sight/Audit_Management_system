CREATE TABLE IF NOT EXISTS audit_form_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  unit VARCHAR(255),       -- MongoDB ObjectId
  department VARCHAR(255), -- MongoDB ObjectId
  form_title VARCHAR(255) DEFAULT 'Part and Quality Audit Performance',
  line_field JSON,         -- Stores object: { label, placeholder, enabled }
  machine_field JSON,      -- Stores object: { label, placeholder, enabled }
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_unit_department (unit, department),
  INDEX idx_department (department)
);
