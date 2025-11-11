# Hướng dẫn tích hợp thanh toán PayOS

## Tổng quan

Hệ thống POS đã được tích hợp với PayOS để hỗ trợ hai phương thức thanh toán:
1. **Tiền mặt (Cash)**: Thanh toán trực tiếp, tự động lưu vào lịch sử bán hàng
2. **QR Banking**: Thanh toán qua QR code với PayOS

## Cài đặt

### 1. Cài đặt dependencies

```bash
cd server
npm install @payos/node
```

### 2. Chạy migration database

Chạy file migration để thêm các trường cần thiết cho Payment và Transaction:

```sql
-- File: server/database/migrations/2025-01-11_add_payment_transaction_fields.sql
mysql -u root -p CCMS_DB < server/database/migrations/2025-01-11_add_payment_transaction_fields.sql
```

### 3. Cấu hình PayOS

1. Đăng ký tài khoản tại [https://payos.vn/](https://payos.vn/)
2. Tạo kênh thanh toán và lấy thông tin:
   - Client ID
   - API Key
   - Checksum Key

3. Tạo file `.env` trong thư mục `server` (copy từ `.env.example`):

```env
# PayOS Configuration
PAYOS_CLIENT_ID=your_payos_client_id
PAYOS_API_KEY=your_payos_api_key
PAYOS_CHECKSUM_KEY=your_payos_checksum_key

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### 4. Cấu hình Webhook (Optional)

Để nhận thông báo thanh toán từ PayOS, cấu hình webhook URL:

```
https://your-domain.com/api/v1/payment/webhook/payos
```

## Cấu trúc Database

### Bảng Payment

```sql
- payment_id: INT (Primary Key)
- method: ENUM('cash', 'card', 'mobile_payment', 'bank_transfer', 'loyalty_points')
- amount: DECIMAL(10, 2)
- status: ENUM('pending', 'completed', 'failed', 'refunded')
- paid_at: DATETIME
- payos_order_code: BIGINT (PayOS order code)
- payos_payment_link_id: VARCHAR(255) (PayOS payment link ID)
- payos_transaction_reference: VARCHAR(255) (PayOS transaction reference)
```

### Bảng Transaction

```sql
- transaction_id: INT (Primary Key)
- customer_id: INT (Foreign Key)
- payment_id: INT (Foreign Key)
- store_id: INT (Foreign Key)
- cashier_id: INT (Foreign Key to User)
- total_amount: DECIMAL(10, 2)
- subtotal: DECIMAL(10, 2)
- tax_amount: DECIMAL(10, 2)
- discount_amount: DECIMAL(10, 2)
- voucher_code: VARCHAR(50)
- status: ENUM('pending', 'completed', 'cancelled', 'refunded')
```

### Bảng TransactionItem

```sql
- transaction_item_id: INT (Primary Key)
- transaction_id: INT (Foreign Key)
- product_id: INT (Foreign Key)
- quantity: INT
- unit_price: DECIMAL(10, 2)
- subtotal: DECIMAL(10, 2)
```

## API Endpoints

### 1. Thanh toán tiền mặt

**POST** `/api/v1/payment/cash`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "customer_id": 1,
  "cart_items": [
    {
      "product_id": 1,
      "product_name": "iPhone 15 Pro",
      "quantity": 1,
      "unit_price": 999.99
    }
  ],
  "subtotal": 999.99,
  "tax_amount": 99.99,
  "discount_amount": 50.00,
  "voucher_code": "DISCOUNT50",
  "total_amount": 1049.98
}
```

**Response:**
```json
{
  "err": 0,
  "msg": "Payment completed successfully",
  "data": {
    "transaction_id": 123,
    "payment_id": 456,
    "status": "completed"
  }
}
```

### 2. Tạo thanh toán QR

**POST** `/api/v1/payment/qr`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "customer_id": 1,
  "cart_items": [
    {
      "product_id": 1,
      "product_name": "iPhone 15 Pro",
      "quantity": 1,
      "unit_price": 999.99
    }
  ],
  "subtotal": 999.99,
  "tax_amount": 99.99,
  "discount_amount": 50.00,
  "voucher_code": "DISCOUNT50",
  "total_amount": 1049.98,
  "customer_name": "Nguyen Van A",
  "customer_phone": "0901234567"
}
```

**Response:**
```json
{
  "err": 0,
  "msg": "Payment link created successfully",
  "data": {
    "transaction_id": 123,
    "payment_id": 456,
    "order_code": 1704067200000,
    "checkout_url": "https://pay.payos.vn/...",
    "qr_code": "data:image/png;base64,...",
    "payment_link_id": "abc123..."
  }
}
```

### 3. Kiểm tra trạng thái thanh toán

**GET** `/api/v1/payment/status/:orderCode`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "err": 0,
  "msg": "Payment status retrieved successfully",
  "data": {
    "id": "abc123...",
    "orderCode": 1704067200000,
    "amount": 1049.98,
    "status": "PAID",
    "transactions": [...]
  }
}
```

