# 📱 Hướng Dẫn Test Quét Mã Vạch/QR Code Bằng Webcam

## 🎯 Tổng Quan

Hướng dẫn này sẽ giúp bạn test chức năng quét barcode/QR code trong ứng dụng Warehouse Management bằng webcam của máy tính mà không cần máy quét barcode chuyên dụng.

**Thời gian thực hiện:** ~30 phút  
**Yêu cầu:** Webcam, máy tính, trình duyệt Chrome/Firefox/Edge

---

## 📋 Danh Sách Kiểm Tra Chuẩn Bị

### 1. **Chuẩn Bị Môi Trường Dev**

- [x] Node.js, npm cài đặt
- [x] Frontend code có `BarcodeInput` component (phát triển sẵn)
- [x] Backend API `/api/v1/product/by-barcode/:code` chạy
- [x] Database có dữ liệu sản phẩm (ProductUnit, Product, Inventory, PricingRule)

### 2. **Cài Đặt Package**

Frontend package.json hiện tại đã có:
- ✅ `react-bootstrap` - UI components
- ✅ `react-icons` - Icons
- ✅ `react-toastify` - Notifications
- ✅ `axios` - HTTP client
- ✅ `qrcode.react` - QR code rendering
- ✅ `qrcode` - QR code generation

**Cài đặt thêm (optional):**
```bash
cd FE
npm install jsqr html5-qrcode
```

**Cái nào là gì:**
- `jsqr` - Decode QR code từ canvas (lightweight, ~10KB)
- `html5-qrcode` - Camera barcode scanner full-featured (nặng hơn, nhưng tự động detect)

---

## 🚀 Quy Trình Test Chi Tiết

### **Phase 1: Chuẩn Bị Mã Vạch Test**

#### Bước 1: Mở Tool Generator

```
📂 Mở file: d:\ki9\2025_Fall_SEP490_G8\BARCODE_QR_GENERATOR.html
🔄 Cách mở:
  Option A: Drag & drop vào trình duyệt
  Option B: Right-click → Open with → Chrome/Firefox
  Option C: Nhập vào URL: file:///d:/ki9/2025_Fall_SEP490_G8/BARCODE_QR_GENERATOR.html
```

**Giao diện tool generator:**
```
┌─────────────────────────────────────────────┐
│  QR Code & Barcode Generator                │
│  Công cụ tạo mã vạch/QR code để test...     │
└─────────────────────────────────────────────┘

📦 Dữ liệu mẫu từ Database
┌────────────────────────────────────────────────────┐
│ Sản phẩm          │ SKU    │ Barcode      │ Giá   │
├────────────────────────────────────────────────────┤
│ Coca Cola 1.5L    │ SKU001 │ 893606520... │ 15K   │
│ Pepsi 1L          │ SKU002 │ 893609640... │ 12K   │
│ ... (8 sản phẩm)  │ ...    │ ...          │ ...   │
└────────────────────────────────────────────────────┘

📱 QR Code Generator    📊 Barcode 1D Generator
├─ Chọn dữ liệu         ├─ Format: EAN-13, Code128
├─ Nhập Barcode/URL     ├─ Nhập số Barcode
├─ Tạo QR Code          ├─ Tạo Barcode
└─ Tải xuống (.png)     └─ Tải xuống (.png)

🖨️ In bộ mã vạch test
├─ Chọn loại (QR/Barcode/Cả hai)
├─ Số lượng (1-20)
└─ Tạo trang in
```

#### Bước 2: Chọn Sản Phẩm & Tạo Mã

**Option A: Dùng sản phẩm mẫu sẵn**

1. Kéo xuống mục "📦 Dữ liệu mẫu từ Database"
2. Nhấp nút "QR" hoặc "Barcode" trên dòng sản phẩm
   - **QR**: Tạo QR code cho Barcode đó
   - **Barcode**: Tạo barcode 1D cho Barcode đó
3. Nhấp "📱 Tạo QR Code" hoặc "📊 Tạo Barcode"
4. Xem trước ở dưới

**Option B: Dùng barcode custom**

