# Hướng dẫn Tạo Voucher cho Khách hàng Đã có Điểm

## 🔍 Vấn đề

Khách hàng đã có điểm tích lũy (ví dụ: 500 điểm) nhưng chưa có voucher nào trong hệ thống.

**Nguyên nhân:** Hệ thống chỉ tự động tạo voucher khi khách hàng thanh toán và gọi API `updateLoyaltyPoints`. Nếu khách hàng đã có điểm từ trước (do import data hoặc cập nhật thủ công), voucher sẽ không được tạo tự động.

## ✅ Giải pháp

### Giải pháp 1: Tự động tạo voucher khi chọn khách hàng (ĐÃ TRIỂN KHAI)

Hệ thống đã được cập nhật để tự động tạo voucher khi:
1. Chọn khách hàng trong POS
2. Hệ thống phát hiện khách hàng chưa có voucher nào
3. Tự động gọi API tạo voucher dựa trên điểm hiện tại
4. Hiển thị voucher mới cho khách hàng

**Cách sử dụng:**
- Chỉ cần chọn khách hàng trong POS như bình thường
- Nếu khách hàng chưa có voucher, hệ thống sẽ tự động tạo
- Thông báo "Đang tạo voucher cho khách hàng..." sẽ hiển thị
- Voucher sẽ xuất hiện sau vài giây

### Giải pháp 2: Tạo voucher thủ công qua SQL

Nếu bạn muốn tạo voucher cho nhiều khách hàng cùng lúc, sử dụng script SQL:

**File:** `server/database/migrations/create_vouchers_for_existing_customers.sql`

**Cách chạy:**

1. Mở MySQL Workbench
2. Kết nối với database CCMS_DB
3. Mở file SQL trên
4. **Thay đổi số điện thoại** trong dòng:
   ```sql
   SET @customer_id = (SELECT customer_id FROM Customer WHERE phone = '0901234567' LIMIT 1);
   ```
5. Chạy toàn bộ script

**Script sẽ:**
- Tìm customer_id từ số điện thoại
- Lấy số điểm tích lũy hiện tại
- Tạo tất cả voucher mà khách hàng đủ điểm
- Hiển thị danh sách voucher đã tạo

### Giải pháp 3: Gọi API thủ công

Sử dụng Postman hoặc curl để gọi API:

```http
POST /api/v1/voucher/customer/:customer_id/generate
Authorization: Bearer {your_token}
```

**Ví dụ với curl:**
```bash
curl -X POST http://localhost:5000/api/v1/voucher/customer/1/generate \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "err": 0,
  "msg": "Đã tạo voucher cho khách hàng John Customer (500 điểm). Đã tạo 7 voucher mới",
  "data": [
    {
      "customer_voucher_id": 1,
      "voucher_code": "WELCOME10-1-1736512345678",
      "voucher_name": "Giảm 10% cho đơn hàng đầu tiên",
      ...
    }
  ]
}
```

## 📊 Voucher sẽ được tạo

Với khách hàng có **500 điểm**, các voucher sau sẽ được tạo:

### Mức 0 điểm
- ✅ WELCOME10 - Giảm 10% (tối đa 50,000đ)
- ✅ FREESHIP - Miễn phí vận chuyển 30,000đ

### Mức 100 điểm
- ✅ SAVE20K - Giảm 20,000đ
- ✅ DISCOUNT5 - Giảm 5% (tối đa 30,000đ)

### Mức 200 điểm
- ✅ SAVE50K - Giảm 50,000đ
- ✅ DISCOUNT10 - Giảm 10% (tối đa 80,000đ)
- ✅ COMBO15 - Giảm 15% (tối đa 100,000đ)

### Mức 500 điểm
- ✅ SAVE100K - Giảm 100,000đ
- ✅ VIP20 - Giảm 20% (tối đa 150,000đ)
- ✅ MEGA25 - Giảm 25% (tối đa 200,000đ)

**Tổng cộng: 10 voucher**

