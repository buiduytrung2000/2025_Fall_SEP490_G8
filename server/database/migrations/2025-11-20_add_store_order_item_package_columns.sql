-- =====================================================
-- Migration: add package unit info to StoreOrderItem
-- Run AFTER the original schema has been applied
-- =====================================================

ALTER TABLE StoreOrderItem
    ADD COLUMN package_unit_id INT NULL AFTER quantity_in_base,
    ADD COLUMN package_quantity INT NULL AFTER package_unit_id;

ALTER TABLE StoreOrderItem
    ADD CONSTRAINT fk_store_order_item_package_unit
        FOREIGN KEY (package_unit_id) REFERENCES Unit(unit_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE;

-- No data backfill is required; existing rows will keep NULL package info.

