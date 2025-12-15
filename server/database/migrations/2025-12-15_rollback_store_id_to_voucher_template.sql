-- Rollback Migration: Remove store_id from VoucherTemplate
-- Date: 2025-12-15

USE CCMS_DB;

-- Drop foreign key constraint if exists
ALTER TABLE VoucherTemplate
DROP FOREIGN KEY fk_voucher_template_store;

-- Drop index if exists
DROP INDEX IF EXISTS idx_voucher_template_store ON VoucherTemplate;

-- Drop column if exists
ALTER TABLE VoucherTemplate
DROP COLUMN IF EXISTS store_id;


