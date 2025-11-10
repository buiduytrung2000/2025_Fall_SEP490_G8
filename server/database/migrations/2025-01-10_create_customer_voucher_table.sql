-- =====================================================
-- CREATE CUSTOMER VOUCHER TABLE
-- =====================================================
-- This table stores vouchers assigned to customers

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

-- Thêm các mẫu voucher theo mức điểm
INSERT INTO VoucherTemplate (voucher_code_prefix, voucher_name, discount_type, discount_value, min_purchase_amount, max_discount_amount, required_loyalty_points, validity_days, is_active) VALUES
-- Mức 0 điểm (Khách hàng mới)
('WELCOME10', 'Giảm 10% cho đơn hàng đầu tiên', 'percentage', 10.00, 100000, 50000, 0, 30, TRUE),
('FREESHIP', 'Miễn phí vận chuyển', 'fixed_amount', 30000.00, 0, NULL, 0, 15, TRUE),

-- Mức 100 điểm
('SAVE20K', 'Giảm 20.000đ cho đơn từ 200.000đ', 'fixed_amount', 20000.00, 200000, NULL, 100, 30, TRUE),
('DISCOUNT5', 'Giảm 5% cho mọi đơn hàng', 'percentage', 5.00, 0, 30000, 100, 30, TRUE),

-- Mức 200 điểm
('SAVE50K', 'Giảm 50.000đ cho đơn từ 500.000đ', 'fixed_amount', 50000.00, 500000, NULL, 200, 30, TRUE),
('DISCOUNT10', 'Giảm 10% cho đơn từ 300.000đ', 'percentage', 10.00, 300000, 80000, 200, 30, TRUE),
('COMBO15', 'Giảm 15% cho đơn từ 400.000đ', 'percentage', 15.00, 400000, 100000, 200, 45, TRUE),

-- Mức 500 điểm
('SAVE100K', 'Giảm 100.000đ cho đơn từ 1.000.000đ', 'fixed_amount', 100000.00, 1000000, NULL, 500, 30, TRUE),
('VIP20', 'Giảm 20% cho khách hàng VIP', 'percentage', 20.00, 500000, 150000, 500, 60, TRUE),
('MEGA25', 'Giảm 25% cho đơn từ 800.000đ', 'percentage', 25.00, 800000, 200000, 500, 60, TRUE),

-- Mức 1000 điểm (Platinum)
('SAVE200K', 'Giảm 200.000đ cho đơn từ 2.000.000đ', 'fixed_amount', 200000.00, 2000000, NULL, 1000, 60, TRUE),
('PLATINUM30', 'Giảm 30% cho khách hàng Platinum', 'percentage', 30.00, 1000000, 300000, 1000, 90, TRUE),
('ULTRA35', 'Giảm 35% cho đơn từ 1.500.000đ', 'percentage', 35.00, 1500000, 500000, 1000, 90, TRUE);

-- Insert sample vouchers for testing (customer_id = 1)
INSERT INTO CustomerVoucher (customer_id, voucher_code, voucher_name, discount_type, discount_value, min_purchase_amount, max_discount_amount, required_loyalty_points, start_date, end_date, status) VALUES
(1, 'WELCOME10-001', 'Giảm 10% cho đơn hàng đầu tiên', 'percentage', 10.00, 100000, 50000, 0, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 'available'),
(1, 'FREESHIP-001', 'Miễn phí vận chuyển', 'fixed_amount', 30000.00, 0, NULL, 0, NOW(), DATE_ADD(NOW(), INTERVAL 15 DAY), 'available'),
(1, 'SAVE20K-001', 'Giảm 20.000đ cho đơn từ 200.000đ', 'fixed_amount', 20000.00, 200000, NULL, 100, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 'available'),
(1, 'SAVE50K-001', 'Giảm 50.000đ cho đơn từ 500.000đ', 'fixed_amount', 50000.00, 500000, NULL, 200, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 'available'),
(1, 'DISCOUNT10-001', 'Giảm 10% cho đơn từ 300.000đ', 'percentage', 10.00, 300000, 80000, 200, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 'available');

