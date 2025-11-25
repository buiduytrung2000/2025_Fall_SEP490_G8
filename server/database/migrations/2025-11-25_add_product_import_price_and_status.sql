-- =====================================================
-- Migration: Add import_price and is_active to Product table
-- Date: 2025-11-25
-- Description: Add import_price (cost price) and is_active (status) fields to Product table
--              to support soft delete functionality and cost tracking
-- =====================================================

USE CCMS_DB;

-- Add import_price column to Product table
ALTER TABLE Product
    ADD COLUMN import_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00
    COMMENT 'Giá nhập/giá vốn của sản phẩm'
    AFTER hq_price;

-- Add is_active column to Product table for soft delete
ALTER TABLE Product
    ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE
    COMMENT 'Trạng thái hoạt động của sản phẩm (TRUE = hoạt động, FALSE = đã xóa/vô hiệu hóa)'
    AFTER description;

-- Add index for is_active to improve query performance
ALTER TABLE Product
    ADD INDEX idx_product_is_active (is_active);

-- Note: This migration adds:
-- 1. import_price: Cost price for tracking profit margins
-- 2. is_active: Boolean flag for soft delete functionality
--    - TRUE (1): Product is active and available
--    - FALSE (0): Product is soft-deleted/disabled
-- 3. Index on is_active for efficient filtering of active products

