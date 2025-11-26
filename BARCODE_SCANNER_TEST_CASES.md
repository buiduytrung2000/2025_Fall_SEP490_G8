# Barcode Scanner Feature - Test Cases & Documentation

## 📋 Overview

Tính năng quét mã vạch (barcode) cho POS CCMS cho phép quản lý hàng tồn hiệu quả, tính giá tự động, kiểm tra tồn kho, và xử lý thanh toán nhanh chóng.

**Thời gian phản hồi**: < 500ms từ lúc quét đến thêm vào giỏ
**Chuẩn mã hỗ trợ**: EAN-13, UPC-A/E, Code 128, SKU tùy chỉnh

---

## ⚙️ Configuration

### POS Config (trong POS.js)

```javascript
const [posConfig] = useState({
    allowOversell: false,           // Không cho phép bán vượt tồn (default: false)
    beepOnScan: true,               // Phát beep khi quét (default: true)
    enableCameraScan: false,        // Bật camera scan (default: false, tùy chọn)
    debounceDelay: 200,             // ms - debounce delay
    throttleInterval: 150,          // ms - throttle interval
    clearInputAfterScan: true,      // Xóa input sau khi quét (default: true)
    validateFormat: true            // Validate định dạng barcode (default: true)
})
```

### Cách thay đổi config

1. **Chặn oversell** (default):
   ```javascript
   allowOversell: false  // Nếu tồn kho < qty, show warning và không thêm
   ```

2. **Cho phép oversell**:
   ```javascript
   allowOversell: true   // Vẫn thêm nhưng show warning "Tồn kho không đủ"
   ```

3. **Tắt beep**:
   ```javascript
   beepOnScan: false
   ```

---

## 🧪 Test Cases

### Group 1: Barcode Format Validation

#### TC-1.1: Quét barcode EAN-13 hợp lệ
- **Input**: 4006381333931 (mã vạch thực)
- **Expected**: ✅ Tìm thấy sản phẩm, thêm vào giỏ
- **Status**: PASS/FAIL

#### TC-1.2: Quét barcode UPC-A hợp lệ
- **Input**: 123456789012
- **Expected**: ✅ Tìm thấy sản phẩm
- **Status**: PASS/FAIL

#### TC-1.3: Quét barcode quá ngắn
- **Input**: 123
- **Expected**: ❌ "Barcode quá ngắn (tối thiểu 6 ký tự)"
- **Status**: PASS/FAIL

#### TC-1.4: Quét barcode chứa ký tự không hợp lệ
- **Input**: 4006381@33393
- **Expected**: ❌ "Barcode chứa ký tự không hợp lệ"
- **Status**: PASS/FAIL

#### TC-1.5: Quét SKU tùy chỉnh
- **Input**: SPTEST-001
- **Expected**: ✅ Tìm thấy theo SKU (nếu không có barcode match)
- **Status**: PASS/FAIL

---

### Group 2: Product Matching & Pricing

#### TC-2.1: Quét barcode khớp ProductUnit
- **Input**: Barcode của ProductUnit (đơn vị hộp)
- **Expected**: 
  - ✅ Tìm thấy sản phẩm
  - Lấy đúng unit_id, unit_name (Hộp)
  - conversion_to_base = số đơn vị cơ sở trong 1 hộp
- **Status**: PASS/FAIL

#### TC-2.2: Quét barcode không có → fallback SKU
- **Input**: SKU của sản phẩm (không có ProductUnit barcode)
- **Expected**:
  - ✅ Tìm thấy theo SKU
  - matched_by = 'sku'
  - unit = base unit (đơn vị cơ sở)
- **Status**: PASS/FAIL

#### TC-2.3: Sản phẩm có pricing rule đang hiệu lực
- **Input**: Barcode của sản phẩm có rule active
- **Expected**:
  - ✅ Lấy current_price = áp dụng pricing rule
  - NOT equal hq_price nếu có rule
- **Status**: PASS/FAIL

#### TC-2.4: Sản phẩm không có pricing rule
- **Input**: Barcode của sản phẩm mới (no rule)
- **Expected**:
  - ✅ current_price = hq_price
- **Status**: PASS/FAIL

