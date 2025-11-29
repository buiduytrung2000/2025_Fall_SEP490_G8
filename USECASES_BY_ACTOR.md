# DANH SÁCH USE CASE THEO TỪNG ACTOR

## 1. CEO (Chief Executive Officer)

### 1.1. Dashboard & Báo cáo
- **UC-CEO-01**: Xem Dashboard tổng quan công ty
  - Xem KPI: Doanh thu hôm nay, tháng này, tổng doanh thu, tổng số cửa hàng
  - Xem biểu đồ doanh thu theo tháng (có thể chọn năm)
  - Xem cơ cấu doanh thu (30 ngày)
  - Xem top cửa hàng bán chạy
  - Xem hiệu suất cửa hàng (30 ngày)
  - Xem sản phẩm bán chạy (30 ngày)
  - Xem cảnh báo tồn kho thấp

- **UC-CEO-02**: Xem Bảng doanh thu (Revenue Board)
  - Xem doanh số theo chi nhánh và sản phẩm
  - Lọc theo tháng/năm
  - Lọc theo chi nhánh
  - Xem tổng doanh thu, tổng sản phẩm bán, số SKU, số chi nhánh

- **UC-CEO-03**: Xem Bảng đơn hàng nhập/xuất (Orders Board)
  - Xem tổng quan đơn nhập kho (tổng đơn, đang chờ, đã xác nhận, đã hủy)
  - Xem danh sách đơn nhập kho gần nhất
  - Xem tổng quan tồn kho (tổng tồn kho, có thể xuất, đang giữ chỗ, số SKU, giá trị ước tính)
  - Xem phân bổ trạng thái đơn

### 1.2. Quản lý sản phẩm (Read-only)
- **UC-CEO-04**: Xem danh sách sản phẩm
- **UC-CEO-05**: Xem chi tiết sản phẩm

---

## 2. Admin

### 2.1. Quản lý người dùng
- **UC-ADMIN-01**: Quản lý người dùng (User Management)
  - Xem danh sách tất cả người dùng trong hệ thống
  - Tìm kiếm người dùng theo username, email, tên
  - Lọc người dùng theo vai trò (Admin, CEO, Manager, Cashier, Warehouse, Supplier)
  - Xem thống kê tài khoản theo từng vai trò
  - Thêm người dùng mới
  - Chỉnh sửa thông tin người dùng
  - Vô hiệu hóa người dùng
  - Kích hoạt lại người dùng đã bị vô hiệu hóa
  - Xem thông tin chi tiết: ID, username, email, họ tên, vai trò, trạng thái, ngày tạo

- **UC-ADMIN-02**: Quản lý phân quyền người dùng (Admin Permissions)
  - Xem danh sách người dùng và vai trò
  - Chỉnh sửa phân quyền người dùng
  - Xóa người dùng

---

## 3. Warehouse (Nhân viên kho)

### 3.1. Quản lý sản phẩm
- **UC-WH-01**: Quản lý sản phẩm (Product Management)
  - Xem danh sách sản phẩm
  - Tìm kiếm sản phẩm theo tên, SKU
  - Lọc sản phẩm theo danh mục, nhà cung cấp
  - Thêm sản phẩm mới
  - Chỉnh sửa thông tin sản phẩm (tên, SKU, giá HQ, giá nhập, danh mục, nhà cung cấp, mô tả)
  - Kích hoạt/Vô hiệu hóa sản phẩm
  - Xem chi tiết sản phẩm
  - Xem lịch sử giá sản phẩm
  - Quản lý quy tắc giá (pricing rules): tạo, sửa, xóa

- **UC-WH-02**: Xem chi tiết sản phẩm (Product Detail)
  - Xem thông tin chi tiết sản phẩm
  - Xem tồn kho theo sản phẩm

- **UC-WH-03**: Quản lý giá sản phẩm (Product Price Management)
  - Xem danh sách sản phẩm và giá hiện tại
  - Tạo quy tắc giá mới (giá cố định hoặc phần trăm)
  - Chỉnh sửa quy tắc giá
  - Xóa quy tắc giá
  - Xem lịch sử thay đổi giá
  - Áp dụng giá hàng loạt cho nhiều sản phẩm

