'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Transaction extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Transaction belongs to Order (optional)
      Transaction.belongsTo(models.Order, {
        foreignKey: 'order_id',
        as: 'order',
        onDelete: 'SET NULL'
      });

      // Transaction belongs to Customer (optional)
      Transaction.belongsTo(models.Customer, {
        foreignKey: 'customer_id',
        as: 'customer',
        onDelete: 'SET NULL'
      });

      // Transaction belongs to Payment
      Transaction.belongsTo(models.Payment, {
        foreignKey: 'payment_id',
        as: 'payment',
        onDelete: 'CASCADE'
      });

      // Transaction belongs to Store
      Transaction.belongsTo(models.Store, {
        foreignKey: 'store_id',
        as: 'store',
        onDelete: 'CASCADE'
      });

      // Transaction has many TransactionItems
      Transaction.hasMany(models.TransactionItem, {
        foreignKey: 'transaction_id',
        as: 'transactionItems',
        onDelete: 'CASCADE'
      });

      // Transaction belongs to Shift (optional)
      Transaction.belongsTo(models.Shift, {
        foreignKey: 'shift_id',
        as: 'shift',
        onDelete: 'SET NULL'
      });
    }
  }
  Transaction.init({
    transaction_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    order_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Order',
        key: 'order_id'
      }
    },
    customer_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Customer',
        key: 'customer_id'
      }
    },
    payment_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Payment',
        key: 'payment_id'
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
    shift_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Shift',
        key: 'shift_id'
      }
    },
    total_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'cancelled', 'refunded'),
      defaultValue: 'pending'
    }
  }, {
    sequelize,
    modelName: 'Transaction',
    tableName: 'Transaction',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  return Transaction;
};

