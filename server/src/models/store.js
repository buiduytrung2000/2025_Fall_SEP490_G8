'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Store extends Model {
    /**
     * Helper method for defining associations.
     */
    static associate(models) {
      Store.hasMany(models.User, {
        foreignKey: 'store_id',
        as: 'employees'
      });
      Store.hasMany(models.Schedule, {
        foreignKey: 'store_id',
        as: 'schedules'
      });
      Store.hasMany(models.ShiftChangeRequest, {
        foreignKey: 'store_id',
        as: 'shiftChangeRequests'
      });
      Store.hasMany(models.PricingRule, {
        foreignKey: 'store_id',
        as: 'pricingRules'
      });
    }
  }
  Store.init({
    store_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'maintenance'),
      defaultValue: 'active'
    }
  }, {
    sequelize,
    modelName: 'Store',
    tableName: 'Store',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  return Store;
};

