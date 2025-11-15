-- =====================================================
-- CCMS Database Schema - MySQL
-- =====================================================
-- Database: CCMS_DB
-- =====================================================

-- Drop database if exists (for fresh start)
-- DROP DATABASE IF EXISTS CCMS_DB;

-- Create database
CREATE DATABASE IF NOT EXISTS CCMS_DB;
USE CCMS_DB;

-- =====================================================
-- 1. STORE TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS Store (
    store_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    status ENUM('active', 'inactive', 'maintenance') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_store_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 2. CATEGORY TABLE (Self-referencing for hierarchy)
-- =====================================================
CREATE TABLE IF NOT EXISTS Category (
    category_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    parent_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES Category(category_id) ON DELETE SET NULL,
    INDEX idx_category_parent (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 3. SUPPLIER TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS Supplier (
    supplier_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    contact VARCHAR(255),
    email VARCHAR(255),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_supplier_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 4. USER TABLE (Employees)
-- =====================================================
CREATE TABLE IF NOT EXISTS User (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('CEO', 'Store_Manager', 'Cashier', 'Warehouse', 'Supplier') NOT NULL,
    store_id INT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES Store(store_id) ON DELETE SET NULL,
    INDEX idx_user_store (store_id),
    INDEX idx_user_role (role),
    INDEX idx_user_status (status),
    INDEX idx_user_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 5. PRODUCT TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS Product (
    product_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) NOT NULL UNIQUE,
    category_id INT NULL,
    supplier_id INT NULL,
    hq_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES Category(category_id) ON DELETE SET NULL,
    FOREIGN KEY (supplier_id) REFERENCES Supplier(supplier_id) ON DELETE SET NULL,
    INDEX idx_product_category (category_id),
    INDEX idx_product_supplier (supplier_id),
    INDEX idx_product_sku (sku)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 6. INVENTORY TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS Inventory (
    inventory_id INT PRIMARY KEY AUTO_INCREMENT,
    store_id INT NOT NULL,
    product_id INT NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    min_stock_level INT NOT NULL DEFAULT 0,
    reorder_point INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES Store(store_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES Product(product_id) ON DELETE CASCADE,
    UNIQUE KEY unique_store_product (store_id, product_id),
    INDEX idx_inventory_store (store_id),
    INDEX idx_inventory_product (product_id),
    INDEX idx_inventory_stock (stock)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 7. PROMOTION TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS Promotion (
    promotion_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    type ENUM('percentage', 'fixed_amount', 'buy_x_get_y', 'bundle') NOT NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    status ENUM('active', 'inactive', 'expired') DEFAULT 'inactive',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_promotion_status (status),
    INDEX idx_promotion_dates (start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 8. PRICING RULE TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS PricingRule (
    rule_id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    store_id INT NOT NULL,
    type ENUM('markup', 'markdown', 'fixed_price') NOT NULL,
    value DECIMAL(10, 2) NOT NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES Product(product_id) ON DELETE CASCADE,
    FOREIGN KEY (store_id) REFERENCES Store(store_id) ON DELETE CASCADE,
    INDEX idx_pricing_product (product_id),
    INDEX idx_pricing_store (store_id),
    INDEX idx_pricing_dates (start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 9. ORDER TABLE (Purchase Orders from Suppliers)
-- =====================================================
CREATE TABLE IF NOT EXISTS `Order` (
    order_id INT PRIMARY KEY AUTO_INCREMENT,
    store_id INT NOT NULL,
    supplier_id INT NOT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'confirmed', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    expected_delivery DATETIME NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES Store(store_id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES Supplier(supplier_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES User(user_id) ON DELETE CASCADE,
    INDEX idx_order_store (store_id),
    INDEX idx_order_supplier (supplier_id),
    INDEX idx_order_created_by (created_by),
    INDEX idx_order_status (status),
    INDEX idx_order_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 10. ORDER ITEM TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS OrderItem (
    order_item_id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES `Order`(order_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES Product(product_id) ON DELETE CASCADE,
    INDEX idx_order_item_order (order_id),
    INDEX idx_order_item_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 11. CUSTOMER TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS Customer (
    customer_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    loyalty_point INT DEFAULT 0,
    tier ENUM('bronze', 'silver', 'gold', 'platinum') DEFAULT 'bronze',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_customer_phone (phone),
    INDEX idx_customer_email (email),
    INDEX idx_customer_tier (tier)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 12. PAYMENT TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS Payment (
    payment_id INT PRIMARY KEY AUTO_INCREMENT,
    method ENUM('cash', 'card', 'mobile_payment', 'bank_transfer', 'loyalty_points') NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    given_amount DECIMAL(10, 2) NULL COMMENT 'For cash: amount customer gave',
    change_amount DECIMAL(10, 2) NULL COMMENT 'For cash: change to return',
    reference VARCHAR(255) NULL COMMENT 'For bank transfer: transaction reference',
    status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    paid_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_payment_status (status),
    INDEX idx_payment_method (method),
    INDEX idx_payment_reference (reference)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 13. TRANSACTION TABLE (Sales Transactions)
-- Note: shift_id column and foreign key will be added after Shift table is created (see section 20)
-- =====================================================
CREATE TABLE IF NOT EXISTS Transaction (
    transaction_id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NULL,
    customer_id INT NULL,
    payment_id INT NOT NULL,
    store_id INT NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'completed', 'cancelled', 'refunded') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES `Order`(order_id) ON DELETE SET NULL,
    FOREIGN KEY (customer_id) REFERENCES Customer(customer_id) ON DELETE SET NULL,
    FOREIGN KEY (payment_id) REFERENCES Payment(payment_id) ON DELETE CASCADE,
    FOREIGN KEY (store_id) REFERENCES Store(store_id) ON DELETE CASCADE,
    INDEX idx_transaction_order (order_id),
    INDEX idx_transaction_customer (customer_id),
    INDEX idx_transaction_payment (payment_id),
    INDEX idx_transaction_store (store_id),
    INDEX idx_transaction_status (status),
    INDEX idx_transaction_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 15. TRANSACTION ITEM TABLE (Items sold in a transaction)
-- =====================================================
CREATE TABLE IF NOT EXISTS TransactionItem (
    transaction_item_id INT PRIMARY KEY AUTO_INCREMENT,
    transaction_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES Transaction(transaction_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES Product(product_id) ON DELETE CASCADE,
    INDEX idx_transaction_item_transaction (transaction_id),
    INDEX idx_transaction_item_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 16. PRODUCT PROMOTION JUNCTION TABLE (Many-to-Many)
-- =====================================================
CREATE TABLE IF NOT EXISTS ProductPromotion (
    product_promotion_id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    promotion_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES Product(product_id) ON DELETE CASCADE,
    FOREIGN KEY (promotion_id) REFERENCES Promotion(promotion_id) ON DELETE CASCADE,
    UNIQUE KEY unique_product_promotion (product_id, promotion_id),
    INDEX idx_product_promotion_product (product_id),
    INDEX idx_product_promotion_promotion (promotion_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 17. PRICING RULE PROMOTION JUNCTION TABLE (Many-to-Many)
-- =====================================================
CREATE TABLE IF NOT EXISTS PricingRulePromotion (
    pricing_rule_promotion_id INT PRIMARY KEY AUTO_INCREMENT,
    rule_id INT NOT NULL,
    promotion_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rule_id) REFERENCES PricingRule(rule_id) ON DELETE CASCADE,
    FOREIGN KEY (promotion_id) REFERENCES Promotion(promotion_id) ON DELETE CASCADE,
    UNIQUE KEY unique_rule_promotion (rule_id, promotion_id),
    INDEX idx_rule_promotion_rule (rule_id),
    INDEX idx_rule_promotion_promotion (promotion_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 18. SHIFT TEMPLATE TABLE (Ca làm việc định nghĩa sẵn)
-- =====================================================
CREATE TABLE IF NOT EXISTS ShiftTemplate (
    shift_template_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL UNIQUE,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_shift_template_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 19. SCHEDULE TABLE (Phân công lịch làm việc)
-- =====================================================
CREATE TABLE IF NOT EXISTS Schedule (
    schedule_id INT PRIMARY KEY AUTO_INCREMENT,
    store_id INT NOT NULL,
    user_id INT NULL COMMENT 'Employee assigned to this shift (NULL if empty)',
    shift_template_id INT NOT NULL,
    work_date DATE NOT NULL,
    status ENUM('draft', 'confirmed', 'cancelled') DEFAULT 'draft',
    attendance_status ENUM('not_checked_in', 'checked_in', 'checked_out', 'absent') DEFAULT 'not_checked_in' COMMENT 'Trạng thái điểm danh: chưa điểm danh, đã check-in, đã check-out, vắng mặt',
    notes TEXT,
    created_by INT NOT NULL COMMENT 'User who created this schedule',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES Store(store_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES User(user_id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (shift_template_id) REFERENCES ShiftTemplate(shift_template_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES User(user_id) ON DELETE CASCADE,
    UNIQUE KEY unique_schedule_user_shift_date (user_id, shift_template_id, work_date),
    INDEX idx_schedule_store (store_id),
    INDEX idx_schedule_user (user_id),
    INDEX idx_schedule_date (work_date),
    INDEX idx_schedule_status (status),
    INDEX idx_schedule_attendance_status (attendance_status),
    INDEX idx_schedule_store_date (store_id, work_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 20. SHIFT TABLE (Ca làm việc của nhân viên)
-- Note: Created after Schedule because Shift references Schedule
-- =====================================================
CREATE TABLE IF NOT EXISTS Shift (
    shift_id INT PRIMARY KEY AUTO_INCREMENT,
    store_id INT NOT NULL,
    cashier_id INT NOT NULL,
    schedule_id INT NULL COMMENT 'Liên kết với Schedule nếu shift được tạo từ schedule',
    opened_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME NULL,
    opening_cash DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    closing_cash DECIMAL(14, 2) NULL,
    cash_sales_total DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    status ENUM('opened', 'closed', 'cancelled') NOT NULL DEFAULT 'opened',
    note TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES Store(store_id) ON DELETE CASCADE,
    FOREIGN KEY (cashier_id) REFERENCES User(user_id) ON DELETE CASCADE,
    FOREIGN KEY (schedule_id) REFERENCES Schedule(schedule_id) ON DELETE SET NULL,
    INDEX idx_shift_store (store_id),
    INDEX idx_shift_cashier (cashier_id),
    INDEX idx_shift_schedule (schedule_id),
    INDEX idx_shift_status (status),
    INDEX idx_shift_opened_at (opened_at),
    INDEX idx_shift_store_cashier_status (store_id, cashier_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Now add shift_id column and foreign key to Transaction table
ALTER TABLE Transaction 
    ADD COLUMN shift_id INT NULL COMMENT 'Shift this transaction belongs to' AFTER store_id;

ALTER TABLE Transaction 
    ADD CONSTRAINT fk_transaction_shift FOREIGN KEY (shift_id) REFERENCES Shift(shift_id) ON DELETE SET NULL;

CREATE INDEX idx_transaction_shift ON Transaction(shift_id);

-- =====================================================
-- 21. SHIFT CASH MOVEMENT TABLE (Giao dịch tiền mặt trong ca)
-- =====================================================
CREATE TABLE IF NOT EXISTS ShiftCashMovement (
    movement_id INT PRIMARY KEY AUTO_INCREMENT,
    shift_id INT NOT NULL,
    type ENUM('cash_in', 'cash_out') NOT NULL,
    amount DECIMAL(14, 2) NOT NULL,
    reason TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shift_id) REFERENCES Shift(shift_id) ON DELETE CASCADE,
    INDEX idx_scm_shift (shift_id),
    INDEX idx_scm_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 22. SHIFT CHANGE REQUEST TABLE (Yêu cầu đổi ca)
-- =====================================================
CREATE TABLE IF NOT EXISTS ShiftChangeRequest (
    request_id INT PRIMARY KEY AUTO_INCREMENT,
    store_id INT NOT NULL,
    from_schedule_id INT NOT NULL COMMENT 'Schedule muốn đổi',
    from_user_id INT NOT NULL COMMENT 'Người yêu cầu đổi ca',
    to_user_id INT NULL COMMENT 'Người muốn nhận ca (nếu có)',
    to_schedule_id INT NULL COMMENT 'Schedule muốn đổi lấy (nếu có)',
    to_work_date DATE NULL COMMENT 'Ngày làm việc của ca muốn đổi (nếu swap với ca trống)',
    to_shift_template_id INT NULL COMMENT 'Shift template của ca muốn đổi (nếu swap với ca trống)',
    request_type ENUM('swap', 'give_away', 'take_over') NOT NULL,
    reason TEXT,
    status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
    reviewed_by INT NULL COMMENT 'Người duyệt yêu cầu',
    reviewed_at DATETIME NULL,
    review_notes TEXT,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES Store(store_id) ON DELETE CASCADE,
    FOREIGN KEY (from_schedule_id) REFERENCES Schedule(schedule_id) ON DELETE CASCADE,
    FOREIGN KEY (from_user_id) REFERENCES User(user_id) ON DELETE CASCADE,
    FOREIGN KEY (to_user_id) REFERENCES User(user_id) ON DELETE SET NULL,
    FOREIGN KEY (to_schedule_id) REFERENCES Schedule(schedule_id) ON DELETE SET NULL,
    FOREIGN KEY (to_shift_template_id) REFERENCES ShiftTemplate(shift_template_id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES User(user_id) ON DELETE SET NULL,
    INDEX idx_change_request_store (store_id),
    INDEX idx_change_request_from_user (from_user_id),
    INDEX idx_change_request_to_user (to_user_id),
    INDEX idx_change_request_status (status),
    INDEX idx_change_request_from_schedule (from_schedule_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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

-- =====================================================
-- NOTES AND RECOMMENDATIONS
-- =====================================================
-- 1. All tables use InnoDB engine for foreign key support
-- 2. All primary keys use INT AUTO_INCREMENT (can change to BIGINT if needed)
-- 3. Timestamps (created_at, updated_at) added for auditing
-- 4. ENUM types used for status fields to ensure data integrity
-- 5. Indexes added on foreign keys and frequently queried fields
-- 6. Junction tables created for many-to-many relationships
-- 7. TransactionItem table added to track individual items in sales transactions
-- 8. CASCADE deletes used where appropriate, SET NULL where relationships are optional
-- 9. Schedule management tables added:
--    - ShiftTemplate: Template định nghĩa các ca làm việc
--    - Schedule: Phân công nhân viên vào ca làm việc (user_id có thể NULL cho ca trống)
--    - ShiftChangeRequest: Yêu cầu đổi ca giữa nhân viên
--    - Shift: Ca làm việc thực tế của nhân viên (check-in/check-out)
--    - ShiftCashMovement: Giao dịch tiền mặt trong ca
-- 10. Payment table extended with:
--    - given_amount: Số tiền khách đưa (cho thanh toán tiền mặt)
--    - change_amount: Tiền thừa trả lại khách
--    - reference: Mã tham chiếu (cho chuyển khoản)
-- 11. Transaction table extended with:
--    - shift_id: Liên kết giao dịch với ca làm việc
-- 12. Schedule table extended with:
--    - attendance_status: Trạng thái điểm danh (not_checked_in, checked_in, checked_out, absent)
-- 13. Shift table includes:
--    - schedule_id: Liên kết với Schedule nếu được tạo từ schedule
--    - Unique constraint enforced in application: only one open shift per cashier per store

