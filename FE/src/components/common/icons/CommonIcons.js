import React from 'react';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Save as SaveIcon,
    Cancel as CancelIcon,
    Refresh as RefreshIcon,
    Search as SearchIcon,
    Visibility as ViewIcon,
    VisibilityOff as VisibilityOffIcon,
    Close as CloseIcon,
    Check as CheckIcon,
    Warning as WarningIcon,
    Error as ErrorIcon,
    Info as InfoIcon,
    CheckCircle as CheckCircleIcon,
    Download as DownloadIcon,
    Upload as UploadIcon,
    Print as PrintIcon,
    FilterList as FilterIcon,
    MoreVert as MoreIcon,
    ArrowBack as ArrowBackIcon,
    ArrowForward as ArrowForwardIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    Store as StoreIcon,
    AccountCircle as AccountCircleIcon,
    Lock as LockIcon,
    LockOutlined as LockOutlinedIcon,
    Replay as ReplayIcon,
    CalendarToday as CalendarTodayIcon,
    LocalShipping as LocalShippingIcon,
    Inventory as InventoryIcon,
    AttachMoney as AttachMoneyIcon
} from '@mui/icons-material';

/**
 * CommonIcons - Tập hợp các icon phổ biến để tái sử dụng
 * Đảm bảo tất cả icon có cùng style và size
 */
const CommonIcons = {
    Add: AddIcon,
    Edit: EditIcon,
    Delete: DeleteIcon,
    Save: SaveIcon,
    Cancel: CancelIcon,
    Refresh: RefreshIcon,
    Search: SearchIcon,
    View: ViewIcon,
    Visibility: ViewIcon,
    VisibilityOff: VisibilityOffIcon,
    Close: CloseIcon,
    Check: CheckIcon,
    Warning: WarningIcon,
    Error: ErrorIcon,
    Info: InfoIcon,
    CheckCircle: CheckCircleIcon,
    Download: DownloadIcon,
    Upload: UploadIcon,
    Print: PrintIcon,
    Filter: FilterIcon,
    More: MoreIcon,
    ArrowBack: ArrowBackIcon,
    ArrowForward: ArrowForwardIcon,
    ExpandMore: ExpandMoreIcon,
    ExpandLess: ExpandLessIcon,
    Store: StoreIcon,
    AccountCircle: AccountCircleIcon,
    Lock: LockIcon,
    LockOutlined: LockOutlinedIcon,
    Replay: ReplayIcon,
    CalendarToday: CalendarTodayIcon,
    Shipping: LocalShippingIcon, // Using LocalShipping as Shipping icon doesn't exist in MUI
    LocalShipping: LocalShippingIcon,
    Inventory: InventoryIcon,
    AttachMoney: AttachMoneyIcon
};

/**
 * Icon Component với props đồng bộ
 */
export const Icon = ({ name, size = 'medium', color, ...props }) => {
    const IconComponent = CommonIcons[name];
    if (!IconComponent) {
        console.warn(`Icon "${name}" không tồn tại trong CommonIcons`);
        return null;
    }

    const sizeMap = {
        small: 'small',
        medium: 'medium',
        large: 'large'
    };

    return (
        <IconComponent
            fontSize={sizeMap[size] || 'medium'}
            sx={{ color: color || 'inherit' }}
            {...props}
        />
    );
};

export default CommonIcons;

