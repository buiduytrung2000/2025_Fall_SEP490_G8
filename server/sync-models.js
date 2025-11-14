require('dotenv').config();
const db = require('./src/models');

async function syncModels() {
    try {
        console.log('Syncing models with database...\n');
        
        // Sync all models without altering existing tables
        await db.sequelize.sync({ alter: false });
        
        console.log('✓ Models synced successfully');
        
        // Verify Payment table
        const [results] = await db.sequelize.query(`
            SELECT COLUMN_NAME, COLUMN_TYPE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'Payment' 
            AND TABLE_SCHEMA = DATABASE()
        `);
        
        console.log('\nPayment table columns:');
        results.forEach(col => {
            console.log(`  - ${col.COLUMN_NAME}: ${col.COLUMN_TYPE}`);
        });
        
        // Check for cash_received and change_amount
        const hasCashReceived = results.some(col => col.COLUMN_NAME === 'cash_received');
        const hasChangeAmount = results.some(col => col.COLUMN_NAME === 'change_amount');
        
        if (hasCashReceived && hasChangeAmount) {
            console.log('\n✓ cash_received and change_amount columns are present in database');
        } else {
            console.log('\n✗ Missing columns in database');
            if (!hasCashReceived) console.log('  - cash_received is missing');
            if (!hasChangeAmount) console.log('  - change_amount is missing');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

syncModels();

