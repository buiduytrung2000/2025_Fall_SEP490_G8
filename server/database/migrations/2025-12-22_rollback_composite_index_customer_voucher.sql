-- Rollback Migration: Remove composite index on (voucher_code, status) from CustomerVoucher table

DROP INDEX IF EXISTS idx_customer_voucher_code_status ON CustomerVoucher;