### 3.2. Quản lý tồn kho
- **UC-WH-04**: Quản lý tồn kho kho (Inventory Management)
  - Xem danh sách tồn kho trong kho
  - Tìm kiếm sản phẩm trong kho
  - Xem trạng thái tồn kho (đủ hàng, sắp hết, gần hết, hết hàng)
  - Cập nhật số lượng tồn kho
  - Xem chi tiết từng sản phẩm trong kho

- **UC-WH-05**: Xem danh sách tồn kho (Inventory List)
  - Xem danh sách tồn kho với đầy đủ thông tin
  - Lọc theo trạng thái
  - Tìm kiếm sản phẩm
  - Tạo đơn hàng hàng loạt cho cửa hàng

- **UC-WH-06**: Xem chi tiết tồn kho (Inventory Detail)
  - Xem chi tiết tồn kho của một sản phẩm
  - Xem lịch sử nhập/xuất

### 3.3. Quản lý nhà cung cấp
- **UC-WH-07**: Quản lý nhà cung cấp (Supplier Management)
  - Xem danh sách nhà cung cấp
  - Thêm nhà cung cấp mới
  - Chỉnh sửa thông tin nhà cung cấp (tên, liên hệ, email, địa chỉ)
  - Xóa nhà cung cấp
  - Gán tài khoản Supplier cho nhà cung cấp

### 3.4. Quản lý đơn hàng
- **UC-WH-08**: Quản lý đơn hàng nhập từ nhà cung cấp (Orders - Supplier Orders)
  - Xem danh sách đơn hàng nhập từ nhà cung cấp
  - Xem chi tiết đơn hàng
  - Tạo đơn hàng nhập mới
  - Cập nhật trạng thái đơn hàng
  - Duyệt đơn hàng

- **UC-WH-09**: Quản lý đơn hàng đến từ nhà cung cấp (Incoming Orders)
  - Xem danh sách đơn hàng đang chờ xử lý từ nhà cung cấp
  - Lọc theo trạng thái (chờ duyệt, đã duyệt, đã xuất kho, đã nhận, đã hủy)
  - Duyệt đơn hàng
  - Xuất kho đơn hàng
  - Cập nhật trạng thái đơn hàng

- **UC-WH-10**: Quản lý đơn hàng từ cửa hàng (Branch Orders)
  - Xem danh sách đơn hàng từ các cửa hàng
  - Lọc theo trạng thái
  - Tìm kiếm đơn hàng
  - Xem chi tiết đơn hàng
  - Cập nhật trạng thái đơn hàng

- **UC-WH-11**: Cập nhật đơn hàng từ cửa hàng (Order Update)
  - Xem chi tiết đơn hàng từ cửa hàng
  - Cập nhật thông tin đơn hàng
  - Cập nhật trạng thái đơn hàng

- **UC-WH-12**: Quản lý giao hàng (Order Shipment)
  - Xem thông tin đơn hàng cần giao
  - Cập nhật trạng thái giao hàng
  - Xác nhận đã giao hàng

### 3.5. Quản lý hóa đơn
- **UC-WH-13**: Quản lý hóa đơn nhập kho (Invoices Management)
  - Xem danh sách hóa đơn nhập kho
  - Lọc theo trạng thái
  - Duyệt hóa đơn
  - Từ chối hóa đơn

### 3.6. Lịch làm việc
- **UC-WH-14**: Xem lịch làm việc của tôi (My Schedule)
  - Xem lịch làm việc theo tuần
  - Xem ca làm việc được phân công

---

## 4. Store Manager (Quản lý cửa hàng)

### 4.1. Dashboard
- **UC-MGR-01**: Xem Dashboard cửa hàng (Manager Dashboard)
  - Xem KPI hôm nay: Doanh thu, đơn hàng, khách hàng, nhân viên
  - Xem biểu đồ doanh thu 7 ngày gần nhất
  - Xem top sản phẩm bán chạy
  - Xem lịch làm việc hôm nay
  - Xem thống kê nhân viên

