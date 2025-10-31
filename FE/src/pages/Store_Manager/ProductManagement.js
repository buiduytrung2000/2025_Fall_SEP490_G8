// src/pages/Manager/ProductManagement.js
import React, { useState, useEffect, useMemo } from 'react';
import { Button, Spinner } from 'react-bootstrap';
import { getProducts } from '../../api/mockApi';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { MaterialReactTable } from 'material-react-table';
import { Box, IconButton } from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import AddIcon from '@mui/icons-material/Add';

// Hàm helper format tiền
const formatCurrency = (number) => 
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(number);

const ProductManagement = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [editData, setEditData] = useState({ id: null, code: '', name: '', price: '', stock: '' });
    const [isEditMode, setIsEditMode] = useState(false);

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

    const handleOpenAdd = () => {
        setEditData({ id: null, code: '', name: '', price: '', stock: '' });
        setIsEditMode(false);
        setShowEditDialog(true);
    };
    const handleOpenEdit = prod => {
        setEditData({ ...prod });
        setIsEditMode(true);
        setShowEditDialog(true);
    };
    const handleCloseEditDialog = () => setShowEditDialog(false);
    const handleEditField = e => setEditData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleSaveProduct = e => {
        e.preventDefault();
        if (isEditMode) {
            setProducts(ps => ps.map(item => item.id === editData.id ? { ...editData, price: parseInt(editData.price), stock: parseInt(editData.stock) } : item));
        } else {
            const newId = products.length > 0 ? Math.max(...products.map(p => p.id))+1 : 1;
            setProducts(ps => [{ ...editData, id: newId, price: parseInt(editData.price), stock: parseInt(editData.stock) }, ...ps]);
        }
        setShowEditDialog(false);
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
                        variant="contained" color="success"
                        startIcon={<AddIcon />}
                        onClick={handleOpenAdd}
                    >Thêm sản phẩm mới</Button>
                )}
                // Nút Sửa/Xóa ở mỗi hàng
                renderRowActions={({ row }) => (
                    <Box sx={{ display: 'flex', gap: '1rem' }}>
                        <IconButton color="warning" onClick={() => handleOpenEdit(row.original)}>
                            <Edit />
                        </IconButton>
                        <IconButton color="error" onClick={() => handleDeleteClick(row.original)}>
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
            {/* Dialog Thêm/Sửa */}
            <Dialog open={showEditDialog} onClose={handleCloseEditDialog} fullWidth maxWidth="xs">
                <form onSubmit={handleSaveProduct}>
                    <DialogTitle>{isEditMode ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}</DialogTitle>
                    <DialogContent dividers>
                        <TextField label="Mã sản phẩm" name="code" value={editData.code} required onChange={handleEditField} fullWidth margin="normal" />
                        <TextField label="Tên sản phẩm" name="name" value={editData.name} required onChange={handleEditField} fullWidth margin="normal" />
                        <TextField label="Giá bán" name="price" type="number" value={editData.price} required inputProps={{ min: 0 }} onChange={handleEditField} fullWidth margin="normal" />
                        <TextField label="Tồn kho" name="stock" type="number" value={editData.stock} required inputProps={{ min: 0 }} onChange={handleEditField} fullWidth margin="normal" />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseEditDialog} color="secondary" variant="outlined">Huỷ</Button>
                        <Button type="submit" variant="contained" color="primary">{isEditMode ? 'Lưu' : 'Thêm'}</Button>
                    </DialogActions>
                </form>
            </Dialog>
        </div>
    );
};
export default ProductManagement;