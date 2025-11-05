-- Add 'phone' column to User table if it doesn't exist
ALTER TABLE `User`
  ADD COLUMN `phone` VARCHAR(20) NULL AFTER `email`;

-- Optional: add index for phone lookups
CREATE INDEX idx_user_phone ON `User` (`phone`);

-- Backfill sample phone numbers for existing sample users (if rows already inserted)
UPDATE `User` SET `phone` = '0900000001' WHERE `username` = 'ceo_admin' AND `phone` IS NULL;
UPDATE `User` SET `phone` = '0900000002' WHERE `username` = 'manager_store1' AND `phone` IS NULL;
UPDATE `User` SET `phone` = '0900000003' WHERE `username` = 'cashier_store1_1' AND `phone` IS NULL;
UPDATE `User` SET `phone` = '0900000004' WHERE `username` = 'cashier_store1_2' AND `phone` IS NULL;
UPDATE `User` SET `phone` = '0900000005' WHERE `username` = 'cashier_store1_3' AND `phone` IS NULL;
UPDATE `User` SET `phone` = '0900000006' WHERE `username` = 'warehouse_staff1' AND `phone` IS NULL;
UPDATE `User` SET `phone` = '0900000007' WHERE `username` = 'supplier_rep1' AND `phone` IS NULL;


