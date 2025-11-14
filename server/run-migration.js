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

        // Read migration file
        const migrationFile = path.join(__dirname, 'database/migrations/2025-01-15_add_cash_payment_fields.sql');
        const sql = fs.readFileSync(migrationFile, 'utf8');

        console.log('\nRunning migration: 2025-01-15_add_cash_payment_fields.sql');
        
        // Split SQL statements and execute them
        const statements = sql.split(';').filter(stmt => stmt.trim());
        
        for (const statement of statements) {
            if (statement.trim()) {
                try {
                    await connection.execute(statement);
                    console.log('✓ Executed:', statement.substring(0, 50) + '...');
                } catch (error) {
                    if (error.code === 'ER_DUP_FIELDNAME') {
                        console.log('⚠ Field already exists (skipping):', error.message);
                    } else {
                        throw error;
                    }
                }
            }
        }

        console.log('\n✓ Migration completed successfully!');
        
        // Verify the fields were added
        console.log('\nVerifying Payment table structure...');
        const [rows] = await connection.execute('DESCRIBE Payment');
        const fields = rows.map(row => row.Field);
        
        if (fields.includes('cash_received') && fields.includes('change_amount')) {
            console.log('✓ Fields cash_received and change_amount are present');
        } else {
            console.log('✗ Fields not found in Payment table');
        }

    } catch (error) {
        console.error('✗ Migration failed:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

runMigration();

