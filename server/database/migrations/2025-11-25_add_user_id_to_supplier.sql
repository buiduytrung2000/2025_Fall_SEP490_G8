-- =====================================================
-- Migration: Add user_id to Supplier table for account linking
-- Date: 2025-11-25
-- Description:
--   * Allow each supplier record to be linked directly with a User account
--   * Enables Supplier portal authorization without relying on email matching
-- =====================================================

USE CCMS_DB;

ALTER TABLE Supplier
    ADD COLUMN user_id INT NULL AFTER supplier_id,
    ADD CONSTRAINT fk_supplier_user
        FOREIGN KEY (user_id) REFERENCES User(user_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT uq_supplier_user UNIQUE (user_id);