1. Điền barcode hoặc SKU vào ô "Nhập Barcode..."
   - VD: `8936065200163` (EAN-13)
   - VD: `SKU001` (Custom SKU)
2. Chọn format nếu barcode 1D
3. Nhấp "Tạo"

#### Bước 3: In Hoặc Lưu Mã

**Cách 1: Lưu PNG (để xem trên màn hình sau)**

```
1. Nhấp "💾 Tải xuống"
2. Lưu file với tên rõ ràng: VD qrcode_coca_cola.png
3. Để sau dùng để hiển thị trên màn hình
```

**Cách 2: In trực tiếp**

```
1. Kéo xuống "🖨️ In bộ mã vạch test"
2. Chọn loại mã (QR / Barcode / Cả hai)
3. Nhập số lượng (6-10 cái đủ test)
4. Nhấp "🖨️ Tạo trang in"
5. Nhấp "🖨️ In (Ctrl+P)"
6. Chọn máy in (hoặc "In thành PDF" để lưu)
7. Nhấp "In"
```

**Kết quả in:**
```
┌─────────────────────────────────────────┐
│        BARCODE TEST SHEET                │
├─────────────────────────────────────────┤
│  ┌──────┐    ┌──────────┐    Coca Cola  │
│  │ QR   │    │ Barcode  │    SKU001     │
│  │ Code │    │  1D      │    15,000 ₫   │
│  └──────┘    └──────────┘                │
│                                          │
│  ┌──────┐    ┌──────────┐    Pepsi 1L   │
│  │ QR   │    │ Barcode  │    SKU002     │
│  │ Code │    │  1D      │    12,000 ₫   │
│  └──────┘    └──────────┘                │
│  (... 4-8 sản phẩm nữa)                 │
└─────────────────────────────────────────┘
```

---

### **Phase 2: Chuẩn Bị Backend API**

#### Bước 1: Kiểm Tra API Endpoint

```bash
# Terminal 1: Chạy server
cd server
npm start
# Kết quả: Server running on port 5000 (hoặc port khác)

# Terminal 2: Test endpoint
curl -X GET "http://localhost:5000/api/v1/product/by-barcode/8936065200163?store_id=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response thành công:**
```json
{
  "err": 0,
  "msg": "OK",
  "data": {
    "product_id": 1,
    "name": "Coca Cola 1.5L",
    "sku": "SKU001",
    "barcode": "8936065200163",
    "unit_name": "Chai",
    "conversion_to_base": 1,
    "current_price": 15000,
    "available_quantity": 50,
    "base_quantity": 50,
    "matched_by": "ProductUnit.barcode"
  }
}
```

#### Bước 2: Kiểm Tra Database

```sql
-- Kiểm tra sản phẩm test có tồn tại
SELECT p.product_id, p.name, p.sku, p.is_active, 
       pu.barcode, pu.unit_name, pu.conversion_to_base,
       inv.stock as base_quantity
FROM products p
LEFT JOIN product_units pu ON p.product_id = pu.product_id
LEFT JOIN inventories inv ON p.product_id = inv.product_id
WHERE p.sku IN ('SKU001', 'SKU002', 'SKU003')
AND p.is_active = true
ORDER BY p.product_id;

-- Kiểm tra pricing rules
SELECT * FROM pricing_rules 
WHERE product_id IN (1, 2, 3)
AND store_id = 1
AND start_date <= CURDATE()
AND end_date >= CURDATE();
```

---

### **Phase 3: Tích Hợp Camera Scanner**

#### Bước 1: Thêm Camera Modal vào Warehouse Page

File: `FE/src/pages/Warehouse/WarehouseManagement.js` (hoặc trang quản lý kho của bạn)

```javascript
import React, { useState } from 'react'
import { Button } from 'react-bootstrap'
import CameraBarcodeScannerModal from '../../components/CameraBarcodeScannerModal'

