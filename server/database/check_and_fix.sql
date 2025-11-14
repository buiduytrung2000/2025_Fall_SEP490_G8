-- =====================================================
-- Script to check and fix database for dashboard
-- =====================================================

USE CCMS_DB;

-- 1. Check if address column exists, if not add it
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'CCMS_DB' 
    AND TABLE_NAME = 'User' 
    AND COLUMN_NAME = 'address'
);

SELECT IF(@col_exists > 0, 'Address column already exists', 'Adding address column...') AS status;

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE User ADD COLUMN address TEXT NULL AFTER phone',
    'SELECT "Address column already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Check if there are any transactions (for dashboard data)
SELECT 
    COUNT(*) AS total_transactions,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_transactions,
    COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) AS today_transactions
FROM Transaction;

-- 3. Check if there are any schedules for today
SELECT 
    COUNT(*) AS today_schedules
FROM Schedule
WHERE work_date = CURDATE() AND status = 'confirmed';

-- 4. Check store_id for Store_Manager
SELECT 
    u.user_id,
    u.username,
    u.role,
    u.store_id,
    s.name AS store_name
FROM User u
LEFT JOIN Store s ON u.store_id = s.store_id
WHERE u.role = 'Store_Manager';

-- 5. Show summary
SELECT 
    'Database Status' AS info,
    (SELECT COUNT(*) FROM Store) AS total_stores,
    (SELECT COUNT(*) FROM User WHERE role = 'Store_Manager') AS total_managers,
    (SELECT COUNT(*) FROM Transaction WHERE status = 'completed') AS total_completed_transactions,
    (SELECT COUNT(*) FROM Schedule WHERE work_date = CURDATE()) AS today_schedules;

