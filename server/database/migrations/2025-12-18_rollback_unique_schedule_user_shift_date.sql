-- Rollback: re-add unique constraint on (user_id, shift_template_id, work_date) in Schedule

ALTER TABLE `Schedule`
  ADD CONSTRAINT `unique_schedule_user_shift_date`
  UNIQUE (`user_id`, `shift_template_id`, `work_date`);






