'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Unit extends Model {
        static associate(models) {
            Unit.hasMany(models.ProductUnit, {
                foreignKey: 'unit_id',
                as: 'productUnits'
            });

            Unit.hasMany(models.Product, {
                foreignKey: 'base_unit_id',
                as: 'products'
            });
        }
    }

    Unit.init({
        unit_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true
        },
        symbol: {
            type: DataTypes.STRING(10),
            allowNull: false
        },
        level: {
            type: DataTypes.TINYINT,
            allowNull: false,
            comment: '1 = đơn vị lớn nhất'
        },
        created_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        updated_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
            onUpdate: DataTypes.NOW
        }
    }, {
        sequelize,
        modelName: 'Unit',
        tableName: 'Unit',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    return Unit;
};

