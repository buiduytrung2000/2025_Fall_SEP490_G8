-- Migration: add direct_to_store and target_store_id to Order table

ALTER TABLE `Order`
ADD COLUMN direct_to_store TINYINT(1) NOT NULL DEFAULT 0 AFTER expected_delivery,
ADD COLUMN target_store_id INT NULL AFTER direct_to_store;

ALTER TABLE `Order`
ADD CONSTRAINT fk_order_target_store
FOREIGN KEY (target_store_id) REFERENCES Store(store_id) ON DELETE SET NULL;

CREATE INDEX idx_order_direct_store ON `Order` (direct_to_store);
CREATE INDEX idx_order_target_store ON `Order` (target_store_id);


