# Common Components - Hướng dẫn sử dụng

Các component tái sử dụng để đảm bảo đồng bộ về style và behavior trong toàn bộ ứng dụng.

## 📦 Buttons

### PrimaryButton
Nút chính cho các hành động quan trọng.

```jsx
import { PrimaryButton } from '../../components/common';

<PrimaryButton 
    startIcon={<AddIcon />}
    onClick={handleAdd}
    loading={isLoading}
>
    Thêm mới
</PrimaryButton>
```

### SecondaryButton
Nút phụ cho các hành động thứ yếu.

```jsx
import { SecondaryButton } from '../../components/common';

<SecondaryButton 
    startIcon={<RefreshIcon />}
    onClick={handleRefresh}
>
    Làm mới
</SecondaryButton>
```

### DangerButton
Nút cảnh báo cho các hành động nguy hiểm (xóa, hủy).

```jsx
import { DangerButton } from '../../components/common';

<DangerButton 
    startIcon={<DeleteIcon />}
    onClick={handleDelete}
    variant="contained" // hoặc "outlined"
>
    Xóa
</DangerButton>
```

### ActionButton
Nút hành động với icon (Edit, Delete, View).

```jsx
import { ActionButton } from '../../components/common';
import { EditIcon, DeleteIcon } from '@mui/icons-material';

<ActionButton 
    icon={<EditIcon />}
    action="edit"
    onClick={handleEdit}
    tooltip="Chỉnh sửa"
/>

<ActionButton 
    icon={<DeleteIcon />}
    action="delete"
    onClick={handleDelete}
/>
```

### IconTextButton
Nút có icon và text.

```jsx
import { IconTextButton } from '../../components/common';
import { DownloadIcon } from '@mui/icons-material';

<IconTextButton 
    icon={<DownloadIcon />}
    position="start"
    variant="contained"
    onClick={handleDownload}
>
    Tải xuống
</IconTextButton>
```

## 🔔 Notifications

### ToastNotification
Wrapper đồng bộ cho toast notifications.

```jsx
import { ToastNotification } from '../../components/common';

// Thay vì: toast.success('Thành công')
ToastNotification.success('Thêm sản phẩm thành công');

// Thay vì: toast.error('Lỗi')
ToastNotification.error('Không thể tải dữ liệu');

// Thay vì: toast.warning('Cảnh báo')
ToastNotification.warning('Vui lòng kiểm tra lại');

// Thay vì: toast.info('Thông tin')
ToastNotification.info('Đang xử lý...');

// Promise notification
ToastNotification.promise(
    saveData(),
    {
        pending: 'Đang lưu...',
        success: 'Lưu thành công',
        error: 'Lỗi khi lưu'
    }
);
```

### Alert
Component thông báo inline.

```jsx
import { Alert } from '../../components/common';

<Alert 
    severity="error"
    title="Lỗi"
    dismissible
    onClose={() => setError(null)}
>
    Không thể tải dữ liệu
</Alert>

<Alert severity="success">
    Thao tác thành công
</Alert>
```

## 🎨 Icons

### Icon Component
Sử dụng icon với style đồng bộ.

```jsx
import { Icon } from '../../components/common';

<Icon name="Add" size="medium" color="primary" />
<Icon name="Edit" size="small" />
<Icon name="Delete" size="large" color="error" />
```

### IconWrapper
Wrapper để tùy chỉnh icon.

```jsx
import { IconWrapper } from '../../components/common';
import { AddIcon } from '@mui/icons-material';

<IconWrapper size="large" color="primary">
    <AddIcon />
</IconWrapper>
```

### CommonIcons
Import trực tiếp các icon.

```jsx
import { CommonIcons } from '../../components/common';

const { Add, Edit, Delete } = CommonIcons;

<Add fontSize="small" />
<Edit color="warning" />
<Delete color="error" />
```

## 📝 Ví dụ Migration

### Trước:
```jsx
import { Button } from '@mui/material';
import { toast } from 'react-toastify';
import { Add as AddIcon } from '@mui/icons-material';

<Button 
    variant="contained" 
    color="primary"
    startIcon={<AddIcon />}
    onClick={handleAdd}
>
    Thêm mới
</Button>

toast.success('Thành công');
```

### Sau:
```jsx
import { PrimaryButton, ToastNotification } from '../../components/common';
import { Icon } from '../../components/common';

<PrimaryButton 
    startIcon={<Icon name="Add" />}
    onClick={handleAdd}
>
    Thêm mới
</PrimaryButton>

ToastNotification.success('Thành công');
```

## 🎯 Lợi ích

1. **Đồng bộ**: Tất cả buttons, notifications, icons có style nhất quán
2. **Dễ bảo trì**: Thay đổi style ở một nơi, áp dụng cho toàn bộ app
3. **Type-safe**: Props được định nghĩa rõ ràng
4. **Tái sử dụng**: Giảm code duplicate
5. **Consistent UX**: Trải nghiệm người dùng đồng nhất

## 📚 Props Reference

### Button Props
- `children`: Nội dung nút
- `startIcon`: Icon bên trái
- `endIcon`: Icon bên phải
- `size`: 'small' | 'medium' | 'large'
- `disabled`: boolean
- `loading`: boolean
- `onClick`: Function
- `type`: 'button' | 'submit' | 'reset'
- `className`: string

### Notification Props
- `severity`: 'error' | 'warning' | 'info' | 'success'
- `title`: string (optional)
- `children`: ReactNode
- `dismissible`: boolean
- `onClose`: Function

### Icon Props
- `name`: string (tên icon trong CommonIcons)
- `size`: 'small' | 'medium' | 'large'
- `color`: string (CSS color)