#### TC-2.5: Sản phẩm là_active = false
- **Input**: Barcode của sản phẩm bị vô hiệu hóa
- **Expected**:
  - ❌ "Sản phẩm đã bị vô hiệu hóa"
  - Không thêm vào giỏ
- **Status**: PASS/FAIL

---

### Group 3: Inventory Check

#### TC-3.1: Tồn kho đủ (allowOversell = false)
- **Input**: Barcode, available_quantity = 10
- **Scan 5 lần**:
- **Expected**:
  - ✅ Lần 1-5: Thêm vào giỏ, qty tăng từ 1→5
  - Không có warning
- **Status**: PASS/FAIL

#### TC-3.2: Tồn kho hết (allowOversell = false)
- **Input**: Barcode, available_quantity = 0
- **Expected**:
  - ❌ "Sản phẩm hết tồn kho"
  - Không thêm vào giỏ
- **Status**: PASS/FAIL

#### TC-3.3: Tồn kho hết nhưng allowOversell = true
- **Input**: Barcode, available_quantity = 0, allowOversell = true
- **Expected**:
  - ⚠️ Thêm vào giỏ nhưng show warning "Tồn kho không đủ"
- **Status**: PASS/FAIL

#### TC-3.4: Quét cùng sản phẩm, tồn kho vừa đủ
- **Input**: Barcode, available_quantity = 3, quét 4 lần
- **Expected**:
  - ✅ Lần 1-3: Thêm/tăng qty
  - ❌ Lần 4: Lỗi "Chỉ còn 3 [unit]", qty không tăng
- **Status**: PASS/FAIL

#### TC-3.5: Conversion unit: quét đơn vị khác nhau
- **Input**: 
  - Barcode unit A (conversion_to_base=10, available=50)
  - Quét 10 lần
- **Expected**:
  - Qty tăng 10, base_quantity = 50/10 = 5 base units
- **Status**: PASS/FAIL

---

### Group 4: Duplicate Detection & Debounce

#### TC-4.1: Quét cùng barcode 2 lần nhanh (< 500ms)
- **Input**: Quét AB12345 → quét AB12345 (lúc nhân)
- **Expected**:
  - ✅ Chỉ xử lý lần đầu
  - Lần 2 bị bỏ qua (duplicate)
  - Qty chỉ tăng 1, không tăng 2
- **Status**: PASS/FAIL

#### TC-4.2: Quét 2 barcode khác nhau liên tiếp
- **Input**: Quét AB12345 → quét CD67890
- **Expected**:
  - ✅ Cả 2 được thêm vào giỏ
- **Status**: PASS/FAIL

#### TC-4.3: Scanner nhanh (5-10 scans/giây)
- **Input**: Quét cùng barcode 10 lần liên tiếp nhanh
- **Expected**:
  - UI không bị đơ
  - Debounce + throttle chặn duplicate
  - Qty tăng đúng 1
- **Status**: PASS/FAIL

#### TC-4.4: Manual input + Enter
- **Input**: Nhập SKU rồi nhấn Enter
- **Expected**:
  - ✅ Tìm kiếm theo SKU
  - Input được xóa (clearInputAfterScan=true)
- **Status**: PASS/FAIL

---

### Group 5: UI/UX Behavior

#### TC-5.1: Auto-focus input trên mount
- **Action**: Mở trang POS
- **Expected**: BarcodeInput focus tự động
- **Status**: PASS/FAIL

#### TC-5.2: Auto-focus sau mỗi quét
- **Action**: Quét barcode thành công
- **Expected**: Input tự động focus để quét tiếp
- **Status**: PASS/FAIL

#### TC-5.3: Nhấn Esc để xóa input
- **Action**: Nhập "ABC" → nhấn Esc
- **Expected**: Input được xóa, focus vẫn ở input
- **Status**: PASS/FAIL

#### TC-5.4: Nhấn Enter khi input rỗng
- **Action**: Input rỗng → nhấn Enter
- **Expected**: Không có hành động
- **Status**: PASS/FAIL

#### TC-5.5: Toast notifications
- **Input**: Quét sản phẩm hợp lệ
- **Expected**: Toast success hiển thị "✅ Đã thêm [Tên sp] ([Đơn vị])"
- **Status**: PASS/FAIL

