import db from '../models';
import { Op } from 'sequelize';
import { updateOrderStatusService as updateWarehouseOrderStatus } from './warehouseOrder';

const ORDER_CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

const generateStoreOrderCode = async () => {
    let code = '';
    let exists = true;

    while (exists) {
        code = Array.from({ length: 6 }, () =>
            ORDER_CODE_CHARS[Math.floor(Math.random() * ORDER_CODE_CHARS.length)]
        ).join('');

        const count = await db.StoreOrder.count({ where: { order_code: code } });
        exists = count > 0;
    }

    return code;
};

const packageUnitCache = new Map();

const getPreferredPackageUnit = async (productId) => {
    if (!productId) return null;
    if (packageUnitCache.has(productId)) return packageUnitCache.get(productId);

    const productUnit = await db.ProductUnit.findOne({
        where: { product_id: productId },
        include: [
            {
                model: db.Unit,
                as: 'unit',
                attributes: ['unit_id', 'name', 'symbol']
            }
        ],
        order: [['conversion_to_base', 'DESC']]
    });

    if (!productUnit) {
        packageUnitCache.set(productId, null);
        return null;
    }

    const meta = {
        conversion_to_base: Number(productUnit.conversion_to_base) || null,
        unit: productUnit.unit
            ? {
                unit_id: productUnit.unit.unit_id,
                name: productUnit.unit.name,
                symbol: productUnit.unit.symbol
            }
            : null
    };

    packageUnitCache.set(productId, meta);
    return meta;
};

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

        for (let i =  0; i < items.length; i++) {
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

        const orderCode = await generateStoreOrderCode();

        const order = await db.StoreOrder.create({
            order_code: orderCode,
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
            const productId = product?.product_id || null;
            const packageMeta = await getPreferredPackageUnit(productId);
            const conversionToBase = packageMeta?.conversion_to_base;
            const quantityInBase = item.quantity_in_base ?? (
                conversionToBase ? quantity * conversionToBase : quantity
            );
            const unitId = item.unit_id || product?.base_unit_id || null;
            const packageUnitId = packageMeta?.unit?.unit_id || null;
            const packageQuantity = quantity ? Math.ceil(quantity) : null;

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
                quantity_in_base: quantityInBase,
                package_unit_id: packageUnitId,
                package_quantity: packageQuantity
            }, { transaction });
        }

        await transaction.commit();
        resolve({
            err: 0,
            msg: 'Order created successfully',
            data: {
                order_id: order.store_order_id,
                order_code: order.order_code,
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
export const updateStoreOrderStatus = ({ orderId, status, updatedBy, notes, receivedItems }) => new Promise(async (resolve, reject) => {
    try {
        // First update order status using warehouse service
        const response = await updateWarehouseOrderStatus({
            orderId,
            status,
            updatedBy,
            notes: null // Don't pass notes here, we'll handle it separately
        });

        if (response.err !== 0) {
            return resolve(response);
        }

        // If status is 'delivered' and we have receivedItems or notes, update them
        if (status === 'delivered') {
            const transaction = await db.sequelize.transaction();
            try {
                const order = await db.StoreOrder.findByPk(orderId, { transaction });
                
                if (!order) {
                    await transaction.rollback();
                    return resolve({ err: 1, msg: 'Order not found' });
                }

                // Update store_receive_note if notes provided
                if (notes) {
                    await order.update({
                        store_receive_note: notes,
                        updated_at: new Date()
                    }, { transaction });
                }

                // Update received_quantity for each item if receivedItems provided
                if (receivedItems && Array.isArray(receivedItems) && receivedItems.length > 0) {
                    for (const receivedItem of receivedItems) {
                        const item = await db.StoreOrderItem.findOne({
                            where: {
                                store_order_id: orderId,
                                sku: receivedItem.sku
                            },
                            transaction
                        });

                        if (item) {
                            await item.update({
                                received_quantity: receivedItem.received_quantity || null,
                                updated_at: new Date()
                            }, { transaction });
                        }
                    }
                }

                await transaction.commit();
            } catch (error) {
                await transaction.rollback();
                console.error('Error updating store receive info:', error);
                // Don't fail the whole request if updating receive info fails
            }
        }

        resolve(response);
    } catch (error) {
        console.error('Error updating store order status:', error);
        reject(error);
    }
});

