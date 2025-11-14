-- Migration: Add unique constraint to prevent multiple open shifts per cashier per store
-- Date: 2025-11-14
-- Description: MySQL doesn't support partial unique indexes, so we enforce via application logic
-- This migration adds a composite index to help with queries, but uniqueness is enforced in service layer

USE CCMS_DB;

-- Add composite index for faster lookups (enforcing uniqueness in app layer)
CREATE INDEX idx_shift_store_cashier_status ON Shift(store_id, cashier_id, status);

-- Note: Uniqueness constraint for (store_id, cashier_id) where status='opened' 
-- is enforced in application logic (shift service checkin function)

