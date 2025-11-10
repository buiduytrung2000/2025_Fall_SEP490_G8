# Hướng dẫn Hệ thống Tích điểm và Voucher

## 📋 Tổng quan

Hệ thống tích điểm và voucher tự động cho phép:
- Khách hàng tích điểm khi mua hàng (100đ = 1 điểm)
- Tự động cấp voucher khi đạt mức điểm mới
- Áp dụng voucher khi thanh toán tại POS
- Quản lý voucher theo mức độ loyalty của khách hàng

## 🚀 Cài đặt

### Bước 1: Chạy Migration Database

Mở MySQL Workbench hoặc command line và chạy:

```sql
-- Kết nối với database CCMS_DB
USE CCMS_DB;

-- Chạy migration
source server/database/migrations/2025-01-10_create_customer_voucher_table.sql;
```

Hoặc sử dụng PowerShell:
```powershell
Get-Content server/database/migrations/2025-01-10_create_customer_voucher_table.sql | mysql -u root -p3322112003ht CCMS_DB
```

### Bước 2: Restart Backend Server

```powershell
cd server
npm start
```

### Bước 3: Restart Frontend

```powershell
cd FE
npm start
```

## 💎 Quy tắc Tích điểm

### Công thức tính điểm
```
Điểm tích lũy = Tổng tiền thanh toán / 100
```

**Ví dụ:**
- Thanh toán 10,000đ → Được 100 điểm
- Thanh toán 50,000đ → Được 500 điểm
- Thanh toán 250,000đ → Được 2,500 điểm
- Thanh toán 1,000,000đ → Được 10,000 điểm

### Tự động cấp Voucher

Khi khách hàng đạt mức điểm mới, hệ thống tự động tạo voucher tương ứng:

| Mức điểm | Voucher được cấp |
|----------|------------------|
| 0 điểm | WELCOME10, FREESHIP |
| 100 điểm | SAVE20K, DISCOUNT5 |
| 200 điểm | SAVE50K, DISCOUNT10, COMBO15 |
| 500 điểm | SAVE100K, VIP20, MEGA25 |
| 1000 điểm | SAVE200K, PLATINUM30, ULTRA35 |

## 🎫 Chi tiết Voucher theo mức

### Mức 0 điểm - Khách hàng mới
| Mã | Tên | Giảm giá | Đơn tối thiểu | Giảm tối đa | HSD |
|----|-----|----------|---------------|-------------|-----|
| WELCOME10 | Giảm 10% cho đơn hàng đầu tiên | 10% | 100,000đ | 50,000đ | 30 ngày |
| FREESHIP | Miễn phí vận chuyển | 30,000đ | 0đ | - | 15 ngày |

### Mức 100 điểm
| Mã | Tên | Giảm giá | Đơn tối thiểu | Giảm tối đa | HSD |
|----|-----|----------|---------------|-------------|-----|
| SAVE20K | Giảm 20.000đ | 20,000đ | 200,000đ | - | 30 ngày |
| DISCOUNT5 | Giảm 5% | 5% | 0đ | 30,000đ | 30 ngày |

### Mức 200 điểm
| Mã | Tên | Giảm giá | Đơn tối thiểu | Giảm tối đa | HSD |
|----|-----|----------|---------------|-------------|-----|
| SAVE50K | Giảm 50.000đ | 50,000đ | 500,000đ | - | 30 ngày |
| DISCOUNT10 | Giảm 10% | 10% | 300,000đ | 80,000đ | 30 ngày |
| COMBO15 | Giảm 15% | 15% | 400,000đ | 100,000đ | 45 ngày |

### Mức 500 điểm - VIP
| Mã | Tên | Giảm giá | Đơn tối thiểu | Giảm tối đa | HSD |
|----|-----|----------|---------------|-------------|-----|
| SAVE100K | Giảm 100.000đ | 100,000đ | 1,000,000đ | - | 30 ngày |
| VIP20 | Giảm 20% VIP | 20% | 500,000đ | 150,000đ | 60 ngày |
| MEGA25 | Giảm 25% | 25% | 800,000đ | 200,000đ | 60 ngày |

### Mức 1000 điểm - Platinum
| Mã | Tên | Giảm giá | Đơn tối thiểu | Giảm tối đa | HSD |
|----|-----|----------|---------------|-------------|-----|
| SAVE200K | Giảm 200.000đ | 200,000đ | 2,000,000đ | - | 60 ngày |
| PLATINUM30 | Giảm 30% Platinum | 30% | 1,000,000đ | 300,000đ | 90 ngày |
| ULTRA35 | Giảm 35% Ultra | 35% | 1,500,000đ | 500,000đ | 90 ngày |

## 🖥️ Sử dụng tại POS

### 1. Chọn khách hàng
- Nhập số điện thoại khách hàng
- Chọn từ danh sách kết quả
- Hệ thống tự động load voucher khả dụng

### 2. Xem voucher
- Voucher hiển thị ngay dưới thông tin khách hàng
- Chỉ hiển thị voucher mà khách hàng đủ điểm
- Badge màu vàng hiển thị số điểm yêu cầu

