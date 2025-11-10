-- Migration: Allow NULL user_id in Schedule table
-- Date: 2025-11-10
-- Description: Allow schedules to have no assigned employee (empty shifts)

-- Step 1: Find and drop the existing foreign key constraint
-- Note: You may need to check the actual constraint name first:
-- SHOW CREATE TABLE Schedule;
-- Then replace 'schedule_ibfk_2' with the actual constraint name

-- Drop foreign key (adjust constraint name if needed)
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

-- Step 2: Modify user_id to allow NULL
ALTER TABLE Schedule
MODIFY COLUMN user_id INT NULL COMMENT 'Employee assigned to this shift (NULL if empty)';

-- Step 3: Re-add foreign key constraint with ON DELETE SET NULL
ALTER TABLE Schedule
ADD CONSTRAINT fk_schedule_user
FOREIGN KEY (user_id) REFERENCES User(user_id) ON DELETE SET NULL ON UPDATE CASCADE;

