-- Migration: Update Order status enum to three states
-- Date: 2025-11-25
-- Description: Change Order status from 6 states to 3 states (pending, confirmed, cancelled)
USE CCMS_DB;
-- Step 1: Update existing orders with non-standard statuses to appropriate new statuses
-- Map 'preparing', 'shipped', 'delivered' to 'confirmed' since they represent confirmed orders
UPDATE `Order` 
SET status = 'confirmed' 
WHERE status IN ('preparing', 'shipped', 'delivered');

-- Step 2: Alter the ENUM to only include the three new statuses
ALTER TABLE `Order` 
MODIFY COLUMN status ENUM('pending', 'confirmed', 'cancelled') DEFAULT 'pending' 
COMMENT 'Order status: pending (can edit), confirmed (read-only), cancelled (read-only)';

-- Verification query (optional - comment out in production)
-- SELECT status, COUNT(*) as count FROM `Order` GROUP BY status;

