# Tính Năng Lịch Sử Thanh Toán - In Hóa Đơn & Xuất Excel

## 📋 Tổng Quan

Đã thêm hai tính năng mới vào phần lịch sử thanh toán:
1. **Nút In Hóa Đơn** - In hóa đơn PDF cho từng đơn hàng
2. **Nút Xuất Excel** - Xuất toàn bộ lịch sử thanh toán ra file Excel

## ✨ Tính Năng Chi Tiết

### 1. Nút In Hóa Đơn (Print Invoice)
- **Vị trí**: Cột "Hành động" trong bảng lịch sử thanh toán
- **Chức năng**: Nhấn nút "In" để in hóa đơn PDF của đơn hàng
- **Hóa đơn bao gồm**:
  - Thông tin cửa hàng
  - Mã giao dịch
  - Thông tin khách hàng
  - Danh sách sản phẩm (STT, tên, số lượng, đơn giá, thành tiền)
  - Tổng tiền, thuế, giảm giá
  - Thông tin thanh toán (tiền khách đưa, tiền trả lại)

### 2. Nút Xuất Excel (Export to Excel)
- **Vị trí**: Card thứ 4 trong phần Summary (bên phải)
- **Chức năng**: Xuất lịch sử thanh toán ra file Excel
- **File Excel bao gồm**:
  - STT
  - Mã giao dịch
  - Thời gian
  - Tên khách hàng
  - Số điện thoại
  - Số lượng sản phẩm
  - Tổng tiền
  - Phương thức thanh toán
  - Trạng thái
  - Tiền khách đưa (nếu thanh toán bằng tiền mặt)
  - Tiền trả lại (nếu thanh toán bằng tiền mặt)

## 📁 Các File Được Tạo/Sửa

### Frontend:
1. **FE/src/utils/exportExcel.js** (NEW)
   - Hàm `exportPaymentHistoryToExcel()` - Xuất dữ liệu ra Excel
   - Sử dụng library `xlsx`

2. **FE/src/pages/Cashier/PaymentHistory.js** (UPDATED)
   - Thêm import: `FaPrint`, `FaFileExcel`, `generateAndPrintInvoice`, `exportPaymentHistoryToExcel`
   - Thêm hàm: `handlePrintInvoice()`, `handleExportExcel()`
   - Thêm nút "Xuất Excel" trong summary cards
   - Thêm cột "Hành động" với nút "In" trong bảng

3. **FE/src/pages/Store_Manager/PaymentHistory.js** (UPDATED)
   - Tương tự như Cashier PaymentHistory.js
   - Thêm các nút in hóa đơn và xuất Excel

4. **FE/src/assets/PaymentHistory.css** (UPDATED)
   - Thêm styling cho các nút
   - Styling cho button hover, disabled states
   - Styling cho action buttons trong table

## 🔧 Dependencies

### Cài đặt Package:
```bash
cd FE
npm install xlsx
```

## 🎯 Cách Sử Dụng

### In Hóa Đơn:
1. Mở trang "Lịch sử thanh toán"
2. Tìm đơn hàng cần in
3. Nhấn nút "In" trong cột "Hành động"
4. Hóa đơn sẽ mở trong cửa sổ mới
5. Nhấn Ctrl+P hoặc chọn Print để in

### Xuất Excel:
1. Mở trang "Lịch sử thanh toán"
2. Chọn ngày và phương thức thanh toán (tùy chọn)
3. Nhấn nút "Xuất Excel" ở phần Summary
4. File Excel sẽ được tải về với tên: `Lich_su_thanh_toan_YYYY-MM-DD.xlsx`

## 📊 Dữ Liệu Xuất Excel

File Excel sẽ chứa các cột:
| STT | Mã GD | Thời gian | Khách hàng | Số điện thoại | Số lượng SP | Tổng tiền | Phương thức | Trạng thái | Tiền khách đưa | Tiền trả lại |

## ⚠️ Lưu Ý

1. **Nút "Xuất Excel" bị disable** khi không có dữ liệu
2. **Hóa đơn in** sử dụng định dạng HTML, có thể tùy chỉnh bằng CSS
3. **File Excel** được tạo client-side, không cần server
4. **Tiền khách đưa & tiền trả lại** chỉ hiển thị cho thanh toán tiền mặt

## 🧪 Test

### Test In Hóa Đơn:
1. Tạo một giao dịch thanh toán bằng tiền mặt
2. Vào lịch sử thanh toán
3. Nhấn nút "In" của giao dịch vừa tạo
4. Kiểm tra hóa đơn hiển thị đúng thông tin

### Test Xuất Excel:
1. Có ít nhất 1 giao dịch trong ngày
2. Nhấn nút "Xuất Excel"
3. Kiểm tra file được tải về
4. Mở file Excel và kiểm tra dữ liệu

## 📞 Hỗ Trợ

Nếu gặp lỗi:
1. Kiểm tra browser console (F12)
2. Kiểm tra xem xlsx package đã được cài đặt
3. Kiểm tra xem popup blocker có block cửa sổ in không

