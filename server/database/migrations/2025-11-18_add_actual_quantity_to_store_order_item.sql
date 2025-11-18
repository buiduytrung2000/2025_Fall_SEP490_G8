-- Migration: Add actual_quantity column to StoreOrderItem table
-- Description: Add actual_quantity field to track adjusted quantities after warehouse processing
-- Date: 2025-11-18

USE CCMS_DB;

-- Add actual_quantity column to StoreOrderItem table
ALTER TABLE StoreOrderItem
ADD COLUMN actual_quantity INT NULL
COMMENT 'Số lượng thực tế sau khi điều chỉnh'
AFTER quantity;

-- Add index for better query performance
CREATE INDEX idx_store_order_item_actual_quantity ON StoreOrderItem(actual_quantity);

