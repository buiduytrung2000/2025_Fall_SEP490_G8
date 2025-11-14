-- MySQL migration: create shifts and shift_cash_movements, link Transaction.shift_id
-- Ensure to run after core tables (Store, User, Transaction, Payment) exist

-- ENUMs in MySQL are inline in columns

-- shifts table
CREATE TABLE IF NOT EXISTS Shift (
  shift_id INT PRIMARY KEY AUTO_INCREMENT,
  store_id INT NOT NULL,
  cashier_id INT NOT NULL,
  opened_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at DATETIME NULL,
  opening_cash DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  closing_cash DECIMAL(14,2) NULL,
  cash_sales_total DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  status ENUM('opened','closed','cancelled') NOT NULL DEFAULT 'opened',
  note TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_shift_store FOREIGN KEY (store_id) REFERENCES Store(store_id) ON DELETE CASCADE,
  CONSTRAINT fk_shift_cashier FOREIGN KEY (cashier_id) REFERENCES User(user_id) ON DELETE CASCADE,
  INDEX idx_shift_store (store_id),
  INDEX idx_shift_cashier (cashier_id),
  INDEX idx_shift_status (status),
  INDEX idx_shift_opened_at (opened_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- enforce at most one open shift per cashier per store via partial-like workaround
-- MySQL doesn't support partial unique index; emulate via trigger or app logic.
-- We'll add a composite key for (store_id, cashier_id, opened_at) and enforce in service.

-- shift_cash_movements table
CREATE TABLE IF NOT EXISTS ShiftCashMovement (
  movement_id INT PRIMARY KEY AUTO_INCREMENT,
  shift_id INT NOT NULL,
  type ENUM('cash_in','cash_out') NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  reason TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_scm_shift FOREIGN KEY (shift_id) REFERENCES Shift(shift_id) ON DELETE CASCADE,
  INDEX idx_scm_shift (shift_id),
  INDEX idx_scm_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- add shift_id to Transaction
ALTER TABLE Transaction
  ADD COLUMN shift_id INT NULL AFTER store_id;

ALTER TABLE Transaction
  ADD CONSTRAINT fk_transaction_shift FOREIGN KEY (shift_id) REFERENCES Shift(shift_id) ON DELETE SET NULL;

CREATE INDEX idx_transaction_shift ON Transaction(shift_id);

