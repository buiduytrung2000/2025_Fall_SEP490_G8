'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Product extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            // Product belongs to Category
            Product.belongsTo(models.Category, {
                foreignKey: 'category_id',
                as: 'category',
                onDelete: 'SET NULL'
            });

            // Product belongs to Supplier
            Product.belongsTo(models.Supplier, {
                foreignKey: 'supplier_id',
                as: 'supplier',
                onDelete: 'SET NULL'
            });

            // Product has many PricingRules
            Product.hasMany(models.PricingRule, {
                foreignKey: 'product_id',
                as: 'pricingRules',
                onDelete: 'CASCADE'
            });

            // Product has many OrderItems
            Product.hasMany(models.OrderItem, {
                foreignKey: 'product_id',
                as: 'orderItems',
                onDelete: 'CASCADE'
            });

            // Product has many TransactionItems
            Product.hasMany(models.TransactionItem, {
                foreignKey: 'product_id',
                as: 'transactionItems',
                onDelete: 'CASCADE'
            });

            // Product belongs to many Promotions through ProductPromotion
            Product.belongsToMany(models.Promotion, {
                through: models.ProductPromotion,
                foreignKey: 'product_id',
                otherKey: 'promotion_id',
                as: 'promotions'
            });

            // Product has many ProductPromotions
            Product.hasMany(models.ProductPromotion, {
                foreignKey: 'product_id',
                as: 'productPromotions',
                onDelete: 'CASCADE'
            });

            // Product has many Inventories
            Product.hasMany(models.Inventory, {
                foreignKey: 'product_id',
                as: 'inventories',
                onDelete: 'CASCADE'
            });
        }
    }
    Product.init({
        product_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        sku: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true
        },
        category_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'Category',
                key: 'category_id'
            }
        },
        supplier_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'Supplier',
                key: 'supplier_id'
            }
        },
        hq_price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.00
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
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
        modelName: 'Product',
        tableName: 'Product',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
    return Product;
};

