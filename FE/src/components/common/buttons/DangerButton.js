import React from 'react';
import { Button } from '@mui/material';

/**
 * DangerButton - Nút cảnh báo/xóa với style đồng bộ
 * @param {Object} props
 * @param {React.ReactNode} props.children - Nội dung nút
 * @param {React.ReactNode} props.startIcon - Icon bên trái
 * @param {React.ReactNode} props.endIcon - Icon bên phải
 * @param {string} props.size - Kích thước: 'small' | 'medium' | 'large'
 * @param {boolean} props.disabled - Vô hiệu hóa nút
 * @param {boolean} props.loading - Hiển thị loading state
 * @param {Function} props.onClick - Handler khi click
 * @param {string} props.variant - Variant: 'contained' | 'outlined'
 * @param {string} props.className - CSS class bổ sung
 */
const DangerButton = ({
    children,
    startIcon,
    endIcon,
    size = 'medium',
    disabled = false,
    loading = false,
    onClick,
    variant = 'contained',
    className = '',
    ...props
}) => {
    return (
        <Button
            variant={variant}
            color="error"
            size={size}
            disabled={disabled || loading}
            onClick={onClick}
            startIcon={loading ? null : startIcon}
            endIcon={endIcon}
            className={`danger-button ${className}`}
            sx={{
                textTransform: 'none',
                fontWeight: variant === 'contained' ? 600 : 500,
                borderRadius: 2,
                px: 3,
                ...props.sx
            }}
            {...props}
        >
            {loading ? 'Đang xử lý...' : children}
        </Button>
    );
};

export default DangerButton;

