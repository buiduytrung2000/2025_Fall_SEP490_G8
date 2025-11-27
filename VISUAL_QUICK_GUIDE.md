# 🎬 Visual Quick Guide - Webcam Barcode Scanner

## 🚀 Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    BARCODE SCANNER WORKFLOW                          │
└─────────────────────────────────────────────────────────────────────┘

                      STEP 1: SETUP (5 min)
                              │
                ┌─────────────┼─────────────┐
                │             │             │
            Terminal 1    Terminal 2   Database
         Backend (5000)  Frontend(3000) MySQL
         npm start        npm start      ↓
                │             │      (test data)
                └─────────────┼──────────────┘
                              │
                          STEP 2: CREATE
                          Mã vạch/QR test
                              │
                ┌─────────────┴─────────────┐
                │                           │
          BARCODE_QR_GENERATOR.html    Print hoặc
          (web tool)                  Hiển thị trên
          - Chọn sản phẩm             màn hình
          - Tạo mã
          - Download/In
                │                           │
                └─────────────┬─────────────┘
                              │
                          STEP 3: INTEGRATE
                          CameraBarcodeScannerModal
                          vào trang test
                              │
                        import + render
                        với onProductScanned
                              │
                          STEP 4: TEST
                          Mở http://localhost:3000
                          Nhấp 🎥 Camera
                              │
                        ┌─────┴─────────────────┐
                        │                       │
                    ALLOW CAMERA         User chọn "Allow"
                    Permission Check           │
                        │                       │
                        └─────┬─────────────────┘
                              │
                        STEP 5: SCAN
                        Đặt mã vạch vào khung
                              │
                ┌─────────────┼──────────────┐
                │             │              │
            Detect QR      Detect 1D      Error
            (< 500ms)      (< 1000ms)     Handling
                │             │              │
                └─────────────┬──────────────┘
                              │
                          API CALL
                    /api/v1/product/by-barcode
                    GET http://localhost:5000
                              │
                    ┌─────────┴──────────┐
                    │                    │
                SUCCESS (200)        ERROR (404/500)
                {err: 0, data: {...}} {err: 1}
                    │                    │
                ┌─────────┐         Toast Error
                │         │         Beep Error
            RESULT      FEEDBACK     (400Hz)
            Display     ✅ Toast
            Product     ✅ Beep
            Info        ✅ History
                │
            ADD TO CART
            OR FORM
                │
          ✅ TEST COMPLETE
```

---

## 📋 File Organization

```
2025_Fall_SEP490_G8/
│
├── 📂 FE/src/
│   ├── components/
│   │   └── CameraBarcodeScannerModal.js      ← Component (NEW)
│   └── assets/
│       └── CameraBarcodeScannerModal.css     ← Styling (NEW)
│
├── 📂 server/
│   └── src/
│       └── services/product.js               ← API service (MODIFIED)
│
├── 🎨 BARCODE_QR_GENERATOR.html              ← Tool (NEW)
│
└── 📚 Documentation/
    ├── CAMERA_BARCODE_QUICK_SETUP.md         ← 5 min setup
    ├── CAMERA_BARCODE_TEST_GUIDE.md          ← Detailed guide
    ├── BACKEND_API_CONFIG.md                 ← API config
    ├── SETUP_AND_TEST_COMPLETE_GUIDE.md      ← Everything
    └── README_CAMERA_BARCODE.md              ← This guide
