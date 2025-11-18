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

        // Check current ENUM values
        console.log('\nChecking current StoreOrder status ENUM...');
        const [columns] = await connection.execute(
            "SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'StoreOrder' AND COLUMN_NAME = 'status'",
            [dbConfig.database]
        );

        if (columns.length > 0) {
            console.log('Current ENUM:', columns[0].COLUMN_TYPE);
            
            // Check if 'confirmed' already exists
            if (columns[0].COLUMN_TYPE.includes("'confirmed'")) {
                console.log('⚠ "confirmed" status already exists in ENUM (skipping)');
                return;
            }
        }

        // Add 'confirmed' status to ENUM
        console.log('\nAdding "confirmed" status to StoreOrder status ENUM...');
        await connection.execute(`
            ALTER TABLE StoreOrder 
            MODIFY COLUMN status ENUM('pending', 'approved', 'rejected', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled') 
            DEFAULT 'pending'
        `);
        console.log('✓ Added "confirmed" status to ENUM');

        console.log('\n✓ Migration completed successfully!');

        // Verify the ENUM was updated
        console.log('\nVerifying StoreOrder status ENUM...');
        const [updatedColumns] = await connection.execute(
            "SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'StoreOrder' AND COLUMN_NAME = 'status'",
            [dbConfig.database]
        );

        if (updatedColumns.length > 0) {
            console.log('Updated ENUM:', updatedColumns[0].COLUMN_TYPE);
            if (updatedColumns[0].COLUMN_TYPE.includes("'confirmed'")) {
                console.log('✓ "confirmed" status is now present in StoreOrder status ENUM');
            } else {
                console.log('✗ "confirmed" status not found in ENUM');
            }
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

