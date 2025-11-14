-- =====================================================
-- Update existing plain text passwords to bcrypt hashes
-- =====================================================
-- This script updates all users with plain text password '123'
-- to use bcrypt hashed password
-- =====================================================

USE CCMS_DB;

-- Update all users with password '123' to use bcrypt hash
-- Password '123' hashed with bcrypt (salt rounds: 12)
UPDATE User 
SET password = '$2a$12$TOeiqj.9Rc3JIaICHIkRYe0P/JGVEEocb2vxGKyvI1L8DZ4gcg3JG'
WHERE password = '123';

-- Verify the update
SELECT user_id, username, email, 
       CASE 
           WHEN password LIKE '$2a$%' THEN 'Hashed (bcrypt)'
           ELSE 'Plain text'
       END AS password_status
FROM User;


















