-- Add cash payment fields to Payment table
-- This migration adds fields to track cash received and change amount for cash payments

ALTER TABLE Payment
ADD COLUMN cash_received DECIMAL(10, 2) NULL COMMENT 'Amount of cash received from customer (for cash payment)';
