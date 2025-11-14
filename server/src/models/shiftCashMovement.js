'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ShiftCashMovement extends Model {
    static associate(models) {
      ShiftCashMovement.belongsTo(models.Shift, { foreignKey: 'shift_id', as: 'shift', onDelete: 'CASCADE' })
    }
  }
  ShiftCashMovement.init({
    movement_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    shift_id: { type: DataTypes.INTEGER, allowNull: false },
    type: { type: DataTypes.ENUM('cash_in','cash_out'), allowNull: false },
    amount: { type: DataTypes.DECIMAL(14,2), allowNull: false },
    reason: { type: DataTypes.TEXT, allowNull: true }
  }, {
    sequelize,
    modelName: 'ShiftCashMovement',
    tableName: 'ShiftCashMovement',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });
  return ShiftCashMovement;
};

