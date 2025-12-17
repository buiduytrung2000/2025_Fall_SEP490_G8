'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CustomerVoucher extends Model {
    static associate(models) {
      // Define association with Customer
      CustomerVoucher.belongsTo(models.Customer, {
        foreignKey: 'customer_id',
        as: 'customer'
      });
    }
  }
  
  CustomerVoucher.init({
    customer_voucher_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    customer_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    voucher_code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    voucher_name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    discount_type: {
      type: DataTypes.ENUM('percentage', 'fixed_amount'),
      allowNull: false
    },
    discount_value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    min_purchase_amount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    max_discount_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    required_loyalty_points: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Số điểm tích lũy tối thiểu để nhận voucher'
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
      type: DataTypes.ENUM('available', 'used', 'expired'),
      defaultValue: 'available'
    },
    used_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    transaction_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    store_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Store',
        key: 'store_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Cửa hàng tạo voucher (lấy từ người tạo hoặc template)'
    }
  }, {
    sequelize,
    modelName: 'CustomerVoucher',
    tableName: 'CustomerVoucher',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  
  return CustomerVoucher;
};

