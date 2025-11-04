'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ShiftTemplate extends Model {
    /**
     * Helper method for defining associations.
     */
    static associate(models) {
      ShiftTemplate.hasMany(models.Schedule, {
        foreignKey: 'shift_template_id',
        as: 'schedules'
      });
    }
  }
  ShiftTemplate.init({
    shift_template_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },
    start_time: {
      type: DataTypes.TIME,
      allowNull: false
    },
    end_time: {
      type: DataTypes.TIME,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'ShiftTemplate',
    tableName: 'ShiftTemplate',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  return ShiftTemplate;
};

