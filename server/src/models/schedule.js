'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Schedule extends Model {
    /**
     * Helper method for defining associations.
     */
    static associate(models) {
      Schedule.belongsTo(models.Store, {
        foreignKey: 'store_id',
        as: 'store'
      });
      Schedule.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'employee'
      });
      Schedule.belongsTo(models.User, {
        foreignKey: 'created_by',
        as: 'creator'
      });
      Schedule.belongsTo(models.ShiftTemplate, {
        foreignKey: 'shift_template_id',
        as: 'shiftTemplate'
      });
      Schedule.hasMany(models.ShiftChangeRequest, {
        foreignKey: 'from_schedule_id',
        as: 'changeRequestsFrom'
      });
      Schedule.hasMany(models.ShiftChangeRequest, {
        foreignKey: 'to_schedule_id',
        as: 'changeRequestsTo'
      });
    }
  }
  Schedule.init({
    schedule_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    store_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Store',
        key: 'store_id'
      }
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'User',
        key: 'user_id'
      }
    },
    shift_template_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'ShiftTemplate',
        key: 'shift_template_id'
      }
    },
    work_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('draft', 'confirmed', 'cancelled'),
      defaultValue: 'draft'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'User',
        key: 'user_id'
      }
    }
  }, {
    sequelize,
    modelName: 'Schedule',
    tableName: 'Schedule',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['store_id']
      },
      {
        fields: ['user_id']
      },
      {
        fields: ['work_date']
      },
      {
        fields: ['status']
      }
    ]
  });
  return Schedule;
};

