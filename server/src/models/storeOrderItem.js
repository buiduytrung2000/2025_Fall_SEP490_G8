'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class StoreOrderItem extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            // StoreOrderItem belongs to StoreOrder
            StoreOrderItem.belongsTo(models.StoreOrder, {
                foreignKey: 'store_order_id',
                as: 'storeOrder',
                onDelete: 'CASCADE'
            });

            // StoreOrderItem belongs to Product (optional)
            StoreOrderItem.belongsTo(models.Product, {
                foreignKey: 'product_id',
                as: 'product',
                onDelete: 'SET NULL'
            });

            StoreOrderItem.belongsTo(models.Unit, {
                foreignKey: 'unit_id',
                as: 'unit',
                onDelete: 'SET NULL'
            });

            StoreOrderItem.belongsTo(models.Unit, {
                foreignKey: 'package_unit_id',
                as: 'packageUnit',
                onDelete: 'SET NULL'
            });
        }
    }
    StoreOrderItem.init({
        store_order_item_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        store_order_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'StoreOrder',
                key: 'store_order_id'
            }
        },
        product_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'Product',
                key: 'product_id'
            },
            comment: 'Product ID if product exists in system'
        },
        sku: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'Product SKU'
        },
        product_name: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        actual_quantity: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'Số lượng thực tế sau khi điều chỉnh'
        },
        quantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1
        },
        unit_price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.00
        },
        subtotal: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.00
        },
        unit_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'Unit',
                key: 'unit_id'
            }
        },
        quantity_in_base: {
            type: DataTypes.DECIMAL(18, 6),
            allowNull: true,
            comment: 'Số lượng quy đổi về đơn vị cơ sở'
        },
        package_unit_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'Unit',
                key: 'unit_id'
            },
            comment: 'Đơn vị đóng gói khi warehouse xuất kho'
        },
        package_quantity: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'Số lượng đóng gói (ví dụ số thùng được xuất)'
        }
    }, {
        sequelize,
        modelName: 'StoreOrderItem',
        tableName: 'StoreOrderItem',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
    return StoreOrderItem;
};
