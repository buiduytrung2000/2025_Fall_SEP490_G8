# Migration Helper - Find & Replace Patterns

File này chứa các pattern Find & Replace để tự động hóa việc migration.

## 🔍 Find & Replace Patterns

### 1. Toast Notifications

#### Pattern 1: Basic toast calls
**Find:**
```
toast.success(
```
**Replace:**
```
ToastNotification.success(
```

**Find:**
```
toast.error(
```
**Replace:**
```
ToastNotification.error(
```

**Find:**
```
toast.warning(
```
**Replace:**
```
ToastNotification.warning(
```

**Find:**
```
toast.info(
```
**Replace:**
```
ToastNotification.info(
```

### 2. Import Statements

#### Pattern 1: Remove toast import
**Find:**
```
import { toast } from 'react-toastify';
```
**Replace:** (Xóa dòng này)

#### Pattern 2: Add common components import
**Find:**
```
import { Button, IconButton, Alert } from '@mui/material';
```
**Replace:**
```
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

**Lưu ý:** Cần điều chỉnh đường dẫn `../../components/common` tùy theo vị trí file.

### 3. Button Components

#### Pattern 1: Primary Button
**Find:**
```
<Button
    variant="contained"
    color="primary"
```
**Replace:**
```
<PrimaryButton
```

**Find:**
```
    startIcon={<Add />}
```
**Replace:**
```
    startIcon={<Icon name="Add" />}
```

#### Pattern 2: Secondary Button
**Find:**
```
<Button
    variant="outlined"
```
**Replace:**
```
<SecondaryButton
```

#### Pattern 3: Danger Button
**Find:**
```
<Button
    variant="contained"
    color="error"
```
**Replace:**
```
<DangerButton
```

**Find:**
```
<Button
    variant="outlined"
    color="error"
```
**Replace:**
```
<DangerButton
    variant="outlined"
```

### 4. IconButton to ActionButton

#### Pattern 1: Edit IconButton
**Find:**
```
<IconButton
    color="warning"
    size="small"
    onClick={handleEdit}
>
    <EditIcon />
</IconButton>
```
**Replace:**
```
<ActionButton
    icon={<Icon name="Edit" />}
    action="edit"
    onClick={handleEdit}
/>
```

#### Pattern 2: Delete IconButton
**Find:**
```
<IconButton
    color="error"
    size="small"
    onClick={handleDelete}
>
    <DeleteIcon />
</IconButton>
```
**Replace:**
```
<ActionButton
    icon={<Icon name="Delete" />}
    action="delete"
    onClick={handleDelete}
/>
```

### 5. Icon Replacements

#### Common Icons
**Find:** `<AddIcon />` → **Replace:** `<Icon name="Add" />`
**Find:** `<EditIcon />` → **Replace:** `<Icon name="Edit" />`
**Find:** `<DeleteIcon />` → **Replace:** `<Icon name="Delete" />`
**Find:** `<RefreshIcon />` → **Replace:** `<Icon name="Refresh" />`
**Find:** `<SaveIcon />` → **Replace:** `<Icon name="Save" />`
**Find:** `<CancelIcon />` → **Replace:** `<Icon name="Cancel" />`
**Find:** `<CloseIcon />` → **Replace:** `<Icon name="Close" />`
**Find:** `<ViewIcon />` hoặc `<VisibilityIcon />` → **Replace:** `<Icon name="View" />`
**Find:** `<SearchIcon />` → **Replace:** `<Icon name="Search" />`
**Find:** `<DownloadIcon />` → **Replace:** `<Icon name="Download" />`
**Find:** `<UploadIcon />` → **Replace:** `<Icon name="Upload" />`
**Find:** `<PrintIcon />` → **Replace:** `<Icon name="Print" />`

### 6. Remove sx props không cần thiết

#### Pattern 1: Remove textTransform
**Find:**
```
    sx={{ textTransform: 'none' }}
```
**Replace:** (Xóa nếu dùng PrimaryButton/SecondaryButton)

## 📝 Step-by-step Migration Process

### Bước 1: Cập nhật Imports
1. Xóa: `import { toast } from 'react-toastify';`
2. Xóa icon imports từ `@mui/icons-material`
3. Thêm import common components:
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

### Bước 2: Replace Toast
- Tìm và thay thế tất cả `toast.*` → `ToastNotification.*`

### Bước 3: Replace Buttons
- Thay thế Button components theo patterns ở trên
- Lưu ý: Một số Button có thể cần giữ lại custom props

### Bước 4: Replace Icons
- Thay thế tất cả icon components
- Kiểm tra icon name có trong CommonIcons không

### Bước 5: Replace IconButtons
- Thay thế IconButton trong tables → ActionButton

### Bước 6: Clean up
- Xóa các sx props không cần thiết (textTransform, etc.)
- Xóa các import không dùng

### Bước 7: Test
- Kiểm tra file không có lỗi
- Test UI hoạt động đúng

## ⚠️ Lưu ý đặc biệt

### 1. Custom Buttons
Nếu Button có custom styling phức tạp, có thể cần giữ lại:
```jsx
// Giữ lại nếu có custom sx phức tạp
<Button
    variant="contained"
    sx={{ 
        customStyles: '...',
        // ... nhiều custom styles
    }}
>
```

### 2. Button trong DialogActions
Thường là:
- Cancel → SecondaryButton
- Confirm/Save → PrimaryButton
- Delete → DangerButton

### 3. Icon không có trong CommonIcons
Nếu icon không có trong CommonIcons, có thể:
- Import trực tiếp từ `@mui/icons-material`
- Hoặc thêm vào CommonIcons.js

### 4. Alert từ MUI
Nếu Alert có custom props phức tạp, có thể cần điều chỉnh:
```jsx
// Trước
<Alert severity="error" onClose={handleClose} sx={{ mb: 2 }}>

// Sau
<Alert severity="error" dismissible onClose={handleClose}>
```

## 🎯 Quick Reference

### Import Path
- Từ `pages/Admin/` → `../../components/common`
- Từ `pages/Warehouse/` → `../../components/common`
- Từ `pages/Store_Manager/` → `../../components/common`
- Từ `pages/Cashier/` → `../../components/common`
- Từ `components/` → `./common` hoặc `../common`

### Common Icon Names
- Add, Edit, Delete, Save, Cancel, Close
- Refresh, Search, View, Download, Upload
- Print, Filter, Check, Warning, Error, Info
- CheckCircle, ArrowBack, ArrowForward
- ExpandMore, ExpandLess

## 📚 Xem thêm

- `FE/src/components/common/README.md` - Hướng dẫn sử dụng
- `FE/src/components/common/MIGRATION_GUIDE.md` - Hướng dẫn migration chi tiết
- `FE/MIGRATION_STATUS.md` - Trạng thái migration

