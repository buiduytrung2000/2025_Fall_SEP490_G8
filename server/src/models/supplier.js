'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Supplier extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            // Supplier has many Products
            Supplier.hasMany(models.Product, {
                foreignKey: 'supplier_id',
                as: 'products'
            });
        }
    }
    Supplier.init({
        supplier_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        contact: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        address: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        email: {
            type: DataTypes.STRING(100),
            allowNull: true
        }
    }, {
        sequelize,
        modelName: 'Supplier',
        tableName: 'Supplier',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
    return Supplier;
};

