'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Shift extends Model {
    static associate(models) {
      Shift.belongsTo(models.Store, { foreignKey: 'store_id', as: 'store' });
      Shift.belongsTo(models.User, { foreignKey: 'cashier_id', as: 'cashier' });
      Shift.belongsTo(models.Schedule, { foreignKey: 'schedule_id', as: 'schedule', onDelete: 'SET NULL' });
      Shift.hasMany(models.ShiftCashMovement, { foreignKey: 'shift_id', as: 'cashMovements', onDelete: 'CASCADE' });
      Shift.hasMany(models.Transaction, { foreignKey: 'shift_id', as: 'transactions', onDelete: 'SET NULL' });
    }
  }
  Shift.init({
    shift_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    store_id: { type: DataTypes.INTEGER, allowNull: false },
    cashier_id: { type: DataTypes.INTEGER, allowNull: false },
    schedule_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'Liên kết với Schedule nếu shift được tạo từ schedule' },
    opened_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    closed_at: { type: DataTypes.DATE, allowNull: true },
    opening_cash: { type: DataTypes.DECIMAL(14,2), allowNull: false, defaultValue: 0 },
    closing_cash: { type: DataTypes.DECIMAL(14,2), allowNull: true },
    cash_sales_total: { type: DataTypes.DECIMAL(14,2), allowNull: false, defaultValue: 0 },
    status: { type: DataTypes.ENUM('opened','closed','cancelled'), allowNull: false, defaultValue: 'opened' },
    note: { type: DataTypes.TEXT, allowNull: true }
  }, {
    sequelize,
    modelName: 'Shift',
    tableName: 'Shift',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  return Shift;
};

