'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class ProductUnit extends Model {
        static associate(models) {
            ProductUnit.belongsTo(models.Product, {
                foreignKey: 'product_id',
                as: 'product',
                onDelete: 'CASCADE'
            });

            ProductUnit.belongsTo(models.Unit, {
                foreignKey: 'unit_id',
                as: 'unit',
                onDelete: 'CASCADE'
            });
        }
    }

    ProductUnit.init({
        product_unit_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        product_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Product',
                key: 'product_id'
            }
        },
        unit_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Unit',
                key: 'unit_id'
            }
        },
        conversion_to_base: {
            type: DataTypes.DECIMAL(18, 6),
            allowNull: false,
            comment: 'Số đơn vị cơ sở trong 1 đơn vị này'
        },
        barcode: {
            type: DataTypes.STRING(100),
            allowNull: true
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
        modelName: 'ProductUnit',
        tableName: 'ProductUnit',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            {
                unique: true,
                name: 'uq_product_unit',
                fields: ['product_id', 'unit_id']
            }
        ]
    });

    return ProductUnit;
};

