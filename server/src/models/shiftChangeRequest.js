'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ShiftChangeRequest extends Model {
    /**
     * Helper method for defining associations.
     */
    static associate(models) {
      ShiftChangeRequest.belongsTo(models.Store, {
        foreignKey: 'store_id',
        as: 'store'
      });
      ShiftChangeRequest.belongsTo(models.Schedule, {
        foreignKey: 'from_schedule_id',
        as: 'fromSchedule'
      });
      ShiftChangeRequest.belongsTo(models.Schedule, {
        foreignKey: 'to_schedule_id',
        as: 'toSchedule'
      });
      ShiftChangeRequest.belongsTo(models.User, {
        foreignKey: 'from_user_id',
        as: 'fromUser'
      });
      ShiftChangeRequest.belongsTo(models.User, {
        foreignKey: 'to_user_id',
        as: 'toUser'
      });
      ShiftChangeRequest.belongsTo(models.User, {
        foreignKey: 'reviewed_by',
        as: 'reviewer'
      });
    }
  }
  ShiftChangeRequest.init({
    request_id: {
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
    from_schedule_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Schedule',
        key: 'schedule_id'
      }
    },
    from_user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'User',
        key: 'user_id'
      }
    },
    to_user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'User',
        key: 'user_id'
      }
    },
    to_schedule_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Schedule',
        key: 'schedule_id'
      }
    },
    to_work_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    to_shift_template_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'ShiftTemplate',
        key: 'shift_template_id'
      }
    },
    request_type: {
      type: DataTypes.ENUM('swap', 'give_away', 'take_over'),
      allowNull: false
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected', 'cancelled'),
      defaultValue: 'pending'
    },
    reviewed_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'User',
        key: 'user_id'
      }
    },
    reviewed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    review_notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'ShiftChangeRequest',
    tableName: 'ShiftChangeRequest',
    timestamps: true,
    createdAt: 'requested_at',
    updatedAt: 'updated_at'
  });
  return ShiftChangeRequest;
};

