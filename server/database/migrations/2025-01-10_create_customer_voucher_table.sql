-- =====================================================
-- CREATE CUSTOMER VOUCHER TABLE
-- =====================================================
-- This table stores vouchers assigned to customers

CREATE TABLE IF NOT EXISTS CustomerVoucher (
    customer_voucher_id INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT NOT NULL,
    voucher_code VARCHAR(50) NOT NULL UNIQUE,
    voucher_name VARCHAR(255) NOT NULL,
    discount_type ENUM('percentage', 'fixed_amount') NOT NULL,
    discount_value DECIMAL(10, 2) NOT NULL,
    min_purchase_amount DECIMAL(10, 2) DEFAULT 0,
    max_discount_amount DECIMAL(10, 2) NULL,
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
    INDEX idx_customer_voucher_dates (start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample vouchers for testing
INSERT INTO CustomerVoucher (customer_id, voucher_code, voucher_name, discount_type, discount_value, min_purchase_amount, max_discount_amount, start_date, end_date, status) VALUES
(1, 'WELCOME10', 'Giảm 10% cho đơn hàng đầu tiên', 'percentage', 10.00, 100000, 50000, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 'available'),
(1, 'SAVE50K', 'Giảm 50.000đ cho đơn từ 500.000đ', 'fixed_amount', 50000.00, 500000, NULL, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 'available'),
(1, 'VIP20', 'Giảm 20% cho khách hàng VIP', 'percentage', 20.00, 200000, 100000, NOW(), DATE_ADD(NOW(), INTERVAL 60 DAY), 'available'),
(1, 'FREESHIP', 'Miễn phí vận chuyển', 'fixed_amount', 30000.00, 0, NULL, NOW(), DATE_ADD(NOW(), INTERVAL 15 DAY), 'available');

