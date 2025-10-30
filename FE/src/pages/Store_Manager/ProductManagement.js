// src/pages/Manager/ProductManagement.js
import React, { useState, useEffect, useMemo } from 'react';
import { Button, Spinner } from 'react-bootstrap';
import { getProducts } from '../../api/mockApi';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { MaterialReactTable } from 'material-react-table';
import { Box, IconButton } from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';

// Hàm helper format tiền
const formatCurrency = (number) => 
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(number);

const ProductManagement = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);

    useEffect(() => {
        getProducts().then(data => {
            setProducts(data);
            setLoading(false);
        });
    }, []);

    const handleDeleteClick = (product) => {
        setSelectedProduct(product);
        setShowModal(true);
    };

    const confirmDelete = () => {
        console.log("Deleting product:", selectedProduct.name);
        // Add logic to call delete API here
        setShowModal(false);
        setSelectedProduct(null);
    };

    // Định nghĩa cột
    const columns = useMemo(
        () => [
            {
                accessorKey: 'code',
                header: 'Mã SP',
                size: 100,
            },
            {
                accessorKey: 'name',
                header: 'Tên sản phẩm',
            },
            {
                accessorKey: 'price',
                header: 'Giá bán',
                // Custom cell render để format tiền
                Cell: ({ cell }) => formatCurrency(cell.getValue()),
            },
            {
                accessorKey: 'stock',
                header: 'Tồn kho',
                size: 100,
            },
        ],
        [],
    );

    if (loading) return <Spinner animation="border" />;

    return (
        <div>
            {/* Modal vẫn dùng của React Bootstrap */}
            <ConfirmationModal
                show={showModal}
                onHide={() => setShowModal(false)}
                onConfirm={confirmDelete}
                title="Xác nhận xóa"
                message={`Bạn có chắc chắn muốn xóa sản phẩm "${selectedProduct?.name}" không?`}
            />

            <MaterialReactTable
                columns={columns}
                data={products}
                enableRowActions
                // Nút "Thêm sản phẩm" ở trên đầu bảng
                renderTopToolbarCustomActions={() => (
                    <Button
                        variant="primary"
                        onClick={() => console.log('Add new product')}
                    >
                        Thêm sản phẩm mới
                    </Button>
                )}
                // Nút Sửa/Xóa ở mỗi hàng
                renderRowActions={({ row }) => (
                    <Box sx={{ display: 'flex', gap: '1rem' }}>
                        <IconButton
                            color="warning"
                            onClick={() => {
                                console.log('Edit product:', row.original);
                            }}
                        >
                            <Edit />
                        </IconButton>
                        <IconButton
                            color="error"
                            onClick={() => handleDeleteClick(row.original)}
                        >
                            <Delete />
                        </IconButton>
                    </Box>
                )}
                // Tùy chỉnh tiêu đề
                muiTableHeadCellProps={{
                    sx: {
                        backgroundColor: '#f5f5f5',
                        fontWeight: 'bold',
                    },
                }}
            />
        </div>
    );
};
export default ProductManagement;