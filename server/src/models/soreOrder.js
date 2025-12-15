'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class StoreOrder extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // StoreOrder belongs to Store
      StoreOrder.belongsTo(models.Store, {
        foreignKey: 'store_id',
        as: 'store',
        onDelete: 'CASCADE'
      });

      // StoreOrder belongs to User (created_by)
      StoreOrder.belongsTo(models.User, {
        foreignKey: 'created_by',
        as: 'creator',
        onDelete: 'CASCADE'
      });

      // StoreOrder belongs to Supplier (optional)
      StoreOrder.belongsTo(models.Supplier, {
        foreignKey: 'supplier_id',
        as: 'supplier',
        onDelete: 'SET NULL'
      });

      // StoreOrder has many StoreOrderItems
      StoreOrder.hasMany(models.StoreOrderItem, {
        foreignKey: 'store_order_id',
        as: 'storeOrderItems',
        onDelete: 'CASCADE'
      });
    }
  }
  StoreOrder.init({
    store_order_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    order_code: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true
    },
    store_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Store',
        key: 'store_id'
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
    order_type: {
      type: DataTypes.ENUM('ToWarehouse', 'ToSupplier'),
      allowNull: false,
      defaultValue: 'ToWarehouse'
    },
    target_warehouse: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Warehouse name for ToWarehouse orders'
    },
    supplier_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Supplier',
        key: 'supplier_id'
      },
      comment: 'Supplier ID for ToSupplier orders'
    },
    total_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'shipped', 'delivered', 'cancelled'),
      defaultValue: 'pending'
    },
    perishable: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'For fresh goods'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    store_receive_note: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Ghi chú khi cửa hàng xác nhận đã nhận hàng'
    },
    expected_delivery: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Expected delivery date for the order'
    }
  }, {
    sequelize,
    modelName: 'StoreOrder',
    tableName: 'StoreOrder',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  return StoreOrder;
};
