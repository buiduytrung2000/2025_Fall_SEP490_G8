'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ProductPromotion extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // ProductPromotion belongs to Product
      ProductPromotion.belongsTo(models.Product, {
        foreignKey: 'product_id',
        as: 'product',
        onDelete: 'CASCADE'
      });

      // ProductPromotion belongs to Promotion
      ProductPromotion.belongsTo(models.Promotion, {
        foreignKey: 'promotion_id',
        as: 'promotion',
        onDelete: 'CASCADE'
      });
    }
  }
  ProductPromotion.init({
    product_promotion_id: {
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
    modelName: 'ProductPromotion',
    tableName: 'ProductPromotion',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      {
        unique: true,
        fields: ['product_id', 'promotion_id'],
        name: 'unique_product_promotion'
      }
    ]
  });
  return ProductPromotion;
};

