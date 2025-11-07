-- Migration: Update unique constraint on Schedule table to allow multiple employees per shift
-- Date: 2025-01-XX
-- Description: This migration removes the unique index on (store_id, shift_template_id, work_date)
--              and replaces it with a unique index on (user_id, shift_template_id, work_date) so
--              that nhiều nhân viên có thể cùng ca, nhưng mỗi nhân viên chỉ có một lịch cho một ca.

-- Drop the previous unique index (store + shift + date)
ALTER TABLE `Schedule`
DROP INDEX `unique_schedule_store_shift_date`;

-- Add new unique index to prevent trùng ca cho cùng nhân viên trong cùng ngày/ca
ALTER TABLE `Schedule`
ADD UNIQUE INDEX `unique_schedule_user_shift_date` (`user_id`, `shift_template_id`, `work_date`);

-- Verify the index has been removed
-- You can check with: SHOW INDEXES FROM Schedule;