#### TC-5.6: Beep sound
- **Config**: beepOnScan = true
- **Input**: Quét barcode hợp lệ
- **Expected**: Phát beep success (tần số cao)
- **Status**: PASS/FAIL

#### TC-5.7: Beep error
- **Config**: beepOnScan = true
- **Input**: Quét barcode không tìm thấy
- **Expected**: Phát beep error (tần số thấp)
- **Status**: PASS/FAIL

---

### Group 6: Edge Cases

#### TC-6.1: Nhiều ProductUnit có cùng barcode
- **Input**: Barcode được gán cho 2 ProductUnit khác nhau
- **Expected**: Lấy kết quả theo product_id nhỏ nhất, log warning
- **Status**: PASS/FAIL

#### TC-6.2: Sản phẩm là_active = false (soft delete)
- **Input**: Barcode của sản phẩm đã bị deactivate
- **Expected**:
  - ❌ Không tìm thấy hoặc "Sản phẩm đã bị vô hiệu hóa"
- **Status**: PASS/FAIL

#### TC-6.3: Quét barcode với khoảng trắng
- **Input**: " AB12345 " (có spaces)
- **Expected**: Normalize thành "AB12345", tìm thấy sản phẩm
- **Status**: PASS/FAIL

#### TC-6.4: Quét barcode trống
- **Input**: Enter mà input rỗng
- **Expected**: Không có hành động
- **Status**: PASS/FAIL

#### TC-6.5: Không có store_id
- **Input**: Quét khi không tồn tại store_id trong user hoặc localStorage
- **Expected**: Fallback store_id = 1, hoặc show error
- **Status**: PASS/FAIL

#### TC-6.6: Network error khi tìm barcode
- **Scenario**: Server không phản hồi
- **Expected**:
  - ❌ Toast "Lỗi khi tìm kiếm sản phẩm"
  - Beep error
- **Status**: PASS/FAIL

---

### Group 7: Integration with Cart

#### TC-7.1: Quét → thêm giỏ → tính tổng tiền
- **Input**: Quét 2 sản phẩm, unit_price khác nhau
- **Expected**: 
  - Subtotal = (price1 × qty1) + (price2 × qty2)
  - Chính xác
- **Status**: PASS/FAIL

#### TC-7.2: Quét → thêm giỏ → áp voucher
- **Action**: Quét sản phẩm → chọn customer → apply voucher
- **Expected**: Voucher discount tính đúng
- **Status**: PASS/FAIL

#### TC-7.3: Quét → thanh toán
- **Action**: Quét sản phẩm → chọn phương thức → thanh toán
- **Expected**: Giao dịch thành công, giỏ được xóa
- **Status**: PASS/FAIL

---

### Group 8: Performance

#### TC-8.1: Thời gian quét < 500ms
- **Metric**: Từ nhấn Enter đến hiển thị trong giỏ
- **Expected**: < 500ms
- **Status**: PASS/FAIL

#### TC-8.2: Quét 50 sản phẩm liên tiếp
- **Action**: Quét 50 barcode khác nhau
- **Expected**: 
  - UI mượt, không lag
  - Tất cả được thêm đúng
- **Status**: PASS/FAIL

---

## 🚀 Device & Browser Testing

### Desktop
- ✅ Chrome Latest
- ✅ Firefox Latest
- ✅ Edge Latest
- ✅ Safari (Mac)

### Tablet
- ✅ iPad (iOS)
- ✅ Android Tablet
- ✅ Scanner Bluetooth kết nối

### POS Terminal
- ✅ Thiết bị POS chuyên dụng (e.g., Sunmi, PAX)
- ✅ Keyboard wedge scanner USB

---

## 🔄 Barcode Format Examples

| Format | Length | Example | Pattern |
|--------|--------|---------|---------|
| EAN-13 | 13 | 4006381333931 | `\d{13}` |
| UPC-A | 12 | 123456789012 | `\d{12}` |
| UPC-E | 8 | 12345678 | `\d{8}` |
| Code 128 | 6+ | ABC123XYZ | `[0-9A-Z]{6,}` |
| SKU | 6+ | SPTEST-001 | `[0-9A-Za-z_\-]{6,}` |

