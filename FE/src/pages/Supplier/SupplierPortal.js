// src/pages/Supplier/SupplierPortal.js
import React, { useState, useEffect, useMemo } from 'react';
import { Spinner } from 'react-bootstrap';
import { MaterialReactTable } from 'material-react-table';
import { Box, Button, Chip } from '@mui/material';
import { getSupplierOrders, supplierApproveOrder } from '../../api/mockApi';

// Hàm helper format tiền
const formatCurrency = (number) => 
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(number);

const SupplierPortal = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = () => {
        getSupplierOrders().then(data => {
            setOrders(data);
            setLoading(false);
        });
    };

    useEffect(() => { load(); }, []);

    // Định nghĩa cột
    const columns = useMemo(
        () => [
            { accessorKey: 'id', header: 'Mã NCC' },
            { accessorKey: 'fromOrderId', header: 'Từ đơn cửa hàng' },
            { accessorKey: 'supplier', header: 'Nhà cung cấp' },
            {
                accessorKey: 'total',
                header: 'Tổng tiền',
                Cell: ({ cell }) => formatCurrency(cell.getValue()),
            },
            {
                accessorKey: 'status',
                header: 'Trạng thái',
                Cell: ({ cell }) => <Chip size="small" color={cell.getValue()==='Approved'?'success':'warning'} label={cell.getValue()} />,
            },
        ],
        [],
    );

    if (loading) return <Spinner animation="border" />;
    return (
        <div>
            <h2>Đơn kho gửi cho nhà cung cấp</h2>
            <MaterialReactTable
                columns={columns}
                data={orders}
                enableRowActions
                positionActionsColumn="last"
                renderRowActions={({ row }) => (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                            variant="contained"
                            size="small"
                            disabled={row.original.status !== 'Pending'}
                            onClick={async () => { await supplierApproveOrder(row.original.id); load(); }}
                        >
                            Approve
                        </Button>
                    </Box>
                )}
            />
        </div>
    );
};
export default SupplierPortal;