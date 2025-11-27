# 🔧 Backend API Configuration for Barcode Testing

## 📋 Kiểm Tra API Endpoint

### 1. Endpoint Details

```
GET /api/v1/product/by-barcode/:code?store_id=:store_id
```

**Parameters:**
- `code` (URL param): Barcode hoặc SKU (VD: 8936065200163)
- `store_id` (Query param): Store ID (VD: 1)
- `Authorization` (Header): JWT token (required)

**Response Format:**
```json
{
  "err": 0,
  "msg": "OK",
  "data": {
    "product_id": 1,
    "name": "Coca Cola 1.5L",
    "sku": "SKU001",
    "is_active": true,
    "unit_id": 5,
    "unit_name": "Chai",
    "conversion_to_base": 1,
    "current_price": 15000,
    "base_quantity": 50,
    "available_quantity": 50,
    "barcode": "8936065200163",
    "matched_by": "ProductUnit.barcode"
  }
}
```

### 2. Test Endpoint via cURL

```bash
# Thay YOUR_TOKEN, BARCODE, STORE_ID
curl -X GET "http://localhost:5000/api/v1/product/by-barcode/8936065200163?store_id=1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Response (Success - 200):**
```json
{
  "err": 0,
  "msg": "OK",
  "data": {
    "product_id": 1,
    "name": "Coca Cola 1.5L",
    ...
  }
}
```

**Response (Product Not Found - 404):**
```json
{
  "err": 1,
  "msg": "Sản phẩm không tìm thấy",
  "data": null
}
```

**Response (Server Error - 500):**
```json
{
  "err": -1,
  "msg": "Lỗi hệ thống",
  "data": null
}
```

---

## 📊 Database Preparation

### Test Data SQL

```sql
-- Thêm test products nếu chưa có
INSERT INTO products (name, sku, hq_price, is_active, category_id, supplier_id, created_at, updated_at)
VALUES
  ('Coca Cola 1.5L', 'SKU001', 15000, true, 1, 1, NOW(), NOW()),
  ('Pepsi 1L', 'SKU002', 12000, true, 1, 1, NOW(), NOW()),
  ('Fanta Orange 2L', 'SKU003', 18000, true, 1, 1, NOW(), NOW()),
  ('Sprite 1.5L', 'SKU004', 15000, true, 1, 1, NOW(), NOW()),
  ('Nước lạnh 350ml', 'SKU005', 5000, true, 1, 1, NOW(), NOW()),
  ('Sữa tươi 1L', 'SKU006', 25000, true, 1, 2, NOW(), NOW()),
  ('Bánh mì', 'SKU007', 8000, true, 2, 3, NOW(), NOW()),
  ('Kẹo socola', 'SKU008', 12000, true, 3, 1, NOW(), NOW());

-- Thêm product units (barcode)
INSERT INTO product_units (product_id, unit_name, barcode, conversion_to_base)
VALUES
  (1, 'Chai', '8936065200163', 1),
  (2, 'Chai', '8936096400051', 1),
  (3, 'Chai', '8936077904100', 1),
  (4, 'Chai', '8936078100003', 1),
  (5, 'Lcan', '8936065200170', 1),
  (6, 'Hộp', '8934783020108', 1),
  (7, 'Cái', '8934783020115', 1),
  (8, 'Gói', '8934783020122', 1);

-- Thêm inventory (tồn kho)
INSERT INTO inventories (product_id, store_id, stock, warehouse_id)
VALUES
  (1, 1, 50, 1),
  (2, 1, 40, 1),
  (3, 1, 30, 1),
  (4, 1, 45, 1),
  (5, 1, 100, 1),
  (6, 1, 25, 1),
  (7, 1, 60, 1),
  (8, 1, 80, 1);

-- (Optional) Thêm pricing rules nếu muốn test dynamic pricing
INSERT INTO pricing_rules (product_id, store_id, rule_type, value, start_date, end_date)
VALUES
  (1, 1, 'fixed_price', 14000, '2025-11-01', '2025-11-30'),
  (2, 1, 'markup', 10, '2025-11-01', '2025-11-30');
```

### Verify Data

```sql
-- Check products
SELECT p.product_id, p.name, p.sku, p.is_active, 
       pu.barcode, pu.unit_name, inv.stock
