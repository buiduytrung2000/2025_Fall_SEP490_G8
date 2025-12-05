-- Rollback Migration: Remove store receive note and received quantity fields
-- Date: 2025-12-05

USE CCMS_DB;

-- Drop indexes
DROP INDEX IF EXISTS idx_store_order_receive_note ON StoreOrder;
DROP INDEX IF EXISTS idx_store_order_item_received_quantity ON StoreOrderItem;

-- Remove store_receive_note field from StoreOrder table
ALTER TABLE StoreOrder 
DROP COLUMN IF EXISTS store_receive_note;

-- Remove received_quantity field from StoreOrderItem table
ALTER TABLE StoreOrderItem 
DROP COLUMN IF EXISTS received_quantity;

