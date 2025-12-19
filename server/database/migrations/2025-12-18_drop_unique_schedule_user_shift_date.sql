-- Drop unique constraint on (user_id, shift_template_id, work_date) in Schedule
-- This removes the rule that one nhân viên chỉ được có 1 ca cho mỗi ngày + ca làm việc

ALTER TABLE `Schedule`
  DROP INDEX `unique_schedule_user_shift_date`;



