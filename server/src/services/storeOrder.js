import db from '../models';
import { Op } from 'sequelize';

// Create store order to warehouse
export const createStoreOrder = (orderData) => new Promise(async (resolve, reject) => {
    try {
        const { store_id, created_by, order_type, target_warehouse, supplier_id, items, perishable, notes } = orderData;

        // Validation: Check required fields
        if (!store_id || !created_by || !items || items.length === 0) {
            return resolve({
                err: 1,
                msg: 'Missing required fields: store_id, created_by, items'
            });
        }

        // Validation: Check order_type
        if (order_type && !['ToWarehouse', 'ToSupplier'].includes(order_type)) {
            return resolve({
                err: 1,
                msg: 'Invalid order_type. Must be "ToWarehouse" or "ToSupplier"'
            });
        }

        // Validation: Check target_warehouse for ToWarehouse orders
        if (order_type === 'ToWarehouse' && (!target_warehouse || target_warehouse.trim() === '')) {
            return resolve({
                err: 1,
                msg: 'target_warehouse is required for ToWarehouse orders'
            });
        }

        // Validation: Check supplier_id for ToSupplier orders
        if (order_type === 'ToSupplier' && (!supplier_id)) {
            return resolve({
                err: 1,
                msg: 'supplier_id is required for ToSupplier orders'
            });
        }

        // Validation: Validate each item
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            
            // Validate SKU - required
            if (!item.sku || item.sku.trim() === '') {
                return resolve({
                    err: 1,
                    msg: `Item ${i + 1}: SKU is required`
                });
            }
            
            // Validate name - required
            if (!item.name || item.name.trim() === '') {
                return resolve({
                    err: 1,
                    msg: `Item ${i + 1}: Product name is required`
                });
            }
            
            // Validate quantity
            const quantity = parseFloat(item.quantity);
            if (isNaN(quantity) || quantity <= 0) {
                return resolve({
                    err: 1,
                    msg: `Item ${i + 1}: Quantity must be greater than 0`
                });
            }
            
            // Validate unit_price - required and must be > 0
            const unitPrice = parseFloat(item.unit_price);
            if (isNaN(unitPrice) || unitPrice <= 0) {
                return resolve({
                    err: 1,
                    msg: `Item ${i + 1}: Unit price is required and must be greater than 0`
                });
            }
        }

        // Calculate total
        const total = items.reduce((sum, item) => {
            const quantity = parseFloat(item.quantity || 0);
            const unitPrice = parseFloat(item.unit_price || 0);
            return sum + (quantity * unitPrice);
        }, 0);

        // For warehouse orders, we'll use a special approach
        // Since Order table is for supplier orders, we'll create a StoreOrder record
        // For now, we'll use raw query to insert into a StoreOrder table
        // If StoreOrder table doesn't exist, we'll need to create it or use Order table with special handling

        // Generate order code
        const orderCode = `SO-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

        // Create order using raw query (assuming we'll create StoreOrder table or use Order with warehouse logic)
        // For now, let's use a workaround: create order with supplier_id = NULL for warehouse orders
        // But Order table requires supplier_id, so we need to create StoreOrder table

        // Using raw query to insert StoreOrder
        const query = `
            INSERT INTO StoreOrder (
                store_id, 
                created_by, 
                order_type, 
                target_warehouse, 
                supplier_id, 
                total_amount, 
                status, 
                perishable, 
                notes, 
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, NOW())
        `;

        let result;
        try {
            result = await db.sequelize.query(query, {
                replacements: [
                    store_id,
                    created_by,
                    order_type || 'ToWarehouse',
                    target_warehouse || null,
                    supplier_id || null,
                    total,
                    perishable || false,
                    notes || null
                ],
                type: db.sequelize.QueryTypes.INSERT
            });
        } catch (dbError) {
            console.error('Database error creating store order:', dbError);
            // Check if table doesn't exist
            if (dbError.message && (dbError.message.includes("doesn't exist") || dbError.message.includes("Unknown table"))) {
                return resolve({
                    err: 1,
                    msg: 'StoreOrder table does not exist. Please run the migration first: server/database/migrations/2025-11-08_create_store_order_tables.sql'
                });
            }
            return resolve({
                err: 1,
                msg: 'Database error: ' + dbError.message
            });
        }

        // Sequelize INSERT returns [result, metadata] where result is [affectedRows, insertId]
        // For MySQL with raw query, result[0] is [affectedRows, insertId]
        let orderId;
        if (Array.isArray(result) && result[0]) {
            if (Array.isArray(result[0])) {
                orderId = result[0][1]; // [affectedRows, insertId]
            } else if (result[0].insertId) {
                orderId = result[0].insertId;
            } else {
                orderId = result[0];
            }
        } else if (result?.insertId) {
            orderId = result.insertId;
        }

        console.log('Store order created with ID:', orderId);

        // Insert order items
        if (orderId) {
            for (const item of items) {
                // Find product by SKU or name
                let product = null;
                if (item.sku) {
                    product = await db.Product.findOne({
                        where: { sku: item.sku }
                    });
                } else if (item.product_id) {
                    product = await db.Product.findByPk(item.product_id);
                }

                if (product) {
                    const itemQuery = `
                        INSERT INTO StoreOrderItem (
                            store_order_id,
                            product_id,
                            sku,
                            product_name,
                            quantity,
                            unit_price,
                            subtotal,
                            created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
                    `;

                    const quantity = parseFloat(item.quantity || 0);
                    const unitPrice = parseFloat(item.unit_price || 0);
                    const subtotal = quantity * unitPrice;

                    await db.sequelize.query(itemQuery, {
                        replacements: [
                            orderId,
                            product.product_id,
                            item.sku || product.sku,
                            item.name || product.name,
                            quantity,
                            unitPrice,
                            subtotal
                        ],
                        type: db.sequelize.QueryTypes.INSERT
                    });
                } else {
                    // If product not found, still create item with provided info
                    const itemQuery = `
                        INSERT INTO StoreOrderItem (
                            store_order_id,
                            product_id,
                            sku,
                            product_name,
                            quantity,
                            unit_price,
                            subtotal,
                            created_at
                        ) VALUES (?, NULL, ?, ?, ?, ?, ?, NOW())
                    `;

                    const quantity = parseFloat(item.quantity || 0);
                    const unitPrice = parseFloat(item.unit_price || 0);
                    const subtotal = quantity * unitPrice;

                    await db.sequelize.query(itemQuery, {
                        replacements: [
                            orderId,
                            item.sku || '',
                            item.name || '',
                            quantity,
                            unitPrice,
                            subtotal
                        ],
                        type: db.sequelize.QueryTypes.INSERT
                    });
                }
            }
        }

        resolve({
            err: 0,
            msg: 'Order created successfully',
            data: {
                order_id: orderId,
                order_code: orderCode,
                total_amount: total
            }
        });
    } catch (error) {
        console.error('Error creating store order:', error);
        reject(error);
    }
});

// Get store orders
export const getStoreOrders = (storeId, filters = {}) => new Promise(async (resolve, reject) => {
    try {

        // Build WHERE clause with table prefix to avoid ambiguous column errors
        let whereConditions = [];
        if (storeId) {
            whereConditions.push('so.store_id = :store_id');
        }
        if (filters.status && filters.status !== 'All') {
            whereConditions.push('so.status = :status');
        }
        if (filters.order_type && filters.order_type !== 'All') {
            whereConditions.push('so.order_type = :order_type');
        }

        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

        const query = `
            SELECT 
                so.*,
                u.username as created_by_name,
                s.name as store_name
            FROM StoreOrder so
            LEFT JOIN User u ON so.created_by = u.user_id
            LEFT JOIN Store s ON so.store_id = s.store_id
            ${whereClause}
            ORDER BY so.created_at DESC
        `;

        // Prepare replacements object
        const replacements = {};
        if (storeId) {
            replacements.store_id = storeId;
        }
        if (filters.status && filters.status !== 'All') {
            replacements.status = filters.status.toLowerCase();
        }
        if (filters.order_type && filters.order_type !== 'All') {
            replacements.order_type = filters.order_type;
        }

        const orders = await db.sequelize.query(query, {
            replacements: replacements,
            type: db.sequelize.QueryTypes.SELECT
        });

        // Get items for each order
        for (const order of orders) {
            const itemsQuery = `
                SELECT * FROM StoreOrderItem 
                WHERE store_order_id = ?
            `;
            const items = await db.sequelize.query(itemsQuery, {
                replacements: [order.store_order_id],
                type: db.sequelize.QueryTypes.SELECT
            });
            order.items = items;
        }

        resolve({
            err: 0,
            msg: 'OK',
            data: orders
        });
    } catch (error) {
        console.error('Error getting store orders:', error);
        reject(error);
    }
});

