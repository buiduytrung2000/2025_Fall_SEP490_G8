# Hướng dẫn Migration: Thêm Giá Nhập và Xóa Mềm cho Sản Phẩm

## Tổng quan
Migration này thêm hai trường mới vào bảng Product:
1. **import_price**: Giá nhập/giá vốn của sản phẩm
2. **is_active**: Trạng thái hoạt động để hỗ trợ xóa mềm

## Các thay đổi đã thực hiện

### 1. Database Schema
- **File migration**: `server/database/migrations/2025-11-25_add_product_import_price_and_status.sql`
- **Schema chính**: `server/database/schema.sql` đã được cập nhật

### 2. Backend (Server)
- **Model**: `server/src/models/product.js` - Thêm trường `import_price` và `is_active`
- **Service**: `server/src/services/product.js`
  - Cập nhật `getAll()` - Lọc sản phẩm hoạt động theo mặc định
  - Cập nhật `getOne()` - Hỗ trợ tham số `include_inactive`
  - Cập nhật `create()` - Thêm trường `import_price` và `is_active`
  - Cập nhật `update()` - Hỗ trợ cập nhật các trường mới
  - Cập nhật `remove()` - Thực hiện xóa mềm (soft delete)
  - Thêm `restore()` - Khôi phục sản phẩm đã xóa
  - Thêm `hardDelete()` - Xóa vĩnh viễn (sử dụng cẩn thận)
  - Cập nhật `getByStore()` - Lọc sản phẩm hoạt động
  - Cập nhật `getForPriceManagement()` - Lọc sản phẩm hoạt động
- **Controller**: `server/src/controllers/product.js`
  - Thêm `restore()` controller
  - Thêm `hardDelete()` controller
- **Routes**: `server/src/routes/product.js`
  - `PATCH /:product_id/restore` - Khôi phục sản phẩm
  - `DELETE /:product_id/hard-delete` - Xóa vĩnh viễn

### 3. Frontend
- **API**: `FE/src/api/productApi.js`
  - Thêm `restoreProduct()` function
  - Thêm `hardDeleteProduct()` function
- **UI**: `FE/src/pages/Warehouse/ProductManagement.js`
  - Thêm trường "Giá nhập" vào form thêm/sửa sản phẩm
  - Thêm cột "Giá nhập" và "Trạng thái" vào bảng
  - Thêm function `handleRestoreClick()` để khôi phục sản phẩm

## Cách chạy Migration

### Phương pháp 1: Sử dụng MySQL Command Line
```bash
# Kết nối đến MySQL
mysql -u root -p

# Chọn database
USE CCMS_DB;

# Chạy migration file
source server/database/migrations/2025-11-25_add_product_import_price_and_status.sql
```

### Phương pháp 2: Sử dụng MySQL Workbench hoặc phpMyAdmin
1. Mở file `server/database/migrations/2025-11-25_add_product_import_price_and_status.sql`
2. Copy toàn bộ nội dung
3. Paste vào SQL editor của MySQL Workbench hoặc phpMyAdmin
4. Execute

### Phương pháp 3: Sử dụng Node.js script
```bash
cd server
node -e "
const mysql = require('mysql2/promise');
const fs = require('fs');

async function runMigration() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'CCMS_DB'
    });
    
    const sql = fs.readFileSync('./database/migrations/2025-11-25_add_product_import_price_and_status.sql', 'utf8');
    const statements = sql.split(';').filter(s => s.trim() && !s.trim().startsWith('--'));
    
    for (const stmt of statements) {
        if (stmt.trim()) await connection.execute(stmt);
    }
    
    console.log('Migration completed');
    await connection.end();
}

runMigration().catch(console.error);
"
```

## Kiểm tra Migration

Sau khi chạy migration, kiểm tra bảng Product:

```sql
-- Kiểm tra cấu trúc bảng
DESCRIBE Product;

-- Kết quả mong đợi sẽ bao gồm:
-- import_price    DECIMAL(10,2)  NO    0.00
-- is_active       TINYINT(1)     NO    1

-- Kiểm tra indexes
SHOW INDEX FROM Product;

-- Kết quả mong đợi sẽ bao gồm:
-- idx_product_is_active
```

## Sử dụng tính năng mới

### 1. Tạo sản phẩm với giá nhập
```javascript
const productData = {
    name: "Sản phẩm A",
    sku: "SKU001",
    base_unit_id: 1,
    hq_price: 100000,
    import_price: 80000,  // Giá nhập
    category_id: 1,
    supplier_id: 1,
    description: "Mô tả sản phẩm"
};

await createProduct(productData);
```

### 2. Xóa mềm sản phẩm
```javascript
// Khi gọi deleteProduct, sản phẩm sẽ được đánh dấu is_active = false
await deleteProduct(productId);
```

### 3. Khôi phục sản phẩm đã xóa
```javascript
await restoreProduct(productId);
```

### 4. Lấy danh sách sản phẩm
```javascript
// Mặc định chỉ lấy sản phẩm hoạt động
await getAllProducts();

// Lấy tất cả sản phẩm kể cả đã xóa
await getAllProducts({ include_inactive: true });
```

## Lưu ý quan trọng

1. **Xóa mềm vs Xóa cứng**:
   - Mặc định, nút "Xóa" sẽ thực hiện xóa mềm (soft delete)
   - Sản phẩm đã xóa mềm vẫn tồn tại trong database với `is_active = false`
   - Để xóa vĩnh viễn, sử dụng endpoint `DELETE /:product_id/hard-delete`

2. **Tính toàn vẹn dữ liệu**:
   - Sản phẩm đã xóa mềm vẫn giữ nguyên các quan hệ với Orders, Transactions, Inventory
   - Điều này đảm bảo lịch sử giao dịch không bị mất

3. **Hiển thị**:
   - Mặc định, tất cả các API chỉ trả về sản phẩm hoạt động (`is_active = true`)
   - Để xem sản phẩm đã xóa, cần truyền tham số `include_inactive=true`

4. **Giá nhập (import_price)**:
   - Dùng để tính toán lợi nhuận: `profit = hq_price - import_price`
   - Mặc định là 0 nếu không được cung cấp

## Rollback (Nếu cần)

Nếu cần hoàn tác migration:

```sql
USE CCMS_DB;

-- Xóa index
ALTER TABLE Product DROP INDEX idx_product_is_active;

-- Xóa cột is_active
ALTER TABLE Product DROP COLUMN is_active;

-- Xóa cột import_price
ALTER TABLE Product DROP COLUMN import_price;
```

## API Endpoints mới

### Khôi phục sản phẩm
```
PATCH /api/v1/product/:product_id/restore
```

### Xóa vĩnh viễn sản phẩm
```
DELETE /api/v1/product/:product_id/hard-delete
```

## Testing

Sau khi chạy migration, test các chức năng sau:

1. ✅ Tạo sản phẩm mới với giá nhập
2. ✅ Cập nhật giá nhập của sản phẩm
3. ✅ Xóa sản phẩm (soft delete)
4. ✅ Kiểm tra sản phẩm đã xóa không hiển thị trong danh sách
5. ✅ Khôi phục sản phẩm đã xóa
6. ✅ Kiểm tra sản phẩm đã khôi phục hiển thị lại trong danh sách
7. ✅ Xem danh sách sản phẩm với `include_inactive=true`

## Hỗ trợ

Nếu gặp vấn đề khi chạy migration, vui lòng kiểm tra:
1. Kết nối database
2. Quyền truy cập của user MySQL
3. Tên database đúng (CCMS_DB)
4. Không có lỗi syntax trong migration file