### 4.2. Quản lý tồn kho cửa hàng
- **UC-MGR-02**: Quản lý tồn kho cửa hàng (Store Inventory Management)
  - Xem danh sách tồn kho của cửa hàng
  - Tìm kiếm sản phẩm trong kho
  - Xem thông tin: SKU, tên hàng, danh mục, giá nhập/thùng, giá lẻ/đơn vị, tồn kho, tồn tối thiểu, trạng thái
  - Tạo đơn hàng nhập từ kho chính
  - Xuất file Excel danh sách tồn kho
  - Chọn nhiều sản phẩm để tạo đơn hàng hàng loạt

### 4.3. Quản lý đơn hàng
- **UC-MGR-03**: Quản lý đơn hàng mua (Purchase Orders)
  - Xem danh sách đơn hàng đã tạo
  - Tạo đơn hàng mua mới từ kho chính
  - Chỉnh sửa đơn hàng (trước khi được duyệt)
  - Xem chi tiết đơn hàng
  - Lọc đơn hàng theo trạng thái (đang chờ duyệt, đã duyệt, đang giao, đã nhận, đã hủy, từ chối)
  - Xác nhận đã nhận hàng
  - Hủy đơn hàng

### 4.4. Quản lý nhân viên
- **UC-MGR-04**: Quản lý nhân viên (Staff Management)
  - Xem danh sách nhân viên trong cửa hàng
  - Thêm nhân viên mới
  - Chỉnh sửa thông tin nhân viên (email, tên, số điện thoại, địa chỉ, vai trò)
  - Xóa nhân viên
  - Tìm kiếm nhân viên
  - Xem thông tin chi tiết nhân viên

### 4.5. Quản lý lịch làm việc
- **UC-MGR-05**: Quản lý lịch làm việc (Schedule Management)
  - Xem lịch làm việc theo tuần
  - Tạo lịch làm việc mới cho nhân viên
  - Chỉnh sửa lịch làm việc
  - Xóa lịch làm việc
  - Xem danh sách nhân viên có sẵn
  - Xem các mẫu ca làm việc (shift templates)
  - Điểm danh nhân viên
  - Xem lịch sử thay đổi ca

### 4.6. Quản lý ca làm việc
- **UC-MGR-06**: Xem báo cáo ca làm việc (Shift Reports)
  - Xem báo cáo ca làm việc của nhân viên
  - Lọc theo nhân viên
  - Lọc theo khoảng thời gian (tuần/tháng)
  - Xem KPI: Tổng doanh thu, tổng đơn hàng, tiền mặt, chuyển khoản
  - Xem chi tiết từng ca làm việc
  - Xem thống kê theo nhân viên

- **UC-MGR-07**: Quản lý yêu cầu đổi ca (Shift Change Request Management)
  - Xem danh sách yêu cầu đổi ca từ nhân viên
  - Lọc theo trạng thái (đang chờ, đã duyệt, đã từ chối, đã hủy)
  - Xem chi tiết yêu cầu đổi ca
  - Duyệt yêu cầu đổi ca
  - Từ chối yêu cầu đổi ca
  - Xem thông tin nhân viên liên quan

### 4.7. Quản lý voucher
- **UC-MGR-08**: Quản lý voucher (Voucher Management)
  - Xem danh sách voucher template
  - Tạo voucher template mới
  - Chỉnh sửa voucher template
  - Xóa voucher template
  - Gán voucher cho khách hàng
  - Xem danh sách khách hàng
  - Tìm kiếm khách hàng
  - Xem voucher khả dụng cho khách hàng
  - Quản lý thông tin voucher: mã prefix, tên, loại giảm giá, giá trị giảm, số tiền mua tối thiểu, số tiền giảm tối đa, điểm loyalty yêu cầu, số ngày hiệu lực