const WarehouseManagement = () => {
    const [showCameraScanner, setShowCameraScanner] = useState(false)

    const handleBarcodeScanned = (productData) => {
        console.log('Scanned product:', productData)
        // Xử lý dữ liệu quét
        // VD: Add to import form, check stock, etc.
    }

    return (
        <div>
            <Button 
                variant="primary" 
                onClick={() => setShowCameraScanner(true)}
                className="mb-3"
            >
                🎥 Quét mã vạch bằng webcam
            </Button>

            <CameraBarcodeScannerModal
                show={showCameraScanner}
                onProductScanned={handleBarcodeScanned}
                storeId={1} // Thay bằng store_id thực tế
                onClose={() => setShowCameraScanner(false)}
            />

            {/* Rest of your warehouse management UI */}
        </div>
    )
}

export default WarehouseManagement
```

#### Bước 2: Hoặc Thêm vào POS Page

File: `FE/src/pages/Cashier/POS.js`

```javascript
// Thêm state
const [showCameraScanner, setShowCameraScanner] = useState(false)

// Thêm button gần BarcodeInput
<Button 
    variant="outline-primary"
    size="sm"
    onClick={() => setShowCameraScanner(true)}
    className="ms-2"
>
    🎥 Quét webcam
</Button>

// Thêm modal
<CameraBarcodeScannerModal
    show={showCameraScanner}
    onProductScanned={handleBarcodeScanned}
    storeId={storeId}
    onClose={() => setShowCameraScanner(false)}
/>
```

#### Bước 3: Chạy Frontend

```bash
# Terminal: Chạy React dev server
cd FE
npm start
# Kết quả: Frontend running on http://localhost:3000
```

---

### **Phase 4: Test Quét Mã Vạch**

#### Sơ Đồ Quy Trình Test

```
┌─────────────────────────────────────────────────────────┐
│ 1. In/Hiển thị mã vạch                                  │
│    ↓ (In trên giấy hoặc hiển thị trên điện thoại khác) │
│                                                          │
│ 2. Mở ứng dụng Warehouse (hoặc POS)                     │
│    ↓ Nhấp nút "🎥 Quét webcam"                          │
│                                                          │
│ 3. Cho phép quyền truy cập camera                       │
│    ↓ Nhấp "Cho phép" khi trình duyệt yêu cầu           │
│                                                          │
│ 4. Đặt mã vạch vào khung                                │
│    ↓ Hướng mã vạch về phía webcam (cách 10-20cm)       │
│                                                          │
│ 5. Chờ quét                                             │
│    ↓ Webcam sẽ tự động detect & quét mã vạch          │
│                                                          │
│ 6. Xem kết quả                                          │
│    ↓ Tên sản phẩm, giá, tồn kho hiển thị               │
│                                                          │
│ 7. Sản phẩm được thêm vào form/giỏ hàng               │
│    ↓ Tiếp tục quét sản phẩm khác                       │
└─────────────────────────────────────────────────────────┘
```

#### Test Case Chi Tiết

**Test 1: Quét QR Code thành công**

```
Input:   In QR code chứa "8936065200163" (Coca Cola)
Steps:
  1. Mở camera scanner modal
  2. Đặt QR code vào khung
  3. Chờ 1-2 giây
Expected: 
  ✅ QR code được detect
  ✅ Thông tin: "Coca Cola 1.5L | Giá: 15,000₫ | Tồn: 50 chai"
  ✅ Phát beep success (800Hz)
  ✅ Toast: "✅ Tìm thấy: Coca Cola 1.5L"
  ✅ Sản phẩm được add vào form/cart
```

**Test 2: Quét Barcode 1D (EAN-13) thành công**

```
Input:   In Barcode 1D: 8936065200163
Steps:
  1. Mở camera scanner modal
  2. Đặt barcode vào khung
  3. Chờ 2-3 giây (barcode 1D chậm hơn QR)
Expected:
  ✅ Barcode được detect (nếu contrast tốt)
  ⚠️ Nếu không được detect: 
     → Manual input field nhập "8936065200163"
     → Nhấp Enter
     → Kết quả tương tự Test 1
```

**Test 3: Sản phẩm không tồn tại**

```
Input:   Barcode: 9999999999999 (không có trong DB)
Expected:
  ✅ API trả: err=1, msg="Sản phẩm không tìm thấy"
  ✅ Toast: "❌ Sản phẩm không tìm thấy"
  ✅ Phát beep error (400Hz)
  ✅ Hiển thị dữ liệu quét & lỗi trong lịch sử
