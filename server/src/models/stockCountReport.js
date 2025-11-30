'use strict';
const {
    Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class StockCountReport extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index.js` file will call this method automatically.
         */
        static associate(models) {
            // StockCountReport belongs to WarehouseInventory
            StockCountReport.belongsTo(models.WarehouseInventory, {
                foreignKey: 'warehouse_inventory_id',
                as: 'warehouseInventory',
                onDelete: 'CASCADE'
            });

            // StockCountReport belongs to Product
            StockCountReport.belongsTo(models.Product, {
                foreignKey: 'product_id',
                as: 'product',
                onDelete: 'CASCADE'
            });

            // StockCountReport belongs to User (reported_by)
            StockCountReport.belongsTo(models.User, {
                foreignKey: 'reported_by',
                as: 'reporter',
                onDelete: 'CASCADE'
            });
        }
    }

    StockCountReport.init({
        report_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        warehouse_inventory_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'WarehouseInventory',
                key: 'warehouse_inventory_id'
            }
        },
        product_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Product',
                key: 'product_id'
            }
        },
        system_stock: {
            type: DataTypes.BIGINT,
            allowNull: false,
            comment: 'Số lượng tồn kho trong hệ thống'
        },
        actual_stock: {
            type: DataTypes.BIGINT,
            allowNull: false,
            comment: 'Số lượng thực tế khi kiểm kê'
        },
        difference: {
            type: DataTypes.BIGINT,
            allowNull: false,
            comment: 'Chênh lệch (actual_stock - system_stock)'
        },
        report_type: {
            type: DataTypes.ENUM('shortage', 'excess', 'normal'),
            allowNull: false,
            comment: 'shortage = thiếu, excess = thừa, normal = đúng'
        },
        reason: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Lý do kiểm kê'
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Ghi chú bổ sung'
        },
        reported_by: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'User',
                key: 'user_id'
            },
            comment: 'Người tạo báo cáo'
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
        modelName: 'StockCountReport',
        tableName: 'StockCountReport',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            {
                name: 'idx_stock_count_report_inventory',
                fields: ['warehouse_inventory_id']
            },
            {
                name: 'idx_stock_count_report_product',
                fields: ['product_id']
            },
            {
                name: 'idx_stock_count_report_type',
                fields: ['report_type']
            },
            {
                name: 'idx_stock_count_report_reported_by',
                fields: ['reported_by']
            },
            {
                name: 'idx_stock_count_report_created_at',
                fields: ['created_at']
            }
        ]
    });

    return StockCountReport;
};

