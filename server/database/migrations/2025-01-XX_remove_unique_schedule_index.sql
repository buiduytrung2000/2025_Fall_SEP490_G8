-- Migration: Remove unique constraint on Schedule table to allow multiple employees per shift
-- Date: 2025-01-XX
-- Description: This migration removes the unique index on (store_id, shift_template_id, work_date)
--              to allow multiple employees to be assigned to the same shift on the same date.

-- Drop the unique index
-- Note: If the index doesn't exist, this will show an error but won't break the migration
ALTER TABLE `Schedule` 
DROP INDEX `unique_schedule_store_shift_date`;

-- Verify the index has been removed
-- You can check with: SHOW INDEXES FROM Schedule;

