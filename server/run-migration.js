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

        // Run migration for shift_id
        console.log('\nRunning migration: Adding shift_id to Transaction table');

        try {
            await connection.execute(
                'ALTER TABLE Transaction ADD COLUMN shift_id INT NULL AFTER store_id'
            );
            console.log('✓ Added shift_id column to Transaction table');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('⚠ shift_id column already exists (skipping)');
            } else {
                throw error;
            }
        }

        // Add foreign key constraint
        try {
            await connection.execute(
                'ALTER TABLE Transaction ADD CONSTRAINT fk_transaction_shift FOREIGN KEY (shift_id) REFERENCES Shift(shift_id) ON DELETE SET NULL'
            );
            console.log('✓ Added foreign key constraint for shift_id');
        } catch (error) {
            if (error.code === 'ER_DUP_KEYNAME') {
                console.log('⚠ Foreign key constraint already exists (skipping)');
            } else {
                throw error;
            }
        }

        // Add index
        try {
            await connection.execute(
                'ALTER TABLE Transaction ADD INDEX idx_transaction_shift (shift_id)'
            );
            console.log('✓ Added index for shift_id');
        } catch (error) {
            if (error.code === 'ER_DUP_KEYNAME') {
                console.log('⚠ Index already exists (skipping)');
            } else {
                throw error;
            }
        }

        // Read and run cash payment migration file
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

        console.log('\n✓ All migrations completed successfully!');

        // Verify the fields were added
        console.log('\nVerifying Transaction table structure...');
        const [transRows] = await connection.execute('DESCRIBE Transaction');
        const transFields = transRows.map(row => row.Field);

        if (transFields.includes('shift_id')) {
            console.log('✓ Field shift_id is present in Transaction table');
        } else {
            console.log('✗ Field shift_id not found in Transaction table');
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

