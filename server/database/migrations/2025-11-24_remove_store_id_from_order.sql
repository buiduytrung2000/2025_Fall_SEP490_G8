-- =====================================================
-- Migration: Remove store_id from Order table
-- Date: 2025-11-24
-- Description: Remove store_id field from Order table to support warehouse-to-supplier orders
--              Order table will be used for warehouse orders (warehouse -> supplier)
--              StoreOrder table will continue to be used for store orders (store -> warehouse/supplier)
-- =====================================================

USE CCMS_DB;

-- Step 1: Drop foreign key constraint
ALTER TABLE `Order`
    DROP FOREIGN KEY `Order_ibfk_1`;

-- Step 2: Drop index on store_id
ALTER TABLE `Order`
    DROP INDEX idx_order_store;

-- Step 3: Drop store_id column
ALTER TABLE `Order`
    DROP COLUMN store_id;

-- Note: This migration assumes that:
-- 1. The Order table is used for warehouse-to-supplier orders (no store_id needed)
-- 2. The StoreOrder table is used for store-to-warehouse/supplier orders (has store_id)
-- 3. Any existing data in Order table will lose the store_id reference
--    If you need to preserve this data, consider migrating it to StoreOrder table first

