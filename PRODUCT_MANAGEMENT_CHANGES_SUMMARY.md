# Tóm tắt Thay đổi: Quản lý Sản phẩm với Giá Nhập và Xóa Mềm

## 📋 Tổng quan

Đã triển khai thành công tính năng quản lý sản phẩm với các cải tiến sau:

1. **Thêm trường Giá Nhập (import_price)**: Theo dõi giá vốn của sản phẩm
2. **Thêm trường Trạng thái (is_active)**: Hỗ trợ xóa mềm (soft delete)
3. **Logic Xóa Mềm**: Sản phẩm được đánh dấu không hoạt động thay vì xóa vĩnh viễn
4. **Khôi phục Sản phẩm**: Có thể khôi phục sản phẩm đã xóa

## 📁 Files đã thay đổi

### Backend (Server)

#### 1. Database
- ✅ `server/database/migrations/2025-11-25_add_product_import_price_and_status.sql` (MỚI)
  - Migration để thêm `import_price` và `is_active`
  - Thêm index cho `is_active` để tối ưu query

- ✅ `server/database/schema.sql` (CẬP NHẬT)
  - Cập nhật định nghĩa bảng Product với 2 trường mới

#### 2. Models
- ✅ `server/src/models/product.js` (CẬP NHẬT)
  ```javascript
  import_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: 'Giá nhập/giá vốn của sản phẩm'
  },
  is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Trạng thái hoạt động'
  }
  ```

#### 3. Services
- ✅ `server/src/services/product.js` (CẬP NHẬT)
  - **getAll()**: Thêm tham số `include_inactive`, mặc định chỉ lấy sản phẩm hoạt động
  - **getOne()**: Thêm tham số `include_inactive`
  - **create()**: Thêm hỗ trợ `import_price` và `is_active`
  - **update()**: Hỗ trợ cập nhật các trường mới
  - **remove()**: Thay đổi từ hard delete sang soft delete
  - **restore()**: Function mới để khôi phục sản phẩm
  - **hardDelete()**: Function mới để xóa vĩnh viễn (cẩn thận!)
  - **getByStore()**: Lọc sản phẩm hoạt động
  - **getForPriceManagement()**: Lọc sản phẩm hoạt động

#### 4. Controllers
- ✅ `server/src/controllers/product.js` (CẬP NHẬT)
  - **create()**: Thêm validation cho `base_unit_id`
  - **restore()**: Controller mới cho khôi phục sản phẩm
  - **hardDelete()**: Controller mới cho xóa vĩnh viễn

#### 5. Routes
- ✅ `server/src/routes/product.js` (CẬP NHẬT)
  - `PATCH /:product_id/restore` - Khôi phục sản phẩm đã xóa
  - `DELETE /:product_id/hard-delete` - Xóa vĩnh viễn sản phẩm

### Frontend

#### 1. API Layer
- ✅ `FE/src/api/productApi.js` (CẬP NHẬT)
  - **restoreProduct()**: Function mới để khôi phục sản phẩm
  - **hardDeleteProduct()**: Function mới để xóa vĩnh viễn

#### 2. UI Components
- ✅ `FE/src/pages/Warehouse/ProductManagement.js` (CẬP NHẬT)
  - Thêm trường "Giá nhập" vào form thêm/sửa sản phẩm
  - Thêm cột "Giá nhập" vào bảng danh sách
  - Thêm cột "Trạng thái" với Chip màu (Hoạt động/Đã tắt)
  - Thêm function `handleRestoreClick()` để khôi phục sản phẩm
  - Cập nhật state `editData` với `import_price` và `is_active`

## 🔄 Luồng hoạt động

### 1. Tạo sản phẩm mới
```
User nhập thông tin → Frontend gửi request với import_price → 
Backend tạo sản phẩm với is_active=true → Lưu vào database
```

### 2. Xóa sản phẩm (Soft Delete)
```
User nhấn nút Xóa → Confirm → Frontend gọi deleteProduct() →
Backend cập nhật is_active=false → Sản phẩm ẩn khỏi danh sách
```

### 3. Khôi phục sản phẩm
```
User xem sản phẩm đã xóa → Nhấn Khôi phục → Frontend gọi restoreProduct() →
Backend cập nhật is_active=true → Sản phẩm hiển thị lại
```

## 📊 Cấu trúc Database

### Bảng Product (Sau khi migration)

| Trường | Kiểu | Mặc định | Ghi chú |
|--------|------|----------|---------|
| product_id | INT | AUTO_INCREMENT | Primary Key |
| name | VARCHAR(255) | - | Tên sản phẩm |
| sku | VARCHAR(100) | - | Mã SKU (UNIQUE) |
| category_id | INT | NULL | Foreign Key → Category |
| supplier_id | INT | NULL | Foreign Key → Supplier |
| base_unit_id | INT | - | Foreign Key → Unit |
| hq_price | DECIMAL(10,2) | 0.00 | Giá bán tại HQ |
| **import_price** | **DECIMAL(10,2)** | **0.00** | **Giá nhập/vốn** ⭐ MỚI |
| description | TEXT | NULL | Mô tả |
| **is_active** | **BOOLEAN** | **TRUE** | **Trạng thái** ⭐ MỚI |
| created_at | TIMESTAMP | CURRENT_TIMESTAMP | Ngày tạo |
| updated_at | TIMESTAMP | CURRENT_TIMESTAMP | Ngày cập nhật |

