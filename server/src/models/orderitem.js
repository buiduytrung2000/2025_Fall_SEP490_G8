'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class OrderItem extends Model {
        static associate(models) {
            OrderItem.belongsTo(models.Order, {
                foreignKey: 'order_id',
                as: 'order',
                onDelete: 'CASCADE'
            });
            OrderItem.belongsTo(models.Product, {
                foreignKey: 'product_id',
                as: 'product',
                onDelete: 'CASCADE'
            });
        }
    }

    OrderItem.init({
        order_item_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        order_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Order',
                key: 'order_id'
            }
        },
        product_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Product',
                key: 'product_id'
            }
        },
        quantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
            comment: 'Số lượng yêu cầu từ chi nhánh'
        },
        actual_quantity: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: null,
            comment: 'Số lượng thực tế xuất kho (do warehouse cập nhật)'
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
        },
        updated_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        }
    }, {
        sequelize,
        modelName: 'OrderItem',
        tableName: 'OrderItem',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { fields: ['order_id'] },
            { fields: ['product_id'] }
        ]
    });

    return OrderItem;
};
