-- =====================================================
-- Setup Dashboard Data
-- Run this script to ensure dashboard has data to display
-- =====================================================

USE CCMS_DB;

-- 1. Add address column if it doesn't exist
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'CCMS_DB' 
    AND TABLE_NAME = 'User' 
    AND COLUMN_NAME = 'address'
);

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE User ADD COLUMN address TEXT NULL AFTER phone',
    'SELECT "Address column already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Create sample transactions for TODAY (if they don't exist)
-- First, check if we have a store
SET @store_id = (SELECT store_id FROM Store LIMIT 1);

-- Create payments for today's transactions
INSERT INTO Payment (method, amount, status, paid_at) 
SELECT 'cash', 1500000, 'completed', NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM Payment WHERE DATE(paid_at) = CURDATE() LIMIT 1
)
LIMIT 1;

SET @payment_id = LAST_INSERT_ID();

-- Create transaction for today
INSERT INTO Transaction (order_id, customer_id, payment_id, store_id, total_amount, status, created_at)
SELECT NULL, NULL, @payment_id, @store_id, 1500000, 'completed', NOW()
WHERE @store_id IS NOT NULL 
AND NOT EXISTS (
    SELECT 1 FROM Transaction WHERE DATE(created_at) = CURDATE() AND store_id = @store_id LIMIT 1
)
LIMIT 1;

SET @transaction_id = LAST_INSERT_ID();

-- Create transaction items
INSERT INTO TransactionItem (transaction_id, product_id, quantity, unit_price, subtotal)
SELECT @transaction_id, 1, 2, 750000, 1500000
WHERE @transaction_id > 0
AND NOT EXISTS (
    SELECT 1 FROM TransactionItem WHERE transaction_id = @transaction_id LIMIT 1
)
LIMIT 1;

-- 3. Create schedule for TODAY (if it doesn't exist)
SET @shift_template_id = (SELECT shift_template_id FROM ShiftTemplate LIMIT 1);
SET @employee_id = (SELECT user_id FROM User WHERE role = 'Cashier' AND store_id = @store_id LIMIT 1);
SET @manager_id = (SELECT user_id FROM User WHERE role = 'Store_Manager' AND store_id = @store_id LIMIT 1);

INSERT INTO Schedule (store_id, user_id, shift_template_id, work_date, status, notes, created_by)
SELECT @store_id, @employee_id, @shift_template_id, CURDATE(), 'confirmed', 'Ca làm việc hôm nay', @manager_id
WHERE @store_id IS NOT NULL 
AND @shift_template_id IS NOT NULL
AND @employee_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM Schedule WHERE work_date = CURDATE() AND store_id = @store_id LIMIT 1
)
LIMIT 1;

-- 4. Show summary
SELECT 
    'Dashboard Data Setup Complete' AS status,
    (SELECT COUNT(*) FROM Transaction WHERE DATE(created_at) = CURDATE()) AS today_transactions,
    (SELECT COUNT(*) FROM Schedule WHERE work_date = CURDATE()) AS today_schedules,
    (SELECT COUNT(*) FROM User WHERE role = 'Store_Manager' AND store_id IS NOT NULL) AS managers_with_store;

