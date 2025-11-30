import React from 'react';
import { IconButton, Tooltip } from '@mui/material';

/**
 * ActionButton - Nút hành động với icon (Edit, Delete, View, etc.)
 * @param {Object} props
 * @param {React.ReactNode} props.icon - Icon hiển thị
 * @param {string} props.action - Loại hành động: 'edit' | 'delete' | 'view' | 'add' | 'custom'
 * @param {string} props.color - Màu: 'primary' | 'warning' | 'error' | 'info' | 'success'
 * @param {string} props.size - Kích thước: 'small' | 'medium'
 * @param {Function} props.onClick - Handler khi click
 * @param {string} props.tooltip - Tooltip text
 * @param {boolean} props.disabled - Vô hiệu hóa nút
 */
const ActionButton = ({
    icon,
    action = 'custom',
    color,
    size = 'small',
    onClick,
    tooltip = '',
    disabled = false,
    ...props
}) => {
    // Tự động set color dựa trên action nếu không được chỉ định
    const getColor = () => {
        if (color) return color;
        switch (action) {
            case 'edit':
                return 'warning';
            case 'delete':
                return 'error';
            case 'view':
                return 'info';
            case 'add':
                return 'success';
            default:
                return 'default';
        }
    };

    // Tự động set tooltip dựa trên action nếu không được chỉ định
    const getTooltip = () => {
        if (tooltip) return tooltip;
        switch (action) {
            case 'edit':
                return 'Chỉnh sửa';
            case 'delete':
                return 'Xóa';
            case 'view':
                return 'Xem chi tiết';
            case 'add':
                return 'Thêm mới';
            default:
                return '';
        }
    };

    const button = (
        <IconButton
            color={getColor()}
            size={size}
            onClick={onClick}
            disabled={disabled}
            className={`action-button action-${action}`}
            {...props}
        >
            {icon}
        </IconButton>
    );

    if (getTooltip()) {
        return (
            <Tooltip title={getTooltip()} arrow>
                {button}
            </Tooltip>
        );
    }

    return button;
};

export default ActionButton;

