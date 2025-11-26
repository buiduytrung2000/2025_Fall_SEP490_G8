-- Normalize existing orders that are still in "preparing" status
UPDATE StoreOrder
SET status = 'confirmed'
WHERE status = 'preparing';

-- Remove the "preparing" option from the status enum
ALTER TABLE StoreOrder
MODIFY COLUMN status ENUM('pending', 'approved', 'rejected', 'confirmed', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending';

