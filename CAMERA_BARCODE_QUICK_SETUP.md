# 🚀 Quick Setup Guide - Camera Barcode Scanner

## ⏱️ Thời gian: 5 phút

### 1️⃣ Cài đặt Package (Optional)

```bash
cd FE
npm install jsqr
# hoặc
npm install html5-qrcode  # Nặng hơn nhưng full-featured
```

### 2️⃣ Integrate Camera Modal vào Trang

**Option A: Warehouse Management Page**

```javascript
// FE/src/pages/Warehouse/WarehouseManagement.js
import CameraBarcodeScannerModal from '../../components/CameraBarcodeScannerModal'
import { useState } from 'react'

export default function WarehouseManagement() {
    const [showCamera, setShowCamera] = useState(false)
    const storeId = 1 // Replace with actual store_id

    const handleBarcodeScanned = (productData) => {
        console.log('Product:', productData)
        // TODO: Process scanned product
        // VD: Add to import form, check inventory, etc.
    }

    return (
        <div>
            <button onClick={() => setShowCamera(true)}>
                🎥 Quét mã vạch
            </button>

            <CameraBarcodeScannerModal
                show={showCamera}
                onProductScanned={handleBarcodeScanned}
                storeId={storeId}
                onClose={() => setShowCamera(false)}
            />
        </div>
    )
}
```

**Option B: POS Page**

```javascript
// FE/src/pages/Cashier/POS.js
// Already integrated via BarcodeInput component
// Add optional camera button:

<Button 
    variant="outline-primary" 
    size="sm"
    onClick={() => setShowCameraScanner(true)}
>
    🎥 Camera
</Button>

<CameraBarcodeScannerModal
    show={showCameraScanner}
    onProductScanned={handleBarcodeScanned}
    storeId={storeId}
    onClose={() => setShowCameraScanner(false)}
/>
```

### 3️⃣ Test

```bash
# Terminal 1: Backend
cd server && npm start

# Terminal 2: Frontend
cd FE && npm start

# Browser: http://localhost:3000
```

### 4️⃣ Tạo Mã Vạch Test

```
📂 Mở: BARCODE_QR_GENERATOR.html
1. Chọn sản phẩm
2. Nhấp "QR" hoặc "Barcode"
3. Tạo & in
```

### 5️⃣ Test Quét

```
1. Mở camera scanner modal
2. Cho phép quyền truy cập
3. Đặt mã vạch vào khung
4. Xem kết quả
```

---

## 🔧 Config Nhanh

### Tắt/Bật Camera

File: `FE/src/pages/Cashier/POS.js`

```javascript
const [posConfig] = useState({
    enableCameraScan: false,  // ← Đổi thành true để bật
    // ... rest config
})
```

### Đổi Format Barcode

File: `BARCODE_QR_GENERATOR.html`

```javascript
// Line ~450: const sampleProducts = [
// Thêm barcode custom:
{ name: 'Sản phẩm X', sku: 'SKUX', barcode: 'YOUR_CODE', price: 10000 }
```

### Performance Tuning

File: `FE/src/components/CameraBarcodeScannerModal.js`

```javascript
// Giảm resolution nếu chậm (line ~100)
width: { ideal: 640 },   // Từ 1280 → 640
height: { ideal: 480 },  // Từ 720 → 480

// Tăng timeout nếu chậm phát hiện (line ~150)
scanIntervalRef.current = requestAnimationFrame(scan)
// delay: setTimeout(scan, 200) // Add này nếu cần
```

---

## 📱 Test Scenarios

### ✅ Test 1: Quét QR

```
1. Generate QR từ BARCODE_QR_GENERATOR.html
2. Mở POS → 🎥 Camera
3. Cho phép quyền
4. Đặt QR trước webcam
5. Chờ detect ✅
```

### ✅ Test 2: Quét Barcode

```
1. Generate Barcode 1D
2. In hoặc hiển thị trên màn hình khác
3. Mở camera scanner
4. Quét barcode
5. Kết quả hiện trong 1-2s ✅
```

### ✅ Test 3: Error Handling

```
1. Quét barcode không tồn tại
2. Expect: "❌ Sản phẩm không tìm thấy" + beep error ✅
```

### ✅ Test 4: Duplicate Detection

```
1. Quét cùng code 5 lần nhanh
2. Expect: Chỉ detect 1 lần ✅
```

---

## 🛠️ Troubleshooting

| Vấn Đề | Giải Pháp |
|--------|----------|
| Camera không hoạt động | Check `Settings > Camera` permission |
| Không detect barcode | Print rõ, ánh sáng tốt, quét vuông góc |
| API error 404 | Kiểm tra DB có sản phẩm, barcode format đúng |
| Chậm/lag | Giảm resolution, đóng app khác |

---

## 📝 Files Reference

| File | Mục đích | Action |
|------|---------|--------|
| `CameraBarcodeScannerModal.js` | Modal quét | Import & use |
| `CameraBarcodeScannerModal.css` | Styling | Auto |
| `BARCODE_QR_GENERATOR.html` | Tạo mã test | Open in browser |
| `CAMERA_BARCODE_TEST_GUIDE.md` | Hướng dẫn chi tiết | Read for details |

---

## 🚀 Go Live Checklist

- [ ] Backend API `/by-barcode/:code` tested & working
- [ ] Frontend component integrated
- [ ] Test on Chrome/Firefox/Edge
- [ ] Webcam permission configured
- [ ] Performance < 500ms QR, < 1s Barcode
- [ ] Error handling verified
- [ ] Toast & beep feedback working
- [ ] Responsive on desktop/tablet/mobile
- [ ] Documentation reviewed

---

**Xong? Vào `CAMERA_BARCODE_TEST_GUIDE.md` để chi tiết hơn!**
