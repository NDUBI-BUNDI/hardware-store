-- Bootstrap SQL for DASHEL Hardware Store (Development)
-- Use this file to create the full development database, schema, sample data
-- and helper objects (views, stored procedures, triggers) for development and testing.
--
-- IMPORTANT: Review and adapt usernames/passwords and environment-specific settings
-- before running in production.

-- 1) Create database and switch to it
CREATE DATABASE IF NOT EXISTS `hardware_store` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `hardware_store`;

-- 2) Core tables
-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  email VARCHAR(255),
  address TEXT,
  products_supplied TEXT,
  payment_terms VARCHAR(100),
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Inventory
CREATE TABLE IF NOT EXISTS inventory (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_name VARCHAR(255) NOT NULL,
  sku VARCHAR(100) DEFAULT NULL,
  quantity INT NOT NULL DEFAULT 0,
  buying_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  selling_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  supplier_id INT DEFAULT NULL,
  reorder_level INT DEFAULT 10,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_product_name (product_name),
  INDEX idx_supplier_id (supplier_id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Sales
CREATE TABLE IF NOT EXISTS sales (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_id INT,
  product_name VARCHAR(255) NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  sale_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_sale_date (sale_date),
  INDEX idx_product_id (product_id),
  FOREIGN KEY (product_id) REFERENCES inventory(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- M-Pesa STK pushes
CREATE TABLE IF NOT EXISTS stk_pushes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  phone VARCHAR(32) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  reference VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  response TEXT,
  merchant_request_id VARCHAR(100),
  checkout_request_id VARCHAR(100),
  result_code VARCHAR(16),
  result_desc TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_phone (phone),
  INDEX idx_status (status),
  INDEX idx_reference (reference)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Supplier invoices & payments
CREATE TABLE IF NOT EXISTS supplier_invoices (
  id INT PRIMARY KEY AUTO_INCREMENT,
  supplier_id INT NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_supplier_invoice_supplier (supplier_id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS supplier_payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  supplier_id INT NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  method VARCHAR(100) DEFAULT NULL,
  reference VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_supplier_payment_supplier (supplier_id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Users (for development, simple local auth)
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Audit logs (generic)
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT DEFAULT NULL,
  action VARCHAR(100) NOT NULL,
  table_name VARCHAR(100),
  record_id INT,
  old_data JSON DEFAULT NULL,
  new_data JSON DEFAULT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3) Views for reporting
-- Supplier balances view (invoices total, payments total, owed)
CREATE OR REPLACE VIEW vw_supplier_balances AS
SELECT
  s.id,
  s.name,
  COALESCE((SELECT SUM(amount) FROM supplier_invoices si WHERE si.supplier_id = s.id),0) AS invoices_total,
  COALESCE((SELECT SUM(amount) FROM supplier_payments sp WHERE sp.supplier_id = s.id),0) AS payments_total,
  (COALESCE((SELECT SUM(amount) FROM supplier_invoices si WHERE si.supplier_id = s.id),0) - COALESCE((SELECT SUM(amount) FROM supplier_payments sp WHERE sp.supplier_id = s.id),0)) AS owed
FROM suppliers s
WHERE s.is_active = 1;

-- 4) Stored procedures/helpers (simple, for dev)
-- Add supplier invoice
DROP PROCEDURE IF EXISTS sp_add_supplier_invoice;
DELIMITER $$
CREATE PROCEDURE sp_add_supplier_invoice(IN p_supplier_id INT, IN p_amount DECIMAL(14,2), IN p_description TEXT)
BEGIN
  INSERT INTO supplier_invoices (supplier_id, amount, description) VALUES (p_supplier_id, p_amount, p_description);
  INSERT INTO audit_logs (action, table_name, record_id, new_data) VALUES ('create_invoice', 'supplier_invoices', LAST_INSERT_ID(), CONCAT('{"supplier_id":', p_supplier_id, ',"amount":', p_amount, '}'));
END$$
DELIMITER ;

-- Add supplier payment
DROP PROCEDURE IF EXISTS sp_add_supplier_payment;
DELIMITER $$
CREATE PROCEDURE sp_add_supplier_payment(IN p_supplier_id INT, IN p_amount DECIMAL(14,2), IN p_method VARCHAR(100), IN p_reference VARCHAR(255))
BEGIN
  INSERT INTO supplier_payments (supplier_id, amount, method, reference) VALUES (p_supplier_id, p_amount, p_method, p_reference);
  INSERT INTO audit_logs (action, table_name, record_id, new_data) VALUES ('create_payment', 'supplier_payments', LAST_INSERT_ID(), CONCAT('{"supplier_id":', p_supplier_id, ',"amount":', p_amount, '}'));
END$$
DELIMITER ;

-- 5) Triggers to populate audit_logs on updates/deletes for key tables
-- Trigger template for supplier_invoices (AFTER UPDATE/DELETE)
DROP TRIGGER IF EXISTS trg_supplier_invoices_update;
DELIMITER $$
CREATE TRIGGER trg_supplier_invoices_update AFTER UPDATE ON supplier_invoices
FOR EACH ROW
BEGIN
  INSERT INTO audit_logs (action, table_name, record_id, old_data, new_data) VALUES
    ('update', 'supplier_invoices', OLD.id, JSON_OBJECT('supplier_id', OLD.supplier_id, 'amount', OLD.amount, 'description', OLD.description), JSON_OBJECT('supplier_id', NEW.supplier_id, 'amount', NEW.amount, 'description', NEW.description));
END$$
DELIMITER ;

DROP TRIGGER IF EXISTS trg_supplier_invoices_delete;
DELIMITER $$
CREATE TRIGGER trg_supplier_invoices_delete AFTER DELETE ON supplier_invoices
FOR EACH ROW
BEGIN
  INSERT INTO audit_logs (action, table_name, record_id, old_data) VALUES
    ('delete', 'supplier_invoices', OLD.id, JSON_OBJECT('supplier_id', OLD.supplier_id, 'amount', OLD.amount, 'description', OLD.description));
END$$
DELIMITER ;

-- Triggers for supplier_payments
DROP TRIGGER IF EXISTS trg_supplier_payments_update;
DELIMITER $$
CREATE TRIGGER trg_supplier_payments_update AFTER UPDATE ON supplier_payments
FOR EACH ROW
BEGIN
  INSERT INTO audit_logs (action, table_name, record_id, old_data, new_data) VALUES
    ('update', 'supplier_payments', OLD.id, JSON_OBJECT('supplier_id', OLD.supplier_id, 'amount', OLD.amount, 'method', OLD.method), JSON_OBJECT('supplier_id', NEW.supplier_id, 'amount', NEW.amount, 'method', NEW.method));
END$$
DELIMITER ;

DROP TRIGGER IF EXISTS trg_supplier_payments_delete;
DELIMITER $$
CREATE TRIGGER trg_supplier_payments_delete AFTER DELETE ON supplier_payments
FOR EACH ROW
BEGIN
  INSERT INTO audit_logs (action, table_name, record_id, old_data) VALUES
    ('delete', 'supplier_payments', OLD.id, JSON_OBJECT('supplier_id', OLD.supplier_id, 'amount', OLD.amount, 'method', OLD.method));
END$$
DELIMITER ;

-- 6) Sample data for development
INSERT INTO suppliers (name, phone, email, address, products_supplied, payment_terms)
VALUES
('Nairobi Cement Supplies', '+254712345678', 'info@nairobi-cement.com', 'Nairobi Industrial Area', 'Cement, Sand, Gravel', 'Net 30'),
('East Africa Steel Ltd', '+254723456789', 'sales@eastafricsteel.com', 'Mombasa Port Area', 'Steel Bars, Iron Sheets', 'Net 60'),
('Premium Paint Co', '+254734567890', 'contact@premiumpaint.com', 'Westlands, Nairobi', 'Paint, Varnish, Primers', 'Net 45');

INSERT INTO inventory (product_name, sku, quantity, buying_price, selling_price, supplier_id, reorder_level, description)
VALUES
('Cement 50kg', 'CEM-50', 150, 400.00, 500.00, 1, 50, 'Portland Cement 50kg bags'),
('Steel Bars 12mm', 'STB-12', 200, 800.00, 1000.00, 2, 30, 'High grade steel bars'),
('Paint White 20L', 'PNT-20W', 75, 2000.00, 2800.00, 3, 20, 'Exterior White Paint 20 liters');

-- Create a test user (password is plaintext here for dev; in production use hashed passwords)
INSERT INTO users (username, email, password, full_name, role) VALUES ('admin', 'admin@example.com', 'password', 'Administrator', 'admin');

-- Example invoices and payments
INSERT INTO supplier_invoices (supplier_id, amount, description) VALUES (1, 50000.00, 'Initial stock invoice'), (2, 120000.00, 'Steel order');
INSERT INTO supplier_payments (supplier_id, amount, method, reference) VALUES (1, 25000.00, 'Bank Transfer', 'BT-001');

-- 7) Helpful queries and notes
-- Check supplier balances: SELECT * FROM vw_supplier_balances;
-- Get supplier ledger: SELECT * FROM supplier_invoices WHERE supplier_id = ? UNION ALL SELECT * FROM supplier_payments WHERE supplier_id = ? ORDER BY created_at DESC;

-- Bank payments table for CSV-batch payouts (Equity CSV flow)
CREATE TABLE IF NOT EXISTS bank_payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  supplier_id INT NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  currency VARCHAR(8) DEFAULT 'KES',
  bank_name VARCHAR(128) DEFAULT NULL,
  account_number VARCHAR(64) DEFAULT NULL,
  branch VARCHAR(128) DEFAULT NULL,
  status ENUM('draft','exported','paid','failed') DEFAULT 'draft',
  batch_id VARCHAR(64) DEFAULT NULL,
  exported_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_bankpayments_supplier (supplier_id),
  INDEX idx_bankpayments_batch (batch_id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add supplier bank detail columns (if not present) to assist CSV generation / display
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS bank_name VARCHAR(128) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bank_account VARCHAR(64) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bank_branch VARCHAR(128) DEFAULT NULL;

-- End of bootstrap.sql

-- Add STK push metadata columns to support merchant mapping and retries
ALTER TABLE stk_pushes
  ADD COLUMN IF NOT EXISTS paybill VARCHAR(64) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS merchant_account VARCHAR(128) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS attempts INT DEFAULT 0;
