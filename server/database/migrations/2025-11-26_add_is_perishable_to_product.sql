-- Migration: add is_perishable flag to Product table

ALTER TABLE Product
ADD COLUMN is_perishable TINYINT(1) NOT NULL DEFAULT 0 AFTER import_price;


