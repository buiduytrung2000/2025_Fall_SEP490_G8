'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class PricingRulePromotion extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // PricingRulePromotion belongs to PricingRule
      PricingRulePromotion.belongsTo(models.PricingRule, {
        foreignKey: 'rule_id',
        as: 'pricingRule',
        onDelete: 'CASCADE'
      });

      // PricingRulePromotion belongs to Promotion
      PricingRulePromotion.belongsTo(models.Promotion, {
        foreignKey: 'promotion_id',
        as: 'promotion',
        onDelete: 'CASCADE'
      });
    }
  }
  PricingRulePromotion.init({
    pricing_rule_promotion_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    rule_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'PricingRule',
        key: 'rule_id'
      }
    },
    promotion_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Promotion',
        key: 'promotion_id'
      }
    }
  }, {
    sequelize,
    modelName: 'PricingRulePromotion',
    tableName: 'PricingRulePromotion',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      {
        unique: true,
        fields: ['rule_id', 'promotion_id'],
        name: 'unique_rule_promotion'
      }
    ]
  });
  return PricingRulePromotion;
};