FROM products p
LEFT JOIN product_units pu ON p.product_id = pu.product_id
LEFT JOIN inventories inv ON p.product_id = inv.product_id AND inv.store_id = 1
WHERE p.sku LIKE 'SKU%'
ORDER BY p.product_id;

-- Check barcode uniqueness (important!)
SELECT barcode, COUNT(*) as cnt
FROM product_units
WHERE barcode IS NOT NULL
GROUP BY barcode
HAVING cnt > 1;
-- Result should be empty (no duplicates)

-- Check pricing rules
SELECT pr.product_id, p.name, pr.rule_type, pr.value,
       pr.start_date, pr.end_date
FROM pricing_rules pr
LEFT JOIN products p ON pr.product_id = p.product_id
WHERE pr.start_date <= CURDATE() AND pr.end_date >= CURDATE()
ORDER BY pr.product_id;
```

---

## 🔍 API Testing Tools

### Option 1: Postman

```
1. Tạo request GET
2. URL: http://localhost:5000/api/v1/product/by-barcode/8936065200163
3. Params: store_id = 1
4. Headers: 
   - Authorization: Bearer YOUR_TOKEN
   - Content-Type: application/json
5. Send
```

### Option 2: VS Code REST Client

File: `test.http`

```http
### Get Product by Barcode
GET http://localhost:5000/api/v1/product/by-barcode/8936065200163?store_id=1
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

### Get Product by Barcode (Pepsi)
GET http://localhost:5000/api/v1/product/by-barcode/8936096400051?store_id=1
Authorization: Bearer YOUR_JWT_TOKEN

### Test with invalid barcode
GET http://localhost:5000/api/v1/product/by-barcode/9999999999999?store_id=1
Authorization: Bearer YOUR_JWT_TOKEN
```

Run: Right-click → "Send Request"

### Option 3: Browser Console

```javascript
// Trong DevTools Console (F12)
const token = localStorage.getItem('token') // Hoặc sessionStorage
const barcode = '8936065200163'
const storeId = 1

fetch(`http://localhost:5000/api/v1/product/by-barcode/${barcode}?store_id=${storeId}`, {
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
})
.then(res => res.json())
.then(data => console.log(data))
.catch(err => console.error('Error:', err))
```

---

## 🧪 Test Scenarios

### Test 1: Successful Barcode Lookup

```
Input:  barcode=8936065200163, store_id=1
Expected HTTP: 200
Expected Response:
{
  "err": 0,
  "msg": "OK",
  "data": {
    "product_id": 1,
    "name": "Coca Cola 1.5L",
    "current_price": 15000,  // hoặc 14000 nếu có pricing rule
    "available_quantity": 50
  }
}
```

### Test 2: Barcode Not Found

```
Input:  barcode=9999999999999, store_id=1
Expected HTTP: 404
Expected Response:
{
  "err": 1,
  "msg": "Sản phẩm không tìm thấy"
}
```

### Test 3: Invalid Store ID

```
Input:  barcode=8936065200163, store_id=999
Expected HTTP: 400 or 404
Expected: Lỗi store không tồn tại hoặc không có tồn kho
```

### Test 4: Inactive Product

```
Setup: UPDATE products SET is_active=false WHERE product_id=1;
Input: barcode=8936065200163, store_id=1
Expected HTTP: 404
Expected: "Sản phẩm không khả dụng"
Cleanup: UPDATE products SET is_active=true WHERE product_id=1;
```

### Test 5: SKU Fallback

```
Input:  code=SKU001 (không phải barcode, là SKU)
Expected: API fallback từ ProductUnit.barcode → Product.sku
Expected Response: Tìm thấy Coca Cola (nếu code=SKU001)
```

### Test 6: Pricing Rules Applied

```
Setup: INSERT pricing rule: product_id=1, rule_type=fixed_price, value=14000
Input: barcode=8936065200163, store_id=1
Expected: current_price=14000 (không phải 15000)
Cleanup: DELETE pricing rule
```

### Test 7: Multiple Units

```
Setup: ProductUnit conversion_to_base=12 (1 box = 12 pieces)
       Inventory stock=120 (base units)
