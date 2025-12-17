import React, { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Typography,
} from '@mui/material';
import { MaterialReactTable } from 'material-react-table';
import { getAllStores } from '../../api/storeApi';
import { ToastNotification } from '../../components/common';

const StoreManagement = () => {
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(false);

    const loadStores = async () => {
        try {
            setLoading(true);
            const res = await getAllStores();
            if (res.err === 0) {
                setStores(res.data || []);
            } else {
                ToastNotification.error(res.msg || 'Không thể tải danh sách cửa hàng');
            }
        } catch (error) {
            ToastNotification.error('Có lỗi xảy ra khi tải danh sách cửa hàng');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStores();
    }, []);

    const columns = useMemo(
        () => [
            {
                accessorKey: 'name',
                header: 'Tên cửa hàng',
            },
            {
                accessorKey: 'address',
                header: 'Địa chỉ',
            },
            {
                accessorKey: 'phone',
                header: 'Số điện thoại',
            },
        ],
        [],
    );

    return (
        <Box sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                        Quản lý cửa hàng
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Danh sách cửa hàng (chỉ xem). Quản lý thêm/sửa/xóa cửa hàng được thực hiện bởi Admin.
                    </Typography>
                </Box>
            </Box>

            <MaterialReactTable
                columns={columns}
                data={stores}
                state={{ isLoading: loading }}
                enableColumnFilters={false}
                enableColumnActions={false}
                localization={{
                    noRecordsToDisplay: 'Chưa có cửa hàng nào',
                    rowsPerPage: 'Số dòng mỗi trang',
                }}
                initialState={{
                    pagination: { pageSize: 10, pageIndex: 0 },
                }}
            />
        </Box>
    );
};

export default StoreManagement;

