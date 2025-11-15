const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbConfig = {
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '123456',
    port: process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306
};

async function initDatabase() {
    let connection;
    try {
        console.log('Connecting to MySQL...');
        connection = await mysql.createConnection(dbConfig);
        console.log('✓ Connected to MySQL');

        // Read schema file
        const schemaFile = path.join(__dirname, 'database/schema.sql');
        const schema = fs.readFileSync(schemaFile, 'utf8');

        console.log('\nInitializing database from schema...');

        // Remove comments and split SQL statements
        let cleanSchema = schema
            .split('\n')
            .filter(line => !line.trim().startsWith('--'))
            .join('\n');

        const statements = cleanSchema.split(';').filter(stmt => stmt.trim());

        for (const statement of statements) {
            if (statement.trim()) {
                try {
                    await connection.query(statement);
                } catch (error) {
                    if (error.code === 'ER_DB_CREATE_EXISTS' || error.code === 'ER_TABLE_EXISTS_ERROR') {
                        // Ignore if database or table already exists
                    } else {
                        console.error('Error executing statement:', statement.substring(0, 50));
                        throw error;
                    }
                }
            }
        }

        console.log('✓ Database initialized successfully!');

    } catch (error) {
        console.error('✗ Database initialization failed:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

initDatabase();

