'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
   
    static associate(models) {
      User.belongsTo(models.Store, {
        foreignKey: 'store_id',
        as: 'store'
      });
      User.hasMany(models.Schedule, {
        foreignKey: 'user_id',
        as: 'schedules'
      });
      User.hasMany(models.Schedule, {
        foreignKey: 'created_by',
        as: 'createdSchedules'
      });
      User.hasMany(models.ShiftChangeRequest, {
        foreignKey: 'from_user_id',
        as: 'shiftChangeRequestsFrom'
      });
      User.hasMany(models.ShiftChangeRequest, {
        foreignKey: 'to_user_id',
        as: 'shiftChangeRequestsTo'
      });
      User.hasMany(models.ShiftChangeRequest, {
        foreignKey: 'reviewed_by',
        as: 'reviewedShiftChangeRequests'
      });
    }
  }
  User.init({
    user_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('CEO', 'Store_Manager', 'Cashier', 'Warehouse', 'Supplier'),
      allowNull: false
    },
    store_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Store',
        key: 'store_id'
      }
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'suspended'),
      defaultValue: 'active'
    },
    name: DataTypes.STRING,
    phone: DataTypes.STRING,
    avatar: DataTypes.BLOB,
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'User',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  return User;
};