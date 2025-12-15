-- Migration: Add store_id to VoucherTemplate for per-store vouchers
-- Date: 2025-12-15
-- Description: Scope voucher templates by store

USE CCMS_DB;

ALTER TABLE VoucherTemplate
ADD COLUMN store_id INT NULL AFTER voucher_template_id;

ALTER TABLE VoucherTemplate
ADD CONSTRAINT fk_voucher_template_store
    FOREIGN KEY (store_id) REFERENCES Store(store_id)
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX idx_voucher_template_store ON VoucherTemplate(store_id);


