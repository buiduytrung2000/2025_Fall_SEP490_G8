# Hướng dẫn Cài đặt Chức năng Thanh toán Tiền Mặt

## ✅ Các bước đã hoàn thành

1. ✓ Migration database đã chạy thành công
2. ✓ Các field `cash_received` và `change_amount` đã được thêm vào bảng Payment
3. ✓ Model Payment đã được cập nhật
4. ✓ Backend service, controller, route đã được cập nhật
5. ✓ Frontend component CashPaymentModal đã được tạo
6. ✓ Utility function in hóa đơn PDF đã được tạo

## 🚀 Bước tiếp theo: Restart Server

### Trên Windows:

1. **Dừng server hiện tại:**
   - Nhấn `Ctrl + C` trong terminal chạy server
   - Hoặc tìm process Node.js và kill nó

2. **Restart server:**
   ```bash
   cd server
   npm start
   ```

3. **Restart frontend (nếu cần):**
   ```bash
   cd FE
   npm start
   ```

### Kiểm tra server đã khởi động thành công:
- Backend: http://localhost:5000
- Frontend: http://localhost:3000

## 🧪 Test Chức năng

Sau khi restart server, hãy test flow thanh toán tiền mặt:

1. Mở POS
2. Thêm sản phẩm vào giỏ
3. Chọn "Tiền mặt" làm phương thức thanh toán
4. Nhấn "Thanh toán"
5. Popup CashPaymentModal sẽ hiển thị
6. Nhập số tiền khách đưa
7. Nhấn "Hoàn thành"
8. Nhấn "In hóa đơn" để in PDF

## 📋 Danh sách các file được tạo/sửa

### Backend:
- `server/src/models/payment.js` - Thêm fields cash_received, change_amount
- `server/src/services/payment.js` - Thêm logic xử lý
- `server/src/controllers/payment.js` - Thêm controller
- `server/src/routes/payment.js` - Thêm route
- `server/database/migrations/2025-01-15_add_cash_payment_fields.sql` - Migration

### Frontend:
- `FE/src/components/CashPaymentModal.js` - Component popup
- `FE/src/assets/CashPaymentModal.css` - Styling
- `FE/src/pages/Cashier/POS.js` - Cập nhật logic
- `FE/src/api/paymentApi.js` - Thêm API function
- `FE/src/utils/invoicePDF.js` - Utility in hóa đơn

### Scripts hỗ trợ:
- `server/run-migration.js` - Script chạy migration
- `server/check-model.js` - Script kiểm tra model
- `server/sync-models.js` - Script sync model

## ⚠️ Lưu ý quan trọng

1. **Migration đã chạy:** Các field `cash_received` và `change_amount` đã được thêm vào bảng Payment
2. **Server cần restart:** Để Sequelize load model mới
3. **Tiền khách đưa phải >= số tiền phải trả:** Nút "Hoàn thành" sẽ bị disable nếu không
4. **Hóa đơn in bằng cách mở cửa sổ mới:** Có thể bị block bởi popup blocker

## 🔧 Troubleshooting

### Lỗi: "Unknown column 'cash_received'"
- **Nguyên nhân:** Server chưa được restart
- **Giải pháp:** Restart server bằng cách dừng và chạy lại `npm start`

### Lỗi: "CashPaymentModal không hiển thị"
- **Nguyên nhân:** Frontend chưa được reload
- **Giải pháp:** Refresh browser hoặc restart frontend

### Lỗi: "Không thể in hóa đơn"
- **Nguyên nhân:** Popup bị block hoặc API không trả về dữ liệu
- **Giải pháp:** Kiểm tra browser console và cho phép popup

## 📞 Hỗ trợ

Nếu gặp bất kỳ vấn đề nào, vui lòng:
1. Kiểm tra browser console (F12)
2. Kiểm tra server logs
3. Chạy lại migration: `cd server && node run-migration.js`
4. Sync model: `cd server && node sync-models.js`

