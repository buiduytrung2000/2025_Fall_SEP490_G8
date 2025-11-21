'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class OrderItem extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // OrderItem belongs to Order
      OrderItem.belongsTo(models.Order, {
        foreignKey: 'order_id',
        as: 'order',
        onDelete: 'CASCADE'
      });

      // OrderItem belongs to Product
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
      defaultValue: 1
    },
    unit_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
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
    }
  }, {
    sequelize,
    modelName: 'OrderItem',
    tableName: 'OrderItem',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  return OrderItem;
};

