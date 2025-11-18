const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

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

        // Check if column already exists
        console.log('\nChecking if actual_quantity column exists...');
        const [columns] = await connection.execute(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'StoreOrderItem' AND COLUMN_NAME = 'actual_quantity'",
            [dbConfig.database]
        );

        if (columns.length > 0) {
            console.log('⚠ actual_quantity column already exists (skipping)');
            return;
        }

        // Add actual_quantity column
        console.log('\nAdding actual_quantity column to StoreOrderItem table...');
        await connection.execute(`
            ALTER TABLE StoreOrderItem
            ADD COLUMN actual_quantity INT NULL
            COMMENT 'Số lượng thực tế sau khi điều chỉnh'
            AFTER quantity
        `);
        console.log('✓ Added actual_quantity column');

        // Add index
        try {
            await connection.execute(`
                CREATE INDEX idx_store_order_item_actual_quantity ON StoreOrderItem(actual_quantity)
            `);
            console.log('✓ Added index for actual_quantity');
        } catch (error) {
            if (error.code === 'ER_DUP_KEYNAME') {
                console.log('⚠ Index already exists (skipping)');
            } else {
                throw error;
            }
        }

        console.log('\n✓ Migration completed successfully!');

        // Verify the column was added
        console.log('\nVerifying StoreOrderItem table structure...');
        const [rows] = await connection.execute('DESCRIBE StoreOrderItem');
        const fields = rows.map(row => row.Field);

        if (fields.includes('actual_quantity')) {
            console.log('✓ Field actual_quantity is present in StoreOrderItem table');
        } else {
            console.log('✗ Field actual_quantity not found in StoreOrderItem table');
        }

    } catch (error) {
        console.error('✗ Migration failed:', error.message);
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('⚠ Column already exists (skipping)');
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

