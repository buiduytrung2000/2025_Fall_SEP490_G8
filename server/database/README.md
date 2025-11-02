# CCMS Database Schema

## Tổng quan

Database schema này được thiết kế cho hệ thống quản lý cửa hàng (CCMS - Chain Customer Management System).

## Các thay đổi và cải tiến so với diagram gốc:

### ✅ Đã sửa/chỉnh:

1. **Chuyển đổi ObjectId sang MySQL:**
   - Tất cả `ObjectId` đã được chuyển thành `INT AUTO_INCREMENT` cho primary keys
   - Foreign keys sử dụng `INT`

2. **Many-to-Many Relationships:**
   - Đã tạo bảng trung gian `ProductPromotion` cho quan hệ Product ↔ Promotion
   - Đã tạo bảng trung gian `PricingRulePromotion` cho quan hệ PricingRule ↔ Promotion

3. **Bổ sung TransactionItem:**
   - Thêm bảng `TransactionItem` để theo dõi từng sản phẩm trong giao dịch bán hàng
   - Giúp báo cáo và thống kê chi tiết hơn

4. **Cải thiện Data Integrity:**
   - Sử dụng `ENUM` cho các trường status, role, tier, method để đảm bảo tính nhất quán dữ liệu
   - Thêm `UNIQUE` constraints cho các trường quan trọng (username, sku, email)

5. **Timestamps:**
   - Thêm `created_at` và `updated_at` cho tất cả các bảng để theo dõi thay đổi

6. **Indexes:**
   - Thêm indexes cho tất cả foreign keys
   - Thêm indexes cho các trường thường xuyên được query (status, dates, etc.)

7. **Quan hệ Payment-Customer:**
   - Loại bỏ quan hệ trực tiếp Payment → Customer (không cần thiết)
   - Quan hệ được quản lý thông qua Transaction

8. **Cải thiện Order:**
   - Thêm `store_id` vào Transaction để theo dõi giao dịch theo từng cửa hàng

9. **Quản lý Lịch Làm Việc (Schedule Management):**
   - **ShiftTemplate**: Định nghĩa các ca làm việc (Ca Sáng, Ca Tối, Ca Đêm...)
   - **Schedule**: Phân công nhân viên vào ca làm việc cụ thể theo ngày
   - **ShiftChangeRequest**: Yêu cầu đổi ca giữa nhân viên với các loại: swap (đổi), give_away (nhường), take_over (nhận)
   - Hỗ trợ trạng thái: draft (nháp), confirmed (đã xác nhận), cancelled (đã hủy)
   - Tracking đầy đủ: người tạo, người duyệt, lý do đổi ca

## Cấu trúc thư mục

```
server/database/
├── schema.sql          # Schema chính với CREATE TABLE statements
├── sample_data.sql     # Dữ liệu mẫu cho testing
├── common_queries.sql  # Các query thông dụng
└── README.md          # File hướng dẫn này
```

## Cách sử dụng

### 1. Tạo database và schema

```bash
# Chạy file schema.sql để tạo tất cả các bảng
mysql -u root -p < server/database/schema.sql
```

Hoặc trong MySQL client:
```sql
source server/database/schema.sql;
```

### 2. Import dữ liệu mẫu (optional)

```bash
mysql -u root -p CCMS_DB < server/database/sample_data.sql
```

### 3. Sử dụng các query thông dụng

Mở file `common_queries.sql` và chạy các query cần thiết trong MySQL client.

**Queries cho Quản lý Lịch Làm Việc:**
- Query 20: Lấy lịch làm việc theo tuần cho cửa hàng
- Query 21: Lấy lịch làm việc của một nhân viên cụ thể
- Query 22: Lấy lịch làm việc theo định dạng calendar (theo tuần)
- Query 23: Lấy các yêu cầu đổi ca đang chờ duyệt
- Query 24: Lấy lịch sử yêu cầu đổi ca của một nhân viên
- Query 25: Tìm các ca làm việc còn trống (chưa phân công)
- Query 26: Thống kê lịch làm việc của nhân viên
- Query 27: Tìm các xung đột lịch làm việc (trùng ca)
- Query 28: Lấy lịch làm việc sắp tới trong 7 ngày

