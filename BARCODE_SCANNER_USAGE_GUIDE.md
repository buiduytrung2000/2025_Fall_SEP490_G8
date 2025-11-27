# 🎯 Hướng Dẫn Sử Dụng Chức Năng Barcode Scanner

## ✅ Kiểm Tra: Các Thư Viện Đã Cài Đặt

Tất cả các thư viện cần thiết **đã được cài đặt sẵn**:

| Thư Viện | Mục Đích | Trạng Thái |
|----------|---------|-----------|
| `react` | Framework chính | ✅ Đã cài |
| `react-bootstrap` | UI Components | ✅ Đã cài |
| `react-icons` | Icons (FaQrcode, FaTimes) | ✅ Đã cài |
| `axios` | HTTP requests | ✅ Đã cài |
| `react-toastify` | Notifications | ✅ Đã cài |

**Không cần cài thêm thư viện nào!** Chỉ cần thiết bị scanner USB/Bluetooth để quét.

---

## 📁 Cấu Trúc Code Barcode Scanner

```
FE/src/
├── components/
│   └── BarcodeInput.js           ← Component quét barcode
├── utils/
│   └── barcodeScanner.js         ← Logic validation, debounce, throttle, beep
├── api/
│   └── barcodeApi.js             ← API tìm sản phẩm theo barcode
├── assets/
│   └── BarcodeInput.css          ← Styling
└── pages/Cashier/
    └── POS.js                    ← Trang sử dụng BarcodeInput
```

---

## 🚀 Cách Sử Dụng Trong Trang POS

### 1. **Nhập Component vào file POS.js**

```javascript
import BarcodeInput from '../../components/BarcodeInput'
```

### 2. **Sử dụng Component trong JSX**

```jsx
<BarcodeInput
    onProductScanned={handleBarcodeScanned}  // Callback khi quét thành công
    onError={(errorMsg) => console.error('Barcode error:', errorMsg)}  // Callback lỗi
    storeId={user?.store_id || 1}            // ID của cửa hàng
    config={posConfig}                       // Config quét
    placeholder="Quét mã vạch hoặc nhập SKU..."
/>
```

### 3. **Config Barcode Scanner**

Định nghĩa config trong component:

```javascript
const [posConfig] = useState({
    allowOversell: false,        // Không cho phép bán quá tồn kho
    beepOnScan: true,            // Phát beep khi quét thành công
    enableCameraScan: false,     // Tắt camera scan (có thể bật sau)
    debounceDelay: 200,          // Delay debounce (ms) - chống trùng lặp
    throttleInterval: 150,       // Throttle interval (ms) - giới hạn tốc độ
    clearInputAfterScan: true,   // Xóa input sau khi quét thành công
    validateFormat: true         // Validate định dạng barcode
})
```

### 4. **Xử Lý Callback khi Quét Thành Công**

```javascript
const handleBarcodeScanned = useCallback((productData) => {
    // productData từ API:
    // {
    //   product_id: number,
    //   name: string,
    //   sku: string,
    //   unit_id: number,
    //   unit_name: string,
    //   current_price: number,
    //   base_quantity: number,
    //   available_quantity: number,
    //   matched_by: 'barcode' | 'sku'
    // }

    if (!isShiftActive) {
        toast.error('⚠️ Vui lòng bắt đầu ca làm việc trước');
        return
    }

    // Thêm vào giỏ hàng
    setCart(currentCart => {
        const itemInCart = currentCart.find(item => item.id === productData.product_id)
        
        if (itemInCart) {
            return currentCart.map(item =>
                item.id === productData.product_id 
                    ? { ...item, qty: item.qty + 1 } 
                    : item
            )
        } else {
            return [...currentCart, { 
                id: productData.product_id,
                name: productData.name,
                price: productData.current_price,
                qty: 1,
                ...productData // Thêm các thông tin khác từ API
            }]
        }
    })
}, [isShiftActive])
```

---

## 💡 Hướng Dẫn Sử Dụng Thực Tế

### **Cách 1: Quét Barcode từ Scanner USB/Bluetooth**

