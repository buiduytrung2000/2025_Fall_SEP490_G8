import db from '../models';

// Lazy load PayOS to avoid import issues with Babel
let payOSInstance = null;
const getPayOS = () => {
    if (!payOSInstance) {
        // PayOS exports as { PayOS: class }
        const { PayOS } = require('@payos/node');
        payOSInstance = new PayOS(
            process.env.PAYOS_CLIENT_ID || 'your-client-id',
            process.env.PAYOS_API_KEY || 'your-api-key',
            process.env.PAYOS_CHECKSUM_KEY || 'your-checksum-key'
        );
    }
    return payOSInstance;
};

// Create cash payment and transaction
export const createCashPayment = (paymentData) => new Promise(async (resolve, reject) => {
    const transaction = await db.sequelize.transaction();

    try {
        let {
            store_id,
            cashier_id,
            customer_id,
            cart_items,
            subtotal,
            tax_amount,
            discount_amount,
            voucher_code,
            total_amount
        } = paymentData;

        // Validation
        if (!cart_items || cart_items.length === 0 || !total_amount) {
            await transaction.rollback();
            return resolve({
                err: 1,
                msg: 'Missing required fields: cart_items, total_amount'
            });
        }

        // Get default store_id if not provided
        if (!store_id) {
            const defaultStore = await db.Store.findOne({
                where: { status: 'active' },
                order: [['store_id', 'ASC']]
            });

            if (defaultStore) {
                store_id = defaultStore.store_id;
            } else {
                await transaction.rollback();
                return resolve({
                    err: 1,
                    msg: 'No active store found. Please provide store_id.'
                });
            }
        }

        // Create payment record
        const payment = await db.Payment.create({
            method: 'cash',
            amount: total_amount,
            status: 'completed',
            paid_at: new Date()
        }, { transaction });

        // Create transaction record
        const transactionRecord = await db.Transaction.create({
            customer_id: customer_id || null,
            payment_id: payment.payment_id,
            store_id: store_id,
            cashier_id: cashier_id,
            total_amount: total_amount,
            subtotal: subtotal || total_amount,
            tax_amount: tax_amount || 0,
            discount_amount: discount_amount || 0,
            voucher_code: voucher_code || null,
            status: 'completed'
        }, { transaction });

        // Create transaction items
        for (const item of cart_items) {
            await db.TransactionItem.create({
                transaction_id: transactionRecord.transaction_id,
                product_id: item.product_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                subtotal: item.quantity * item.unit_price
            }, { transaction });

            // Update inventory (only if store_id is provided)
            if (store_id) {
                const inventory = await db.Inventory.findOne({
                    where: {
                        store_id: store_id,
                        product_id: item.product_id
                    }
                });

                if (inventory) {
                    await inventory.update({
                        stock: inventory.stock - item.quantity
                    }, { transaction });
                }
            }
        }

        // Mark voucher as used if applicable
        if (voucher_code) {
            await db.sequelize.query(
                `UPDATE CustomerVoucher 
                 SET status = 'used', 
                     used_at = NOW(), 
                     transaction_id = ? 
                 WHERE voucher_code = ? AND status = 'available'`,
                {
                    replacements: [transactionRecord.transaction_id, voucher_code],
                    type: db.sequelize.QueryTypes.UPDATE,
                    transaction
                }
            );
        }

        await transaction.commit();

        // Fetch complete transaction with items
        const completeTransaction = await db.Transaction.findOne({
            where: { transaction_id: transactionRecord.transaction_id },
            include: [
                {
                    model: db.TransactionItem,
                    as: 'items',
                    include: [{
                        model: db.Product,
                        as: 'product'
                    }]
                },
                {
                    model: db.Payment,
                    as: 'payment'
                },
                {
                    model: db.Customer,
                    as: 'customer'
                }
            ]
        });

        resolve({
            err: 0,
            msg: 'Payment completed successfully',
            data: completeTransaction
        });

    } catch (error) {
        await transaction.rollback();
        console.error('Error creating cash payment:', error);
        resolve({
            err: -1,
            msg: 'Failed to create cash payment: ' + error.message
        });
    }
});

// Create QR payment link with PayOS
export const createQRPayment = (paymentData) => new Promise(async (resolve, reject) => {
    try {
        let {
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
        } = paymentData;

        // Validation
        if (!cart_items || cart_items.length === 0 || !total_amount) {
            return resolve({
                err: 1,
                msg: 'Missing required fields: cart_items, total_amount'
            });
        }

        // Get default store_id if not provided
        if (!store_id) {
            const defaultStore = await db.Store.findOne({
                where: { status: 'active' },
                order: [['store_id', 'ASC']]
            });

            if (defaultStore) {
                store_id = defaultStore.store_id;
            } else {
                return resolve({
                    err: 1,
                    msg: 'No active store found. Please provide store_id.'
                });
            }
        }

        // Generate unique order code
        const orderCode = Date.now();

        // Prepare items for PayOS
        const payosItems = cart_items.map(item => ({
            name: item.product_name || item.name,
            quantity: item.quantity,
            price: Math.round(item.unit_price)
        }));

        // Create PayOS payment link
        const payosBody = {
            orderCode: orderCode,
            amount: Math.round(total_amount),
            description: `Thanh toan don hang #${orderCode}`,
            items: payosItems,
            cancelUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pos/payment-cancel`,
            returnUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pos/payment-success`,
            buyerName: customer_name || 'Customer',
            buyerPhone: customer_phone || ''
        };

        const paymentLinkRes = await getPayOS().createPaymentLink(payosBody);

        // Create pending payment record
        const payment = await db.Payment.create({
            method: 'bank_transfer',
            amount: total_amount,
            status: 'pending',
            payos_order_code: orderCode,
            payos_payment_link_id: paymentLinkRes.paymentLinkId
        });

        // Create pending transaction record
        const transactionRecord = await db.Transaction.create({
            customer_id: customer_id || null,
            payment_id: payment.payment_id,
            store_id: store_id,
            cashier_id: cashier_id,
            total_amount: total_amount,
            subtotal: subtotal || total_amount,
            tax_amount: tax_amount || 0,
            discount_amount: discount_amount || 0,
            voucher_code: voucher_code || null,
            status: 'pending'
        });

        // Create transaction items
        for (const item of cart_items) {
            await db.TransactionItem.create({
                transaction_id: transactionRecord.transaction_id,
                product_id: item.product_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                subtotal: item.quantity * item.unit_price
            });
        }

        resolve({
            err: 0,
            msg: 'Payment link created successfully',
            data: {
                transaction_id: transactionRecord.transaction_id,
                payment_id: payment.payment_id,
                order_code: orderCode,
                checkout_url: paymentLinkRes.checkoutUrl,
                qr_code: paymentLinkRes.qrCode,
                payment_link_id: paymentLinkRes.paymentLinkId
            }
        });

    } catch (error) {
        console.error('Error creating QR payment:', error);
        resolve({
            err: -1,
            msg: 'Failed to create QR payment: ' + error.message
        });
    }
});

