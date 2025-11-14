# Hướng dẫn Test Thanh toán Tiền Mặt

## Chuẩn bị

1. **Chạy migration**
   ```bash
   # Thêm field vào bảng Payment
   mysql -u root -p your_database < server/database/migrations/2025-01-15_add_cash_payment_fields.sql
   ```

2. **Khởi động server**
   ```bash
   cd server
   npm install
   npm start
   ```

3. **Khởi động frontend**
   ```bash
   cd FE
   npm install
   npm start
   ```

## Test Cases

### Test 1: Hiển thị CashPaymentModal
**Bước:**
1. Mở POS
2. Thêm 1-2 sản phẩm vào giỏ
3. Chọn "Tiền mặt" làm phương thức thanh toán
4. Nhấn "Thanh toán"

**Kỳ vọng:**
- CashPaymentModal hiển thị
- Hiển thị số tiền phải trả
- Input field để nhập tiền khách đưa
- Tiền trả lại hiển thị là 0

### Test 2: Tính toán tiền trả lại
**Bước:**
1. Tiếp tục từ Test 1
2. Nhập số tiền khách đưa = số tiền phải trả + 50,000

**Kỳ vọng:**
- Tiền trả lại tự động cập nhật = 50,000
- Nút "Hoàn thành" được enable

### Test 3: Validate tiền khách đưa
**Bước:**
1. Tiếp tục từ Test 1
2. Nhập số tiền khách đưa < số tiền phải trả

**Kỳ vọng:**
- Nút "Hoàn thành" bị disable
- Không thể nhấn "Hoàn thành"

### Test 4: Hoàn thành thanh toán
**Bước:**
1. Tiếp tục từ Test 2
2. Nhấn "Hoàn thành"

**Kỳ vọng:**
- Modal hiển thị "Thanh toán thành công"
- Hiển thị thông tin thanh toán (tiền phải trả, tiền khách đưa, tiền trả lại)
- Hiển thị 2 button: "In hóa đơn" và "Đóng"
- Giỏ hàng được xóa
- Trạng thái thanh toán reset

### Test 5: In hóa đơn
**Bước:**
1. Tiếp tục từ Test 4
2. Nhấn "In hóa đơn"

**Kỳ vọng:**
- Cửa sổ in mở ra
- Hóa đơn hiển thị đầy đủ thông tin:
  - Tiêu đề "HÓA ĐƠN BÁN HÀNG"
  - Thông tin cửa hàng
  - Mã giao dịch
  - Thông tin khách hàng (nếu có)
  - Danh sách sản phẩm
  - Tổng tiền, thuế, giảm giá
  - Thông tin thanh toán (tiền khách đưa, tiền trả lại)
- Có thể in hoặc hủy

### Test 6: Kiểm tra database
**Bước:**
1. Sau khi hoàn thành thanh toán
2. Kiểm tra bảng Payment trong database

**Kỳ vọng:**
- Bản ghi Payment mới được tạo
- `cash_received` = số tiền khách đưa
- `change_amount` = số tiền trả lại
- `method` = 'cash'
- `status` = 'completed'

### Test 7: Thanh toán với khách hàng đã đăng ký
**Bước:**
1. Tìm kiếm khách hàng bằng số điện thoại
2. Chọn khách hàng
3. Thêm sản phẩm vào giỏ
4. Chọn "Tiền mặt"
5. Nhấn "Thanh toán"
6. Nhập tiền khách đưa
7. Nhấn "Hoàn thành"

**Kỳ vọng:**
- Hóa đơn hiển thị tên khách hàng
- Điểm tích lũy được cập nhật
- Voucher được tạo tự động (nếu có)

### Test 8: Thanh toán với khách hàng vãng lai
**Bước:**
1. Không chọn khách hàng
2. Thêm sản phẩm vào giỏ
3. Chọn "Tiền mặt"
4. Nhấn "Thanh toán"
5. Nhập tiền khách đưa
6. Nhấn "Hoàn thành"

**Kỳ vọng:**
- Hóa đơn hiển thị "Khách vãng lai"
- Thanh toán thành công
- Không cập nhật điểm tích lũy

## Kiểm tra lỗi

### Lỗi 1: CashPaymentModal không hiển thị
- Kiểm tra import trong POS.js
- Kiểm tra state `showCashPaymentModal`
- Kiểm tra console có lỗi gì không

### Lỗi 2: Tiền trả lại không tính đúng
- Kiểm tra logic tính toán trong CashPaymentModal
- Kiểm tra input value có phải là number không

### Lỗi 3: Hóa đơn không in được
- Kiểm tra API endpoint `/payment/invoice/pdf/:transactionId`
- Kiểm tra dữ liệu transaction có đầy đủ không
- Kiểm tra browser console có lỗi gì không

### Lỗi 4: Dữ liệu không lưu vào database
- Kiểm tra backend có nhận `cash_received` và `change_amount` không
- Kiểm tra migration đã chạy chưa
- Kiểm tra bảng Payment có 2 field mới không

## Checklist

- [ ] CashPaymentModal hiển thị đúng
- [ ] Tính toán tiền trả lại chính xác
- [ ] Validate tiền khách đưa hoạt động
- [ ] Hoàn thành thanh toán thành công
- [ ] Dữ liệu lưu vào database đúng
- [ ] In hóa đơn hoạt động
- [ ] Hóa đơn hiển thị đầy đủ thông tin
- [ ] Thanh toán với khách hàng đã đăng ký
- [ ] Thanh toán với khách hàng vãng lai
- [ ] Giỏ hàng được xóa sau thanh toán
- [ ] Trạng thái reset đúng

