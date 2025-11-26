ALTER TABLE StoreOrder
ADD COLUMN order_code VARCHAR(10) NULL AFTER store_order_id;

UPDATE StoreOrder
SET order_code = CONCAT('SO', LPAD(store_order_id, 4, '0'))
WHERE order_code IS NULL;

ALTER TABLE StoreOrder
MODIFY COLUMN order_code VARCHAR(10) NOT NULL;

ALTER TABLE StoreOrder
ADD CONSTRAINT unique_store_order_code UNIQUE (order_code);

