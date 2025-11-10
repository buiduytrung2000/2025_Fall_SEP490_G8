-- Migration: Allow NULL user_id in Schedule table (Simple version)
-- Date: 2025-11-10
-- Description: Allow schedules to have no assigned employee (empty shifts)
-- 
-- IMPORTANT: Before running this, check the actual foreign key constraint name:
-- SHOW CREATE TABLE Schedule;
-- Then replace 'schedule_ibfk_2' below with the actual constraint name from the output

-- Drop the existing foreign key constraint (replace constraint name if needed)
ALTER TABLE Schedule
DROP FOREIGN KEY schedule_ibfk_2;

-- Modify user_id to allow NULL
ALTER TABLE Schedule
MODIFY COLUMN user_id INT NULL COMMENT 'Employee assigned to this shift (NULL if empty)';

-- Re-add foreign key constraint with ON DELETE SET NULL
ALTER TABLE Schedule
ADD CONSTRAINT fk_schedule_user
FOREIGN KEY (user_id) REFERENCES User(user_id) ON DELETE SET NULL ON UPDATE CASCADE;