### 4.8. Lịch sử thanh toán
- **UC-MGR-09**: Xem lịch sử thanh toán (Payment History)
  - Xem lịch sử giao dịch thanh toán của cửa hàng
  - Lọc theo khoảng thời gian
  - Xem chi tiết từng giao dịch
  - Tìm kiếm giao dịch

---

## 5. Cashier (Thu ngân)

### 5.1. Bán hàng
- **UC-CASH-01**: Sử dụng hệ thống POS (Point of Sale)
  - Tìm kiếm sản phẩm để bán
  - Quét mã QR sản phẩm
  - Thêm sản phẩm vào giỏ hàng
  - Chỉnh sửa số lượng sản phẩm trong giỏ
  - Xóa sản phẩm khỏi giỏ
  - Tìm kiếm khách hàng theo số điện thoại
  - Tạo khách hàng mới
  - Chọn voucher cho khách hàng
  - Xem voucher khả dụng của khách hàng
  - Tính toán tổng tiền (có áp dụng voucher)
  - Thanh toán bằng tiền mặt
  - Thanh toán bằng chuyển khoản (QR code)
  - In hóa đơn
  - Xử lý trả lại tiền thừa
  - Xem lịch sử giao dịch trong ca

### 5.2. Quản lý ca làm việc
- **UC-CASH-02**: Check-in ca làm việc
  - Xem lịch làm việc hôm nay
  - Check-in ca làm việc
  - Nhập số tiền đầu ca (opening cash)
  - Xem trạng thái điểm danh

- **UC-CASH-03**: Check-out ca làm việc
  - Check-out ca làm việc
  - Nhập số tiền cuối ca (closing cash)
  - Xem tổng kết ca: tổng doanh thu, tiền mặt, chuyển khoản
  - Xác nhận kết thúc ca

- **UC-CASH-04**: Xem báo cáo ca làm việc của tôi (My Shift Reports)
  - Xem danh sách các ca làm việc đã làm
  - Xem chi tiết từng ca: doanh thu, số đơn hàng, tiền mặt, chuyển khoản
  - Lọc theo khoảng thời gian

### 5.3. Yêu cầu đổi ca
- **UC-CASH-05**: Tạo yêu cầu đổi ca (Shift Change Request)
  - Xem lịch làm việc của tôi
  - Tạo yêu cầu đổi ca với nhân viên khác
  - Xem trạng thái yêu cầu đổi ca (đang chờ, đã duyệt, đã từ chối)
  - Hủy yêu cầu đổi ca

### 5.4. Lịch làm việc
- **UC-CASH-06**: Xem lịch làm việc của tôi (My Schedule)
  - Xem lịch làm việc theo tuần
  - Xem ca làm việc được phân công
  - Xem thông tin chi tiết ca làm việc

### 5.5. Lịch sử thanh toán
- **UC-CASH-07**: Xem lịch sử thanh toán (Payment History)
  - Xem lịch sử giao dịch đã xử lý
  - Lọc theo khoảng thời gian
  - Xem chi tiết từng giao dịch
  - Tìm kiếm giao dịch

### 5.6. Thông tin cá nhân
- **UC-CASH-08**: Xem và chỉnh sửa thông tin cá nhân (Profile)
  - Xem thông tin tài khoản
  - Chỉnh sửa thông tin cá nhân

---

## TÓM TẮT SỐ LƯỢNG USE CASE

| Actor | Số lượng Use Case |
|-------|-------------------|
| CEO | 5 |
| Admin | 2 |
| Warehouse | 14 |
| Store Manager | 9 |
| Cashier | 8 |
| **TỔNG CỘNG** | **38** |

---

## GHI CHÚ

- Một số use case có thể được chia nhỏ hơn tùy theo yêu cầu chi tiết
- Các use case liên quan đến authentication (đăng nhập, đăng xuất) được áp dụng cho tất cả các actor
- Một số chức năng có thể được chia sẻ giữa các actor (ví dụ: CEO và Warehouse đều có thể xem sản phẩm)

