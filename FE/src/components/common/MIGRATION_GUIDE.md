# Migration Guide - Chuyển đổi sang Common Components

Hướng dẫn chuyển đổi code hiện tại sang sử dụng common components để đảm bảo đồng bộ.

## 🔄 Buttons

### Trước (Material-UI Button trực tiếp):
```jsx
import { Button } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

<Button 
    variant="contained" 
    color="primary"
    startIcon={<AddIcon />}
    onClick={handleAdd}
    sx={{ textTransform: 'none' }}
>
    Thêm mới
</Button>
```

### Sau (PrimaryButton):
```jsx
import { PrimaryButton } from '../../components/common';
import { Icon } from '../../components/common';

<PrimaryButton 
    startIcon={<Icon name="Add" />}
    onClick={handleAdd}
>
    Thêm mới
</PrimaryButton>
```

### Trước (Secondary Button):
```jsx
<Button 
    variant="outlined"
    color="primary"
    startIcon={<RefreshIcon />}
    onClick={handleRefresh}
    sx={{ textTransform: 'none' }}
>
    Làm mới
</Button>
```

### Sau (SecondaryButton):
```jsx
import { SecondaryButton } from '../../components/common';

<SecondaryButton 
    startIcon={<Icon name="Refresh" />}
    onClick={handleRefresh}
>
    Làm mới
</SecondaryButton>
```

### Trước (Delete Button):
```jsx
<Button 
    variant="contained"
    color="error"
    startIcon={<DeleteIcon />}
    onClick={handleDelete}
>
    Xóa
</Button>
```

### Sau (DangerButton):
```jsx
import { DangerButton } from '../../components/common';

<DangerButton 
    startIcon={<Icon name="Delete" />}
    onClick={handleDelete}
>
    Xóa
</DangerButton>
```

### Trước (IconButton trong table):
```jsx
import { IconButton } from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';

<IconButton
    color="warning"
    size="small"
    onClick={handleEdit}
>
    <EditIcon />
</IconButton>
<IconButton
    color="error"
    size="small"
    onClick={handleDelete}
>
    <DeleteIcon />
</IconButton>
```

### Sau (ActionButton):
```jsx
import { ActionButton } from '../../components/common';
import { Icon } from '../../components/common';

<ActionButton
    icon={<Icon name="Edit" />}
    action="edit"
    onClick={handleEdit}
/>
<ActionButton
    icon={<Icon name="Delete" />}
    action="delete"
    onClick={handleDelete}
/>
```

## 🔔 Notifications

### Trước (toast trực tiếp):
```jsx
import { toast } from 'react-toastify';

toast.success('Thêm sản phẩm thành công');
toast.error('Không thể tải dữ liệu');
toast.warning('Vui lòng kiểm tra lại');
toast.info('Đang xử lý...');
```

### Sau (ToastNotification):
```jsx
import { ToastNotification } from '../../components/common';

ToastNotification.success('Thêm sản phẩm thành công');
ToastNotification.error('Không thể tải dữ liệu');
ToastNotification.warning('Vui lòng kiểm tra lại');
ToastNotification.info('Đang xử lý...');
```

### Trước (Alert trực tiếp):
```jsx
import { Alert as MuiAlert } from '@mui/material';

<MuiAlert 
    severity="error" 
    onClose={() => setError(null)}
    sx={{ mb: 2 }}
>
    {error}
</MuiAlert>
```

### Sau (Alert component):
```jsx
import { Alert } from '../../components/common';

<Alert 
    severity="error"
    dismissible
    onClose={() => setError(null)}
>
    {error}
</Alert>
```

## 🎨 Icons

### Trước (Import trực tiếp):
```jsx
import { Add as AddIcon, Edit as EditIcon } from '@mui/icons-material';

<AddIcon fontSize="small" />
<EditIcon color="warning" />
```

### Sau (Icon component):
```jsx
import { Icon } from '../../components/common';

<Icon name="Add" size="small" />
<Icon name="Edit" color="warning.main" />
```

### Hoặc sử dụng CommonIcons:
```jsx
import { CommonIcons } from '../../components/common';

const { Add, Edit, Delete } = CommonIcons;

<Add fontSize="small" />
<Edit color="warning" />
```

## 📋 Checklist Migration

- [ ] Thay thế tất cả `Button variant="contained" color="primary"` → `PrimaryButton`
- [ ] Thay thế tất cả `Button variant="outlined"` → `SecondaryButton`
- [ ] Thay thế tất cả `Button color="error"` → `DangerButton`
- [ ] Thay thế tất cả `IconButton` trong tables → `ActionButton`
- [ ] Thay thế tất cả `toast.*` → `ToastNotification.*`
- [ ] Thay thế tất cả `Alert` từ MUI → `Alert` từ common
- [ ] Thay thế icon imports → `Icon` component hoặc `CommonIcons`
- [ ] Xóa các `sx={{ textTransform: 'none' }}` không cần thiết
- [ ] Kiểm tra tất cả pages đã sử dụng common components

## 🎯 Lợi ích sau migration

1. ✅ Code ngắn gọn hơn
2. ✅ Style đồng bộ toàn bộ app
3. ✅ Dễ bảo trì và cập nhật
4. ✅ Type-safe với props rõ ràng
5. ✅ Consistent UX

## 📝 Notes

- Các component common đã có sẵn các style mặc định, không cần thêm `sx` prop trừ khi cần override
- `Icon` component tự động map size và color theo Material-UI theme
- `ToastNotification` có autoClose time mặc định khác nhau cho từng loại
- `ActionButton` tự động set color và tooltip dựa trên `action` prop

