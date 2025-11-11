-- Migration: Add to_work_date and to_shift_template_id fields to ShiftChangeRequest table
-- Date: 2025-11-10
-- Description: Add fields to support empty shift swap requests

ALTER TABLE ShiftChangeRequest
ADD COLUMN to_work_date DATE NULL AFTER to_schedule_id,
ADD COLUMN to_shift_template_id INT NULL AFTER to_work_date;

-- Add foreign key constraint for to_shift_template_id
ALTER TABLE ShiftChangeRequest
ADD CONSTRAINT fk_shift_change_request_to_shift_template
FOREIGN KEY (to_shift_template_id) REFERENCES ShiftTemplate(shift_template_id)
ON DELETE SET NULL ON UPDATE CASCADE;

