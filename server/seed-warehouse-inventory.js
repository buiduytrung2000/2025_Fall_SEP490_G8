const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '123456',
    database: process.env.MYSQL_DB || 'CCMS_DB',
    port: process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306
};

async function seedWarehouseInventory() {
    let connection;
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        console.log('✓ Connected to database');

        // Get all products
        console.log('\nFetching products...');
        const [products] = await connection.execute(
            'SELECT product_id, name, sku FROM Product LIMIT 20'
        );

        if (products.length === 0) {
            console.log('⚠ No products found. Please create products first.');
            return;
        }

        console.log(`✓ Found ${products.length} products`);

        // Check existing warehouse inventory
        const [existing] = await connection.execute(
            'SELECT product_id FROM WarehouseInventory'
        );
        const existingProductIds = new Set(existing.map(e => e.product_id));

        // Seed warehouse inventory
        console.log('\nSeeding warehouse inventory...');
        let inserted = 0;
        let skipped = 0;

        for (const product of products) {
            if (existingProductIds.has(product.product_id)) {
                skipped++;
                continue;
            }

            // Random stock between 10-100
            const stock = Math.floor(Math.random() * 91) + 10;
            // Min stock level between 5-20
            const minStockLevel = Math.floor(Math.random() * 16) + 5;
            // Reorder point between 10-30
            const reorderPoint = Math.floor(Math.random() * 21) + 10;
            
            // Random location
            const locations = ['Kho chính', 'Kho lạnh', 'Kho đồ khô', 'Kho phụ', null];
            const location = locations[Math.floor(Math.random() * locations.length)];

            await connection.execute(
                `INSERT INTO WarehouseInventory 
                (product_id, stock, min_stock_level, reorder_point, location, notes) 
                VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    product.product_id,
                    stock,
                    minStockLevel,
                    reorderPoint,
                    location,
                    `Tồn kho ban đầu cho sản phẩm ${product.name}`
                ]
            );
            inserted++;
        }

        console.log(`✓ Inserted ${inserted} warehouse inventory records`);
        if (skipped > 0) {
            console.log(`⚠ Skipped ${skipped} products (already have inventory)`);
        }

        console.log('\n✓ Seeding completed successfully!');

    } catch (error) {
        console.error('✗ Seeding failed:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

seedWarehouseInventory();