### 3. Áp dụng voucher
- Thêm sản phẩm vào giỏ hàng
- Click vào voucher muốn sử dụng
- Hệ thống tự động kiểm tra:
  - Giỏ hàng không trống
  - Đơn hàng đạt giá trị tối thiểu
  - Voucher còn hạn sử dụng
- Giảm giá hiển thị trong phần tổng tiền

### 4. Thanh toán
- Click nút "Thanh toán"
- Hệ thống tự động:
  - Tính điểm dựa trên tổng tiền
  - Cộng điểm vào tài khoản khách hàng
  - Tạo voucher mới nếu đạt mức điểm mới
  - Đánh dấu voucher đã sử dụng
- Thông báo số điểm được cộng

## 📊 Ví dụ thực tế

### Ví dụ 1: Khách hàng mới (0 điểm)

**Tình huống:**
- Khách hàng A mua lần đầu
- Tổng đơn hàng: 350,000đ

**Kết quả:**
1. Voucher khả dụng: WELCOME10, FREESHIP
2. Áp dụng WELCOME10 (giảm 10%, tối đa 50,000đ)
3. Giảm giá: 35,000đ
4. Thanh toán: 350,000 + VAT(35,000) - 35,000 = 350,000đ
5. Được cộng: 3,500 điểm (350,000 / 100)
6. Tự động nhận voucher mức 100, 200, 500, 1000 điểm

### Ví dụ 2: Khách hàng có 150 điểm

**Tình huống:**
- Khách hàng B có 150 điểm
- Tổng đơn hàng: 60,000đ

**Kết quả:**
1. Voucher khả dụng: Mức 0 và 100 điểm
2. Áp dụng DISCOUNT5 (giảm 5%, tối đa 30,000đ)
3. Giảm giá: 3,000đ (5% của 60,000đ)
4. Thanh toán: 60,000 + VAT(6,000) - 3,000 = 63,000đ
5. Được cộng: 600 điểm (60,000 / 100)
6. Tổng điểm mới: 750 điểm
7. Tự động nhận voucher mức 200 điểm và 500 điểm

### Ví dụ 3: Khách hàng VIP (550 điểm)

**Tình huống:**
- Khách hàng C có 550 điểm
- Tổng đơn hàng: 1,200,000đ

**Kết quả:**
1. Voucher khả dụng: Tất cả mức từ 0-500 điểm
2. Áp dụng VIP20 (giảm 20%, đơn tối thiểu 500,000đ, tối đa 150,000đ)
3. Giảm giá: 150,000đ (đã đạt max)
4. Thanh toán: 1,200,000 + VAT(120,000) - 150,000 = 1,170,000đ
5. Được cộng: 12,000 điểm (1,200,000 / 100)
6. Tổng điểm mới: 12,550 điểm
7. Tự động nhận voucher mức 1000 điểm (Platinum)

## 🔧 API Endpoints

### Cập nhật Loyalty Points
```http
PUT /api/v1/customer/:customer_id/loyalty-points
Content-Type: application/json
Authorization: Bearer {token}

{
  "purchase_amount": 500000
}
```

**Response:**
```json
{
  "err": 0,
  "msg": "Đã cộng 5000 điểm. Tổng điểm: 7500",
  "data": {
    "old_points": 2500,
    "points_added": 5000,
    "new_points": 7500
  }
}
```

### Lấy Voucher khả dụng
```http
GET /api/v1/voucher/customer/:customer_id/available
Authorization: Bearer {token}
```

**Response:**
```json
{
  "err": 0,
  "msg": "OK",
  "data": [
    {
      "customer_voucher_id": 1,
      "voucher_code": "SAVE50K-001",
      "voucher_name": "Giảm 50.000đ cho đơn từ 500.000đ",
      "discount_type": "fixed_amount",
      "discount_value": 50000,
      "min_purchase_amount": 500000,
      "required_loyalty_points": 200,
      "end_date": "2025-02-10T00:00:00.000Z"
    }
  ]
}
```

## 🧪 Testing

Chạy script test:
```sql
source server/database/migrations/test_loyalty_system.sql;
```

## 📝 Lưu ý

1. **Voucher tự động tạo:** Chỉ tạo voucher mới nếu khách hàng chưa có voucher loại đó
2. **Điểm không hết hạn:** Loyalty points không có thời hạn sử dụng
3. **Voucher có hạn:** Mỗi voucher có thời hạn riêng (15-90 ngày)
4. **Một voucher/đơn:** Mỗi đơn hàng chỉ áp dụng được 1 voucher
5. **Giảm giá tối đa:** Một số voucher có giới hạn giảm giá tối đa

## 🎯 Roadmap

- [ ] Thêm tier tự động (Bronze → Silver → Gold → Platinum)
- [ ] Voucher sinh nhật
- [ ] Voucher giới thiệu bạn bè
- [ ] Lịch sử sử dụng voucher
- [ ] Thống kê hiệu quả voucher

