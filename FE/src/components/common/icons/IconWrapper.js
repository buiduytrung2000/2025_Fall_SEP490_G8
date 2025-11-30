import React from 'react';
import { Box } from '@mui/material';

/**
 * IconWrapper - Wrapper để đồng bộ style cho icons
 * @param {Object} props
 * @param {React.ReactNode} props.children - Icon component
 * @param {string} props.size - Kích thước: 'small' | 'medium' | 'large'
 * @param {string} props.color - Màu (CSS color hoặc theme color)
 * @param {string} props.className - CSS class bổ sung
 */
const IconWrapper = ({
    children,
    size = 'medium',
    color,
    className = '',
    ...props
}) => {
    const sizeMap = {
        small: { fontSize: '1rem', width: '16px', height: '16px' },
        medium: { fontSize: '1.25rem', width: '20px', height: '20px' },
        large: { fontSize: '1.5rem', width: '24px', height: '24px' }
    };

    return (
        <Box
            component="span"
            className={`icon-wrapper icon-${size} ${className}`}
            sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: color || 'inherit',
                ...sizeMap[size],
                ...props.sx
            }}
            {...props}
        >
            {children}
        </Box>
    );
};

export default IconWrapper;

