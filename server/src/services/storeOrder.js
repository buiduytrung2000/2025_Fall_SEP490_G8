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

// Get store order detail by ID
export const getStoreOrderDetail = (orderId) => new Promise(async (resolve, reject) => {
    try {
        const order = await db.StoreOrder.findOne({
            where: { store_order_id: orderId },
            include: [
                {
                    model: db.User,
                    as: 'creator',
                    attributes: ['user_id', 'username', 'full_name']
                },
                {
                    model: db.Store,
                    as: 'store',
                    attributes: ['store_id', 'name', 'address', 'phone']
                }
            ]
        });

        if (!order) {
            return resolve({
                err: 1,
                msg: 'Order not found'
            });
        }

        // Get order items
        const items = await db.StoreOrderItem.findAll({
            where: { store_order_id: orderId },
            include: [
                {
                    model: db.Product,
                    as: 'product',
                    attributes: ['product_id', 'name', 'sku']
                }
            ]
        });

        // Format response
        const orderData = {
            store_order_id: order.store_order_id,
            order_code: order.order_code,
            store_id: order.store_id,
            store_name: order.store?.name || 'N/A',
            status: order.status,
            order_type: order.order_type,
            target_warehouse: order.target_warehouse,
            supplier_id: order.supplier_id,
            perishable: order.perishable,
            notes: order.notes,
            store_receive_note: order.store_receive_note,
            created_at: order.created_at,
            updated_at: order.updated_at,
            created_by: order.created_by,
            created_by_name: order.creator?.full_name || order.creator?.username || 'N/A',
            items: items.map(item => ({
                store_order_item_id: item.store_order_item_id,
                product_id: item.product_id,
                product_name: item.product?.name || item.product_name,
                name: item.product?.name || item.product_name,
                sku: item.product?.sku || item.sku,
                quantity: Number(item.quantity),
                unit_price: Number(item.unit_price || 0),
                subtotal: Number(item.subtotal || 0),
                unit_name: item.unit_name,
                conversion_to_base: Number(item.conversion_to_base || 1)
            }))
        };

        resolve({
            err: 0,
            msg: 'OK',
            data: orderData
        });
    } catch (error) {
        console.error('Error getting store order detail:', error);
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

                // Nếu có receivedItems: cập nhật SL nhận thực tế, điều chỉnh tồn kho chi nhánh và tổng tiền đơn
                if (receivedItems && Array.isArray(receivedItems) && receivedItems.length > 0) {
                    let newTotalAmount = 0;

                    for (const receivedItem of receivedItems) {
                        const item = await db.StoreOrderItem.findOne({
                            where: {
                                store_order_id: orderId,
                                sku: receivedItem.sku
                            },
                            transaction,
                            lock: transaction.LOCK.UPDATE
                        });

                        if (!item) continue;

                        const receivedQtyPackage = Number(receivedItem.received_quantity ?? 0);
                        if (isNaN(receivedQtyPackage) || receivedQtyPackage < 0) {
                            continue;
                        }

                        const unitPrice = Number(item.unit_price || 0);

                        // Xác định conversion (thùng -> đơn vị base) để tính delta tồn kho
                        let conversionToBase = null;
                        if (item.quantity_in_base && item.quantity && Number(item.quantity) > 0 && Number(item.quantity_in_base) > Number(item.quantity)) {
                            conversionToBase = Number(item.quantity_in_base) / Number(item.quantity);
                        } else if (item.product_id) {
                            const pkgMeta = await getPreferredPackageUnit(item.product_id);
                            if (pkgMeta?.conversion_to_base && pkgMeta.conversion_to_base > 1) {
                                conversionToBase = Number(pkgMeta.conversion_to_base);
                            }
                        }

                        // shippedBase: số lượng base đã được cộng vào tồn kho khi warehouse chuyển trạng thái shipped -> delivered
                        let shippedBase = 0;
                        if (item.actual_quantity !== null && item.actual_quantity !== undefined) {
                            shippedBase = Number(item.actual_quantity || 0);
                        } else if (item.quantity_in_base !== null && item.quantity_in_base !== undefined) {
                            shippedBase = Number(item.quantity_in_base || 0);
                        } else if (conversionToBase && conversionToBase > 1) {
                            shippedBase = Number(item.quantity || 0) * conversionToBase;
                        } else {
                            shippedBase = Number(item.quantity || 0);
                        }

                        // receivedBase: số lượng base tương ứng với SL nhận thực tế (thùng)
                        let receivedBase = 0;
                        if (conversionToBase && conversionToBase > 1) {
                            receivedBase = receivedQtyPackage * conversionToBase;
                        } else {
                            receivedBase = receivedQtyPackage;
                        }

                        const deltaBase = receivedBase - shippedBase;

                        // Điều chỉnh tồn kho chi nhánh theo chênh lệch giữa shipped và received
                        if (deltaBase !== 0 && item.product_id && order.store_id) {
                            const inventory = await db.Inventory.findOne({
                                where: {
                                    store_id: order.store_id,
                                    product_id: item.product_id
                                },
                                transaction,
                                lock: transaction.LOCK.UPDATE
                            });

                            if (inventory) {
                                const newStock = Number(inventory.stock || 0) + deltaBase;
                                if (newStock < 0) {
                                    // Không cho tồn kho âm, rollback và báo lỗi
                                    await transaction.rollback();
                                    return resolve({
                                        err: 1,
                                        msg: `Tồn kho tại cửa hàng không đủ để điều chỉnh cho sản phẩm ${item.product_name || item.sku}`
                                    });
                                }

                                await inventory.update(
                                    {
                                        stock: newStock,
                                        updated_at: new Date()
                                    },
                                    { transaction }
                                );
                            } else if (deltaBase > 0) {
                                // Nếu chưa có bản ghi tồn và delta > 0, tạo mới
                                await db.Inventory.create(
                                    {
                                        store_id: order.store_id,
                                        product_id: item.product_id,
                                        stock: deltaBase,
                                        min_stock_level: 0,
                                        reorder_point: 0
                                    },
                                    { transaction }
                                );
                            }
                        }

                        // Cập nhật received_quantity và subtotal theo SL nhận thực tế
                        const newSubtotal = receivedQtyPackage * unitPrice;
                        await item.update(
                            {
                                received_quantity: receivedQtyPackage,
                                subtotal: newSubtotal,
                                updated_at: new Date()
                            },
                            { transaction }
                        );

                        newTotalAmount += newSubtotal;
                    }

                    // Cập nhật tổng tiền đơn theo SL nhận thực tế
                    await order.update(
                        {
                            total_amount: newTotalAmount,
                            updated_at: new Date()
                        },
                        { transaction }
                    );
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

