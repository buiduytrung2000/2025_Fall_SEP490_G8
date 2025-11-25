# Tính năng Toggle Trạng thái Sản phẩm

## 📋 Tổng quan

Đã triển khai thành công tính năng toggle trạng thái sản phẩm với các cải tiến sau:

1. **Thêm Toggle Switch**: Thay thế nút "Xóa" bằng Switch để bật/tắt trạng thái sản phẩm
2. **Loại bỏ chức năng xóa từ UI**: Người dùng không còn thấy nút xóa, chỉ có thể tắt sản phẩm
3. **Cải thiện UX**: Thêm tooltip, confirmation dialog, và thông báo rõ ràng

## 🎯 Mục tiêu

- ✅ Ngăn người dùng vô tình xóa sản phẩm
- ✅ Đơn giản hóa giao diện quản lý sản phẩm
- ✅ Cải thiện trải nghiệm người dùng với toggle switch trực quan
- ✅ Bảo toàn dữ liệu bằng cách chỉ cho phép tắt/bật sản phẩm

## 📁 Files đã thay đổi

### Backend (Server)

#### 1. Services
- ✅ `server/src/services/product.js`
  - **Thêm function `toggleStatus()`**: Toggle trạng thái is_active của sản phẩm
  - Tự động phát hiện trạng thái hiện tại và đảo ngược
  - Trả về thông tin sản phẩm và trạng thái mới

#### 2. Controllers
- ✅ `server/src/controllers/product.js`
  - **Thêm `toggleStatus()` controller**: Xử lý request toggle trạng thái

#### 3. Routes
- ✅ `server/src/routes/product.js`
  - **Thêm route mới**: `PATCH /api/v1/product/:product_id/toggle`

### Frontend

#### 1. API Layer
- ✅ `FE/src/api/productApi.js`
  - **Thêm `toggleProductStatus()` function**: Gọi API toggle

#### 2. UI Components
- ✅ `FE/src/pages/Warehouse/ProductManagement.js`
  - **Loại bỏ**: 
    - Nút "Xóa" (Delete button)
    - ConfirmationModal cho xóa
    - State `showModal`
    - Functions `handleDeleteClick()` và `confirmDelete()`
    - Import `deleteProduct` và `restoreProduct`
  - **Thêm**:
    - Toggle Switch component từ Material-UI
    - Function `handleToggleStatus()` với confirmation
    - Tooltip cho Switch
    - Toast notifications cho toggle actions
    - Icons CheckCircle và Cancel cho status chip
  - **Cập nhật**:
    - Cột "Trạng thái" với icon và variant khác nhau
    - renderRowActions với Switch thay vì Delete button

## 🔄 Luồng hoạt động

### Toggle Trạng thái Sản phẩm

```
User click Switch → Confirmation dialog → 
User confirm → Frontend gọi toggleProductStatus() →
Backend lấy trạng thái hiện tại → Đảo ngược trạng thái →
Cập nhật database → Trả về trạng thái mới →
Frontend hiển thị toast notification → Refresh danh sách
```

## 🔌 API Endpoint mới

### Toggle Product Status
```
PATCH /api/v1/product/:product_id/toggle
```

**Request:**
- Method: PATCH
- URL: `/api/v1/product/:product_id/toggle`
- Headers: `Authorization: Bearer <token>`

**Response (Success):**
```json
{
  "err": 0,
  "msg": "Product activated successfully",
  "data": {
    "product_id": 1,
    "name": "Coca Cola 330ml",
    "is_active": true
  }
}
```

**Response (Error):**
```json
{
  "err": 1,
  "msg": "Product not found",
  "data": null
}
```

## 🎨 UI/UX Changes

### Trước đây:
```
[Sửa] [Xóa]
```

### Bây giờ:
```
[Sửa] [Toggle Switch]
```

### Cột Trạng thái:

**Hoạt động:**
- Chip màu xanh (success)
- Icon: CheckCircle
- Label: "Hoạt động"
- Variant: filled

**Đã tắt:**
- Chip màu xám (default)
- Icon: Cancel
- Label: "Đã tắt"
- Variant: outlined

### Toggle Switch:

**Khi sản phẩm đang hoạt động:**
- Switch: ON (màu xanh)
- Tooltip: "Tắt sản phẩm"
- Confirmation: "Bạn có chắc chắn muốn tắt sản phẩm...?"

**Khi sản phẩm đã tắt:**
- Switch: OFF (màu xám)
- Tooltip: "Bật sản phẩm"
- Confirmation: "Bạn có chắc chắn muốn kích hoạt sản phẩm...?"

## 📝 Code Examples

### Backend Service (toggleStatus)

