-- =====================================================
-- Migration: Add order_code column to Order table
-- Date: 2025-11-25
-- Description: Store a human-friendly alphanumeric code (length 5)
--               for warehouse-to-supplier orders.
-- =====================================================

USE CCMS_DB;

ALTER TABLE `Order`
    ADD COLUMN order_code VARCHAR(8) NULL AFTER order_id;

UPDATE `Order`
SET order_code = CONCAT('OD', LPAD(order_id, 3, '0'))
WHERE order_code IS NULL;

ALTER TABLE `Order` 
    MODIFY COLUMN order_code VARCHAR(8) NOT NULL,
    ADD UNIQUE KEY uq_order_code (order_code);

