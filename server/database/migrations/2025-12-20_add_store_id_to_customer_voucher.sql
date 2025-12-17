-- Migration: Add store_id to CustomerVoucher for tracking which store created the voucher
-- Date: 2025-12-20
-- Description: Track store_id when vouchers are created from templates

USE CCMS_DB;

ALTER TABLE CustomerVoucher
ADD COLUMN store_id INT NULL AFTER transaction_id;

ALTER TABLE CustomerVoucher
ADD CONSTRAINT fk_customer_voucher_store
    FOREIGN KEY (store_id) REFERENCES Store(store_id)
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX idx_customer_voucher_store ON CustomerVoucher(store_id);



