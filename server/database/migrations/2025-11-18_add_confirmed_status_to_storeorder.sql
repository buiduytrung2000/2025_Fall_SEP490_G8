-- Migration: Add 'confirmed' status to StoreOrder table
-- Description: Add 'confirmed' status to the status ENUM in StoreOrder table
-- Date: 2025-11-18

USE CCMS_DB;

-- Add 'confirmed' status to StoreOrder status ENUM
-- Current ENUM: 'pending', 'approved', 'rejected', 'preparing', 'shipped', 'delivered', 'cancelled'
-- New ENUM: 'pending', 'approved', 'rejected', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'
ALTER TABLE StoreOrder 
MODIFY COLUMN status ENUM('pending', 'approved', 'rejected', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled') 
DEFAULT 'pending';

