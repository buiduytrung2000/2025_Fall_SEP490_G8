-- Migration: Create WarehouseInventory table
-- Description: Create separate inventory table for warehouse (main warehouse) management
-- Date: 2025-11-18

USE CCMS_DB;

-- Create WarehouseInventory table for warehouse stock management
CREATE TABLE IF NOT EXISTS WarehouseInventory (
    warehouse_inventory_id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    min_stock_level INT NOT NULL DEFAULT 0,
    reorder_point INT NOT NULL DEFAULT 0,
    location VARCHAR(255) NULL COMMENT 'Vị trí trong kho (ví dụ: Kho chính, Kho lạnh, Kho đồ khô)',
    notes TEXT NULL COMMENT 'Ghi chú về tồn kho',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES Product(product_id) ON DELETE CASCADE,
    UNIQUE KEY unique_warehouse_product (product_id),
    INDEX idx_warehouse_inventory_product (product_id),
    INDEX idx_warehouse_inventory_stock (stock),
    INDEX idx_warehouse_inventory_location (location)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

