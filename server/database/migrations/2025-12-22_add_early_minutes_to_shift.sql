USE CCMS_DB;

ALTER TABLE Shift
ADD COLUMN early_minutes INT NULL COMMENT 'Số phút kết ca sớm (trước thời gian hợp lệ)';


