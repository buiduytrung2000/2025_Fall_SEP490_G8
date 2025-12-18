-- Migration: Add discrepancy_reason column to StoreOrderItem table
-- Date: 2025-01-XX
-- Description: Add field to store reason for discrepancy between shipped and received quantities

ALTER TABLE StoreOrderItem
ADD COLUMN discrepancy_reason TEXT NULL
COMMENT 'Lý do chênh lệch giữa số lượng giao và số lượng nhận thực tế';

