import React from 'react';
import { Alert as MuiAlert, AlertTitle, IconButton } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

/**
 * Alert - Component thông báo đồng bộ
 * @param {Object} props
 * @param {string} props.severity - Mức độ: 'error' | 'warning' | 'info' | 'success'
 * @param {string} props.title - Tiêu đề (optional)
 * @param {string} props.message - Nội dung thông báo (optional, nếu không có sẽ dùng children)
 * @param {React.ReactNode} props.children - Nội dung thông báo (optional, nếu không có sẽ dùng message)
 * @param {boolean} props.dismissible - Có thể đóng được không
 * @param {Function} props.onClose - Handler khi đóng
 * @param {string} props.variant - Variant: 'filled' | 'outlined' | 'standard'
 */
const Alert = ({
    severity = 'info',
    title,
    message,
    children,
    dismissible = false,
    onClose,
    variant = 'standard',
    ...props
}) => {
    const content = message || children;
    return (
        <MuiAlert
            severity={severity}
            variant={variant}
            onClose={dismissible ? onClose : undefined}
            action={
                dismissible && onClose ? (
                    <IconButton
                        aria-label="close"
                        color="inherit"
                        size="small"
                        onClick={onClose}
                    >
                        <CloseIcon fontSize="inherit" />
                    </IconButton>
                ) : undefined
            }
            sx={{
                borderRadius: 2,
                mb: 2,
                ...props.sx
            }}
            {...props}
        >
            {title && <AlertTitle>{title}</AlertTitle>}
            {content}
        </MuiAlert>
    );
};

export default Alert;