1. ✅ Chuẩn bị scanner USB hoặc Bluetooth
2. ✅ Kết nối scanner với máy tính
3. ✅ Truy cập trang POS
4. ✅ **Nhấp vào ô input barcode** để focus
5. ✅ **Quét mã vạch từ sản phẩm**
6. ✅ Scanner sẽ tự động gửi dữ liệu vào input + nhấn Enter
7. ✅ Component tự động tìm sản phẩm và thêm vào giỏ hàng

**Tín hiệu:**
- 🔊 **Beep cao** (800Hz) = Quét thành công
- 🔊 **Beep thấp** (400Hz) = Quét thất bại/lỗi
- 🔊 **Beep vừa** (600Hz) = Cảnh báo (format không hỗ trợ nhưng tiếp tục tìm)

---

### **Cách 2: Nhập SKU Thủ Công**

1. ✅ Nhấp vào ô input barcode
2. ✅ **Gõ SKU của sản phẩm** (ví dụ: `SKU001`, `PROD-123`)
3. ✅ **Nhấn Enter**
4. ✅ Component tìm sản phẩm theo SKU

---

### **Cách 3: Xóa Input**

- Nhấn **`Esc`** hoặc nhấp nút **X** để xóa input

---

## 🔍 Định Dạng Barcode Được Hỗ Trợ

| Định Dạng | Ví Dụ | Độ Dài |
|-----------|-------|--------|
| **EAN-13** | 5901234123457 | 13 ký tự |
| **UPC-A** | 123456789012 | 12 ký tự |
| **UPC-E** | 12345678 | 8 ký tự |
| **Code 128** | ABC123XYZ | 6+ ký tự (chữ hoa) |
| **SKU Custom** | PROD-001, SKU_123 | 6+ ký tự (alphanumeric) |

---

## ⚙️ Công Năng Nâng Cao

### **Debounce & Throttle**

- **Debounce (200ms)**: Chống quét trùng lặp nhanh
- **Throttle (150ms)**: Giới hạn tốc độ xử lý (max ~6 scans/giây)
- **Duplicate Check (500ms)**: Nếu quét cùng barcode trong 500ms, sẽ bỏ qua

### **Duplicate Detection**

```javascript
// Component tự động phát hiện quét trùng lặp
// Nếu quét cùng barcode 2 lần liên tiếp trong 500ms → bỏ qua lần thứ 2
// Tin nhắn: không hiển thị, chỉ log console
```

### **Validation Tự Động**

- ✅ Kiểm tra độ dài barcode (min 6, max 128 ký tự)
- ✅ Kiểm tra ký tự hợp lệ (alphanumeric + `-` + `_`)
- ✅ Kiểm tra định dạng barcode (EAN, UPC, Code128, SKU)
- ✅ Kiểm tra sản phẩm có đang hoạt động không (`is_active`)
- ✅ Kiểm tra tồn kho (nếu `allowOversell: false`)

---

## 🎵 Âm Thanh Feedback

Mỗi lần quét, component sẽ phát beep tự động:

```javascript
// Success (quét thành công)
playBeep('success', 100)  // Tần số 800Hz, 100ms

// Error (quét thất bại)
playBeep('error', 150)    // Tần số 400Hz, 150ms

// Warning (cảnh báo)
playBeep('warning', 200)  // Tần số 600Hz, 200ms
```

**Bật/Tắt:** Chỉnh `config.enableSound: true/false`

---

## 🐛 Troubleshooting

### **1. Quét không làm gì**

```
❌ Problem: Quét barcode nhưng không có gì xảy ra
✅ Solution:
   - Kiểm tra input có được focus không (click vào input)
   - Kiểm tra barcode có tồn tại trong database không
   - Kiểm tra store_id có khớp với sản phẩm không
   - Mở console (F12) để xem lỗi chi tiết
```

### **2. Không nghe thấy beep**

```
❌ Problem: Quét xong không phát âm
✅ Solution:
   - Kiểm tra `enableSound: true` trong config
   - Kiểm tra speaker/volume máy tính
   - Kiểm tra trình duyệt hỗ trợ Web Audio API (tất cả trình duyệt hiện đại hỗ trợ)
```

### **3. Quét trùng lặp**

```
❌ Problem: Quét 1 lần nhưng thêm 2 sản phẩm
✅ Solution:
   - Tăng `debounceDelay` từ 200 → 300ms
   - Tăng `throttleInterval` từ 150 → 200ms
   - Kiểm tra scanner có vấn đề không
```

