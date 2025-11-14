# Cập nhật Chức năng Thanh toán Tiền Mặt

## Tóm tắt các thay đổi

Đã cập nhật hệ thống thanh toán tiền mặt để hiển thị popup nhập tiền khách đưa, tính toán tiền trả lại, và in hóa đơn PDF.

## Các file được sửa/tạo

### Backend (Server)

1. **server/src/models/payment.js**
   - Thêm field `cash_received` (tiền khách đưa)
   - Thêm field `change_amount` (tiền trả lại)

2. **server/database/migrations/2025-01-15_add_cash_payment_fields.sql**
   - Migration để thêm 2 field vào bảng Payment

3. **server/src/services/payment.js**
   - Cập nhật `createCashPayment()` để nhận và lưu `cash_received` và `change_amount`
   - Thêm `generateInvoicePDF()` để lấy dữ liệu hóa đơn

4. **server/src/controllers/payment.js**
   - Cập nhật `createCashPayment()` controller để xử lý `cash_received` và `change_amount`
   - Thêm `generateInvoicePDF()` controller

5. **server/src/routes/payment.js**
   - Thêm route GET `/invoice/pdf/:transactionId` để lấy dữ liệu hóa đơn

### Frontend (FE)

1. **FE/src/components/CashPaymentModal.js** (NEW)
   - Component popup để nhập tiền khách đưa
   - Tự động tính toán tiền trả lại
   - 2 button: "Hoàn thành" và "In hóa đơn"
   - Hiển thị thông tin thanh toán sau khi hoàn thành

2. **FE/src/assets/CashPaymentModal.css** (NEW)
   - CSS styling cho CashPaymentModal

3. **FE/src/pages/Cashier/POS.js**
   - Import CashPaymentModal component
   - Thêm state: `showCashPaymentModal`, `cashPaymentData`
   - Thêm handler: `handleCashPaymentComplete()`
   - Sửa logic thanh toán tiền mặt để hiển thị CashPaymentModal
   - Thêm CashPaymentModal component vào JSX

4. **FE/src/api/paymentApi.js**
   - Thêm `getInvoiceData()` function để lấy dữ liệu hóa đơn

5. **FE/src/utils/invoicePDF.js** (NEW)
   - Utility function `generateAndPrintInvoice()` để tạo và in hóa đơn PDF
   - HTML template cho hóa đơn với styling đẹp

## Flow thanh toán tiền mặt

1. Khách hàng chọn "Tiền mặt" làm phương thức thanh toán
2. Nhấn "Thanh toán" → Hiển thị CashPaymentModal
3. Nhập số tiền khách đưa → Tự động tính tiền trả lại
4. Nhấn "Hoàn thành" → Lưu thông tin thanh toán vào database
5. Hiển thị thông tin thanh toán thành công
6. Nhấn "In hóa đơn" → In hóa đơn PDF
7. Nhấn "Đóng" → Đóng modal, xóa giỏ hàng, reset trạng thái

## Dữ liệu được lưu

Khi thanh toán tiền mặt, các thông tin sau được lưu:
- `cash_received`: Số tiền khách đưa
- `change_amount`: Số tiền trả lại
- Tất cả thông tin thanh toán khác (số tiền, phương thức, trạng thái, v.v.)

## Hóa đơn PDF

Hóa đơn bao gồm:
- Thông tin cửa hàng
- Mã giao dịch
- Thông tin khách hàng (nếu có)
- Danh sách sản phẩm với số lượng, đơn giá, thành tiền
- Tổng tiền hàng, thuế, giảm giá, tổng cộng
- Thông tin thanh toán (phương thức, tiền khách đưa, tiền trả lại)
- Trạng thái thanh toán

## Cách sử dụng

### Chạy migration
```bash
# Chạy migration để thêm field vào bảng Payment
mysql -u root -p database_name < server/database/migrations/2025-01-15_add_cash_payment_fields.sql
```

### Test thanh toán tiền mặt
1. Mở POS
2. Thêm sản phẩm vào giỏ
3. Chọn "Tiền mặt" làm phương thức thanh toán
4. Nhấn "Thanh toán"
5. Nhập số tiền khách đưa (phải >= số tiền phải trả)
6. Nhấn "Hoàn thành"
7. Nhấn "In hóa đơn" để in

## Lưu ý

- Tiền khách đưa phải >= số tiền phải trả
- Nút "Hoàn thành" sẽ bị disable nếu tiền khách đưa < số tiền phải trả
- Hóa đơn được in bằng cách mở cửa sổ mới và gọi print dialog
- Tất cả dữ liệu được lưu vào database trước khi in hóa đơn