## Danh sách các bảng

1. **Store** - Thông tin cửa hàng
2. **Category** - Danh mục sản phẩm (hierarchical)
3. **Supplier** - Nhà cung cấp
4. **User** - Nhân viên/Người dùng hệ thống
5. **Product** - Sản phẩm
6. **Inventory** - Tồn kho theo cửa hàng
7. **Promotion** - Chương trình khuyến mãi
8. **PricingRule** - Quy tắc định giá
9. **Order** - Đơn hàng mua từ nhà cung cấp
10. **OrderItem** - Chi tiết đơn hàng mua
11. **Customer** - Khách hàng
12. **Payment** - Thanh toán
13. **Transaction** - Giao dịch bán hàng
14. **TransactionItem** - Chi tiết giao dịch bán hàng
15. **ProductPromotion** - Bảng trung gian Product ↔ Promotion
16. **PricingRulePromotion** - Bảng trung gian PricingRule ↔ Promotion
17. **ShiftTemplate** - Template định nghĩa các ca làm việc
18. **Schedule** - Phân công lịch làm việc cho nhân viên
19. **ShiftChangeRequest** - Yêu cầu đổi ca giữa nhân viên

## Quan hệ giữa các bảng

### Quan hệ 1-Nhiều:
- Store → User
- Store → Order
- Store → Inventory
- Store → PricingRule
- Store → Transaction
- Category → Product (và self-referencing)
- Supplier → Product
- Supplier → Order
- User → Order (created_by)
- Product → Inventory
- Product → OrderItem
- Product → TransactionItem
- Product → PricingRule
- Order → OrderItem
- Order → Transaction
- Customer → Transaction
- Payment → Transaction
- Promotion → ProductPromotion
- Promotion → PricingRulePromotion
- Store → Schedule
- Store → ShiftChangeRequest
- User → Schedule (user_id, created_by)
- ShiftTemplate → Schedule
- Schedule → ShiftChangeRequest (from_schedule_id, to_schedule_id)
- User → ShiftChangeRequest (from_user_id, to_user_id, reviewed_by)

### Quan hệ Nhiều-Nhiều:
- Product ↔ Promotion (qua ProductPromotion)
- PricingRule ↔ Promotion (qua PricingRulePromotion)

## Lưu ý quan trọng

1. **Password hashing**: 
   - Các password trong sample_data.sql chỉ là ví dụ
   - Trong production, cần sử dụng bcrypt hoặc argon2 để hash passwords

2. **Decimal precision**:
   - Tất cả giá tiền sử dụng `DECIMAL(10, 2)` (10 digits, 2 decimal places)
   - Có thể điều chỉnh nếu cần độ chính xác cao hơn

3. **Dates**:
   - Sử dụng `DATETIME` cho start_date, end_date
   - Sử dụng `TIMESTAMP` cho created_at, updated_at

4. **Character Set**:
   - Sử dụng `utf8mb4` để hỗ trợ emoji và các ký tự đặc biệt

5. **Engine**:
   - Tất cả bảng sử dụng `InnoDB` để hỗ trợ foreign keys và transactions

## Migration từ diagram gốc

Nếu bạn đang migrate từ diagram MongoDB/ObjectId sang MySQL:
- `ObjectId` → `INT AUTO_INCREMENT`
- Embedding documents → Separate tables với foreign keys
- Many-to-many → Junction tables
- String status → ENUM types

## Hỗ trợ

Nếu có vấn đề hoặc câu hỏi về schema, vui lòng kiểm tra:
- Foreign key constraints
- Indexes đã được tạo đúng chưa
- ENUM values có phù hợp với business logic không
- Data types có đủ lớn cho dữ liệu thực tế không

