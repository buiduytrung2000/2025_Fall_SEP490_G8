-- Migration: Create StoreOrder and StoreOrderItem tables
-- Description: Tables for orders created by Store Manager to send to Warehouse Manager

-- StoreOrder table
CREATE TABLE IF NOT EXISTS StoreOrder (
    store_order_id INT PRIMARY KEY AUTO_INCREMENT,
    store_id INT NOT NULL,
    created_by INT NOT NULL,
    order_type ENUM('ToWarehouse', 'ToSupplier') NOT NULL DEFAULT 'ToWarehouse',
    target_warehouse VARCHAR(255) NULL COMMENT 'Warehouse name for ToWarehouse orders',
    supplier_id INT NULL COMMENT 'Supplier ID for ToSupplier orders',
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    status ENUM('pending', 'approved', 'rejected', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    perishable BOOLEAN DEFAULT FALSE COMMENT 'For fresh goods',
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES Store(store_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES User(user_id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES Supplier(supplier_id) ON DELETE SET NULL,
    INDEX idx_store_order_store (store_id),
    INDEX idx_store_order_created_by (created_by),
    INDEX idx_store_order_status (status),
    INDEX idx_store_order_type (order_type),
    INDEX idx_store_order_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- StoreOrderItem table
CREATE TABLE IF NOT EXISTS StoreOrderItem (
    store_order_item_id INT PRIMARY KEY AUTO_INCREMENT,
    store_order_id INT NOT NULL,
    product_id INT NULL COMMENT 'Product ID if product exists in system',
    sku VARCHAR(100) NULL COMMENT 'Product SKU',
    product_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (store_order_id) REFERENCES StoreOrder(store_order_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES Product(product_id) ON DELETE SET NULL,
    INDEX idx_store_order_item_order (store_order_id),
    INDEX idx_store_order_item_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