### **4. Không tìm thấy sản phẩm**

```
❌ Problem: Quét barcode nhưng báo "Không tìm thấy sản phẩm"
✅ Solution:
   - Kiểm tra barcode có trong bảng products không
   - Kiểm tra sản phẩm có được thêm vào store_id của cashier không
   - Kiểm tra sản phẩm có đang hoạt động không (is_active = 1)
   - Kiểm tra backend API có hoạt động không (test bằng Postman)
```

---

## 📊 Flow Hoạt Động Của Barcode Scanner

```
┌─────────────────────────────────────────────────────────┐
│ Scanner USB/Bluetooth gửi barcode hoặc nhập thủ công     │
└────────────────┬────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────┐
│ BarcodeInput Component nhận input                        │
│ - Focus vào input                                       │
│ - Nhấn Enter hoặc Enter từ scanner                      │
└────────────────┬────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────┐
│ Normalize & Validate Barcode                            │
│ - Trim, check độ dài, check ký tự                      │
│ - Validate định dạng (EAN, UPC, Code128, SKU)         │
└────────────────┬────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────┐
│ Duplicate Check                                         │
│ - Kiểm tra barcode có giống lần quét trước không      │
│ - Nếu trùng → bỏ qua (silent)                         │
└────────────────┬────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────┐
│ Call API: findProductByBarcode(barcode, storeId)       │
│ GET /api/v1/product/by-barcode/:barcode?store_id=1    │
└────────────────┬────────────────────────────────────────┘
                 │
                 ├─ Product Found ──────────────────────────┐
                 │                                          │
                 │  ✅ Beep Success (800Hz)                │
                 │  ✅ Toast success message               │
                 │  ✅ Call onProductScanned callback      │
                 │  ✅ Clear input (optional)              │
                 │                                          │
                 └──────────────────────────────────────────┘
                 │
                 ├─ Product Not Found ──────────────────────┐
                 │                                          │
                 │  ❌ Beep Error (400Hz)                  │
                 │  ❌ Toast error message                 │
                 │  ❌ Call onError callback               │
                 │                                          │
                 └──────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────┐
│ Clear input & Auto-focus for next scan                 │
└─────────────────────────────────────────────────────────┘
```

---

## 🎬 Ví Dụ Đầy Đủ: Trang POS.js

Xem file `POS.js` dòng 57-65 để xem config:

```javascript
const [posConfig] = useState({
    allowOversell: false,
    beepOnScan: true,
    enableCameraScan: false,
    debounceDelay: 200,
    throttleInterval: 150,
    clearInputAfterScan: true,
    validateFormat: true
})
```

Dòng 959-964 để xem sử dụng:

```javascript
<BarcodeInput
    onProductScanned={handleBarcodeScanned}
    onError={(errorMsg) => console.error('Barcode error:', errorMsg)}
    storeId={user?.store_id || Number(localStorage.getItem('store_id')) || 1}
    config={posConfig}
    placeholder="Quét mã vạch hoặc nhập SKU..."
/>
```

---

## ✨ Tính Năng Đã Cài Đặt

- ✅ Normalize & Validate barcode
- ✅ Debounce & Throttle (chống quét trùng)
- ✅ Duplicate detection (500ms window)
- ✅ Format validation (EAN-13, UPC-A/E, Code128, SKU)
- ✅ Audio feedback (beep success/error/warning)
- ✅ Auto-focus input
- ✅ Clear input after scan (configurable)
- ✅ Product lookup via API
- ✅ Stock check (configurable oversell)
- ✅ Error handling & logging

---

## 🔮 Tính Năng Có Thể Bật Sau

- 📷 Camera scan (QR code via webcam)
- 🔌 Scanner hardware integration
- 📊 Scan analytics & reporting
- 🎨 Custom beep tones per product category

---

## 📞 Cần Giúp?

Kiểm tra:
1. Console browser (F12) xem error messages
2. Network tab kiểm tra API calls
3. Đọc file `barcodeScanner.js` để hiểu logic
4. Thử quét barcode test hoặc nhập SKU thủ công

**Mọi thứ đã sẵn sàng! 🚀**
