# 🎯 Hướng Dẫn Test Webcam Barcode Scanner - Tất Cả Bước

Tài liệu này hướng dẫn **chi tiết từng bước** cách test chức năng quét mã vạch/QR code bằng webcam.

---

## 📑 Bảng Nội Dung

1. [Chuẩn bị nhanh (5 phút)](#chuẩn-bị-nhanh)
2. [Chuẩn bị chi tiết (20 phút)](#chuẩn-bị-chi-tiết)
3. [Tạo mã vạch test](#tạo-mã-vạch-test)
4. [Test quét mã](#test-quét-mã)
5. [Troubleshooting](#troubleshooting)
6. [Tham khảo](#tham-khảo)

---

## ⚡ Chuẩn Bị Nhanh

**Cho người muốn làm ngay trong 5 phút:**

### Bước 1: Kiểm tra files tồn tại

```bash
# Kiểm tra files
ls -la FE/src/components/CameraBarcodeScannerModal.js
ls -la FE/src/assets/CameraBarcodeScannerModal.css
ls -la BARCODE_QR_GENERATOR.html
```

✅ Nếu tất cả tồn tại → Bỏ qua bước install, go to Bước 2

### Bước 2: Chạy backend

```bash
cd server
npm start
# Output: Server running on port 5000
```

### Bước 3: Chạy frontend (terminal mới)

```bash
cd FE
npm start
# Output: Compiled successfully
# Browser: http://localhost:3000
```

### Bước 4: Tạo mã test

```
1. Mở browser: BARCODE_QR_GENERATOR.html
2. Nhấp "QR" hoặc "Barcode" ở bảng sản phẩm
3. Nhấp "Tạo QR Code" hoặc "Tạo Barcode"
4. Nhấp "💾 Tải xuống" (hoặc "🖨️ In")
```

### Bước 5: Test quét

```
1. Đi tới POS hoặc Warehouse page
2. Nhấp nút 🎥 Camera (hoặc input field quét)
3. Cho phép quyền camera
4. Đặt mã vạch vào khung
5. Chờ detect ✅
```

**Done! Xem kết quả.**

---

## 📚 Chuẩn Bị Chi Tiết

**Cho người muốn hiểu chi tiết:**

### 1️⃣ Kiểm Tra Yêu Cầu

```bash
# Node.js & npm
node -v  # >= v14
npm -v   # >= v6

# Webcam (dùng câu lệnh hoặc check Device Manager)
# Windows: Settings > Devices > Cameras
# Mac: System Preferences > Security & Privacy > Camera
# Linux: ls /dev/video*

# Database (MySQL/MariaDB)
mysql -u root -p -e "SELECT VERSION();"
```

### 2️⃣ Cài Đặt Package (Optional)

```bash
# Nếu chưa có, cài jsQR (lightweight QR decoder)
cd FE
npm install jsqr@1.4.0

# Hoặc cài html5-qrcode (full-featured, nặng hơn)
npm install html5-qrcode

# (CameraBarcodeScannerModal.js sẽ tự load jsQR từ CDN nếu không cài)
```

### 3️⃣ Chuẩn Bị Database

```bash
# Đăng nhập MySQL
mysql -u root -p

# Tạo database (nếu chưa có)
CREATE DATABASE warehouse_db;
USE warehouse_db;

# Import schema
source server/database/schema.sql;

# Thêm test data
source server/database/sample_data.sql;
# hoặc chạy SQL từ BACKEND_API_CONFIG.md
```

### 4️⃣ Kiểm Tra Backend API

```bash
# Terminal 1: Backend
cd server
npm start

# Terminal 2: Test API
curl -X GET "http://localhost:5000/api/v1/product/by-barcode/8936065200163?store_id=1" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: 200 OK với dữ liệu sản phẩm
```

### 5️⃣ Kiểm Tra Frontend

```bash
# Terminal: Frontend
cd FE
npm start

# Kết quả:
# ✔ compiled successfully
# http://localhost:3000
```

### 6️⃣ Kiểm Tra Component

```
1. Browser: http://localhost:3000
2. Login vào app
3. Navigate tới POS hoặc Warehouse page
4. Kiểm tra BarcodeInput component hiển thị (input quét)
```

---

## 🎨 Tạo Mã Vạch Test

### Cách 1: Dùng Tool Generator (Recommended)

```
📂 Mở file: BARCODE_QR_GENERATOR.html

┌─────────────────────────────────────────────┐
│  QR Code & Barcode Generator                │
├─────────────────────────────────────────────┤
│ 📦 Dữ liệu mẫu từ Database (8 sản phẩm)     │
│  ┌──────────────────────────────────────┐  │
│  │ Sản phẩm │ SKU   │ Barcode │ Giá    │  │
│  ├──────────────────────────────────────┤  │
│  │ Coca Cola│SKU001│893606..│15,000₫ │  │
│  │  [QR] [Barcode]                      │  │
│  └──────────────────────────────────────┘  │
│                                             │
│ 📱 QR Code Generator                        │
│  Nhập Barcode: [8936065200163        ]     │
│  [📱 Tạo QR Code] [💾 Tải xuống]          │
│  (Xem trước QR code)                       │
│                                             │
│ 📊 Barcode 1D Generator                     │
│  Format: [EAN-13 ▼]                        │
│  Nhập: [8936065200163          ]          │
│  [📊 Tạo Barcode] [💾 Tải xuống]          │
│  (Xem trước barcode)                       │
│                                             │
│ 🖨️ In bộ mã vạch test                       │
│  Loại: [QR Code ▼]                        │
│  Số lượng: [6]                             │
│  [🖨️ Tạo trang in] [🖨️ In (Ctrl+P)]       │
└─────────────────────────────────────────────┘
```

**Các bước:**

```
A. Dùng sản phẩm mẫu:
   1. Kéo xuống "📦 Dữ liệu mẫu"
   2. Nhấp [QR] hoặc [Barcode] ở dòng sản phẩm
   3. Sẽ auto-fill vào form phía trên

B. Tạo mã:
   1. Nhấp [📱 Tạo QR Code] hoặc [📊 Tạo Barcode]
   2. Xem trước ở dưới

C. Lưu/In:
   - Lưu PNG: Nhấp [💾 Tải xuống]
   - In giấy: Kéo xuống [🖨️ In bộ mã vạch test]
              → Chọn loại & số lượng
              → Nhấp [🖨️ Tạo trang in]
              → Nhấp [🖨️ In (Ctrl+P)]
              → Chọn máy in
              → In
```

### Cách 2: QR Code Online (Nhanh)

```
1. Vào https://www.qr-code-generator.com/
2. Nhập barcode: 8936065200163
3. Generate
4. Download hoặc Print
```

### Cách 3: Barcode Online (Nhanh)

```
1. Vào https://barcode.tec-it.com/
2. Chọn format: EAN 13
3. Nhập: 8936065200163
4. Generate
5. Download
```

### Cách 4: Dùng SKU Custom

```
Generator form:
- Loại: QR Code
- Nhập: SKU001 (hoặc code tuỳ ý)
- Tạo

Hoặc Barcode:
- Format: CODE128 (hỗ trợ text)
- Nhập: SKU001
- Tạo
```

---

## 🎬 Test Quét Mã

### Test Preparation

```
Chuẩn bị:
☐ Backend chạy (port 5000)
☐ Frontend chạy (port 3000)
☐ Mã vạch đã tạo (in hoặc hiển thị trên màn hình)
☐ Webcam hoạt động (test qua Chrome: chrome://camera)
☐ Quyền truy cập camera: Cho phép
```

### Test 1: Quét QR Code Thành Công

```
┌─ Test Case ─────────────────────────────────────┐
│ ID: T1                                          │
│ Name: Quét QR code thành công                  │
│ Pre-condition:                                  │
│  - QR code chứa "8936065200163" được in rõ    │
│  - Backend API hoạt động                       │
│  - Webcam có camera                            │
│                                                 │
│ Steps:                                          │
│  1. Mở POS hoặc Warehouse page                 │
│  2. Nhấp nút "🎥 Quét mã vạch bằng webcam"    │
│  3. Khi modal mở, chờ 1-2s để camera khởi động│
│  4. Cho phép quyền truy cập camera             │
│  5. Đặt QR code vào khung (cách 10-20cm)       │
│  6. Chờ detect (1-2s)                          │
│                                                 │
│ Expected Result:                                │
│  ✅ Webcam hiển thị live view                  │
│  ✅ QR code được detect (khung sáng xanh)      │
│  ✅ Thông tin sản phẩm:                        │
│     - Tên: "Coca Cola 1.5L"                   │
│     - SKU: "SKU001"                            │
│     - Giá: "15,000₫" (hoặc 14,000 nếu có rule)│
│     - Tồn: "50 Chai"                           │
│  ✅ Phát beep: Tones success (800Hz, 100ms)    │
│  ✅ Toast: "✅ Tìm thấy: Coca Cola 1.5L"      │
│  ✅ Sản phẩm add vào form/cart                 │
│                                                 │
│ Pass: ✅                                        │
└─────────────────────────────────────────────────┘
```

### Test 2: Quét Barcode 1D (EAN-13)

```
┌─ Test Case ─────────────────────────────────────┐
│ ID: T2                                          │
│ Name: Quét Barcode 1D thành công               │
│ Pre-condition:                                  │
│ - Barcode 1D EAN-13 được in rõ                 │
│ - Contrast tốt (đen/trắng)                     │
│                                                 │
│ Steps:                                          │
│  1-4. (giống T1)                               │
│  5. Đặt barcode vào khung (đặt ngang)          │
│  6. Chờ 2-3s (barcode 1D chậm hơn QR)         │
│                                                 │
│ Expected:                                       │
│  ✅ Barcode được detect trong 2-3s             │
│  ⚠️ Nếu không detect:                          │
│     → Thử manual input (có input field)        │
│     → Gõ "8936065200163" + Enter              │
│     → Kết quả tương tự                        │
│                                                 │
│ Notes:                                          │
│ - Barcode 1D detection tùy vào quality camera  │
│ - QR Code nên được ưu tiên                     │
│ - Fallback: manual input                       │
│                                                 │
│ Pass: ✅ (detect auto) hoặc ⚠️ (manual input)  │
└─────────────────────────────────────────────────┘
```

### Test 3: Sản Phẩm Không Tồn Tại

```
┌─ Test Case ─────────────────────────────────────┐
│ ID: T3                                          │
│ Name: Quét barcode không tồn tại               │
│                                                 │
│ Steps:                                          │
│  1. Tạo QR/Barcode với code: 9999999999999    │
│  2. Quét                                        │
│                                                 │
│ Expected:                                       │
│  ✅ API trả 404:                               │
│     {                                           │
│       "err": 1,                                 │
│       "msg": "Sản phẩm không tìm thấy"         │
│     }                                           │
│  ✅ Toast: "❌ Sản phẩm không tìm thấy"        │
│  ✅ Phát beep error: (400Hz, 150ms)            │
│  ✅ Hiển thị error state                       │
│  ✅ Lịch sử quét cập nhật                      │
│                                                 │
│ Pass: ✅                                        │
└─────────────────────────────────────────────────┘
```

### Test 4: Duplicate Detection

```
┌─ Test Case ─────────────────────────────────────┐
│ ID: T4                                          │
│ Name: Quét lặp không add duplicate              │
│                                                 │
│ Steps:                                          │
│  1. Quét cùng 1 mã vạch 5 lần liên tiếp nhanh │
│  2. Chờ xử lý                                   │
│                                                 │
│ Expected:                                       │
│  ✅ Lần 1: Detect & add sản phẩm               │
│  ✅ Lần 2-5: Bỏ qua (duplicate)                │
│  ✅ Chỉ nghe 1 beep success                    │
│  ✅ Lịch sử quét hiển thị 5 entry              │
│  ✅ Cart chỉ có 1 sản phẩm (qty=1)            │
│                                                 │
│ Pass: ✅                                        │
└─────────────────────────────────────────────────┘
```

### Test 5: Chuyển Camera

```
┌─ Test Case ─────────────────────────────────────┐
│ ID: T5                                          │
│ Name: Chuyển camera front/back                  │
│                                                 │
│ Steps:                                          │
│  1. Mở camera modal                            │
│  2. Nhấp nút "🔄 Chuyển camera"               │
│  3. Chờ reconnect (~1s)                        │
│  4. Tiếp tục quét                              │
│                                                 │
│ Expected:                                       │
│  ✅ Camera switch thành công                   │
│  ✅ Video feed update                          │
│  ✅ Có thể quét với camera mới                 │
│  ✅ Chất lượng image thay đổi                  │
│                                                 │
│ Notes:                                          │
│ - Desktop: Chỉ 1 camera → "switch" vô dụng     │
│ - Laptop: Có 2 camera (built-in + USB)        │
│ - Tablet: Front + Back → Có tác dụng           │
│                                                 │
│ Pass: ✅                                        │
└─────────────────────────────────────────────────┘
```

### Test 6: Từ Chối Quyền Camera

```
┌─ Test Case ─────────────────────────────────────┐
│ ID: T6                                          │
│ Name: Xử lý từ chối quyền camera               │
│                                                 │
│ Steps:                                          │
│  1. Mở camera modal                            │
│  2. Chọn "Block" khi browser yêu cầu quyền    │
│  3. Xem modal                                   │
│                                                 │
│ Expected:                                       │
│  ✅ Hiển thị: "❌ Bạn chưa cho phép..."        │
│  ✅ Hướng dẫn cách bật quyền                   │
│  ✅ Nút "🔄 Thử lại" hiển thị                  │
│  ✅ Nhấp thử lại → Browser yêu cầu lại        │
│                                                 │
│ Pass: ✅                                        │
└─────────────────────────────────────────────────┘
```

---

## 🔧 Troubleshooting

### ❌ Vấn Đề: "Không tìm thấy camera"

**Nguyên nhân:** Camera không kết nối hoặc driver sai

**Cách khắc phục:**

1. **Kiểm tra kết nối:**
   ```bash
   # Windows (Device Manager)
   # Tìm "Cameras" → Kiểm tra webcam có xuất hiện
   
   # Linux
   ls /dev/video* 
   # Nếu rỗng → Camera không detect
   
   # Mac (System Report)
   # Apple menu → About This Mac → System Report → Camera
   ```

2. **Thử camera online:**
   ```
   Chrome: chrome://camera
   Firefox: Mở https://webcamtests.com/
   ```

3. **Restart browser & device:**
   ```bash
   # Close all browser windows
   # Restart computer (nếu cần)
   # Mở browser mới
   ```

4. **Kiểm tra driver:**
   ```
   Windows: Settings > Devices > Cameras > Manage
   Mac: System Preferences > Security & Privacy > Camera
   ```

### ❌ Vấn Đề: "Camera đang được sử dụng bởi ứng dụng khác"

**Nguyên nhân:** Zoom, Skype, OBS, v.v. dùng camera

**Cách khắc phục:**

```bash
# Kiểm tra ứng dụng dùng camera
# Windows: Task Manager > Performance > GPU > 3D Engine
# Mac: Activity Monitor > Tìm zoom/skype/obs

# Đóng ứng dụng
killall Zoom.app  # Mac
taskkill /IM Zoom.exe  # Windows

# Hoặc dùng ngoài browser cũ, mở browser mới
```

### ❌ Vấn Đề: "Không được phép truy cập camera"

**Nguyên nhân:** Browser chặn quyền

**Cách khắc phục:**

**Chrome:**
```
1. Settings (⚙️) → Privacy and security
2. Site settings → Camera
3. Tìm localhost:3000 → Xoá
4. Reload page
5. Chọn "Allow"
```

**Firefox:**
```
1. Trang quét barcode
2. Nhấp vào biểu tượng 🔒 ở thanh URL
3. Cog icon → Permissions
4. Camera: Allow
```

**Edge:**
```
1. Settings → Privacy, search, and services
2. Site permissions → Camera
3. Allow on site
```

**Safari (Mac):**
```
1. System Preferences > Security & Privacy > Camera
2. Cho phép Safari
```

### ❌ Vấn Đề: "Quét không detect barcode"

**Nguyên nhân:** Chất lượng ảnh, góc, khoảng cách

| Triệu Chứng | Nguyên Nhân | Giải Pháp |
|-----------|----------|-----------|
| QR code không detect | Mờ/mấu| Print rõ, contrast cao |
| | Quá nhỏ | Phóng to (tối thiểu 2x2cm) |
| | Góc quét sai | Quét vuông góc |
| Barcode 1D không detect | Quá nhanh | Chậm lại, đặt lâu hơn |
| | Bị xoay | Đặt ngang, không xoay |
| | Ánh sáng xấu | Ánh sáng tốt, không tối |

**Mẹo quét:**

```
✅ QR Code:
   • Frame sáng xanh quanh
   • Đặt trực diện
   • Cách 10-20cm
   • Nền trắng, mã đen
   • In rõ 300 DPI

✅ Barcode 1D:
   • Đặt ngang
   • Cách 10-15cm
   • Nền trắng, barcode đen
   • Ánh sáng từ phía trên
   • Không phản chiếu

❌ Tránh:
   • Barcode bị xoay
   • Quá gần/quá xa
   • Ánh sáng từ phía sau
   • Bề mặt bóng loáng
```

### ❌ Vấn Đề: "API error 404"

**Nguyên nhân:** Barcode không tồn tại trong DB

**Cách khắc phục:**

```bash
# 1. Kiểm tra barcode tồn tại
SELECT barcode FROM product_units 
WHERE barcode = '8936065200163';

# 2. Kiểm tra sản phẩm is_active
SELECT p.is_active FROM products p
LEFT JOIN product_units pu ON p.product_id = pu.product_id
WHERE pu.barcode = '8936065200163';

# 3. Thêm barcode test nếu không có
INSERT INTO product_units (product_id, unit_name, barcode, conversion_to_base)
VALUES (1, 'Chai', '8936065200163', 1);

# 4. Kiểm tra API lại
curl "http://localhost:5000/api/v1/product/by-barcode/8936065200163?store_id=1" \
  -H "Authorization: Bearer TOKEN"
```

### ❌ Vấn Đề: "Chậm/Lag Camera"

**Nguyên nhân:** Hardware yếu, resolution cao

**Cách khắc phục:**

```javascript
// File: FE/src/components/CameraBarcodeScannerModal.js
// Giảm resolution

// Thay từ:
width: { ideal: 1280 },
height: { ideal: 720 },

// Thành:
width: { ideal: 640 },
height: { ideal: 480 },

// Hoặc nếu cần:
width: { ideal: 320 },
height: { ideal: 240 },
```

---

## 📚 Tham Khảo

### Tài Liệu

| Tài Liệu | Mục đích | Link |
|---------|---------|------|
| Quick Setup | 5 phút setup | `CAMERA_BARCODE_QUICK_SETUP.md` |
| Test Guide | Chi tiết hướng dẫn | `CAMERA_BARCODE_TEST_GUIDE.md` |
| Backend API Config | Cấu hình API | `BACKEND_API_CONFIG.md` |
| Barcode Scanner README | Tính năng | `BARCODE_SCANNER_README.md` |
| Implementation Guide | Chi tiết kỹ thuật | `BARCODE_SCANNER_IMPLEMENTATION.md` |
| Test Cases | 40+ test cases | `BARCODE_SCANNER_TEST_CASES.md` |

### Tools

| Tool | Mục đích |
|------|---------|
| `BARCODE_QR_GENERATOR.html` | Tạo mã vạch/QR code |
| Chrome DevTools (F12) | Debug JavaScript |
| Postman | Test API |
| MySQL Workbench | Manage database |

### External Resources

| Resource | Mục đích |
|----------|---------|
| https://qr-code-generator.com/ | QR code online |
| https://barcode.tec-it.com/ | Barcode online |
| https://webcamtests.com/ | Test webcam |
| https://github.com/cozmo/jsQR | jsQR library |

---

## ✅ Checklist Cuối Cùng

```
Pre-Test:
☐ Node.js, npm cài đặt
☐ Backend chạy (npm start)
☐ Frontend chạy (npm start)
☐ Database có dữ liệu test
☐ Webcam hoạt động

Setup:
☐ CameraBarcodeScannerModal.js tồn tại
☐ CameraBarcodeScannerModal.css tồn tại
☐ Component integrate vào trang
☐ Import statement thêm

Mã vạch test:
☐ Mã QR tạo thành công
☐ Mã Barcode tạo thành công
☐ In hoặc hiển thị trên màn hình

Test:
☐ T1: Quét QR code ✅
☐ T2: Quét Barcode 1D ⚠️/✅
☐ T3: Sản phẩm không tồn tại ✅
☐ T4: Duplicate detection ✅
☐ T5: Chuyển camera ✅
☐ T6: Từ chối quyền ✅

Performance:
☐ QR detection < 500ms ✅
☐ Barcode detection < 1s ⚠️/✅
☐ API response < 300ms ✅

Browser:
☐ Chrome ✅
☐ Firefox ✅
☐ Edge ✅
```

---

## 🎉 Hoàn Thành!

Nếu tất cả test passed, bạn đã:

✅ Setup environment thành công  
✅ Tạo mã vạch test  
✅ Integrate camera scanner  
✅ Test quét QR/Barcode  
✅ Xử lý error cases  
✅ Verify performance  

**Tiếp theo:** Deploy vào production, test trên máy quét barcode chuyên dụng, monitor performance.

---

**Có vấn đề? Xem mục "Troubleshooting" hoặc mở DevTools Console (F12)**
