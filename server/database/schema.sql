
CREATE DATABASE IF NOT EXISTS CCMS_DB;
USE CCMS_DB;

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

CREATE TABLE IF NOT EXISTS Category (
    category_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    parent_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES Category(category_id) ON DELETE SET NULL,
    INDEX idx_category_parent (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Unit (
    unit_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    level TINYINT NOT NULL COMMENT '1 = đơn vị lớn nhất',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_unit_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Supplier (
    supplier_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NULL,
    name VARCHAR(255) NOT NULL,
    contact VARCHAR(255),
    email VARCHAR(255),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES User(user_id) ON DELETE SET NULL ON UPDATE CASCADE,
    UNIQUE KEY uq_supplier_user (user_id),
    INDEX idx_supplier_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS User (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('CEO', 'Store_Manager', 'Cashier', 'Warehouse', 'Admin') NOT NULL,
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

CREATE TABLE IF NOT EXISTS Product (
    product_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) NOT NULL UNIQUE,
    category_id INT NULL,
    supplier_id INT NULL,
    base_unit_id INT NOT NULL,
    hq_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    import_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00 COMMENT 'Giá nhập/giá vốn của sản phẩm',
    is_perishable TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = hàng tươi sống',
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Trạng thái hoạt động của sản phẩm (TRUE = hoạt động, FALSE = đã xóa/vô hiệu hóa)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES Category(category_id) ON DELETE SET NULL,
    FOREIGN KEY (supplier_id) REFERENCES Supplier(supplier_id) ON DELETE SET NULL,
    FOREIGN KEY (base_unit_id) REFERENCES Unit(unit_id),
    INDEX idx_product_category (category_id),
    INDEX idx_product_supplier (supplier_id),
    INDEX idx_product_sku (sku),
    INDEX idx_product_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ProductUnit (
    product_unit_id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    unit_id INT NOT NULL,
    conversion_to_base DECIMAL(18, 6) NOT NULL COMMENT 'Số đơn vị cơ sở trong 1 đơn vị này',
    barcode VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_product_unit (product_id, unit_id),
    FOREIGN KEY (product_id) REFERENCES Product(product_id) ON DELETE CASCADE,
    FOREIGN KEY (unit_id) REFERENCES Unit(unit_id),
    CHECK (conversion_to_base > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Inventory (
    inventory_id INT PRIMARY KEY AUTO_INCREMENT,
    store_id INT NOT NULL,
    product_id INT NOT NULL,
    base_quantity BIGINT NOT NULL DEFAULT 0,
    reserved_quantity BIGINT NOT NULL DEFAULT 0,
    min_stock_level INT NOT NULL DEFAULT 0,
    reorder_point INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES Store(store_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES Product(product_id) ON DELETE CASCADE,
    UNIQUE KEY unique_store_product (store_id, product_id),
    INDEX idx_inventory_store (store_id),
    INDEX idx_inventory_product (product_id),
    INDEX idx_inventory_stock (base_quantity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS WarehouseInventory (
    warehouse_inventory_id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    base_quantity BIGINT NOT NULL DEFAULT 0,
    reserved_quantity BIGINT NOT NULL DEFAULT 0,
    min_stock_level INT NOT NULL DEFAULT 0,
    reorder_point INT NOT NULL DEFAULT 0,
    location VARCHAR(255) NULL COMMENT 'Vị trí trong kho (ví dụ: Kho chính, Kho lạnh, Kho đồ khô)',
    notes TEXT NULL COMMENT 'Ghi chú về tồn kho',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES Product(product_id) ON DELETE CASCADE,
    UNIQUE KEY unique_warehouse_product (product_id),
    INDEX idx_warehouse_inventory_product (product_id),
    INDEX idx_warehouse_inventory_stock (base_quantity),
    INDEX idx_warehouse_inventory_location (location)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS PricingRule (
    rule_id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    store_id INT NOT NULL,
    type ENUM('markup', 'markdown', 'fixed_price') NOT NULL,
    value DECIMAL(10, 2) NOT NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    status ENUM('upcoming', 'active', 'expired') DEFAULT 'upcoming',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES Product(product_id) ON DELETE CASCADE,
    FOREIGN KEY (store_id) REFERENCES Store(store_id) ON DELETE CASCADE,
    INDEX idx_pricing_product (product_id),
    INDEX idx_pricing_store (store_id),
    INDEX idx_pricing_dates (start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Order table: For warehouse-to-supplier orders (no store_id)
-- StoreOrder table: For store-to-warehouse/supplier orders (has store_id)
CREATE TABLE IF NOT EXISTS `Order` (
    order_id INT PRIMARY KEY AUTO_INCREMENT,
    order_code VARCHAR(8) NOT NULL UNIQUE,
    supplier_id INT NOT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'confirmed', 'cancelled') DEFAULT 'pending',
    expected_delivery DATETIME NULL,
    direct_to_store TINYINT(1) NOT NULL DEFAULT 0,
    target_store_id INT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES Supplier(supplier_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES User(user_id) ON DELETE CASCADE,
    FOREIGN KEY (target_store_id) REFERENCES Store(store_id) ON DELETE SET NULL,
    INDEX idx_order_supplier (supplier_id),
    INDEX idx_order_created_by (created_by),
    INDEX idx_order_status (status),
    INDEX idx_order_created_at (created_at),
    INDEX idx_order_direct_store (direct_to_store),
    INDEX idx_order_target_store (target_store_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS OrderItem (
    order_item_id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    unit_id INT NOT NULL,
    quantity_in_base DECIMAL(18, 6) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES `Order`(order_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES Product(product_id) ON DELETE CASCADE,
    FOREIGN KEY (unit_id) REFERENCES Unit(unit_id),
    INDEX idx_order_item_order (order_id),
    INDEX idx_order_item_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

CREATE TABLE IF NOT EXISTS Payment (
    payment_id INT PRIMARY KEY AUTO_INCREMENT,
    method ENUM('cash', 'card', 'mobile_payment', 'bank_transfer', 'loyalty_points') NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    given_amount DECIMAL(10, 2) NULL COMMENT 'For cash: amount customer gave',
    change_amount DECIMAL(10, 2) NULL COMMENT 'For cash: change to return',
    cash_received DECIMAL(10, 2) NULL COMMENT 'Amount of cash received from customer (for cash payment)',
    reference VARCHAR(255) NULL COMMENT 'For bank transfer: transaction reference',
    payos_order_code BIGINT NULL COMMENT 'PayOS order code for QR payment',
    payos_payment_link_id VARCHAR(255) NULL COMMENT 'PayOS payment link ID',
    payos_transaction_reference VARCHAR(255) NULL COMMENT 'PayOS transaction reference',
    status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    paid_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_payment_status (status),
    INDEX idx_payment_method (method),
    INDEX idx_payment_reference (reference),
    INDEX idx_payment_payos_order_code (payos_order_code),
    INDEX idx_payment_payos_payment_link_id (payos_payment_link_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

CREATE TABLE IF NOT EXISTS StoreOrder (
    store_order_id INT PRIMARY KEY AUTO_INCREMENT,
    order_code VARCHAR(10) NOT NULL UNIQUE,
    store_id INT NOT NULL,
    created_by INT NOT NULL,
    order_type ENUM('ToWarehouse', 'ToSupplier') NOT NULL DEFAULT 'ToWarehouse',
    target_warehouse VARCHAR(255) NULL COMMENT 'Warehouse name for ToWarehouse orders',
    supplier_id INT NULL COMMENT 'Supplier ID for ToSupplier orders',
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    status ENUM('pending', 'approved', 'rejected', 'confirmed', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    perishable BOOLEAN DEFAULT FALSE COMMENT 'For fresh goods',
    notes TEXT NULL,
    expected_delivery DATETIME NULL COMMENT 'Expected delivery date for the order',
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
    actual_quantity INT NULL COMMENT 'Số lượng thực tế sau khi điều chỉnh',
    unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    unit_id INT NULL,
    quantity_in_base DECIMAL(18, 6) NULL,
    package_unit_id INT NULL COMMENT 'Đơn vị đóng gói khi xuất kho',
    package_quantity INT NULL COMMENT 'Số lượng đóng gói (ví dụ: số thùng)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (store_order_id) REFERENCES StoreOrder(store_order_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES Product(product_id) ON DELETE SET NULL,
    FOREIGN KEY (unit_id) REFERENCES Unit(unit_id),
    FOREIGN KEY (package_unit_id) REFERENCES Unit(unit_id),
    INDEX idx_store_order_item_order (store_order_id),
    INDEX idx_store_order_item_product (product_id),
    INDEX idx_store_order_item_actual_quantity (actual_quantity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS CustomerVoucher (
    customer_voucher_id INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT NULL,
    voucher_code VARCHAR(50) NOT NULL UNIQUE,
    voucher_name VARCHAR(255) NOT NULL,
    discount_type ENUM('percentage', 'fixed_amount') NOT NULL,
    discount_value DECIMAL(10, 2) NOT NULL,
    min_purchase_amount DECIMAL(10, 2) DEFAULT 0,
    max_discount_amount DECIMAL(10, 2) NULL,
    required_loyalty_points INT DEFAULT 0 COMMENT 'Số điểm tích lũy tối thiểu để nhận voucher',
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    status ENUM('available', 'used', 'expired') DEFAULT 'available',
    used_at DATETIME NULL,
    transaction_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES Customer(customer_id) ON DELETE CASCADE,
    INDEX idx_customer_voucher_customer (customer_id),
    INDEX idx_customer_voucher_code (voucher_code),
    INDEX idx_customer_voucher_status (status),
    INDEX idx_customer_voucher_dates (start_date, end_date),
    INDEX idx_customer_voucher_loyalty (required_loyalty_points)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tạo bảng VoucherTemplate để quản lý các mẫu voucher theo điểm
CREATE TABLE IF NOT EXISTS VoucherTemplate (
    voucher_template_id INT PRIMARY KEY AUTO_INCREMENT,
    voucher_code_prefix VARCHAR(20) NOT NULL COMMENT 'Tiền tố mã voucher',
    voucher_name VARCHAR(255) NOT NULL,
    discount_type ENUM('percentage', 'fixed_amount') NOT NULL,
    discount_value DECIMAL(10, 2) NOT NULL,
    min_purchase_amount DECIMAL(10, 2) DEFAULT 0,
    max_discount_amount DECIMAL(10, 2) NULL,
    required_loyalty_points INT DEFAULT 0 COMMENT 'Số điểm tích lũy tối thiểu để nhận voucher',
    validity_days INT DEFAULT 30 COMMENT 'Số ngày voucher có hiệu lực',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_voucher_template_loyalty (required_loyalty_points),
    INDEX idx_voucher_template_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS Transaction (
    transaction_id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NULL,
    customer_id INT NULL,
    payment_id INT NOT NULL,
    store_id INT NOT NULL,
    shift_id INT NULL,
    cashier_id INT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NULL,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    voucher_code VARCHAR(50) NULL,
    status ENUM('pending', 'completed', 'cancelled', 'refunded') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES `Order`(order_id) ON DELETE SET NULL,
    FOREIGN KEY (customer_id) REFERENCES Customer(customer_id) ON DELETE SET NULL,
    FOREIGN KEY (payment_id) REFERENCES Payment(payment_id) ON DELETE CASCADE,
    FOREIGN KEY (store_id) REFERENCES Store(store_id) ON DELETE CASCADE,
    FOREIGN KEY (shift_id) REFERENCES Shift(shift_id) ON DELETE SET NULL,
    FOREIGN KEY (cashier_id) REFERENCES User(user_id) ON DELETE SET NULL,
    INDEX idx_transaction_order (order_id),
    INDEX idx_transaction_customer (customer_id),
    INDEX idx_transaction_payment (payment_id),
    INDEX idx_transaction_store (store_id),
    INDEX idx_transaction_shift (shift_id),
    INDEX idx_transaction_cashier (cashier_id),
    INDEX idx_transaction_voucher_code (voucher_code),
    INDEX idx_transaction_status (status),
    INDEX idx_transaction_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS TransactionItem (
    transaction_item_id INT PRIMARY KEY AUTO_INCREMENT,
    transaction_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    unit_id INT NOT NULL,
    quantity_in_base DECIMAL(18, 6) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES Transaction(transaction_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES Product(product_id) ON DELETE CASCADE,
    FOREIGN KEY (unit_id) REFERENCES Unit(unit_id),
    INDEX idx_transaction_item_transaction (transaction_id),
    INDEX idx_transaction_item_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
