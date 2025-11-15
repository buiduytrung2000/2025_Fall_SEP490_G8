-- Migration: Add fields for PayOS integration and enhanced transaction tracking
-- Date: 2025-01-11

USE CCMS_DB;

-- Add PayOS fields to Payment table
ALTER TABLE Payment 
ADD COLUMN payos_order_code BIGINT NULL COMMENT 'PayOS order code for QR payment',
ADD COLUMN payos_payment_link_id VARCHAR(255) NULL COMMENT 'PayOS payment link ID',
ADD COLUMN payos_transaction_reference VARCHAR(255) NULL COMMENT 'PayOS transaction reference';

-- Add enhanced fields to Transaction table
ALTER TABLE Transaction
ADD COLUMN cashier_id INT NULL COMMENT 'User ID of the cashier who processed the transaction',
ADD COLUMN subtotal DECIMAL(10, 2) NULL COMMENT 'Subtotal before tax and discount',
ADD COLUMN tax_amount DECIMAL(10, 2) DEFAULT 0 COMMENT 'VAT amount',
ADD COLUMN discount_amount DECIMAL(10, 2) DEFAULT 0 COMMENT 'Discount from voucher',
ADD COLUMN voucher_code VARCHAR(50) NULL COMMENT 'Applied voucher code';

-- Add foreign key for cashier_id if not exists
-- Note: This will fail if the constraint already exists, which is fine
ALTER TABLE Transaction
ADD CONSTRAINT fk_transaction_cashier 
FOREIGN KEY (cashier_id) REFERENCES User(user_id) ON DELETE SET NULL;

-- Add indexes for better query performance
CREATE INDEX idx_payment_payos_order_code ON Payment(payos_order_code);
CREATE INDEX idx_payment_payos_payment_link_id ON Payment(payos_payment_link_id);
CREATE INDEX idx_transaction_cashier ON Transaction(cashier_id);
CREATE INDEX idx_transaction_voucher_code ON Transaction(voucher_code);