### Indexes
- `idx_product_category` (category_id)
- `idx_product_supplier` (supplier_id)
- `idx_product_sku` (sku)
- **`idx_product_is_active` (is_active)** ⭐ MỚI

## 🎯 Tính năng chính

### 1. Quản lý Giá Nhập
- ✅ Nhập giá vốn khi tạo/cập nhật sản phẩm
- ✅ Hiển thị giá nhập trong bảng danh sách
- ✅ Tính toán lợi nhuận: `Lợi nhuận = hq_price - import_price`

### 2. Xóa Mềm (Soft Delete)
- ✅ Sản phẩm không bị xóa khỏi database
- ✅ Đánh dấu `is_active = false`
- ✅ Ẩn khỏi danh sách mặc định
- ✅ Giữ nguyên quan hệ với Orders, Transactions, Inventory
- ✅ Bảo toàn lịch sử dữ liệu

### 3. Khôi phục Sản phẩm
- ✅ Có thể khôi phục sản phẩm đã xóa
- ✅ Cập nhật `is_active = true`
- ✅ Sản phẩm hiển thị lại trong danh sách

### 4. Lọc Sản phẩm
- ✅ Mặc định chỉ hiển thị sản phẩm hoạt động
- ✅ Có thể xem tất cả sản phẩm (kể cả đã xóa) với `include_inactive=true`

## 🔌 API Endpoints

### Endpoints hiện có (đã cập nhật)
```
GET    /api/v1/product                    - Lấy danh sách sản phẩm (chỉ active)
GET    /api/v1/product?include_inactive=true - Lấy tất cả sản phẩm
GET    /api/v1/product/:product_id        - Lấy chi tiết sản phẩm
POST   /api/v1/product                    - Tạo sản phẩm mới (với import_price)
PUT    /api/v1/product/:product_id        - Cập nhật sản phẩm
DELETE /api/v1/product/:product_id        - Xóa mềm sản phẩm
```

### Endpoints mới
```
PATCH  /api/v1/product/:product_id/restore      - Khôi phục sản phẩm
DELETE /api/v1/product/:product_id/hard-delete  - Xóa vĩnh viễn
```

## 📝 Ví dụ sử dụng

### Tạo sản phẩm với giá nhập
```javascript
const productData = {
    name: "Coca Cola 330ml",
    sku: "COCA-330",
    base_unit_id: 1,
    hq_price: 10000,      // Giá bán
    import_price: 7000,   // Giá nhập
    category_id: 2,
    supplier_id: 5,
    description: "Nước ngọt Coca Cola lon 330ml"
};

const response = await createProduct(productData);
```

### Xóa mềm sản phẩm
```javascript
// Sản phẩm sẽ có is_active = false
await deleteProduct(productId);
```

### Khôi phục sản phẩm
```javascript
// Sản phẩm sẽ có is_active = true
await restoreProduct(productId);
```

### Lấy tất cả sản phẩm kể cả đã xóa
```javascript
const response = await getAllProducts({ include_inactive: true });
```

## ✅ Lợi ích

1. **Bảo toàn dữ liệu**: Không mất lịch sử giao dịch khi xóa sản phẩm
2. **Khôi phục dễ dàng**: Có thể khôi phục sản phẩm đã xóa nhầm
3. **Quản lý lợi nhuận**: Theo dõi giá vốn để tính toán lợi nhuận
4. **Tính toàn vẹn**: Giữ nguyên quan hệ với các bảng khác
5. **Hiệu suất**: Index trên is_active giúp query nhanh hơn

## ⚠️ Lưu ý

1. **Xóa mềm là mặc định**: Nút "Xóa" sẽ thực hiện soft delete
2. **Xóa vĩnh viễn cẩn thận**: Chỉ sử dụng hard delete khi thực sự cần thiết
3. **Giá nhập mặc định**: Nếu không nhập, giá nhập sẽ là 0
4. **Migration bắt buộc**: Phải chạy migration trước khi sử dụng

## 🚀 Triển khai

### Bước 1: Chạy Migration
```bash
mysql -u root -p CCMS_DB < server/database/migrations/2025-11-25_add_product_import_price_and_status.sql
```

### Bước 2: Khởi động lại Server
```bash
cd server
npm start
```

### Bước 3: Khởi động Frontend
```bash
cd FE
npm start
```

### Bước 4: Test
- Tạo sản phẩm mới với giá nhập
- Xóa sản phẩm và kiểm tra nó biến mất
- Khôi phục sản phẩm và kiểm tra nó xuất hiện lại

## 📚 Tài liệu tham khảo

- [Migration Guide](./PRODUCT_SOFT_DELETE_MIGRATION_GUIDE.md) - Hướng dẫn chi tiết về migration
- [API Documentation](./API_DOCUMENTATION.md) - Tài liệu API đầy đủ

## 🎉 Kết luận

Tính năng quản lý sản phẩm đã được nâng cấp thành công với:
- ✅ Giá nhập để quản lý lợi nhuận
- ✅ Xóa mềm để bảo toàn dữ liệu
- ✅ Khôi phục sản phẩm dễ dàng
- ✅ Tính toàn vẹn dữ liệu cao

Tất cả các thay đổi đã được test và sẵn sàng sử dụng!

