// src/pages/Supplier/SupplierPortal.js
import React, { useState, useEffect, useMemo } from 'react';
import { Spinner, Badge } from 'react-bootstrap';
import { getPurchaseOrders } from '../../api/mockApi';
import { MaterialReactTable } from 'material-react-table';
import { Box, Button } from '@mui/material';

// Hàm helper format tiền
const formatCurrency = (number) => 
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(number);

const SupplierPortal = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getPurchaseOrders().then(data => {
            setOrders(data);
            setLoading(false);
        });
    }, []);

    // Định nghĩa cột
    const columns = useMemo(
        () => [
            {
                accessorKey: 'id',
                header: 'Mã ĐH',
            },
            {
                accessorKey: 'date',
                header: 'Ngày đặt',
            },
            {
                accessorKey: 'total',
                header: 'Tổng tiền',
                // Custom render
                Cell: ({ cell }) => formatCurrency(cell.getValue()),
            },
            {
                accessorKey: 'status',
                header: 'Trạng thái',
                // Custom render cho Badge
                Cell: ({ cell }) => (
                    <Badge bg={cell.getValue() === 'Approved' ? 'success' : 'warning'}>
                        {cell.getValue()}
                    </Badge>
                ),
            },
        ],
        [],
    );


    if (loading) return <Spinner animation="border" />;
    return (
        <div>
            <h2>Đơn đặt hàng</h2>
            <MaterialReactTable
                columns={columns}
                data={orders}
                enableRowActions
                renderRowActions={({ row }) => (
                    <Button
                        variant="contained"
                        size="small"
                        onClick={() => console.log('View order:', row.original.id)}
                    >
                        Xem chi tiết & Nhập hóa đơn
                    </Button>
                )}
            />
        </div>
    );
};
export default SupplierPortal;