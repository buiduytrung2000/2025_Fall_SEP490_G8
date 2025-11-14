-- Migration: Add attendance status to Schedule table and link Schedule with Shift
-- Date: 2025-11-14
-- Description: Track attendance status (not_checked_in, checked_in, checked_out) for schedules

USE CCMS_DB;

-- Add attendance_status to Schedule table
ALTER TABLE Schedule
ADD COLUMN attendance_status ENUM('not_checked_in', 'checked_in', 'checked_out') 
    DEFAULT 'not_checked_in' 
    COMMENT 'Trạng thái điểm danh: chưa điểm danh, đã check-in, đã check-out';

-- Add schedule_id to Shift table to link shift with schedule
ALTER TABLE Shift
ADD COLUMN schedule_id INT NULL COMMENT 'Liên kết với Schedule nếu shift được tạo từ schedule';

ALTER TABLE Shift
ADD CONSTRAINT fk_shift_schedule FOREIGN KEY (schedule_id) REFERENCES Schedule(schedule_id) ON DELETE SET NULL;

CREATE INDEX idx_shift_schedule ON Shift(schedule_id);
CREATE INDEX idx_schedule_attendance_status ON Schedule(attendance_status);

-- Update existing schedules to have default attendance_status
UPDATE Schedule SET attendance_status = 'not_checked_in' WHERE attendance_status IS NULL;
