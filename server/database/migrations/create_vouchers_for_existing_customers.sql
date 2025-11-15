-- =====================================================
-- TẠO VOUCHER CHO KHÁCH HÀNG ĐÃ CÓ ĐIỂM
-- =====================================================
-- Script này tạo voucher cho khách hàng đã có điểm tích lũy

-- Lấy customer_id của khách hàng (thay đổi phone number nếu cần)
SET @customer_id = (SELECT customer_id FROM Customer WHERE phone = '0901234567' LIMIT 1);
SET @loyalty_points = (SELECT loyalty_point FROM Customer WHERE customer_id = @customer_id);

-- Hiển thị thông tin khách hàng
SELECT CONCAT('Customer ID: ', @customer_id, ', Loyalty Points: ', @loyalty_points) AS customer_info;

-- Tạo voucher cho mức 0 điểm
INSERT INTO CustomerVoucher (customer_id, voucher_code, voucher_name, discount_type, discount_value, min_purchase_amount, max_discount_amount, required_loyalty_points, start_date, end_date, status)
SELECT 
    @customer_id,
    CONCAT(voucher_code_prefix, '-', @customer_id, '-', UNIX_TIMESTAMP()),
    voucher_name,
    discount_type,
    discount_value,
    min_purchase_amount,
    max_discount_amount,
    required_loyalty_points,
    NOW(),
    DATE_ADD(NOW(), INTERVAL validity_days DAY),
    'available'
FROM VoucherTemplate
WHERE is_active = TRUE 
  AND required_loyalty_points <= @loyalty_points
  AND NOT EXISTS (
      SELECT 1 FROM CustomerVoucher cv 
      WHERE cv.customer_id = @customer_id 
        AND cv.voucher_code LIKE CONCAT(VoucherTemplate.voucher_code_prefix, '%')
        AND cv.status = 'available'
  );

-- Hiển thị voucher đã tạo
SELECT 
    voucher_code,
    voucher_name,
    discount_type,
    discount_value,
    required_loyalty_points,
    end_date
FROM CustomerVoucher
WHERE customer_id = @customer_id
  AND status = 'available'
ORDER BY required_loyalty_points DESC;

