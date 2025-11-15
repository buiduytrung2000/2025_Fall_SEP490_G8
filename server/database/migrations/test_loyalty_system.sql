-- Script để test hệ thống loyalty points và voucher

-- 1. Kiểm tra bảng đã được tạo chưa
SELECT 'Checking tables...' AS status;
SHOW TABLES LIKE '%Voucher%';

-- 2. Kiểm tra VoucherTemplate
SELECT 'Voucher Templates:' AS status;
SELECT voucher_code_prefix, voucher_name, required_loyalty_points, discount_type, discount_value 
FROM VoucherTemplate 
WHERE is_active = TRUE
ORDER BY required_loyalty_points;

-- 3. Kiểm tra CustomerVoucher cho customer_id = 1
SELECT 'Customer Vouchers (customer_id = 1):' AS status;
SELECT voucher_code, voucher_name, required_loyalty_points, status, end_date
FROM CustomerVoucher
WHERE customer_id = 1
ORDER BY required_loyalty_points;

-- 4. Kiểm tra loyalty points của customer
SELECT 'Customer Loyalty Points:' AS status;
SELECT customer_id, name, phone, loyalty_point, tier
FROM Customer
WHERE customer_id = 1;

-- 5. Test query: Lấy voucher khả dụng cho customer có 150 điểm
SELECT 'Available vouchers for customer with 150 points:' AS status;
SELECT voucher_code, voucher_name, required_loyalty_points, discount_type, discount_value
FROM CustomerVoucher
WHERE customer_id = 1
  AND status = 'available'
  AND required_loyalty_points <= 150
  AND start_date <= NOW()
  AND end_date >= NOW()
ORDER BY required_loyalty_points DESC;

-- 6. Cập nhật loyalty points cho customer (giả lập thanh toán 50,000đ = 500 điểm)
-- Uncomment để test
-- UPDATE Customer SET loyalty_point = loyalty_point + 500 WHERE customer_id = 1;
-- SELECT 'Updated loyalty points' AS status, loyalty_point FROM Customer WHERE customer_id = 1;

