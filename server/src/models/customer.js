'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Customer extends Model {
    static associate(models) {
      // Define associations here if needed
      // Customer.hasMany(models.Transaction, {
      //   foreignKey: 'customer_id',
      //   as: 'transactions'
      // });
    }
  }
  
  Customer.init({
    customer_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      unique: false
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    loyalty_point: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    tier: {
      type: DataTypes.ENUM('bronze', 'silver', 'gold', 'platinum'),
      defaultValue: 'bronze'
    }
  }, {
    sequelize,
    modelName: 'Customer',
    tableName: 'Customer',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  
  return Customer;
};