## 🔧 Thay đổi Code

### Backend

**1. Service mới:** `server/src/services/customerVoucher.js`
```javascript
export const generateVouchersForExistingCustomer = (customerId) => {
    // Lấy điểm hiện tại của khách hàng
    // Tạo tất cả voucher mà khách hàng đủ điểm
    // Trả về danh sách voucher đã tạo
}
```

**2. Controller mới:** `server/src/controllers/customerVoucher.js`
```javascript
export const generateVouchersForCustomer = async (req, res) => {
    const { customer_id } = req.params
    // Gọi service generateVouchersForExistingCustomer
}
```

**3. Route mới:** `server/src/routes/customerVoucher.js`
```javascript
router.post('/customer/:customer_id/generate', voucherController.generateVouchersForCustomer)
```

### Frontend

**1. API function:** `FE/src/api/voucherApi.js`
```javascript
export async function generateVouchersForCustomer(customerId) {
    const res = await fetch(`${API_BASE}/voucher/customer/${customerId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
    });
    return res.json();
}
```

**2. Auto-generate logic:** `FE/src/pages/Cashier/POS.js`
```javascript
const loadCustomerVouchers = async (customerId) => {
    // Load vouchers
    // Nếu không có voucher nào, tự động tạo
    if (res.data.length === 0) {
        await generateVouchersForCustomer(customerId);
        // Reload vouchers
    }
}
```

## 🧪 Testing

### Test Case 1: Khách hàng có 500 điểm, chưa có voucher

**Bước 1:** Kiểm tra database
```sql
SELECT customer_id, name, loyalty_point FROM Customer WHERE phone = '0901234567';
-- Kết quả: customer_id=1, loyalty_point=500

SELECT COUNT(*) FROM CustomerVoucher WHERE customer_id = 1 AND status = 'available';
-- Kết quả: 0 (chưa có voucher)
```

**Bước 2:** Chọn khách hàng trong POS
- Nhập số điện thoại: 0901234567
- Click chọn khách hàng

**Bước 3:** Kiểm tra kết quả
- Thông báo: "Đang tạo voucher cho khách hàng..."
- Thông báo: "Đã tạo voucher cho khách hàng John Customer (500 điểm). Đã tạo 10 voucher mới"
- Danh sách voucher hiển thị đầy đủ 10 voucher

**Bước 4:** Verify database
```sql
SELECT COUNT(*) FROM CustomerVoucher WHERE customer_id = 1 AND status = 'available';
-- Kết quả: 10 (đã có voucher)
```

### Test Case 2: Khách hàng có 150 điểm

**Kết quả mong đợi:**
- Tạo 4 voucher (mức 0 và 100 điểm)
- Không tạo voucher mức 200, 500, 1000 điểm

### Test Case 3: Khách hàng đã có voucher

**Kết quả mong đợi:**
- Không tạo voucher trùng lặp
- Chỉ tạo voucher mà khách hàng chưa có

## 📝 Lưu ý

1. **Không tạo trùng:** Hệ thống kiểm tra voucher đã tồn tại trước khi tạo mới
2. **Chỉ tạo voucher đủ điểm:** Chỉ tạo voucher có `required_loyalty_points` <= điểm hiện tại
3. **Thời hạn voucher:** Mỗi voucher có thời hạn riêng (15-90 ngày)
4. **Status:** Tất cả voucher mới có status = 'available'

## 🚀 Restart Server

Sau khi cập nhật code, restart backend server:

```powershell
cd server
npm start
```

Restart frontend:
```powershell
cd FE
npm start
```

## 🎯 Kết luận

Với 3 giải pháp trên, bạn có thể:
1. ✅ Tự động tạo voucher khi chọn khách hàng (khuyến nghị)
2. ✅ Tạo voucher thủ công qua SQL (cho nhiều khách hàng)
3. ✅ Gọi API trực tiếp (cho testing/debugging)

Giải pháp 1 đã được tích hợp sẵn vào POS, không cần thao tác thêm!