---

## 🛠️ Troubleshooting

### Problem: Barcode không được tìm thấy
**Solution**:
1. Kiểm tra barcode có chính xác không
2. Kiểm tra ProductUnit.barcode hoặc Product.sku
3. Kiểm tra Product.is_active = true

### Problem: Input không tự focus
**Solution**:
1. Kiểm tra `autoFocus = true` trong config
2. Kiểm tra browser có focus được không (pop-up blocker?)

### Problem: Beep không phát
**Solution**:
1. Kiểm tra `beepOnScan = true`
2. Kiểm tra browser có support Web Audio API
3. Kiểm tra mute/volume

### Problem: Duplicate scans
**Solution**:
1. Tăng `duplicateCheckWindowMs` (default 500ms)
2. Hoặc tăng `debounceDelay` hoặc `throttleInterval`

### Problem: Tồn kho không đúng
**Solution**:
1. Kiểm tra conversion_to_base có đúng không
2. Kiểm tra Inventory.stock (base_quantity) theo store_id
3. Kiểm tra allowOversell config

---

## 📝 API Endpoint

### GET /api/v1/product/by-barcode/:code?store_id={id}

**Request**:
```bash
GET /api/v1/product/by-barcode/4006381333931?store_id=1
Authorization: Bearer {token}
```

**Response (Success)**:
```json
{
  "err": 0,
  "msg": "OK",
  "data": {
    "product_id": 1,
    "name": "Sản phẩm A",
    "sku": "SKU-001",
    "is_active": true,
    "product_unit_id": 2,
    "unit_id": 2,
    "unit_name": "Hộp",
    "conversion_to_base": 10,
    "current_price": 50000,
    "hq_price": 45000,
    "base_quantity": 100,
    "available_quantity": 10,
    "barcode": "4006381333931",
    "matched_by": "barcode"
  }
}
```

**Response (Error)**:
```json
{
  "err": 1,
  "msg": "Không tìm thấy sản phẩm cho mã: ABC12345",
  "data": null
}
```

---

## 📚 Files Changed/Created

### Backend
- ✅ `server/src/services/product.js` - Added `getByBarcode()`
- ✅ `server/src/controllers/product.js` - Added `getByBarcode()`
- ✅ `server/src/routes/product.js` - Added route `/by-barcode/:code`

### Frontend
- ✅ `FE/src/utils/barcodeScanner.js` - Utilities (NEW)
- ✅ `FE/src/api/barcodeApi.js` - API integration (NEW)
- ✅ `FE/src/components/BarcodeInput.js` - Component (NEW)
- ✅ `FE/src/assets/BarcodeInput.css` - Styles (NEW)
- ✅ `FE/src/pages/Cashier/POS.js` - Updated with barcode support

---

## 🎓 Developer Notes

### Smart Debounce + Throttle

```javascript
const smartScanner = createSmartScanner(callback, 200, 150)
// 200ms debounce + 150ms throttle
// Chặn duplicate + xử lý nhanh
```

### Duplicate Detection

```javascript
const scanHistory = createScanHistory(3) // Track 3 lần quét gần nhất
scanHistory.push('ABC123')
const isDuplicate = scanHistory.isDuplicate('ABC123', 500) // Trong 500ms?
```

### Audio Feedback

```javascript
playBeep('success', 100)  // Tần số cao, 100ms
playBeep('error', 150)    // Tần số thấp, 150ms
```

---

## ✅ Checklist Triển Khai

- [ ] Cấu hình POS config (allowOversell, beepOnScan)
- [ ] Test tất cả TC-1 to TC-8
- [ ] Test trên desktop, tablet, POS terminal
- [ ] Test scanner USB keyboard wedge
- [ ] Test scanner Bluetooth
- [ ] Verify giá pricing rule
- [ ] Verify tồn kho
- [ ] Verify cart + checkout flow
- [ ] Performance testing (< 500ms)
- [ ] Deploy to production
- [ ] Monitor logs

---

**Last Updated**: 2025-11-26
**Version**: 1.0.0