```javascript
export const toggleStatus = (product_id) => new Promise(async (resolve, reject) => {
    try {
        // Get current status
        const product = await db.Product.findOne({
            where: { product_id },
            attributes: ['product_id', 'is_active', 'name']
        })

        if (!product) {
            resolve({
                err: 1,
                msg: 'Product not found',
                data: null
            })
            return
        }

        // Toggle the status
        const newStatus = !product.is_active
        const [affectedRows] = await db.Product.update(
            { is_active: newStatus },
            { where: { product_id } }
        )

        resolve({
            err: affectedRows > 0 ? 0 : 1,
            msg: affectedRows > 0 
                ? `Product ${newStatus ? 'activated' : 'deactivated'} successfully` 
                : 'Failed to update product status',
            data: {
                product_id: product.product_id,
                name: product.name,
                is_active: newStatus
            }
        })
    } catch (error) {
        reject(error)
    }
})
```

### Frontend Toggle Handler

```javascript
const handleToggleStatus = async (product) => {
    // Confirm action
    const action = product.is_active ? 'tắt' : 'kích hoạt';
    const confirmMessage = `Bạn có chắc chắn muốn ${action} sản phẩm "${product.name}"?`;
    
    if (!window.confirm(confirmMessage)) {
        return;
    }

    try {
        const result = await toggleProductStatus(product.product_id);
        if (result.err === 0) {
            const newStatus = result.data?.is_active;
            toast.success(
                newStatus 
                    ? `✓ Đã kích hoạt sản phẩm "${product.name}"` 
                    : `✓ Đã tắt sản phẩm "${product.name}"`
            );
            await loadData();
        } else {
            toast.error(result.msg || 'Không thể thay đổi trạng thái sản phẩm');
        }
    } catch (err) {
        toast.error('Lỗi khi thay đổi trạng thái: ' + err.message);
    }
};
```

### MaterialReactTable Actions

```javascript
renderRowActions={({ row }) => (
    <Box sx={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <Tooltip title="Chỉnh sửa sản phẩm">
            <IconButton 
                color="warning" 
                onClick={(e) => { 
                    e.stopPropagation(); 
                    handleOpenEdit(row.original); 
                }}
            >
                <Edit />
            </IconButton>
        </Tooltip>
        <Tooltip title={row.original.is_active ? "Tắt sản phẩm" : "Bật sản phẩm"}>
            <Switch
                checked={row.original.is_active}
                onChange={(e) => {
                    e.stopPropagation();
                    handleToggleStatus(row.original);
                }}
                color={row.original.is_active ? "success" : "default"}
                onClick={(e) => e.stopPropagation()}
            />
        </Tooltip>
    </Box>
)}
```

## ✅ Lợi ích

1. **An toàn hơn**: Không còn nguy cơ xóa nhầm sản phẩm
2. **Trực quan hơn**: Toggle switch dễ hiểu và sử dụng
3. **Nhanh hơn**: Không cần modal xác nhận phức tạp
4. **Rõ ràng hơn**: Trạng thái được hiển thị với icon và màu sắc
5. **Linh hoạt hơn**: Dễ dàng bật lại sản phẩm đã tắt

## ⚠️ Lưu ý

1. **API endpoints cũ vẫn tồn tại**: 
   - `DELETE /product/:id` (soft delete)
   - `PATCH /product/:id/restore`
   - `DELETE /product/:id/hard-delete`
   - Các endpoint này vẫn có thể sử dụng cho mục đích quản trị hoặc API

2. **Chỉ ẩn khỏi UI**: Chức năng xóa chỉ bị ẩn khỏi giao diện người dùng, không bị xóa khỏi backend

3. **Confirmation dialog**: Sử dụng `window.confirm()` đơn giản, có thể nâng cấp thành Material-UI Dialog sau

4. **Toast notifications**: Sử dụng react-toastify để hiển thị thông báo

## 🚀 Sử dụng

### Bật/Tắt sản phẩm:

1. Vào trang "Quản lý Sản phẩm"
2. Tìm sản phẩm cần bật/tắt
3. Click vào Toggle Switch ở cột "Actions"
4. Xác nhận trong dialog
5. Xem thông báo thành công
6. Danh sách sản phẩm tự động refresh

### Xem trạng thái:

- Cột "Trạng thái" hiển thị:
  - ✓ **Hoạt động** (chip xanh với icon CheckCircle)
  - ✗ **Đã tắt** (chip xám với icon Cancel)

## 🎉 Kết luận

Tính năng toggle trạng thái đã được triển khai thành công với:
- ✅ API endpoint mới cho toggle
- ✅ UI/UX cải thiện với Switch component
- ✅ Loại bỏ nút xóa khỏi giao diện
- ✅ Confirmation và toast notifications
- ✅ Icon và màu sắc trực quan

Người dùng giờ đây có thể quản lý trạng thái sản phẩm một cách an toàn và trực quan hơn!

