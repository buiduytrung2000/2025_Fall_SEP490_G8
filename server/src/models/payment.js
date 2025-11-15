'use strict';
const {
    Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Payment extends Model {
        static associate(models) {
            // Payment has many Transactions
            Payment.hasMany(models.Transaction, {
                foreignKey: 'payment_id',
                as: 'transactions',
                onDelete: 'CASCADE'
            });
        }
    }
    
    Payment.init({
        payment_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        method: {
            type: DataTypes.ENUM('cash', 'card', 'mobile_payment', 'bank_transfer', 'loyalty_points'),
            allowNull: false
        },
        amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
            defaultValue: 'pending'
        },
        paid_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
        // PayOS specific fields
        payos_order_code: {
            type: DataTypes.BIGINT,
            allowNull: true,
            comment: 'PayOS order code for QR payment'
        },
        payos_payment_link_id: {
            type: DataTypes.STRING(255),
            allowNull: true,
            comment: 'PayOS payment link ID'
        },
        payos_transaction_reference: {
            type: DataTypes.STRING(255),
            allowNull: true,
            comment: 'PayOS transaction reference'
        },
        cash_received: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            comment: 'Amount of cash received from customer (for cash payment)'
        },
        change_amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            comment: 'Change amount to return to customer (for cash payment)'
        },
        created_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        updated_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        }
    }, {
        sequelize,
        modelName: 'Payment',
        tableName: 'Payment',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
    
    return Payment;
};