```

---

## 🎯 Quick Start in 5 Steps

```
┌──────────────────────────────────────────────────────────┐
│ STEP 1: Terminal 1                                       │
├──────────────────────────────────────────────────────────┤
│ $ cd server                                              │
│ $ npm start                                              │
│ ✅ Server running on port 5000                           │
│ ✅ Database connected                                    │
└──────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────┐
│ STEP 2: Terminal 2                                       │
├──────────────────────────────────────────────────────────┤
│ $ cd FE                                                  │
│ $ npm start                                              │
│ ✅ Compiled successfully                                 │
│ ✅ Browser: http://localhost:3000                        │
└──────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────┐
│ STEP 3: Browser 1                                        │
├──────────────────────────────────────────────────────────┤
│ file:///d:/ki9/.../BARCODE_QR_GENERATOR.html            │
│ 1. Kéo xuống "📦 Dữ liệu mẫu"                           │
│ 2. Nhấp [QR] hoặc [Barcode]                             │
│ 3. Auto-fill vào form                                   │
│ 4. Nhấp [Tạo QR Code] hoặc [Tạo Barcode]               │
│ 5. Nhấp [Tải xuống] hoặc [In]                           │
│ ✅ Mã vạch/QR code ready                                 │
└──────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────┐
│ STEP 4: Browser 2 (http://localhost:3000)               │
├──────────────────────────────────────────────────────────┤
│ 1. Login vào app                                         │
│ 2. Navigate tới POS hoặc Warehouse page                 │
│ 3. Nhấp nút [🎥 Quét mã vạch bằng webcam]              │
│ 4. Modal mở → Chờ camera khởi động                      │
│ 5. Cho phép quyền truy cập camera khi browser yêu cầu   │
│ ✅ Camera live preview hiển thị                          │
└──────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────┐
│ STEP 5: Test Quét                                       │
├──────────────────────────────────────────────────────────┤
│ 1. Đặt mã vạch vào khung (cách 10-20cm)                 │
│ 2. Chờ detect                                            │
│ 3. Khi detect thành công:                               │
│    ✅ Tên sản phẩm hiển thị                             │
│    ✅ Giá & tồn kho                                      │
│    ✅ Beep sound phát (success)                         │
│    ✅ Toast notification                                │
│    ✅ Sản phẩm thêm vào form/cart                       │
└──────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow Diagram

```
BARCODE SCANNER DATA FLOW
═══════════════════════════════════════════════════════════

User scans barcode with webcam
        │
        ↓
CameraBarcodeScannerModal (Component)
├─ Capture video frame
├─ Apply image processing
├─ Detect QR code (jsQR library)
│  or Barcode 1D pattern
        │
        ↓ (if detected)
normalizeBarcode()
├─ Trim whitespace
├─ Validate length
├─ Check format
        │
        ↓ (if valid)
findProductByBarcode() [API Call]
└─ GET /api/v1/product/by-barcode/:code?store_id=id
        │
        ↓ (http request)
BACKEND: Product Service
├─ Search ProductUnit.barcode (exact match)
├─ Fallback: Search Product.sku
├─ Validate is_active = true
├─ Find PricingRule (if any)
├─ Get Inventory stock
├─ Calculate available_quantity
        │
        ↓ (database queries)
Database (MySQL)
├─ product_units table
├─ products table
├─ pricing_rules table
├─ inventories table
        │
        ↓ (return result)
BACKEND: Response JSON
{
  err: 0,
  msg: "OK",
  data: {
    product_id: 1,
    name: "Coca Cola",
    sku: "SKU001",
    current_price: 15000,
    available_quantity: 50,
    ...
  }
}
        │
        ↓ (http response 200)
FRONTEND: CameraBarcodeScannerModal
├─ Validate response
├─ Check product.is_active
├─ Emit onProductScanned(productData)
        │
        ↓ (callback)
FRONTEND: handleBarcodeScanned()
├─ Toast notification: "✅ Tìm thấy: ..."
├─ Beep success: 800Hz, 100ms
├─ Add to cart/form
├─ Clear input field
├─ Auto-focus next scan
        │
        ↓
USER SEES RESULT
✅ Product added successfully
```

---

## 📊 Test Matrix

```
╔════════════════════════════════════════════════════════════════╗
║                    TEST MATRIX                                 ║
╠════════════════════════════════════════════════════════════════╣
║ TEST ID │ DESCRIPTION        │ INPUT    │ EXPECTED  │ STATUS   ║
╠════════════════════════════════════════════════════════════════╣
║ T1      │ QR code success    │ [QR]     │ ✅ 200   │ ⏳ Ready ║
║ T2      │ Barcode 1D success │ [EAN]    │ ✅ 200   │ ⏳ Ready ║
║ T3      │ Product not found  │ [9999]   │ ❌ 404   │ ⏳ Ready ║
║ T4      │ Duplicate detect   │ [x5]     │ ✅ 1x    │ ⏳ Ready ║
║ T5      │ Camera switching   │ [toggle] │ ✅ OK    │ ⏳ Ready ║
║ T6      │ Permission denied  │ [block]  │ ❌ Error │ ⏳ Ready ║
║ T7      │ Performance        │ [any]    │ < 500ms  │ ⏳ Ready ║
╚════════════════════════════════════════════════════════════════╝
```

---

## 🎨 Component Architecture

```
┌──────────────────────────────────────┐
│   CameraBarcodeScannerModal          │
│   (Main Component)                   │
└───────────────────┬──────────────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
        ↓           ↓           ↓
    Camera      Scan Logic    UI/UX
    Features    Features      Features
    ─────────   ──────────    ──────
    │ Live      │ QR detect   │ Modal
    │   video   │ Barcode     │ Video
    │ Front/    │   detect    │   preview
    │   back    │ Duplicate   │ Result
    │ Permission  check      │ display
    │ handling  │ API call    │ History
    │           │ Error       │ Buttons
    │           │   handling  │ Toast
    │           │             │ Beep
    └───────────┴─────────────┴──────
            │
        Dependencies
        ├─ React (hooks)
        ├─ Bootstrap (modal)
        ├─ jsQR (QR detection)
        ├─ axios (HTTP)
        ├─ react-toastify
        └─ Web Audio API
```

---

## 🔐 Security Flow

```
USER REQUEST
    │
    ↓
[FRONTEND]
├─ Input validation (barcode format, length)
├─ Normalize barcode (trim, clean)
├─ Duplicate detection (prevent double-scan)
├─ Include JWT token in header
    │
    ↓ (HTTP request with auth header)
[BACKEND - MIDDLEWARE]
├─ verifyToken() - Check JWT validity
├─ checkRole() - Verify user permission
    │
    ↓ (if token valid)
[BACKEND - CONTROLLER]
├─ Validate code parameter (trim, length)
├─ Validate store_id (integer, positive)
├─ Sanitize input (prevent SQL injection)
    │
    ↓ (if all valid)
[BACKEND - SERVICE]
├─ Query database (via ORM - Sequelize)
├─ Return only active products
├─ Apply business logic safely
    │
    ↓ (safe result)
[RESPONSE]
├─ HTTP 200 (success) or 4xx/5xx (error)
├─ JSON with controlled error messages
├─ No sensitive data leakage
```

---

## ⚡ Performance Targets

```
┌──────────────────────────────────────────────────────────┐
│              PERFORMANCE METRICS                         │
├──────────────────────────────────────────────────────────┤
│                                                           │
│ QR Code Detection:     < 500ms  ✅ Target             │
│ Barcode 1D Detection:  < 1000ms ⚠️  Acceptable        │
│ API Response Time:     < 300ms  ✅ Expected            │
│ UI Render:             < 100ms  ✅ Expected            │
│ Total Scan-to-Result:  < 1.5s   ✅ Acceptable        │
│                                                           │
│ Bottlenecks:                                             │
│ • Camera frame capture: ~50-100ms                        │
│ • Image processing: ~100-200ms                           │
│ • Network latency: ~50-100ms                             │
│ • API processing: ~100-200ms                             │
│ • React re-render: ~50-100ms                             │
│                                                           │
│ Optimization Tips:                                       │
│ • Reduce camera resolution if lag                        │
│ • Add database indexes (barcode, sku)                    │
│ • Enable query caching (Redis - optional)                │
│ • Use connection pooling                                 │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

---

## 🎓 Learning Path Visualization

```
BEGINNER (15 min)
├─ Read: CAMERA_BARCODE_QUICK_SETUP.md (5 min)
├─ Do: Setup backend + frontend (5 min)
├─ Do: Create barcode + test (5 min)
└─ Result: ✅ Working camera scanner

INTERMEDIATE (1 hour)
├─ Read: SETUP_AND_TEST_COMPLETE_GUIDE.md (30 min)
├─ Do: Follow all steps (20 min)
├─ Do: Troubleshoot issues (10 min)
└─ Result: ✅ Fully functional & tested

ADVANCED (2 hours)
├─ Read: BACKEND_API_CONFIG.md (30 min)
├─ Read: CameraBarcodeScannerModal code (20 min)
├─ Do: Custom integration (30 min)
├─ Do: Performance optimization (20 min)
└─ Result: ✅ Production-ready solution
```

---

## 🐛 Common Issues & Quick Fixes

```
┌─────────────────────────────────────────────────────────┐
│ ISSUE               │ CAUSE        │ FIX                 │
├─────────────────────────────────────────────────────────┤
│ Camera not found    │ Not connected│ Check Device Manager│
│ Permission denied   │ Browser block│ Allow in settings   │
│ Not detecting       │ Poor quality │ Print clear, light  │
│ API error 404       │ No barcode   │ Add test data       │
│ Slow detection      │ Weak hardware│ Lower resolution    │
│ Lag/freeze          │ High load    │ Close other apps    │
│ False positives     │ Sensitivity │ Adjust threshold    │
│ Token expired       │ Auth expired │ Re-login            │
│ CORS error          │ Wrong origin │ Check backend config│
│ Beep not working    │ No speaker   │ Check volume & OS   │
└─────────────────────────────────────────────────────────┘
```

---

## 📈 Success Criteria Checklist

```
☐ Setup Complete
  ☐ Backend running (port 5000)
  ☐ Frontend running (port 3000)
  ☐ Database with test data
  ☐ Webcam detected & working

☐ Code Integration
  ☐ Component files copied
  ☐ Component imported
  ☐ Component rendered
  ☐ Callback handlers setup

☐ Test Barcode Created
  ☐ QR code generated
  ☐ Barcode 1D generated
  ☐ Files saved/printed
  ☐ Quality verified

☐ Functionality Testing
  ☐ T1: QR code detection ✅
  ☐ T2: Barcode 1D detection ✅
  ☐ T3: Error handling ✅
  ☐ T4: Duplicate detection ✅
  ☐ T5: Camera switching ✅
  ☐ T6: Permission handling ✅
  ☐ T7: Performance < 500ms ✅

☐ User Experience
  ☐ Toast notifications show
  ☐ Beep sounds play
  ☐ UI responsive
  ☐ Error messages clear
  ☐ Scan history displays

☐ Production Ready
  ☐ Code reviewed
  ☐ Tests passed
  ☐ Documentation complete
  ☐ Performance verified
  ☐ Security checked
```

---

## 🚀 Next Steps

```
WEEK 1:
├─ Day 1-2: Setup & local testing
├─ Day 3-4: Fix issues & optimize
└─ Day 5: Deploy to staging

WEEK 2:
├─ Day 1-2: Staging testing
├─ Day 3-4: Hardware testing (real scanner)
└─ Day 5: Deploy to production

ONGOING:
├─ Monitor API performance
├─ Track barcode match success rate
├─ Gather user feedback
├─ Plan Phase 2 enhancements
└─ Scale to other locations
```

---

## 📞 Quick Reference

| Need | File | Section |
|------|------|---------|
| Quick setup | QUICK_SETUP.md | All |
| Step-by-step | TEST_GUIDE.md | Phase 1-5 |
| API details | API_CONFIG.md | Endpoint Details |
| Issues | TEST_GUIDE.md | Troubleshooting |
| Code | Component.js | Check comments |
| All info | COMPLETE_GUIDE.md | Full reference |

---

**Ready to test? → Open CAMERA_BARCODE_QUICK_SETUP.md and follow 5 steps!** 🎯
