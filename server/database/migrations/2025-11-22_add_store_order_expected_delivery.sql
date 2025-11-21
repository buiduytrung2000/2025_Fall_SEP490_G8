-- =====================================================
-- Migration: Add expected_delivery column to StoreOrder table
-- Date: 2025-11-22
-- Description: Add expected_delivery field to store the expected delivery date for warehouse orders
-- =====================================================

-- Add expected_delivery column to StoreOrder table
ALTER TABLE StoreOrder
    ADD COLUMN expected_delivery DATETIME NULL
    COMMENT 'Expected delivery date for the order'
    AFTER notes;

-- No data backfill is required; existing rows will keep NULL expected_delivery.