```

**Test 4: Sản phẩm bị vô hiệu hóa (is_active=false)**

```
Input:   Barcode của sản phẩm đã xoá
Expected:
  ✅ API trả: err=1, msg="Sản phẩm không khả dụng"
  ✅ Toast: "❌ Sản phẩm không khả dụng"
  ✅ Phát beep error
```

**Test 5: Quét liên tục (duplicates)**

```
Input:   Quét cùng 1 mã vạch 5 lần liên tiếp nhanh
Expected:
  ✅ Lần 1: Detect & add
  ✅ Lần 2-5: Bỏ qua (duplicate detection hoạt động)
  ✅ Chỉ 1 lần phát beep success
Verify: Check lịch sử quét (scan history)
```

**Test 6: Chuyển camera (front/back)**

```
Input:   Nhấp nút "🔄 Chuyển camera"
Expected:
  ✅ Camera chuyển từ sau sang trước (hoặc ngược lại)
  ✅ Có thể tiếp tục quét
  ✅ Chất lượng video thay đổi
```

**Test 7: Từ chối quyền camera**

```
Input:   Không cho phép quyền camera
Expected:
  ✅ Hiển thị thông báo: "❌ Bạn chưa cho phép truy cập camera"
  ✅ Hướng dẫn cách bật quyền
  ✅ Nút "🔄 Thử lại" hoạt động
```

---

### **Phase 5: Test Trên Các Thiết Bị Khác Nhau**

#### Desktop (Windows/Mac/Linux)

```
✅ Webcam USB: Hoạt động tốt, clear image
✅ Webcam tích hợp: Hoạt động nhưng có thể chậm
⚠️ Khoảng cách tối ưu: 10-20cm
⚠️ Ánh sáng: Cần ánh sáng tốt (không quá tối)
```

#### Tablet/Mobile

```
❌ Webcam: Không có (skip)
✅ Camera sau: Có thể dùng được
✅ Camera trước: Chỉ dùng để test (quality thấp)
⚠️ Khoảng cách: 5-15cm
⚠️ Cứng camera: Có thể cần cơ chế ổn định
```

#### Browser Compatibility

```
✅ Chrome 90+: Full support
✅ Firefox 88+: Full support
✅ Edge 90+: Full support
✅ Safari 14+: Full support (iOS phải request permission mỗi lần)
❌ IE 11: Không support
```

---

## 🛠️ Cấu Hình Tối Ưu

### Tùy Chỉnh Camera Scanner

File: `FE/src/components/CameraBarcodeScannerModal.js`

```javascript
// Mặc định config
const defaultConfig = {
    facingMode: 'environment',     // 'environment' (sau), 'user' (trước)
    width: { ideal: 1280 },        // Độ rộng tối ưu
    height: { ideal: 720 },        // Độ cao tối ưu
    focusMode: 'continuous',       // Tự động focus
    scanFrameDelay: 100,           // ms giữa 2 frame scan
    duplicateCheckWindowMs: 500    // Window kiểm tra duplicate
}

// Tùy chỉnh cho từng trường hợp
```

### Tùy Chỉnh QR Code Detection

```javascript
// Trong CameraBarcodeScannerModal.js, hàm detectBarcode1D()
// Thay đổi threshold detect:
const isBlack = gray < 128  // Tăng lên 150-180 nếu image quá sáng
                             // Giảm xuống 80-100 nếu quá tối

// Thay đổi scan pattern:
const minPatternLength = 30 // Giảm nếu miss barcode nhỏ
                            // Tăng nếu false positive quá nhiều
