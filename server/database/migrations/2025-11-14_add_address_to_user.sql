-- =====================================================
-- Migration: Add address column to User table
-- Date: 2025-11-14
-- Description: Adds a nullable address field to store employee addresses
-- =====================================================

ALTER TABLE User
ADD COLUMN address TEXT NULL AFTER phone;

