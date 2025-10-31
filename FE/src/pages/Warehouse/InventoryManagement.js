// src/pages/Warehouse/InventoryManagement.js
import React, { useState, useEffect, useMemo } from 'react';
import { Button, Spinner } from 'react-bootstrap';
import { getProducts } from '../../api/mockApi';
import { MaterialReactTable } from 'material-react-table';

const InventoryManagement = () => {
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getProducts().then(data => {
            setInventory(data);
            setLoading(false);
        });
    }, []);

    const columns = useMemo(
        () => [
            {
                accessorKey: 'code',
                header: 'Mã SP',
            },
            {
                accessorKey: 'name',
                header: 'Tên sản phẩm',
            },
            {
                accessorKey: 'stock',
                header: 'Số lượng tồn',
            },
        ],
        [],
    );

    if (loading) return <Spinner animation="border" />;
    return (
        <div>
            <MaterialReactTable
                columns={columns}
                data={inventory}
                renderTopToolbarCustomActions={() => (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Button variant="success">Nhập kho</Button>
                        <Button variant="info">Xuất kho</Button>
                    </div>
                )}
            />
        </div>
    );
};
export default InventoryManagement;