```

---

## 🔍 Troubleshooting

### ❌ Vấn Đề: Camera không hoạt động

**Nguyên nhân & Cách Khắc Phục:**

| Triệu Chứng | Nguyên Nhân | Cách Khắc Phục |
|-----------|----------|-----------|
| "Không tìm thấy camera" | Camera chưa kết nối | Kiểm tra kết nối USB, restart trình duyệt |
| "Camera đang được sử dụng" | Ứng dụng khác dùng camera | Đóng Zoom, Skype, OBS, v.v. |
| "Không được phép truy cập" | Browser chặn quyền | Kiểm tra permission (xem bên dưới) |
| Hình ảnh mờ/chuyển động | Auto-focus không tốt | Điều chỉnh khoảng cách, ánh sáng |
| Chậm/lag | Hardware yếu | Đóng ứng dụng khác, giảm resolution |

**Kiểm Tra Quyền Truy Cập:**

*Windows (Chrome):*
1. Settings → Privacy and security → Site settings
2. Tìm "Camera" → Cho phép
3. Thêm website vào "Allow" list

*Mac (Chrome):*
1. System Preferences → Security & Privacy → Camera
2. Cho phép Chrome truy cập camera

*Linux:*
1. `sudo chmod a+rw /dev/video0`
2. Hoặc add user vào group: `sudo usermod -a -G video $USER`

### ❌ Vấn Đề: Quét không detect barcode

**Nguyên nhân & Cách Khắc Phục:**

| Triệu Chứng | Nguyên Nhân | Cách Khắc Phục |
|-----------|----------|-----------|
| QR code không detect | Contrast thấp | In màu đen/trắng, tránh ảnh mờ |
| | Barcode quá nhỏ | Phóng to barcode (tối thiểu 2x2cm) |
| | Góc quét sai | Quét vuông góc với barcode |
| Barcode 1D không detect | Pattern phức tạp | Thử dùng QR code thay thế |
| | Barcode bị xoay | Đặt thẳng barcode |

**Mẹo Quét:**

```
✅ QR Code:
   • Đặt trực diện
   • Có frame sáng xanh quanh QR
   • Cách 10-20cm từ camera
   • Nền trắng, mã đen

✅ Barcode 1D (EAN-13):
   • Đặt ngang camera
   • Cách 10-15cm từ camera
   • Nền trắng, barcode đen
   • In rõ (không làm nhõn)
   • Ánh sáng tốt, không sáng ngược

❌ Tránh:
   • Barcode bị xoay
   • Camera quá gần/quá xa
   • Ánh sáng từ phía sau
   • Bề mặt bóng (barcode phản chiếu)
```

### ❌ Vấn Đề: API trả lỗi

**Kiểm Tra Debug:**

```javascript
// Mở DevTools (F12)
// Đi tới tab "Network"
// Quét mã vạch
// Xem request GET /api/v1/product/by-barcode/:code

// Kiểm tra:
✅ Status: 200 (thành công), 404 (không tìm), 500 (server error)
✅ Response body: err, msg, data
✅ Headers: Authorization header có trong request?
```

**Lỗi Thường Gặp:**

| Lỗi | Nguyên Nhân | Cách Khắc Phục |
|-----|----------|-----------|
| 401 Unauthorized | Token hết hạn | Đăng nhập lại |
| 404 Not Found | Barcode không tồn tại | Check DB có sản phẩm không |
| 500 Internal Error | Backend bug | Check server logs |
| CORS error | Config CORS sai | Kiểm tra `cors` setting trong server.js |

### ❌ Vấn Đề: Hiệu Năng Chậm

| Triệu Chứng | Nguyên Nhân | Cách Khắc Phục |
|-----------|----------|-----------|
| API response > 1s | Database query chậm | Add index trên `ProductUnit.barcode`, `Product.sku` |
| | Network yếu | Check kết nối internet |
| Camera lag | Hardware yếu | Giảm resolution (từ 1280x720 xuống 640x480) |
| | Render chậm | Profile React component (DevTools) |

**Tối Ưu Hóa:**

```sql
-- Add indexes
CREATE INDEX idx_product_unit_barcode ON product_units(barcode);
CREATE INDEX idx_product_sku ON products(sku);
CREATE INDEX idx_pricing_rule ON pricing_rules(product_id, store_id, start_date, end_date);
```

---

## 📊 Metrics & Performance

### Target Metrics

```
QR Code Detection:    < 500ms từ lúc quét tới kết quả
Barcode 1D Detection: < 1000ms (chậm hơn QR)
API Response:         < 300ms
UI Render:            < 100ms
Total:                < 500-1500ms (acceptable)
```

### Đo Lường Performance

```javascript
// Trong browser console
console.time('scan-total')

