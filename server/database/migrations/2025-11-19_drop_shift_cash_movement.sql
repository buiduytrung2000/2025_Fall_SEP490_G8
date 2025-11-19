-- Migration: Drop ShiftCashMovement table
-- Date: 2025-11-19
-- Description: Remove legacy cash movement tracking table (logic handled directly on Shift)

USE CCMS_DB;

DROP TABLE IF EXISTS ShiftCashMovement;

