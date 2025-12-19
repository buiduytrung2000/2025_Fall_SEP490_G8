-- Migration: Add composite index on (voucher_code, status) for CustomerVoucher table
-- This optimizes the UPDATE query used when marking vouchers as used during payment

-- Add composite index for faster voucher status updates
CREATE INDEX IF NOT EXISTS idx_customer_voucher_code_status 
ON CustomerVoucher(voucher_code, status);

