-- Migration: Add fields to store receive note and received quantity
-- Date: 2025-12-05
-- Description: Add store_receive_note to StoreOrder and received_quantity to StoreOrderItem

USE CCMS_DB;

-- Add store_receive_note field to StoreOrder table
ALTER TABLE StoreOrder 
ADD COLUMN store_receive_note TEXT NULL COMMENT 'Ghi chú khi cửa hàng xác nhận đã nhận hàng' AFTER notes;

-- Add received_quantity field to StoreOrderItem table
ALTER TABLE StoreOrderItem 
ADD COLUMN received_quantity INT NULL COMMENT 'Số lượng nhận thực tế từ cửa hàng' AFTER actual_quantity;

-- Add index for better query performance
CREATE INDEX idx_store_order_receive_note ON StoreOrder(store_receive_note(255));
CREATE INDEX idx_store_order_item_received_quantity ON StoreOrderItem(received_quantity);

