-- Migration: Add payment fields for cash and bank transfer handling
-- Date: 2025-11-11
-- Description: Add given_amount, change_amount, and reference columns to Payment table

USE CCMS_DB;

-- Add new columns to Payment table
ALTER TABLE Payment
ADD COLUMN given_amount DECIMAL(10, 2) NULL COMMENT 'For cash: amount customer gave',
ADD COLUMN change_amount DECIMAL(10, 2) NULL COMMENT 'For cash: change to return',
--ADD COLUMN reference VARCHAR(255) NULL COMMENT 'For bank transfer: transaction reference';

-- Create index for reference if bank transfer lookups are needed
CREATE INDEX idx_payment_reference ON Payment(reference);

-- Verification query (uncomment to check)
-- SELECT payment_id, method, amount, given_amount, change_amount, reference, status FROM Payment LIMIT 5;
