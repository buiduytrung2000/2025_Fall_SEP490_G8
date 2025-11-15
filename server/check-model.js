require('dotenv').config();
const db = require('./src/models');

async function checkModel() {
    try {
        console.log('Checking Payment model attributes...\n');
        
        const attributes = db.Payment.rawAttributes;
        
        console.log('Payment model attributes:');
        Object.keys(attributes).forEach(key => {
            const attr = attributes[key];
            console.log(`  - ${key}: ${attr.type.key || attr.type}`);
        });

        console.log('\n✓ Model check completed');
        
        // Check if cash_received and change_amount exist
        if (attributes.cash_received && attributes.change_amount) {
            console.log('✓ cash_received and change_amount fields are present in model');
        } else {
            console.log('✗ cash_received or change_amount fields are missing from model');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkModel();

