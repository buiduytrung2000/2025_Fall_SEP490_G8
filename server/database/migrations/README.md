# Database Migrations

## Hướng dẫn chạy migration

### Migration: Tạo bảng CustomerVoucher và VoucherTemplate

File: `2025-01-10_create_customer_voucher_table.sql`

**Cách 1: Sử dụng MySQL Workbench**
1. Mở MySQL Workbench
2. Kết nối với database CCMS_DB
3. Mở file `2025-01-10_create_customer_voucher_table.sql`
4. Chạy toàn bộ script

**Cách 2: Sử dụng MySQL Command Line**
```bash
mysql -u root -p CCMS_DB < server/database/migrations/2025-01-10_create_customer_voucher_table.sql
```

**Cách 3: Sử dụng PowerShell (Windows)**
```powershell
Get-Content server/database/migrations/2025-01-10_create_customer_voucher_table.sql | mysql -u root -p CCMS_DB
```

## Tính năng Loyalty Points và Voucher

### Quy tắc tích điểm
- **100đ = 1 điểm**
- Điểm được cộng tự động sau mỗi lần thanh toán thành công
- Điểm tích lũy không có hạn sử dụng

### Phân cấp Voucher theo điểm

#### Mức 0 điểm (Khách hàng mới)
- **WELCOME10**: Giảm 10% cho đơn từ 100,000đ (tối đa 50,000đ)
- **FREESHIP**: Miễn phí vận chuyển 30,000đ

#### Mức 100 điểm
- **SAVE20K**: Giảm 20,000đ cho đơn từ 200,000đ
- **DISCOUNT5**: Giảm 5% cho mọi đơn hàng (tối đa 30,000đ)

#### Mức 200 điểm
- **SAVE50K**: Giảm 50,000đ cho đơn từ 500,000đ
- **DISCOUNT10**: Giảm 10% cho đơn từ 300,000đ (tối đa 80,000đ)
- **COMBO15**: Giảm 15% cho đơn từ 400,000đ (tối đa 100,000đ)

#### Mức 500 điểm
- **SAVE100K**: Giảm 100,000đ cho đơn từ 1,000,000đ
- **VIP20**: Giảm 20% cho đơn từ 500,000đ (tối đa 150,000đ)
- **MEGA25**: Giảm 25% cho đơn từ 800,000đ (tối đa 200,000đ)

#### Mức 1000 điểm (Platinum)
- **SAVE200K**: Giảm 200,000đ cho đơn từ 2,000,000đ
- **PLATINUM30**: Giảm 30% cho đơn từ 1,000,000đ (tối đa 300,000đ)
- **ULTRA35**: Giảm 35% cho đơn từ 1,500,000đ (tối đa 500,000đ)

### Cách hoạt động

1. **Khi khách hàng thanh toán:**
   - Hệ thống tự động tính điểm dựa trên tổng tiền (10,000đ = 10 điểm)
   - Cộng điểm vào tài khoản khách hàng
   - Tự động tạo voucher mới nếu khách hàng đạt mức điểm mới

2. **Khi chọn khách hàng trong POS:**
   - Hiển thị tất cả voucher mà khách hàng có thể sử dụng
   - Chỉ hiển thị voucher có `required_loyalty_points` <= điểm hiện tại của khách hàng
   - Voucher được sắp xếp theo mức điểm yêu cầu (cao xuống thấp)

3. **Khi áp dụng voucher:**
   - Kiểm tra giỏ hàng không trống
   - Kiểm tra đơn hàng đạt giá trị tối thiểu
   - Tính toán giảm giá dựa trên loại voucher (percentage/fixed_amount)
   - Áp dụng giới hạn giảm giá tối đa (nếu có)

## Cấu trúc Database

### Bảng CustomerVoucher
Lưu trữ voucher của từng khách hàng cụ thể.

**Các trường quan trọng:**
- `customer_id`: ID khách hàng (NULL = voucher công khai)
- `voucher_code`: Mã voucher duy nhất
- `required_loyalty_points`: Số điểm tối thiểu để sử dụng voucher
- `status`: available/used/expired

### Bảng VoucherTemplate
Lưu trữ mẫu voucher để tự động tạo voucher cho khách hàng.

**Các trường quan trọng:**
- `voucher_code_prefix`: Tiền tố mã voucher (VD: WELCOME10, SAVE50K)
- `required_loyalty_points`: Số điểm tối thiểu để nhận voucher
- `validity_days`: Số ngày voucher có hiệu lực
- `is_active`: Bật/tắt mẫu voucher

## API Endpoints

### Customer Loyalty Points
- **PUT** `/api/v1/customer/:customer_id/loyalty-points`
  - Body: `{ purchase_amount: number }`
  - Tự động tính điểm và tạo voucher mới

### Voucher
- **GET** `/api/v1/voucher/customer/:customer_id/available`
  - Lấy danh sách voucher khả dụng (đã lọc theo loyalty_points)
  
- **POST** `/api/v1/voucher/validate`
  - Body: `{ voucher_code, customer_id, purchase_amount }`
  - Validate voucher trước khi áp dụng

## Testing

### Test tích điểm
1. Chọn khách hàng có 0 điểm
2. Thêm sản phẩm vào giỏ hàng (VD: 25,000đ)
3. Thanh toán
4. Kiểm tra: Khách hàng được cộng 250 điểm (25,000 / 100)
5. Kiểm tra: Xuất hiện voucher mới cho mức 100 điểm và 200 điểm

### Test voucher theo điểm
1. Khách hàng có 150 điểm
2. Chọn khách hàng trong POS
3. Kiểm tra: Chỉ hiển thị voucher mức 0 và 100 điểm
4. Không hiển thị voucher mức 200, 500, 1000 điểm

### Test áp dụng voucher
1. Chọn khách hàng
2. Thêm sản phẩm vào giỏ (VD: 300,000đ)
3. Chọn voucher DISCOUNT10 (giảm 10%, đơn tối thiểu 300,000đ)
4. Kiểm tra: Giảm giá 30,000đ
5. Tổng tiền = 300,000 + VAT(30,000) - 30,000 = 300,000đ

