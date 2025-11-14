# Hướng dẫn setup Database cho Dashboard

## Vấn đề
Dashboard không hiển thị dữ liệu vì:
1. Có thể thiếu cột `address` trong bảng `User` (nếu database cũ)
2. Không có dữ liệu transactions/schedules cho hôm nay

## Cách sửa

### Bước 1: Chạy Migration (nếu database cũ)

Nếu database của bạn được tạo trước khi có migration, cần chạy:

```sql
-- Chạy file migration
source server/database/migrations/2025-11-14_add_address_to_user.sql;
```

Hoặc chạy trực tiếp:
```sql
ALTER TABLE User ADD COLUMN address TEXT NULL AFTER phone;
```

### Bước 2: Tạo dữ liệu mẫu cho Dashboard

Chạy script để tạo dữ liệu mẫu cho hôm nay:

```bash
mysql -u root -p CCMS_DB < server/database/setup_dashboard_data.sql
```

Hoặc trong MySQL client:
```sql
source server/database/setup_dashboard_data.sql;
```

Script này sẽ:
- ✅ Kiểm tra và thêm cột `address` nếu chưa có
- ✅ Tạo 1 transaction mẫu cho hôm nay
- ✅ Tạo 1 schedule mẫu cho hôm nay
- ✅ Hiển thị summary

### Bước 3: Kiểm tra dữ liệu

Sau khi chạy script, kiểm tra:

```sql
-- Kiểm tra transactions hôm nay
SELECT COUNT(*) as today_transactions 
FROM Transaction 
WHERE DATE(created_at) = CURDATE();

-- Kiểm tra schedules hôm nay
SELECT COUNT(*) as today_schedules 
FROM Schedule 
WHERE work_date = CURDATE();

-- Kiểm tra Store Manager có store_id chưa
SELECT user_id, username, role, store_id 
FROM User 
WHERE role = 'Store_Manager';
```

## Nếu vẫn không có dữ liệu

### Kiểm tra Store Manager có store_id

```sql
-- Xem Store Manager nào chưa có store_id
SELECT user_id, username, role, store_id 
FROM User 
WHERE role = 'Store_Manager' AND store_id IS NULL;

-- Gán store_id cho Store Manager (nếu cần)
UPDATE User 
SET store_id = 1 
WHERE role = 'Store_Manager' AND store_id IS NULL 
LIMIT 1;
```

### Tạo dữ liệu thủ công

Nếu script không chạy được, có thể tạo thủ công:

```sql
-- 1. Tạo payment
INSERT INTO Payment (method, amount, status, paid_at) 
VALUES ('cash', 2000000, 'completed', NOW());

SET @payment_id = LAST_INSERT_ID();

-- 2. Tạo transaction (thay store_id = 1 bằng store_id thực tế)
INSERT INTO Transaction (order_id, customer_id, payment_id, store_id, total_amount, status, created_at)
VALUES (NULL, NULL, @payment_id, 1, 2000000, 'completed', NOW());

SET @transaction_id = LAST_INSERT_ID();

-- 3. Tạo transaction item (thay product_id = 1 bằng product_id thực tế)
INSERT INTO TransactionItem (transaction_id, product_id, quantity, unit_price, subtotal)
VALUES (@transaction_id, 1, 2, 1000000, 2000000);

-- 4. Tạo schedule (thay các ID bằng ID thực tế)
INSERT INTO Schedule (store_id, user_id, shift_template_id, work_date, status, notes, created_by)
SELECT 1, 
       (SELECT user_id FROM User WHERE role = 'Cashier' LIMIT 1),
       (SELECT shift_template_id FROM ShiftTemplate LIMIT 1),
       CURDATE(),
       'confirmed',
       'Ca làm việc hôm nay',
       (SELECT user_id FROM User WHERE role = 'Store_Manager' LIMIT 1);
```

## Lưu ý

1. **Đảm bảo có Store**: Phải có ít nhất 1 Store trong database
2. **Đảm bảo có Product**: Phải có ít nhất 1 Product để tạo transaction
3. **Đảm bảo có ShiftTemplate**: Phải có ít nhất 1 ShiftTemplate để tạo schedule
4. **Đảm bảo Store Manager có store_id**: Store Manager phải được gán vào một Store

## Kiểm tra nhanh

Chạy query này để xem tổng quan:

```sql
SELECT 
    'Stores' AS type, COUNT(*) AS count FROM Store
UNION ALL
SELECT 
    'Products', COUNT(*) FROM Product
UNION ALL
SELECT 
    'Managers with Store', COUNT(*) FROM User WHERE role = 'Store_Manager' AND store_id IS NOT NULL
UNION ALL
SELECT 
    'Today Transactions', COUNT(*) FROM Transaction WHERE DATE(created_at) = CURDATE()
UNION ALL
SELECT 
    'Today Schedules', COUNT(*) FROM Schedule WHERE work_date = CURDATE();
```

