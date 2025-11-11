import * as paymentService from '../services/payment';

// Create cash payment
export const createCashPayment = async (req, res) => {
    try {
        const {
            store_id,
            cashier_id,
            customer_id,
            cart_items,
            subtotal,
            tax_amount,
            discount_amount,
            voucher_code,
            total_amount
        } = req.body;

        // Validation
        if (!cart_items || cart_items.length === 0 || !total_amount) {
            return res.status(400).json({
                err: 1,
                msg: 'Missing required fields: cart_items, total_amount'
            });
        }

        // Validate cart items structure
        for (let i = 0; i < cart_items.length; i++) {
            const item = cart_items[i];
            if (!item.product_id || !item.quantity || !item.unit_price) {
                return res.status(400).json({
                    err: 1,
                    msg: `Item ${i + 1}: Missing product_id, quantity, or unit_price`
                });
            }
        }

        const paymentData = {
            store_id: store_id || null,
            cashier_id: cashier_id || null,
            customer_id: customer_id || null,
            cart_items,
            subtotal: subtotal || total_amount,
            tax_amount: tax_amount || 0,
            discount_amount: discount_amount || 0,
            voucher_code: voucher_code || null,
            total_amount
        };

        const response = await paymentService.createCashPayment(paymentData);
        return res.status(response.err === 0 ? 201 : 400).json(response);

    } catch (error) {
        console.error('Error in createCashPayment controller:', error);
        return res.status(500).json({
            err: -1,
            msg: 'Failed at payment controller: ' + error.message
        });
    }
};

// Create QR payment
export const createQRPayment = async (req, res) => {
    try {
        const {
            store_id,
            cashier_id,
            customer_id,
            cart_items,
            subtotal,
            tax_amount,
            discount_amount,
            voucher_code,
            total_amount,
            customer_name,
            customer_phone
        } = req.body;

        // Validation
        if (!cart_items || cart_items.length === 0 || !total_amount) {
            return res.status(400).json({
                err: 1,
                msg: 'Missing required fields: cart_items, total_amount'
            });
        }

        // Validate cart items structure
        for (let i = 0; i < cart_items.length; i++) {
            const item = cart_items[i];
            if (!item.product_id || !item.quantity || !item.unit_price) {
                return res.status(400).json({
                    err: 1,
                    msg: `Item ${i + 1}: Missing product_id, quantity, or unit_price`
                });
            }
            // Add product name if not provided
            if (!item.product_name && !item.name) {
                return res.status(400).json({
                    err: 1,
                    msg: `Item ${i + 1}: Missing product_name or name`
                });
            }
        }

        const paymentData = {
            store_id: store_id || null,
            cashier_id: cashier_id || null,
            customer_id: customer_id || null,
            cart_items,
            subtotal: subtotal || total_amount,
            tax_amount: tax_amount || 0,
            discount_amount: discount_amount || 0,
            voucher_code: voucher_code || null,
            total_amount,
            customer_name: customer_name || 'Customer',
            customer_phone: customer_phone || ''
        };

        const response = await paymentService.createQRPayment(paymentData);
        return res.status(response.err === 0 ? 201 : 400).json(response);

    } catch (error) {
        console.error('Error in createQRPayment controller:', error);
        return res.status(500).json({
            err: -1,
            msg: 'Failed at payment controller: ' + error.message
        });
    }
};

// Check payment status
export const checkPaymentStatus = async (req, res) => {
    try {
        const { orderCode } = req.params;

        if (!orderCode) {
            return res.status(400).json({
                err: 1,
                msg: 'Missing orderCode parameter'
            });
        }

        const response = await paymentService.checkPaymentStatus(orderCode);
        return res.status(response.err === 0 ? 200 : 400).json(response);

    } catch (error) {
        console.error('Error in checkPaymentStatus controller:', error);
        return res.status(500).json({
            err: -1,
            msg: 'Failed at payment controller: ' + error.message
        });
    }
};

// Handle PayOS webhook
export const handlePayOSWebhook = async (req, res) => {
    try {
        const webhookData = req.body;

        console.log('Received PayOS webhook:', webhookData);

        const response = await paymentService.handlePayOSWebhook(webhookData);
        
        // Always return 200 to PayOS to acknowledge receipt
        return res.status(200).json(response);

    } catch (error) {
        console.error('Error in handlePayOSWebhook controller:', error);
        // Still return 200 to prevent PayOS from retrying
        return res.status(200).json({
            err: -1,
            msg: 'Failed to process webhook: ' + error.message
        });
    }
};

// Get transaction details
export const getTransactionDetails = async (req, res) => {
    try {
        const { transactionId } = req.params;

        if (!transactionId) {
            return res.status(400).json({
                err: 1,
                msg: 'Missing transactionId parameter'
            });
        }

        const response = await paymentService.getTransactionDetails(transactionId);
        return res.status(response.err === 0 ? 200 : 400).json(response);

    } catch (error) {
        console.error('Error in getTransactionDetails controller:', error);
        return res.status(500).json({
            err: -1,
            msg: 'Failed at payment controller: ' + error.message
        });
    }
};

// Get transaction history
export const getTransactionHistory = async (req, res) => {
    try {
        const { date, payment_method, store_id, cashier_id } = req.query;
        const user = req.user;

        // Build filters
        const filters = {};

        if (date) {
            filters.date = date;
        }

        if (payment_method) {
            filters.payment_method = payment_method;
        }

        // For Cashier role: only show their own transactions
        if (user.role === 'Cashier') {
            // Get user's store_id from database
            const userInfo = await paymentService.getUserInfo(user.user_id);
            if (!userInfo) {
                return res.status(404).json({
                    err: 1,
                    msg: 'User not found'
                });
            }

            filters.cashier_id = user.user_id;
            filters.store_id = userInfo.store_id;
        }
        // For Manager role: show all transactions in their store
        else if (user.role === 'Manager' || user.role === 'Store_Manager') {
            // Get manager's store_id from database
            const userInfo = await paymentService.getUserInfo(user.user_id);
            if (!userInfo) {
                return res.status(404).json({
                    err: 1,
                    msg: 'User not found'
                });
            }

            filters.store_id = store_id || userInfo.store_id;
            if (cashier_id) {
                filters.cashier_id = cashier_id;
            }
        }
        // For other roles: allow filtering by store_id and cashier_id
        else {
            if (store_id) filters.store_id = store_id;
            if (cashier_id) filters.cashier_id = cashier_id;
        }

        const response = await paymentService.getTransactionHistory(filters);
        return res.status(response.err === 0 ? 200 : 400).json(response);

    } catch (error) {
        console.error('Error in getTransactionHistory controller:', error);
        return res.status(500).json({
            err: -1,
            msg: 'Failed at payment controller: ' + error.message
        });
    }
};

