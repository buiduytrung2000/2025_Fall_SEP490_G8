-- =====================================================
-- Migration: Add StockCountReport table for inventory stock count reports
-- Date: 2025-12-01
-- Description:
--   * Create StockCountReport table to track inventory stock count discrepancies
--   * Supports reporting of shortage, excess, and normal stock counts
--   * Links to WarehouseInventory, Product, and User tables
-- =====================================================

USE CCMS_DB;

-- Create StockCountReport table
CREATE TABLE IF NOT EXISTS StockCountReport (
    report_id INT PRIMARY KEY AUTO_INCREMENT,
    warehouse_inventory_id INT NOT NULL,
    product_id INT NOT NULL,
    system_stock BIGINT NOT NULL COMMENT 'Số lượng tồn kho trong hệ thống',
    actual_stock BIGINT NOT NULL COMMENT 'Số lượng thực tế khi kiểm kê',
    difference BIGINT NOT NULL COMMENT 'Chênh lệch (actual_stock - system_stock)',
    report_type ENUM('shortage', 'excess', 'normal') NOT NULL COMMENT 'shortage = thiếu, excess = thừa, normal = đúng',
    reason TEXT NULL COMMENT 'Lý do kiểm kê',
    notes TEXT NULL COMMENT 'Ghi chú bổ sung',
    reported_by INT NOT NULL COMMENT 'Người tạo báo cáo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (warehouse_inventory_id) REFERENCES WarehouseInventory(warehouse_inventory_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES Product(product_id) ON DELETE CASCADE,
    FOREIGN KEY (reported_by) REFERENCES User(user_id) ON DELETE CASCADE,
    INDEX idx_stock_count_report_inventory (warehouse_inventory_id),
    INDEX idx_stock_count_report_product (product_id),
    INDEX idx_stock_count_report_type (report_type),
    INDEX idx_stock_count_report_reported_by (reported_by),
    INDEX idx_stock_count_report_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Note: This migration creates:
-- 1. StockCountReport table to store inventory stock count reports
-- 2. Tracks system stock vs actual stock with difference calculation
-- 3. Report types: 'shortage' (thiếu), 'excess' (thừa), 'normal' (đúng)
-- 4. Links to WarehouseInventory, Product, and User tables
-- 5. Indexes for efficient querying by inventory, product, type, reporter, and date

