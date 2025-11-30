/**
 * ComponentExamples - File ví dụ sử dụng các common components
 * File này chỉ để tham khảo, không được import vào production code
 */

import React, { useState } from 'react';
import { Box, Stack, Typography, Divider } from '@mui/material';

// Import common components
import {
    PrimaryButton,
    SecondaryButton,
    DangerButton,
    ActionButton,
    IconTextButton,
    Alert,
    ToastNotification,
    Icon,
    IconWrapper,
    CommonIcons
} from '../index';

const ComponentExamples = () => {
    const [showAlert, setShowAlert] = useState(true);

    const handleToast = (type) => {
        switch (type) {
            case 'success':
                ToastNotification.success('Thao tác thành công!');
                break;
            case 'error':
                ToastNotification.error('Đã xảy ra lỗi!');
                break;
            case 'warning':
                ToastNotification.warning('Vui lòng kiểm tra lại!');
                break;
            case 'info':
                ToastNotification.info('Thông tin quan trọng!');
                break;
            default:
                break;
        }
    };

    return (
        <Box sx={{ p: 4 }}>
            <Typography variant="h4" gutterBottom>
                Common Components Examples
            </Typography>

            {/* Buttons Section */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h5" gutterBottom>
                    Buttons
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Stack direction="row" spacing={2} flexWrap="wrap" gap={2}>
                    <PrimaryButton startIcon={<Icon name="Add" />}>
                        Thêm mới
                    </PrimaryButton>

                    <PrimaryButton loading>
                        Đang xử lý...
                    </PrimaryButton>

                    <SecondaryButton startIcon={<Icon name="Refresh" />}>
                        Làm mới
                    </SecondaryButton>

                    <DangerButton startIcon={<Icon name="Delete" />}>
                        Xóa
                    </DangerButton>

                    <DangerButton variant="outlined" startIcon={<Icon name="Cancel" />}>
                        Hủy
                    </DangerButton>

                    <IconTextButton
                        icon={<Icon name="Download" />}
                        position="start"
                        variant="contained"
                    >
                        Tải xuống
                    </IconTextButton>
                </Stack>
            </Box>

            {/* Action Buttons Section */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h5" gutterBottom>
                    Action Buttons
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Stack direction="row" spacing={2}>
                    <ActionButton
                        icon={<Icon name="Edit" />}
                        action="edit"
                        onClick={() => console.log('Edit clicked')}
                    />
                    <ActionButton
                        icon={<Icon name="Delete" />}
                        action="delete"
                        onClick={() => console.log('Delete clicked')}
                    />
                    <ActionButton
                        icon={<Icon name="View" />}
                        action="view"
                        onClick={() => console.log('View clicked')}
                    />
                    <ActionButton
                        icon={<Icon name="Add" />}
                        action="add"
                        onClick={() => console.log('Add clicked')}
                    />
                </Stack>
            </Box>

            {/* Notifications Section */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h5" gutterBottom>
                    Notifications
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Stack spacing={2} sx={{ mb: 2 }}>
                    <Alert severity="success" dismissible onClose={() => setShowAlert(false)}>
                        Thao tác thành công!
                    </Alert>
                    <Alert severity="error" title="Lỗi">
                        Đã xảy ra lỗi khi xử lý
                    </Alert>
                    <Alert severity="warning">
                        Vui lòng kiểm tra lại thông tin
                    </Alert>
                    <Alert severity="info">
                        Thông tin quan trọng
                    </Alert>
                </Stack>

                <Stack direction="row" spacing={2} flexWrap="wrap" gap={2}>
                    <PrimaryButton onClick={() => handleToast('success')}>
                        Toast Success
                    </PrimaryButton>
                    <DangerButton onClick={() => handleToast('error')}>
                        Toast Error
                    </DangerButton>
                    <SecondaryButton onClick={() => handleToast('warning')}>
                        Toast Warning
                    </SecondaryButton>
                    <SecondaryButton onClick={() => handleToast('info')}>
                        Toast Info
                    </SecondaryButton>
                </Stack>
            </Box>

            {/* Icons Section */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h5" gutterBottom>
                    Icons
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" gap={2}>
                    <Icon name="Add" size="small" />
                    <Icon name="Edit" size="medium" color="warning.main" />
                    <Icon name="Delete" size="large" color="error.main" />
                    <Icon name="Check" color="success.main" />
                    <Icon name="Close" color="error.main" />

                    <IconWrapper size="large" color="primary.main">
                        <CommonIcons.Add />
                    </IconWrapper>

                    <IconWrapper size="medium" color="success.main">
                        <CommonIcons.CheckCircle />
                    </IconWrapper>
                </Stack>
            </Box>
        </Box>
    );
};

export default ComponentExamples;

