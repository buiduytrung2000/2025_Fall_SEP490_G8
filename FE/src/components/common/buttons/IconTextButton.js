import React from 'react';
import { Button } from '@mui/material';

/**
 * IconTextButton - Nút có icon và text với style đồng bộ
 * @param {Object} props
 * @param {React.ReactNode} props.children - Text hiển thị
 * @param {React.ReactNode} props.icon - Icon hiển thị
 * @param {string} props.position - Vị trí icon: 'start' | 'end'
 * @param {string} props.variant - Variant: 'contained' | 'outlined' | 'text'
 * @param {string} props.color - Màu: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success'
 * @param {string} props.size - Kích thước: 'small' | 'medium' | 'large'
 * @param {boolean} props.disabled - Vô hiệu hóa nút
 * @param {Function} props.onClick - Handler khi click
 */
const IconTextButton = ({
    children,
    icon,
    position = 'start',
    variant = 'contained',
    color = 'primary',
    size = 'medium',
    disabled = false,
    onClick,
    ...props
}) => {
    const iconProps = position === 'start' 
        ? { startIcon: icon }
        : { endIcon: icon };

    return (
        <Button
            variant={variant}
            color={color}
            size={size}
            disabled={disabled}
            onClick={onClick}
            {...iconProps}
            className={`icon-text-button icon-${position}`}
            sx={{
                textTransform: 'none',
                fontWeight: variant === 'contained' ? 600 : 500,
                borderRadius: 2,
                px: 3,
                ...props.sx
            }}
            {...props}
        >
            {children}
        </Button>
    );
};

export default IconTextButton;

