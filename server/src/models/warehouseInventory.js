'use strict';
const {
    Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class WarehouseInventory extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index.js` file will call this method automatically.
         */
        static associate(models) {
            // WarehouseInventory belongs to Product
            WarehouseInventory.belongsTo(models.Product, {
                foreignKey: 'product_id',
                as: 'product',
                onDelete: 'CASCADE'
            });
        }
    }

    WarehouseInventory.init({
        warehouse_inventory_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        product_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Product',
                key: 'product_id'
            }
        },
        stock: {
            type: DataTypes.BIGINT,
            allowNull: false,
            defaultValue: 0,
            field: 'base_quantity',
            comment: 'Số lượng theo đơn vị cơ sở'
        },
        reserved_quantity: {
            type: DataTypes.BIGINT,
            allowNull: false,
            defaultValue: 0,
            comment: 'Số lượng đã xuất khỏi kho nhưng chưa giao'
        },
        min_stock_level: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        reorder_point: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        location: {
            type: DataTypes.STRING(255),
            allowNull: true,
            comment: 'Vị trí trong kho (ví dụ: Kho chính, Kho lạnh, Kho đồ khô)'
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Ghi chú về tồn kho'
        },
        created_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        updated_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
            onUpdate: DataTypes.NOW
        }
    }, {
        sequelize,
        modelName: 'WarehouseInventory',
        tableName: 'WarehouseInventory',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            {
                unique: true,
                name: 'unique_warehouse_product',
                fields: ['product_id']
            },
            {
                name: 'idx_warehouse_inventory_product',
                fields: ['product_id']
            },
            {
                name: 'idx_warehouse_inventory_stock',
                fields: ['base_quantity']
            },
            {
                name: 'idx_warehouse_inventory_location',
                fields: ['location']
            }
        ]
    });

    return WarehouseInventory;
};

