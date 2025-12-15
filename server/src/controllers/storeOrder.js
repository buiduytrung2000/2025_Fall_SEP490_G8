import * as storeOrderService from '../services/storeOrder';
import db from '../models';

// Create store order
export const createStoreOrder = async (req, res) => {
    try {
        const { order_type, target_warehouse, supplier_id, items, perishable, notes } = req.body;
        
        console.log('Create store order request:', {
            body: req.body,
            user: req.user
        });
        
        // Get created_by from user token
        const createdBy = req.user?.user_id || req.user?.id || req.body.created_by;
        
        if (!createdBy) {
            return res.status(400).json({
                err: 1,
                msg: 'User not authenticated or missing user_id'
            });
        }

        // Get store_id from user or database
        let storeId = req.user?.store_id || req.body.store_id;
        
        // If store_id not in token, get from database
        if (!storeId && createdBy) {
            const user = await db.User.findOne({
                where: { user_id: createdBy },
                attributes: ['store_id']
            });
            storeId = user?.store_id;
        }

        if (!storeId) {
            return res.status(400).json({
                err: 1,
                msg: 'Missing store_id. User may not be assigned to a store.'
            });
        }

        // Validation: Check order_type
        if (order_type && !['ToWarehouse', 'ToSupplier'].includes(order_type)) {
            return res.status(400).json({
                err: 1,
                msg: 'Invalid order_type. Must be "ToWarehouse" or "ToSupplier"'
            });
        }

        const finalOrderType = order_type || 'ToWarehouse';

        // Validation: Check target_warehouse for ToWarehouse orders
        if (finalOrderType === 'ToWarehouse' && (!target_warehouse || target_warehouse.trim() === '')) {
            return res.status(400).json({
                err: 1,
                msg: 'target_warehouse is required for ToWarehouse orders'
            });
        }

        // Validation: Check supplier_id for ToSupplier orders
        if (finalOrderType === 'ToSupplier' && (!supplier_id)) {
            return res.status(400).json({
                err: 1,
                msg: 'supplier_id is required for ToSupplier orders'
            });
        }

        // Validation: Check items
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                err: 1,
                msg: 'Order must have at least one item'
            });
        }

        // Validation: Validate each item
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            
            // Validate SKU - required
            if (!item.sku || item.sku.trim() === '') {
                return res.status(400).json({
                    err: 1,
                    msg: `Item ${i + 1}: SKU is required`
                });
            }
            
            // Validate name - required
            if (!item.name || item.name.trim() === '') {
                return res.status(400).json({
                    err: 1,
                    msg: `Item ${i + 1}: Product name is required`
                });
            }
            
            // Validate quantity
            const quantity = parseFloat(item.quantity);
            if (isNaN(quantity) || quantity <= 0) {
                return res.status(400).json({
                    err: 1,
                    msg: `Item ${i + 1}: Quantity must be greater than 0`
                });
            }
            
            // Validate unit_price - required and must be > 0
            const unitPrice = parseFloat(item.unit_price);
            if (isNaN(unitPrice) || unitPrice <= 0) {
                return res.status(400).json({
                    err: 1,
                    msg: `Item ${i + 1}: Unit price is required and must be greater than 0`
                });
            }
        }

        const orderData = {
            store_id: parseInt(storeId),
            created_by: parseInt(createdBy),
            order_type: finalOrderType,
            target_warehouse: finalOrderType === 'ToWarehouse' ? target_warehouse.trim() : null,
            supplier_id: finalOrderType === 'ToSupplier' && supplier_id ? parseInt(supplier_id) : null,
            items: items,
            perishable: perishable || false,
            notes: notes || null
        };

        const response = await storeOrderService.createStoreOrder(orderData);
        return res.status(response.err === 0 ? 201 : 400).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at store order controller: ' + error.message
        });
    }
};

// Get store orders
export const getStoreOrders = async (req, res) => {
    try {
        const storeId = req.user?.store_id || req.query.store_id;
        const filters = {
            status: req.query.status || 'All',
            order_type: req.query.order_type || 'All'
        };

        const response = await storeOrderService.getStoreOrders(storeId ? parseInt(storeId) : null, filters);
        return res.status(response.err === 0 ? 200 : 400).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at store order controller: ' + error.message
        });
    }
};

// Update store order status (for store to mark as delivered)
export const updateStoreOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, notes, received_items } = req.body;

        if (!orderId || !status) {
            return res.status(400).json({
                err: 1,
                msg: 'Missing required inputs: order ID and status'
            });
        }

        // Only allow store to update status to 'delivered' when current status is 'shipped'
        if (status !== 'delivered') {
            return res.status(400).json({
                err: 1,
                msg: 'Store can only update status to "delivered"'
            });
        }

        const response = await storeOrderService.updateStoreOrderStatus({
            orderId: parseInt(orderId),
            status,
            updatedBy: req.user?.user_id,
            notes: notes || null,
            receivedItems: received_items || null
        });

        return res.status(response.err === 0 ? 200 : 400).json(response);
    } catch (error) {
        return res.status(500).json({
            err: -1,
            msg: 'Failed at store order controller: ' + error.message
        });
    }
};

