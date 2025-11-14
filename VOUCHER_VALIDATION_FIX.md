# Sửa Lỗi Voucher - Tổng Tiền Không Bao Giờ Âm

## 🎯 Yêu Cầu

Khi chọn voucher giảm số tiền tổng cộng phải trả nhỏ hơn 0, thì sẽ để số tiền phải trả là 0 thay vì số âm.

## ✅ Các Sửa Chữa

### 1. Frontend - Tính Toán Tổng Tiền
**File**: `FE/src/pages/Cashier/POS.js` (dòng 155-160)

**Trước**:
```javascript
const vat = useMemo(() => subtotal * 0.1, [subtotal]);
const total = useMemo(() => subtotal + vat - voucherDiscount, [subtotal, vat, voucherDiscount]);
```

**Sau**:
```javascript
const vat = useMemo(() => subtotal * 0.1, [subtotal]);
const total = useMemo(() => {
    const calculatedTotal = subtotal + vat - voucherDiscount;
    // Ensure total is never negative
    return Math.max(0, calculatedTotal);
}, [subtotal, vat, voucherDiscount]);
```

**Kết quả**: Tổng tiền sẽ luôn >= 0

### 2. Backend - Cash Payment Validation
**File**: `server/src/services/payment.js` (dòng 37-49)

**Thêm validate**:
```javascript
// Ensure total_amount is never negative
if (total_amount < 0) {
    total_amount = 0;
}
```

### 3. Backend - QR Payment Validation
**File**: `server/src/services/payment.js` (dòng 212-223)

**Thêm validate tương tự** cho QR payment

### 4. Backend - Voucher Discount Validation
**File**: `server/src/services/customerVoucher.js` (dòng 118-141)

**Thêm validate**:
```javascript
// Ensure discount doesn't exceed purchase amount
if (discountAmount > purchaseAmount) {
    discountAmount = purchaseAmount;
}
```

**Kết quả**: Discount không bao giờ vượt quá số tiền mua hàng

## 🔄 Flow Xử Lý Voucher

```
1. Khách hàng chọn voucher
2. Frontend tính discount
3. Frontend tính total = subtotal + vat - discount
4. Nếu total < 0 → total = 0 ✓
5. Backend validate discount <= purchaseAmount
6. Backend validate total_amount >= 0
7. Lưu payment với total_amount >= 0
```

## 📊 Ví Dụ

**Trường hợp 1: Discount nhỏ hơn tổng tiền**
- Subtotal: 100,000đ
- VAT (10%): 10,000đ
- Discount: 50,000đ
- Total: 100,000 + 10,000 - 50,000 = **60,000đ** ✓

**Trường hợp 2: Discount lớn hơn tổng tiền**
- Subtotal: 100,000đ
- VAT (10%): 10,000đ
- Discount: 150,000đ
- Total: 100,000 + 10,000 - 150,000 = -40,000đ
- **Kết quả: 0đ** ✓ (không âm)

## 🧪 Test

1. **Tạo giao dịch với voucher discount lớn**
2. **Kiểm tra tổng tiền** - phải >= 0
3. **Thanh toán** - phải thành công
4. **Kiểm tra database** - total_amount >= 0

## 📋 Files Được Sửa

- ✅ `FE/src/pages/Cashier/POS.js`
- ✅ `server/src/services/payment.js`
- ✅ `server/src/services/customerVoucher.js`

## 🚀 Deployment

1. **Restart server** để load code mới
2. **Refresh frontend** để load code mới
3. **Test lại chức năng voucher**

