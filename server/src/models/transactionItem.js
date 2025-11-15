'use strict';
const {
    Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class TransactionItem extends Model {
        static associate(models) {
            // TransactionItem belongs to Transaction
            TransactionItem.belongsTo(models.Transaction, {
                foreignKey: 'transaction_id',
                as: 'transaction',
                onDelete: 'CASCADE'
            });

            // TransactionItem belongs to Product
            TransactionItem.belongsTo(models.Product, {
                foreignKey: 'product_id',
                as: 'product',
                onDelete: 'CASCADE'
            });
        }
    }
    
    TransactionItem.init({
        transaction_item_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        transaction_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        product_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        quantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1
        },
        unit_price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        subtotal: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        created_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        }
    }, {
        sequelize,
        modelName: 'TransactionItem',
        tableName: 'TransactionItem',
        timestamps: false,
        createdAt: 'created_at',
        updatedAt: false
    });
    
    return TransactionItem;
};