// Check payment status
export const checkPaymentStatus = (orderCode) => new Promise(async (resolve, reject) => {
    try {
        const paymentInfo = await getPayOS().getPaymentLinkInformation(orderCode);

        resolve({
            err: 0,
            msg: 'Payment status retrieved successfully',
            data: paymentInfo
        });
    } catch (error) {
        console.error('Error checking payment status:', error);
        resolve({
            err: -1,
            msg: 'Failed to check payment status: ' + error.message
        });
    }
});

// Handle PayOS webhook
export const handlePayOSWebhook = (webhookData) => new Promise(async (resolve, reject) => {
    const transaction = await db.sequelize.transaction();

    try {
        // Verify webhook data
        const verifiedData = getPayOS().verifyPaymentWebhookData(webhookData);

        if (!verifiedData || verifiedData.code !== '00') {
            await transaction.rollback();
            return resolve({
                err: 1,
                msg: 'Payment verification failed or payment not successful'
            });
        }

        // Find payment by order code
        const payment = await db.Payment.findOne({
            where: {
                payos_order_code: verifiedData.orderCode,
                status: 'pending'
            }
        });

        if (!payment) {
            await transaction.rollback();
            return resolve({
                err: 1,
                msg: 'Payment not found or already processed'
            });
        }

        // Update payment status
        await payment.update({
            status: 'completed',
            paid_at: new Date(),
            payos_transaction_reference: verifiedData.reference
        }, { transaction });

        // Find and update transaction
        const transactionRecord = await db.Transaction.findOne({
            where: {
                payment_id: payment.payment_id,
                status: 'pending'
            }
        });

        if (!transactionRecord) {
            await transaction.rollback();
            return resolve({
                err: 1,
                msg: 'Transaction not found'
            });
        }

        await transactionRecord.update({
            status: 'completed'
        }, { transaction });

        // Update inventory for all items (only if store_id is provided)
        if (transactionRecord.store_id) {
            const items = await db.TransactionItem.findAll({
                where: { transaction_id: transactionRecord.transaction_id }
            });

            for (const item of items) {
                const inventory = await db.Inventory.findOne({
                    where: {
                        store_id: transactionRecord.store_id,
                        product_id: item.product_id
                    }
                });

                if (inventory) {
                    await inventory.update({
                        stock: inventory.stock - item.quantity
                    }, { transaction });
                }
            }
        }

        // Mark voucher as used if applicable
        if (transactionRecord.voucher_code) {
            await db.sequelize.query(
                `UPDATE CustomerVoucher
                 SET status = 'used',
                     used_at = NOW(),
                     transaction_id = ?
                 WHERE voucher_code = ? AND status = 'available'`,
                {
                    replacements: [transactionRecord.transaction_id, transactionRecord.voucher_code],
                    type: db.sequelize.QueryTypes.UPDATE,
                    transaction
                }
            );
        }

        await transaction.commit();

        resolve({
            err: 0,
            msg: 'Payment webhook processed successfully',
            data: {
                transaction_id: transactionRecord.transaction_id,
                payment_id: payment.payment_id
            }
        });

    } catch (error) {
        await transaction.rollback();
        console.error('Error handling PayOS webhook:', error);
        resolve({
            err: -1,
            msg: 'Failed to handle webhook: ' + error.message
        });
    }
});

// Get transaction details
export const getTransactionDetails = (transactionId) => new Promise(async (resolve, reject) => {
    try {
        const transaction = await db.Transaction.findOne({
            where: { transaction_id: transactionId },
            include: [
                {
                    model: db.TransactionItem,
                    as: 'items',
                    include: [{
                        model: db.Product,
                        as: 'product'
                    }]
                },
                {
                    model: db.Payment,
                    as: 'payment'
                },
                {
                    model: db.Customer,
                    as: 'customer'
                },
                {
                    model: db.Store,
                    as: 'store'
                }
            ]
        });

        if (!transaction) {
            return resolve({
                err: 1,
                msg: 'Transaction not found'
            });
        }

        resolve({
            err: 0,
            msg: 'Transaction retrieved successfully',
            data: transaction
        });

    } catch (error) {
        console.error('Error getting transaction details:', error);
        resolve({
            err: -1,
            msg: 'Failed to get transaction details: ' + error.message
        });
    }
});

