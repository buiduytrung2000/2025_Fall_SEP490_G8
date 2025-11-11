'use strict';
const {
    Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Transaction extends Model {
        static associate(models) {
            // Transaction belongs to Customer
            Transaction.belongsTo(models.Customer, {
                foreignKey: 'customer_id',
                as: 'customer',
                onDelete: 'SET NULL'
            });

            // Transaction belongs to Payment
            Transaction.belongsTo(models.Payment, {
                foreignKey: 'payment_id',
                as: 'payment',
                onDelete: 'CASCADE'
            });

            // Transaction belongs to Store
            Transaction.belongsTo(models.Store, {
                foreignKey: 'store_id',
                as: 'store',
                onDelete: 'CASCADE'
            });

            // Transaction belongs to User (cashier)
            Transaction.belongsTo(models.User, {
                foreignKey: 'cashier_id',
                as: 'cashier',
                onDelete: 'SET NULL'
            });

            // Transaction has many TransactionItems
            Transaction.hasMany(models.TransactionItem, {
                foreignKey: 'transaction_id',
                as: 'items',
                onDelete: 'CASCADE'
            });
        }
    }

    Transaction.init({
        transaction_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        order_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        customer_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        payment_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        store_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        cashier_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'User ID of the cashier who processed the transaction'
        },
        total_amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        subtotal: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            comment: 'Subtotal before tax and discount'
        },
        tax_amount: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0,
            comment: 'VAT amount'
        },
        discount_amount: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0,
            comment: 'Discount from voucher'
        },
        voucher_code: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: 'Applied voucher code'
        },
        status: {
            type: DataTypes.ENUM('pending', 'completed', 'cancelled', 'refunded'),
            defaultValue: 'pending'
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
        modelName: 'Transaction',
        tableName: 'Transaction',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    return Transaction;
};
