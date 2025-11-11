'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Payment extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Payment has many Transactions
      Payment.hasMany(models.Transaction, {
        foreignKey: 'payment_id',
        as: 'transactions',
        onDelete: 'CASCADE'
      });
    }
  }
  Payment.init({
    payment_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    method: {
      type: DataTypes.ENUM('cash', 'card', 'mobile_payment', 'bank_transfer', 'loyalty_points'),
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
      defaultValue: 'pending'
    },
    paid_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    given_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'For cash: amount customer gave'
    },
    change_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'For cash: change to return'
    },
    // reference: {
    //   type: DataTypes.STRING(255),
    //   allowNull: true,
    //   comment: 'For bank transfer: transaction reference'
    // }
  }, {
    sequelize,
    modelName: 'Payment',
    tableName: 'Payment',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  return Payment;
};

