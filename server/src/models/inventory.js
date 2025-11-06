'use strict';
const {
    Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Inventory extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            // Inventory belongs to Store
            Inventory.belongsTo(models.Store, {
                foreignKey: 'store_id',
                as: 'store',
                onDelete: 'CASCADE'
            });

            // Inventory belongs to Product
            Inventory.belongsTo(models.Product, {
                foreignKey: 'product_id',
                as: 'product',
                onDelete: 'CASCADE'
            });
        }
    }

    Inventory.init({
        inventory_id: {
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
        product_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Product',
                key: 'product_id'
            }
        },
        stock: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
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
        modelName: 'Inventory',
        tableName: 'Inventory',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            {
                unique: true,
                name: 'unique_store_product',
                fields: ['store_id', 'product_id']
            },
            {
                name: 'idx_inventory_store',
                fields: ['store_id']
            },
            {
                name: 'idx_inventory_product',
                fields: ['product_id']
            },
            {
                name: 'idx_inventory_stock',
                fields: ['stock']
            }
        ]
    });

    return Inventory;
};