// ... quét và xử lý ...
// Quét camera: ~300-500ms
// API call: ~200-300ms
// UI update: ~50-100ms

console.timeEnd('scan-total')
// Kết quả: scan-total: 523.45ms
```

---

## 📝 Test Checklist

### Pre-Launch Testing

```
Chuẩn Bị:
☐ Database có ít nhất 8 sản phẩm test với barcode
☐ Backend API endpoint `/by-barcode/:code` hoạt động
☐ Frontend component CameraBarcodeScannerModal tích hợp
☐ Webcam test hoạt động trên chrome://camera
☐ Quyền truy cập camera đã config

Quét:
☐ Test 1: Quét QR code thành công
☐ Test 2: Quét Barcode 1D thành công
☐ Test 3: Sản phẩm không tồn tại (error handling)
☐ Test 4: Sản phẩm bị vô hiệu (is_active=false)
☐ Test 5: Duplicate detection (quét 5 lần cùng code)
☐ Test 6: Chuyển camera (front/back)
☐ Test 7: Từ chối quyền camera (error handling)

UI/UX:
☐ Toast notification hiển thị đúng
☐ Beep sound phát đúng loại (success/error)
☐ Lịch sử quét cập nhật (scan history)
☐ Input field auto-focus sau quét
☐ Loading spinner hiển thị đúng

Performance:
☐ QR: < 500ms
☐ Barcode 1D: < 1000ms
☐ API: < 300ms
☐ Không lag/freeze

Cross-Browser:
☐ Chrome 90+: ✅
☐ Firefox 88+: ✅
☐ Edge 90+: ✅
☐ Safari 14+ (Mac): ✅ (nếu có)

Responsive:
☐ Desktop (1920x1080): ✅
☐ Tablet (1024x768): ✅
☐ Mobile (375x667): ✅
```

---

## 🎓 Kiến Thức Bổ Sung

### Các Format Barcode

| Format | Độ dài | Ví dụ | Sử dụng |
|--------|--------|--------|--------|
| EAN-13 | 13 số | 8936065200163 | Bán lẻ (phổ biến) |
| EAN-8 | 8 số | 89360652 | Sản phẩm nhỏ |
| UPC-A | 12 số | 893606520016 | Bắc Mỹ |
| UPC-E | 8 số | 89360652 | UPC compressed |
| Code128 | 1-80 ký tự | SKU12345 | Custom, warehouse |
| QR Code | Variable | (2D) | Thông tin phức tạp |

### Công Thức Kiểm Tra EAN-13

```
Luhn checksum: chữ số cuối là mã kiểm tra
Công thức: (10 - ((sum_odd*3 + sum_even) mod 10)) mod 10

VD: 893606520016 + checksum = 8936065200163
```

### JSQr Library

```javascript
// Load từ CDN (trong CameraBarcodeScannerModal)
const script = document.createElement('script')
script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js'
document.head.appendChild(script)

// Dùng
const qrCode = window.jsQR(imageData.data, width, height)
if (qrCode) {
    console.log('Decoded:', qrCode.data)
}
```

---

## 📚 Tài Liệu Liên Quan

- `BARCODE_SCANNER_README.md` - Giới thiệu tính năng
- `BARCODE_SCANNER_IMPLEMENTATION.md` - Chi tiết kỹ thuật
- `BARCODE_SCANNER_TEST_CASES.md` - 40+ test cases
- `BARCODE_QR_GENERATOR.html` - Tool tạo mã vạch/QR

---

## ✅ Kết Luận

Bạn đã hoàn thành:

1. ✅ Chuẩn bị môi trường (webcam, package)
2. ✅ Tạo mã vạch/QR code test (generator tool)
3. ✅ Cấu hình ứng dụng (CameraBarcodeScannerModal)
4. ✅ Test chức năng (7 test case)
5. ✅ Troubleshooting (FAQs)

**Tiếp theo:** Deploy camera scanner vào production, test trên máy quét barcode chuyên dụng, và monitor performance.

---

**Câu hỏi? Kiểm tra mục "Troubleshooting" hoặc xem DevTools Console (F12).**

