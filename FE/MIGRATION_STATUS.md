# Migration Status - Chuyển đổi sang Common Components

## ✅ Đã hoàn thành

### Files đã cập nhật:
1. ✅ `FE/src/pages/Admin/UserManagement.js`
   - Đã thay thế Button → PrimaryButton, SecondaryButton, DangerButton
   - Đã thay thế toast → ToastNotification
   - Đã thay thế icons → Icon component
   - Đã thay thế Alert → Alert từ common

2. ✅ `FE/src/pages/Store_Manager/VoucherManagement.js`
   - Đã thay thế Button → PrimaryButton, SecondaryButton
   - Đã thay thế IconButton → ActionButton
   - Đã thay thế toast → ToastNotification
   - Đã thay thế icons → Icon component

## 📋 Files cần cập nhật (37 files)

### Pages - Admin
- [ ] `FE/src/pages/Admin/AdminPermissions.js`

### Pages - CEO
- [ ] `FE/src/pages/CEO/CEODashboard.js`
- [ ] `FE/src/pages/CEO/CEORevenueBoard.js`
- [ ] `FE/src/pages/CEO/CEOOrdersBoard.js`

### Pages - Warehouse
- [ ] `FE/src/pages/Warehouse/ProductManagement.js` ⚠️ (File lớn, nhiều buttons/toast)
- [ ] `FE/src/pages/Warehouse/InventoryList.js`
- [ ] `FE/src/pages/Warehouse/InventoryManagement.js`
- [ ] `FE/src/pages/Warehouse/InventoryDetail.js`
- [ ] `FE/src/pages/Warehouse/SupplierManagement.js`
- [ ] `FE/src/pages/Warehouse/InvoicesManagement.js`
- [ ] `FE/src/pages/Warehouse/IncomingOrders.js`
- [ ] `FE/src/pages/Warehouse/BranchOrders.js`
- [ ] `FE/src/pages/Warehouse/OrderUpdate.js`
- [ ] `FE/src/pages/Warehouse/OrderShipment.js`
- [ ] `FE/src/pages/Warehouse/ProductDetail.js`
- [ ] `FE/src/pages/Warehouse/ProductPriceManagement.js`
- [ ] `FE/src/pages/Warehouse/Orders/OrderList.js`
- [ ] `FE/src/pages/Warehouse/Orders/OrderDetail.js`

### Pages - Store Manager
- [ ] `FE/src/pages/Store_Manager/ManagerDashboard.js`
- [ ] `FE/src/pages/Store_Manager/InventoryManagement.js`
- [ ] `FE/src/pages/Store_Manager/PurchaseOrders.js`
- [ ] `FE/src/pages/Store_Manager/StaffManagement.js`
- [ ] `FE/src/pages/Store_Manager/ScheduleManagement.js`
- [ ] `FE/src/pages/Store_Manager/ShiftReports.js`
- [ ] `FE/src/pages/Store_Manager/ShiftChangeRequestManagement.js`
- [ ] `FE/src/pages/Store_Manager/PaymentHistory.js`

### Pages - Cashier
- [ ] `FE/src/pages/Cashier/POS.js` ⚠️ (File lớn, phức tạp)
- [ ] `FE/src/pages/Cashier/Profile.js`
- [ ] `FE/src/pages/Cashier/PaymentHistory.js`
- [ ] `FE/src/pages/Cashier/MySchedule.js`
- [ ] `FE/src/pages/Cashier/ShiftChangeRequest.js`
- [ ] `FE/src/pages/Cashier/MyShiftReports.js`

### Pages - Public
- [ ] `FE/src/pages/public/Login.js`
- [ ] `FE/src/pages/public/Register.js`

### Pages - Supplier
- [ ] `FE/src/pages/Supplier/SupplierPortal.js`
- [ ] `FE/src/pages/Supplier/SupplierOrderDetail.js`

### Components
- [ ] `FE/src/components/ProductSelectorDialog.js`
- [ ] `FE/src/components/OrderItemsEditor.js`
- [ ] `FE/src/components/common/UserDialog.js`
- [ ] `FE/src/components/common/CustomerSearchModal.js`

## 🔧 Các thay đổi cần thực hiện

### 1. Import statements
**Trước:**
```jsx
import { Button, IconButton, Alert } from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { toast } from 'react-toastify';
```

**Sau:**
```jsx
import {
    PrimaryButton,
    SecondaryButton,
    DangerButton,
    ActionButton,
    ToastNotification,
    Alert,
    Icon
} from '../../components/common';
```

### 2. Button replacements
- `Button variant="contained" color="primary"` → `PrimaryButton`
- `Button variant="outlined"` → `SecondaryButton`
- `Button color="error"` → `DangerButton`
- `IconButton` trong tables → `ActionButton`

### 3. Toast replacements
- `toast.success()` → `ToastNotification.success()`
- `toast.error()` → `ToastNotification.error()`
- `toast.warning()` → `ToastNotification.warning()`
- `toast.info()` → `ToastNotification.info()`

### 4. Icon replacements
- `<AddIcon />` → `<Icon name="Add" />`
- `<EditIcon />` → `<Icon name="Edit" />`
- `<DeleteIcon />` → `<Icon name="Delete" />`
- Và các icon khác tương tự

### 5. Alert replacements
- `Alert` từ `@mui/material` → `Alert` từ `../../components/common`
- Thêm prop `dismissible` nếu cần

## 📝 Checklist cho mỗi file

Khi cập nhật một file, đảm bảo:
- [ ] Đã cập nhật imports
- [ ] Đã thay thế tất cả Button components
- [ ] Đã thay thế tất cả toast calls
- [ ] Đã thay thế tất cả icons
- [ ] Đã thay thế Alert nếu có
- [ ] Đã test file không có lỗi
- [ ] Đã kiểm tra UI hoạt động đúng

## 🚀 Cách tiếp tục

1. **Tự động hóa**: Sử dụng Find & Replace trong IDE:
   - Tìm: `toast.success(` → Thay: `ToastNotification.success(`
   - Tìm: `toast.error(` → Thay: `ToastNotification.error(`
   - Tìm: `toast.warning(` → Thay: `ToastNotification.warning(`
   - Tìm: `toast.info(` → Thay: `ToastNotification.info(`

2. **Manual review**: Sau khi replace tự động, cần review lại:
   - Kiểm tra imports
   - Kiểm tra Button components
   - Kiểm tra icons

3. **Test**: Sau mỗi file, test để đảm bảo không có lỗi

## ⚠️ Lưu ý

- Một số file có thể có custom styling, cần giữ lại
- Một số Button có thể cần giữ variant/color cụ thể
- Kiểm tra kỹ các file lớn như ProductManagement.js và POS.js

## 📊 Tiến độ

- **Đã hoàn thành**: 2/39 files (5%)
- **Còn lại**: 37 files (95%)

