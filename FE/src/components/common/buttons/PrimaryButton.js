import React from 'react';
import { Button } from '@mui/material';

/**
 * PrimaryButton - Nút chính với style đồng bộ
 * @param {Object} props
 * @param {React.ReactNode} props.children - Nội dung nút
 * @param {React.ReactNode} props.startIcon - Icon bên trái
 * @param {React.ReactNode} props.endIcon - Icon bên phải
 * @param {string} props.size - Kích thước: 'small' | 'medium' | 'large'
 * @param {boolean} props.disabled - Vô hiệu hóa nút
 * @param {boolean} props.loading - Hiển thị loading state
 * @param {Function} props.onClick - Handler khi click
 * @param {string} props.type - Type của button: 'button' | 'submit' | 'reset'
 * @param {string} props.className - CSS class bổ sung
 */
const PrimaryButton = ({
    children,
    startIcon,
    endIcon,
    size = 'medium',
    disabled = false,
    loading = false,
    onClick,
    type = 'button',
    className = '',
    ...props
}) => {
    return (
        <Button
            variant="contained"
            color="primary"
            size={size}
            disabled={disabled || loading}
            onClick={onClick}
            type={type}
            startIcon={loading ? null : startIcon}
            endIcon={endIcon}
            className={`primary-button ${className}`}
            sx={{
                textTransform: 'none',
                fontWeight: 600,
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

export default PrimaryButton;

