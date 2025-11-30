-- =====================================================
-- Rollback Migration: Remove StockCountReport table
-- Date: 2025-12-01
-- Description:
--   * Drop StockCountReport table and all its indexes
--   * Use this to rollback the 2025-12-01_add_stock_count_report_table.sql migration
-- =====================================================

USE CCMS_DB;

-- Drop StockCountReport table (this will also drop all foreign keys and indexes)
DROP TABLE IF EXISTS StockCountReport;

-- Note: This rollback migration removes:
-- 1. StockCountReport table
-- 2. All associated indexes
-- 3. All foreign key constraints
-- 4. All data in the table (use with caution!)

