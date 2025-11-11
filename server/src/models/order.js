'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Order extends Model {
        static associate(models) {
            // Kiểm tra model tồn tại trước khi associate
            if (models.Store) {
                Order.belongsTo(models.Store, {
                    foreignKey: 'store_id',
                    as: 'store',
                    onDelete: 'CASCADE'
                });
            }

            if (models.Supplier) {
                Order.belongsTo(models.Supplier, {
                    foreignKey: 'supplier_id',
                    as: 'supplier',
                    onDelete: 'CASCADE'
                });
            }

            if (models.User) {
                Order.belongsTo(models.User, {
                    foreignKey: 'created_by',
                    as: 'creator',
                    onDelete: 'CASCADE'
                });
            }

            if (models.OrderItem) {
                Order.hasMany(models.OrderItem, {
                    foreignKey: 'order_id',
                    as: 'orderItems',
                    onDelete: 'CASCADE'
                });
            }

            if (models.Transaction) {
                Order.hasMany(models.Transaction, {
                    foreignKey: 'order_id',
                    as: 'transactions',
                    onDelete: 'SET NULL'
                });
            }
        }
    }

    Order.init({
        order_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        store_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Store',
                key: 'store_id'
            }
        },
        supplier_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Supplier',
                key: 'supplier_id'
            }
        },
        created_by: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'User',
                key: 'user_id'
            }
        },
        status: {
            type: DataTypes.ENUM('pending', 'confirmed', 'shipped', 'delivered', 'cancelled'),
            defaultValue: 'pending'
        },
        expected_delivery: {
            type: DataTypes.DATE,
            allowNull: true
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
        modelName: 'Order',
        tableName: 'Order',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { fields: ['store_id'] },
            { fields: ['supplier_id'] },
            { fields: ['created_by'] },
            { fields: ['status'] },
            { fields: ['created_at'] }
        ]
    });

    return Order;
};
