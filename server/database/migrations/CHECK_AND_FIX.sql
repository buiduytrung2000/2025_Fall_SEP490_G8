-- Script to check and fix Schedule table issues
-- Run this to check current state and apply fixes

-- Step 1: Check current state of user_id column
SELECT 
    COLUMN_NAME,
    IS_NULLABLE,
    COLUMN_TYPE,
    COLUMN_DEFAULT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'Schedule'
AND COLUMN_NAME = 'user_id';

-- Step 2: Check foreign key constraints
SELECT 
    CONSTRAINT_NAME,
    TABLE_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'Schedule'
AND COLUMN_NAME = 'user_id'
AND REFERENCED_TABLE_NAME IS NOT NULL;

-- Step 3: If user_id is NOT NULL, run the migration
-- (Uncomment the lines below if IS_NULLABLE = 'NO')

/*
-- Find and drop existing foreign key
SET @constraint_name = (
    SELECT CONSTRAINT_NAME 
    FROM information_schema.KEY_COLUMN_USAGE 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'Schedule'
    AND COLUMN_NAME = 'user_id'
    AND REFERENCED_TABLE_NAME IS NOT NULL
    LIMIT 1
);

SET @sql = CONCAT('ALTER TABLE Schedule DROP FOREIGN KEY ', @constraint_name);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Modify user_id to allow NULL
ALTER TABLE Schedule
MODIFY COLUMN user_id INT NULL COMMENT 'Employee assigned to this shift (NULL if empty)';

-- Re-add foreign key constraint
ALTER TABLE Schedule
ADD CONSTRAINT fk_schedule_user
FOREIGN KEY (user_id) REFERENCES User(user_id) ON DELETE SET NULL ON UPDATE CASCADE;
*/

-- Step 4: Check ShiftChangeRequest table for new columns
SELECT 
    COLUMN_NAME,
    IS_NULLABLE,
    COLUMN_TYPE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'ShiftChangeRequest'
AND COLUMN_NAME IN ('to_work_date', 'to_shift_template_id');

