-- Rollback Migration: Remove store_id from CustomerVoucher
-- Date: 2025-12-20

USE CCMS_DB;

-- Drop foreign key constraint if exists
ALTER TABLE CustomerVoucher
DROP FOREIGN KEY fk_customer_voucher_store;

-- Drop index if exists
DROP INDEX IF EXISTS idx_customer_voucher_store ON CustomerVoucher;

-- Drop column if exists
ALTER TABLE CustomerVoucher
DROP COLUMN IF EXISTS store_id;



