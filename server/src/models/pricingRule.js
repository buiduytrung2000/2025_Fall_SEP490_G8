'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class PricingRule extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            // PricingRule belongs to Product
            PricingRule.belongsTo(models.Product, {
                foreignKey: 'product_id',
                as: 'product',
                onDelete: 'CASCADE'
            });

            // PricingRule belongs to Store
            PricingRule.belongsTo(models.Store, {
                foreignKey: 'store_id',
                as: 'store',
                onDelete: 'CASCADE'
            });

            // PricingRule belongs to many Promotions through PricingRulePromotion
            PricingRule.belongsToMany(models.Promotion, {
                through: models.PricingRulePromotion,
                foreignKey: 'rule_id',
                otherKey: 'promotion_id',
                as: 'promotions'
            });

            // PricingRule has many PricingRulePromotions
            PricingRule.hasMany(models.PricingRulePromotion, {
                foreignKey: 'rule_id',
                as: 'pricingRulePromotions',
                onDelete: 'CASCADE'
            });
        }
    }
    PricingRule.init({
        rule_id: {
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
        store_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Store',
                key: 'store_id'
            }
        },
        type: {
            type: DataTypes.ENUM('markup', 'markdown', 'fixed_price'),
            allowNull: false
        },
        value: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        start_date: {
            type: DataTypes.DATE,
            allowNull: false
        },
        end_date: {
            type: DataTypes.DATE,
            allowNull: false
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
        modelName: 'PricingRule',
        tableName: 'PricingRule',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
    return PricingRule;
};

