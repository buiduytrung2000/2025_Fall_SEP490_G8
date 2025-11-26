-- Migration: 2025-11-26_add_admin_role_and_user_fields.sql
-- Purpose: Add Admin role to User role ENUM and add new fields for user management
USE CCMS_DB;

ALTER TABLE `User` 
MODIFY role ENUM('Admin', 'CEO', 'Store_Manager', 'Cashier', 'Warehouse', 'Supplier') NOT NULL;

ALTER TABLE `User` 
ADD COLUMN full_name VARCHAR(255) NULL AFTER address,
ADD COLUMN is_active BOOLEAN DEFAULT TRUE AFTER full_name;

-- Add index for is_active column for efficient filtering
ALTER TABLE `User` 
ADD INDEX idx_user_is_active (is_active);