### 4. Lấy chi tiết giao dịch

**GET** `/api/v1/payment/transaction/:transactionId`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "err": 0,
  "msg": "Transaction retrieved successfully",
  "data": {
    "transaction_id": 123,
    "customer": {...},
    "payment": {...},
    "items": [...],
    "total_amount": 1049.98,
    "status": "completed"
  }
}
```

### 5. Webhook PayOS (Internal)

**POST** `/api/v1/payment/webhook/payos`

Endpoint này được PayOS gọi tự động khi thanh toán thành công.

## Flow thanh toán

### Flow thanh toán tiền mặt:

1. Cashier chọn sản phẩm vào giỏ hàng
2. Áp dụng voucher (nếu có)
3. Chọn phương thức "Tiền mặt"
4. Nhấn "Thanh toán"
5. Hệ thống:
   - Tạo Payment record (status: completed)
   - Tạo Transaction record (status: completed)
   - Tạo TransactionItem records
   - Cập nhật inventory (trừ stock)
   - Đánh dấu voucher đã sử dụng
   - Cập nhật loyalty points
6. Hiển thị thông báo thành công

### Flow thanh toán QR Banking:

1. Cashier chọn sản phẩm vào giỏ hàng
2. Áp dụng voucher (nếu có)
3. Chọn phương thức "QR Banking"
4. Nhấn "Thanh toán"
5. Hệ thống:
   - Tạo Payment record (status: pending)
   - Tạo Transaction record (status: pending)
   - Tạo TransactionItem records
   - Gọi PayOS API để tạo payment link
   - Trả về QR code
6. Hiển thị modal với QR code
7. Khách hàng scan QR và thanh toán
8. Hệ thống tự động kiểm tra trạng thái mỗi 3 giây
9. Khi thanh toán thành công:
   - Cập nhật Payment (status: completed)
   - Cập nhật Transaction (status: completed)
   - Cập nhật inventory (trừ stock)
   - Đánh dấu voucher đã sử dụng
   - Cập nhật loyalty points
10. Hiển thị thông báo thành công với option in hóa đơn

## Components Frontend

### PaymentModal Component

Component hiển thị QR code và xử lý thanh toán QR Banking.

**Props:**
- `show`: Boolean - Hiển thị/ẩn modal
- `onHide`: Function - Callback khi đóng modal
- `paymentData`: Object - Dữ liệu thanh toán (qr_code, order_code, etc.)
- `onPaymentSuccess`: Function - Callback khi thanh toán thành công
- `onPrintInvoice`: Function - Callback khi nhấn in hóa đơn

**Features:**
- Hiển thị QR code
- Tự động kiểm tra trạng thái thanh toán mỗi 3 giây
- Hiển thị thông tin khách hàng và số tiền
- Nút "In hóa đơn" và "Đóng" sau khi thanh toán thành công

## Testing

### Test thanh toán tiền mặt:

1. Đăng nhập với tài khoản Cashier
2. Thêm sản phẩm vào giỏ hàng
3. Chọn "Tiền mặt"
4. Nhấn "Thanh toán"
5. Kiểm tra:
   - Transaction được tạo trong database
   - Inventory được cập nhật
   - Voucher được đánh dấu đã sử dụng (nếu có)

### Test thanh toán QR:

1. Đăng nhập với tài khoản Cashier
2. Thêm sản phẩm vào giỏ hàng
3. Chọn "QR Banking"
4. Nhấn "Thanh toán"
5. Kiểm tra:
   - Modal hiển thị QR code
   - QR code có thể scan được
   - Sau khi thanh toán, modal hiển thị thành công
   - Transaction được cập nhật trong database

## Troubleshooting

### Lỗi "PayOS credentials not configured"

- Kiểm tra file `.env` có đầy đủ thông tin PayOS
- Restart server sau khi cập nhật `.env`

### QR code không hiển thị

- Kiểm tra PayOS credentials
- Kiểm tra network request trong browser console
- Kiểm tra server logs

### Thanh toán không tự động cập nhật

- Kiểm tra webhook URL đã được cấu hình đúng
- Kiểm tra server logs để xem webhook có được gọi không
- Kiểm tra firewall/network có block webhook không

## Tính năng tương lai

- [ ] In hóa đơn PDF
- [ ] Gửi hóa đơn qua email
- [ ] Hoàn tiền (refund)
- [ ] Báo cáo doanh thu theo phương thức thanh toán
- [ ] Tích hợp thêm payment gateway khác (VNPay, Momo, etc.)

