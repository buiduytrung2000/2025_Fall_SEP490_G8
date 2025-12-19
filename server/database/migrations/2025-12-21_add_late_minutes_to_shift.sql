-- Migration: Add late_minutes to Shift table for tracking late check-in minutes
-- Date: 2025-12-21
-- Description: Track how many minutes late an employee checked in for their shift

USE CCMS_DB;

ALTER TABLE Shift
ADD COLUMN late_minutes INT NULL DEFAULT NULL AFTER note
COMMENT 'Số phút đi muộn (tính từ sau thời gian hợp lệ check-in)';

