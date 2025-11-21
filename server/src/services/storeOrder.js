import db from '../models';
import { Op } from 'sequelize';
import { updateOrderStatusService as updateWarehouseOrderStatus } from './warehouseOrder';

// Create store order to warehouse
export const createStoreOrder = (orderData) => new Promise(async (resolve, reject) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { store_id, created_by, order_type, target_warehouse, supplier_id, items, perishable, notes } = orderData;

        if (!store_id || !created_by || !items || items.length === 0) {
            await transaction.rollback();
            return resolve({ err: 1, msg: 'Missing required fields: store_id, created_by, items' });
        }

        if (order_type && !['ToWarehouse', 'ToSupplier'].includes(order_type)) {
            await transaction.rollback();
            return resolve({ err: 1, msg: 'Invalid order_type. Must be "ToWarehouse" or "ToSupplier"' });
        }

        if (order_type === 'ToWarehouse' && (!target_warehouse || target_warehouse.trim() === '')) {
            await transaction.rollback();
            return resolve({ err: 1, msg: 'target_warehouse is required for ToWarehouse orders' });
        }

        if (order_type === 'ToSupplier' && (!supplier_id)) {
            await transaction.rollback();
            return resolve({ err: 1, msg: 'supplier_id is required for ToSupplier orders' });
        }

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (!item.sku || item.sku.trim() === '') {
                await transaction.rollback();
                return resolve({ err: 1, msg: `Item ${i + 1}: SKU is required` });
            }
            if (!item.name || item.name.trim() === '') {
                await transaction.rollback();
                return resolve({ err: 1, msg: `Item ${i + 1}: Product name is required` });
            }
            const quantity = parseFloat(item.quantity);
            if (isNaN(quantity) || quantity <= 0) {
                await transaction.rollback();
                return resolve({ err: 1, msg: `Item ${i + 1}: Quantity must be greater than 0` });
            }
            const unitPrice = parseFloat(item.unit_price);
            if (isNaN(unitPrice) || unitPrice <= 0) {
                await transaction.rollback();
                return resolve({ err: 1, msg: `Item ${i + 1}: Unit price is required and must be greater than 0` });
            }
        }

        const total = items.reduce((sum, item) => {
            const quantity = parseFloat(item.quantity || 0);
            const unitPrice = parseFloat(item.unit_price || 0);
            return sum + (quantity * unitPrice);
        }, 0);

        const order = await db.StoreOrder.create({
            store_id,
            created_by,
            order_type: order_type || 'ToWarehouse',
            target_warehouse: order_type === 'ToWarehouse' ? target_warehouse?.trim() : null,
            supplier_id: order_type === 'ToSupplier' ? supplier_id : null,
            total_amount: total,
            status: 'pending',
            perishable: perishable || false,
            notes: notes || null
        }, { transaction });

        for (const item of items) {
            let product = null;
            if (item.product_id) {
                product = await db.Product.findByPk(item.product_id, { transaction });
            } else if (item.sku) {
                product = await db.Product.findOne({
                    where: { sku: item.sku },
                    transaction
                });
            }

            const quantity = parseFloat(item.quantity || 0);
            const unitPrice = parseFloat(item.unit_price || 0);
            const subtotal = quantity * unitPrice;
            const quantityInBase = item.quantity_in_base ?? quantity;
            const unitId = item.unit_id || product?.base_unit_id || null;

            await db.StoreOrderItem.create({
                store_order_id: order.store_order_id,
                product_id: product?.product_id || null,
                sku: item.sku?.trim() || product?.sku || '',
                product_name: item.name?.trim() || product?.name || '',
                quantity,
                actual_quantity: null,
                unit_price: unitPrice,
                subtotal,
                unit_id: unitId,
                quantity_in_base: quantityInBase
            }, { transaction });
        }

        await transaction.commit();
        resolve({
            err: 0,
            msg: 'Order created successfully',
            data: {
                order_id: order.store_order_id,
                total_amount: total
            }
        });
    } catch (error) {
        await transaction.rollback();
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

// Update store order status (for store to mark as delivered)
export const updateStoreOrderStatus = ({ orderId, status, updatedBy }) => new Promise(async (resolve, reject) => {
    try {
        const response = await updateWarehouseOrderStatus({
            orderId,
            status,
            updatedBy
        });
        resolve(response);
    } catch (error) {
        console.error('Error updating store order status:', error);
        reject(error);
    }
});

