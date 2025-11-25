'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Order extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Order belongs to Supplier
      Order.belongsTo(models.Supplier, {
        foreignKey: 'supplier_id',
        as: 'supplier',
        onDelete: 'CASCADE'
      });

      // Order belongs to User (created_by)
      Order.belongsTo(models.User, {
        foreignKey: 'created_by',
        as: 'creator',
        onDelete: 'CASCADE'
      });

      // Order has many OrderItems
      Order.hasMany(models.OrderItem, {
        foreignKey: 'order_id',
        as: 'orderItems',
        onDelete: 'CASCADE'
      });

      // Order has many Transactions
      Order.hasMany(models.Transaction, {
        foreignKey: 'order_id',
        as: 'transactions',
        onDelete: 'SET NULL'
      });
    }

    /**
     * Check if order can be edited
     * Only pending orders can be edited
     */
    isEditable() {
      return this.status === 'pending';
    }

    /**
     * Check if status transition is valid
     */
    canTransitionTo(newStatus) {
      const validTransitions = {
        'pending': ['confirmed', 'cancelled'],
        'confirmed': [], // No transitions allowed from confirmed
        'cancelled': []  // No transitions allowed from cancelled
      };
      return validTransitions[this.status]?.includes(newStatus) || false;
    }
  }
  Order.init({
    order_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    order_code: {
      type: DataTypes.STRING(8),
      allowNull: false,
      unique: true
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
      type: DataTypes.ENUM('pending', 'confirmed', 'cancelled'),
      defaultValue: 'pending',
      comment: 'Order status: pending (can edit), confirmed (read-only), cancelled (read-only)'
    },
    expected_delivery: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Order',
    tableName: 'Order',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  return Order;
};


