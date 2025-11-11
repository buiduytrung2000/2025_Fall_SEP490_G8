'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Promotion extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Promotion belongs to many Products through ProductPromotion
      Promotion.belongsToMany(models.Product, {
        through: models.ProductPromotion,
        foreignKey: 'promotion_id',
        otherKey: 'product_id',
        as: 'products'
      });

      // Promotion belongs to many PricingRules through PricingRulePromotion
      Promotion.belongsToMany(models.PricingRule, {
        through: models.PricingRulePromotion,
        foreignKey: 'promotion_id',
        otherKey: 'rule_id',
        as: 'pricingRules'
      });

      // Promotion has many ProductPromotions
      Promotion.hasMany(models.ProductPromotion, {
        foreignKey: 'promotion_id',
        as: 'productPromotions',
        onDelete: 'CASCADE'
      });

      // Promotion has many PricingRulePromotions
      Promotion.hasMany(models.PricingRulePromotion, {
        foreignKey: 'promotion_id',
        as: 'pricingRulePromotions',
        onDelete: 'CASCADE'
      });
    }
  }
  Promotion.init({
    promotion_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('percentage', 'fixed_amount', 'buy_x_get_y', 'bundle'),
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
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'expired'),
      defaultValue: 'inactive'
    }
  }, {
    sequelize,
    modelName: 'Promotion',
    tableName: 'Promotion',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  return Promotion;
};

