# Sửa Lỗi QR Payment - Lịch Sử Thanh Toán Không Hiển Thị

## 🔍 Vấn Đề

Khi thanh toán bằng QR thành công, transaction không hiển thị trong lịch sử thanh toán.

## 🎯 Nguyên Nhân

1. **Lịch sử thanh toán chỉ hiển thị transaction có status `'completed'`**
   - Khi QR payment được tạo, transaction được tạo với status `'pending'`
   - Chỉ được cập nhật thành `'completed'` khi webhook từ PayOS được gọi
   - Nếu webhook chưa được gọi hoặc bị lỗi, transaction vẫn ở trạng thái `'pending'`

2. **Webhook có thể chưa được gọi hoặc bị lỗi**
   - PayOS webhook có thể bị delay
   - Webhook có thể bị lỗi trong quá trình xử lý

## ✅ Các Sửa Chữa

### 1. Hiển Thị Cả Transaction Pending
**File**: `server/src/services/payment.js` (dòng 576-577)

```javascript
// Trước:
whereClause.status = 'completed';

// Sau:
// Show both completed and pending transactions (pending QR payments waiting for webhook)
// whereClause.status = 'completed';
```

**Kết quả**: Lịch sử thanh toán sẽ hiển thị cả transaction `pending` (đang chờ webhook) và `completed`

### 2. Thêm Endpoint Cập Nhật Trạng Thái QR Payment
**Files**:
- `server/src/services/payment.js` - Hàm `updateQRPaymentStatus()`
- `server/src/controllers/payment.js` - Controller `updateQRPaymentStatus()`
- `server/src/routes/payment.js` - Route `PUT /payment/status/:orderCode`

**Chức năng**: 
- Kiểm tra trạng thái thanh toán từ PayOS
- Nếu đã thanh toán, cập nhật database (payment, transaction, inventory, loyalty points)
- Có thể gọi thủ công để sync trạng thái

### 3. Cập Nhật Frontend
**Files**:
- `FE/src/api/paymentApi.js` - Hàm `updateQRPaymentStatus()`
- `FE/src/components/PaymentModal.js` - Gọi hàm cập nhật khi thanh toán thành công

**Chức năng**:
- Khi phát hiện thanh toán thành công trên PayOS
- Tự động gọi endpoint cập nhật để sync database
- Đảm bảo transaction được cập nhật thành `'completed'` ngay lập tức

## 🔄 Flow Thanh Toán QR Mới

1. **Khách hàng quét QR** → PayOS xử lý thanh toán
2. **Frontend kiểm tra trạng thái** mỗi 3 giây
3. **Khi phát hiện PAID**:
   - Gọi `updateQRPaymentStatus()` để sync database
   - Cập nhật transaction status thành `'completed'`
   - Cập nhật inventory, loyalty points
4. **Lịch sử thanh toán hiển thị ngay** (không cần chờ webhook)

## 📋 Các Endpoint

### Check Payment Status
```
GET /api/v1/payment/status/:orderCode
```
- Kiểm tra trạng thái thanh toán từ PayOS
- Không cập nhật database

### Update Payment Status (NEW)
```
PUT /api/v1/payment/status/:orderCode
```
- Kiểm tra trạng thái từ PayOS
- Nếu PAID: cập nhật database
- Nếu CANCELLED: cập nhật status thành cancelled
- Nếu pending: trả về pending

## 🧪 Test

### Test QR Payment:
1. Tạo giao dịch QR payment
2. Quét QR bằng app ngân hàng
3. Thanh toán thành công
4. Kiểm tra lịch sử thanh toán - **transaction sẽ hiển thị ngay**

### Test Manual Sync:
```bash
curl -X PUT http://localhost:5000/api/v1/payment/status/{orderCode}
```

## 📊 Trạng Thái Transaction

- `pending` - Chờ thanh toán (QR payment chưa được thanh toán)
- `completed` - Thanh toán thành công
- `cancelled` - Thanh toán bị hủy

## ⚠️ Lưu Ý

1. **Webhook vẫn hoạt động** - Nếu webhook được gọi, nó sẽ cập nhật database
2. **Không bị trùng lặp** - Hàm `updateQRPaymentStatus()` kiểm tra nếu đã completed thì không cập nhật lại
3. **Inventory được cập nhật** - Khi transaction completed, inventory sẽ được trừ
4. **Loyalty points được cập nhật** - Khách hàng sẽ nhận điểm tích lũy

## 🚀 Deployment

1. Restart server để load code mới
2. Frontend sẽ tự động sử dụng hàm mới
3. Không cần migration database

