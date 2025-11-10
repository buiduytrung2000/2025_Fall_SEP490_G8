'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class VoucherTemplate extends Model {
    static associate(models) {
      // No direct associations needed
    }
  }
  
  VoucherTemplate.init({
    voucher_template_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    voucher_code_prefix: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: 'Tiền tố mã voucher'
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
    validity_days: {
      type: DataTypes.INTEGER,
      defaultValue: 30,
      comment: 'Số ngày voucher có hiệu lực'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'VoucherTemplate',
    tableName: 'VoucherTemplate',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  
  return VoucherTemplate;
};

