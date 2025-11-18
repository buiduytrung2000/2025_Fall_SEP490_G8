const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '123456',
    database: process.env.MYSQL_DB || 'CCMS_DB',
    port: process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306
};

async function runMigration() {
    let connection;
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        console.log('✓ Connected to database');

        // Check if table already exists
        console.log('\nChecking if WarehouseInventory table exists...');
        const [tables] = await connection.execute(
            "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'WarehouseInventory'",
            [dbConfig.database]
        );

        if (tables.length > 0) {
            console.log('⚠ WarehouseInventory table already exists (skipping)');
            return;
        }

        // Create WarehouseInventory table
        console.log('\nCreating WarehouseInventory table...');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS WarehouseInventory (
                warehouse_inventory_id INT PRIMARY KEY AUTO_INCREMENT,
                product_id INT NOT NULL,
                stock INT NOT NULL DEFAULT 0,
                min_stock_level INT NOT NULL DEFAULT 0,
                reorder_point INT NOT NULL DEFAULT 0,
                location VARCHAR(255) NULL COMMENT 'Vị trí trong kho (ví dụ: Kho chính, Kho lạnh, Kho đồ khô)',
                notes TEXT NULL COMMENT 'Ghi chú về tồn kho',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES Product(product_id) ON DELETE CASCADE,
                UNIQUE KEY unique_warehouse_product (product_id),
                INDEX idx_warehouse_inventory_product (product_id),
                INDEX idx_warehouse_inventory_stock (stock),
                INDEX idx_warehouse_inventory_location (location)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✓ Created WarehouseInventory table');

        console.log('\n✓ Migration completed successfully!');

        // Verify the table was created
        console.log('\nVerifying WarehouseInventory table...');
        const [columns] = await connection.execute(
            "SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'WarehouseInventory'",
            [dbConfig.database]
        );

        if (columns.length > 0) {
            console.log('✓ WarehouseInventory table created with columns:');
            columns.forEach(col => {
                console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
            });
        } else {
            console.log('✗ WarehouseInventory table not found');
        }

    } catch (error) {
        console.error('✗ Migration failed:', error.message);
        if (error.code === 'ER_TABLE_EXISTS_ERROR') {
            console.log('⚠ Table already exists (skipping)');
        } else {
            process.exit(1);
        }
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

runMigration();

