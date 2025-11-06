// src/pages/Manager/ChangeShiftModal.js
import React, { useState, useEffect } from 'react';
import {
    Modal,
    Typography,
    Button,
    Box,
    FormControl,
    InputLabel,
    Select,
    MenuItem
} from '@mui/material';

// Style cho Modal (dùng Box của MUI thay cho Modal của React-Bootstrap)
const modalStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'background.paper',
    boxShadow: 24,
    p: 4, // padding
    borderRadius: 2,
};

const ChangeShiftModal = ({ show, onHide, onSave, shiftInfo, staffList = [] }) => {
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');

    const toIdString = (v) => (v === null || v === undefined ? '' : String(v));

    // Đồng bộ giá trị Select với danh sách option hiện tại
    useEffect(() => {
        const desired = toIdString(shiftInfo?.employeeId);
        const optionIds = new Set(staffList.map(s => toIdString(s.id)));
        if (desired && optionIds.has(desired)) {
            setSelectedEmployeeId(desired);
        } else {
            // Nếu chưa có option tương ứng (VD: staffList chưa load), set rỗng để tránh out-of-range
            setSelectedEmployeeId('');
        }
    }, [shiftInfo, staffList]);

    if (!shiftInfo) return null; // Không render gì nếu không có thông tin

    const handleSaveClick = () => {
        onSave(selectedEmployeeId || null);
    };

    return (
        <Modal
            open={show}
            onClose={onHide}
            aria-labelledby="change-shift-modal-title"
        >
            <Box sx={modalStyle}>
                <Typography id="change-shift-modal-title" variant="h6" component="h2" fontWeight="bold">
                    Thay đổi nhân viên
                </Typography>
                <Typography sx={{ mt: 1, mb: 2, color: 'text.secondary' }}>
                    {shiftInfo.day} - {shiftInfo.shiftName}
                </Typography>
                
                <FormControl fullWidth>
                    <InputLabel id="select-staff-label">Chọn nhân viên</InputLabel>
                    <Select
                        labelId="select-staff-label"
                        value={selectedEmployeeId}
                        label="Chọn nhân viên"
                        onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    >
                        {staffList.map(staff => (
                            <MenuItem key={staff.id} value={toIdString(staff.id)}>
                                {staff.name} ({staff.role})
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                    <Button variant="outlined" onClick={onHide}>Hủy</Button>
                    <Button variant="contained" onClick={handleSaveClick}>Lưu</Button>
                </Box>
            </Box>
        </Modal>
    );
};

export default ChangeShiftModal;