Input: barcode của unit này
Expected: available_quantity=10 (120/12)
```

---

## 🐛 Debugging Tips

### Enable Logging in Service

File: `server/src/services/product.js`

```javascript
export const getByBarcode = (barcode, storeId) => new Promise(async (resolve, reject) => {
    try {
        console.log('🔍 Searching for barcode:', barcode)
        
        // ... normalization ...
        
        console.log('📦 Found ProductUnit:', productUnit)
        console.log('💰 Applying pricing rule:', pricingRule)
        console.log('📊 Inventory:', inventory)
        console.log('✅ Final result:', result)
        
        resolve(result)
    } catch (error) {
        console.error('❌ Error in getByBarcode:', error)
        reject(error)
    }
})
```

Run with logging:
```bash
npm start 2>&1 | grep -E "(🔍|📦|💰|📊|✅|❌)"
```

### Check Database Queries

Enable Sequelize logging:

File: `server/src/config/connectDatabase.js`

```javascript
const sequelize = new Sequelize({
    // ... other config ...
    logging: console.log  // or logging: (sql) => console.log('[SQL]', sql)
})
```

---

## 📈 Performance Optimization

### Add Database Indexes

```sql
-- Index trên barcode (primary search)
CREATE INDEX idx_product_unit_barcode ON product_units(barcode);

-- Index trên SKU (fallback search)
CREATE INDEX idx_product_sku ON products(sku);

-- Index trên pricing rules
CREATE INDEX idx_pricing_product_store ON pricing_rules(product_id, store_id);
CREATE INDEX idx_pricing_dates ON pricing_rules(start_date, end_date);

-- Index trên inventory
CREATE INDEX idx_inventory_product_store ON inventories(product_id, store_id);

-- Verify indexes
SHOW INDEX FROM product_units;
SHOW INDEX FROM products;
SHOW INDEX FROM pricing_rules;
SHOW INDEX FROM inventories;
```

### Query Optimization

```javascript
// Current query (acceptable)
const productUnit = await db.ProductUnit.findOne({ where: { barcode } })
const product = await db.Product.findByPk(productUnit.product_id)
const inventory = await db.Inventory.findOne({ where: { product_id, store_id } })
const pricingRule = await db.PricingRule.findOne({ where: { ... } })

// Could be optimized with:
// - Connection pooling (already configured)
// - Query result caching (Redis - optional)
// - Batch loading (DataLoader - optional for future)
```

---

## 🔐 Security Checklist

- [x] Input validation (barcode length, store_id number)
- [x] Authorization check (JWT token required)
- [x] SQL injection prevention (Sequelize ORM)
- [x] Rate limiting (optional, can add with express-rate-limit)
- [x] CORS configured correctly
- [x] Error messages don't leak sensitive info

### (Optional) Add Rate Limiting

```bash
npm install express-rate-limit
```

```javascript
// server/src/routes/product.js
import rateLimit from 'express-rate-limit'

const barcodeRateLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,  // 1 minute
    max: 100,  // 100 requests per minute
    message: 'Quá nhiều yêu cầu, vui lòng thử lại sau'
})

router.get('/by-barcode/:code', barcodeRateLimiter, productController.getByBarcode)
```

---

## 📋 Pre-Deployment Checklist

- [ ] API endpoint implemented & tested
- [ ] Database has test data (8+ products)
- [ ] All barcode unique (no duplicates)
- [ ] Pricing rules configured (if applicable)
- [ ] Inventory stocked (> 0)
- [ ] Indexes created on barcode, sku, pricing_rules
- [ ] JWT authentication working
- [ ] Error handling covers all cases
- [ ] Response format matches contract
- [ ] Performance < 300ms per request
- [ ] Logging enabled for debugging
- [ ] Rate limiting configured (optional)
- [ ] CORS allows frontend origin
- [ ] Documentation updated

---

## 🚀 Deployment Steps

```bash
# 1. Backup database
mysqldump -u root -p warehouse_db > backup_$(date +%Y%m%d).sql

# 2. Run migrations (if needed)
# sequelize-cli db:migrate

# 3. Add test data
mysql -u root -p warehouse_db < test_data.sql

# 4. Restart server
npm start

# 5. Verify endpoint
curl -X GET "http://localhost:5000/api/v1/product/by-barcode/8936065200163?store_id=1" \
  -H "Authorization: Bearer TOKEN"

# Expected: 200 OK with product data
```

---

**Next: Open `CAMERA_BARCODE_TEST_GUIDE.md` untuk test dengan webcam**
