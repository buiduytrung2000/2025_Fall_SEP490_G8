// src/pages/Warehouse/ProductManagement.js
import React, { useState, useEffect, useMemo } from 'react';
import { Alert } from 'react-bootstrap';
import { getAllProducts, createProduct, updateProduct, deleteProduct, getAllCategories, getAllSuppliers } from '../../api/productApi';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { MaterialReactTable } from 'material-react-table';
import { useNavigate } from 'react-router-dom';
import { Box, IconButton, Button } from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import AddIcon from '@mui/icons-material/Add';

// Hàm helper format tiền
const formatCurrency = (number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(number);

const ProductManagement = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [editData, setEditData] = useState({
        product_id: null,
        sku: '',
        name: '',
        hq_price: '',
        category_id: '',
        supplier_id: '',
        description: ''
    });
    const [isEditMode, setIsEditMode] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Load products, categories, suppliers
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setError(null);
        try {
            const [productsRes, categoriesRes, suppliersRes] = await Promise.all([
                getAllProducts(),
                getAllCategories(),
                getAllSuppliers()
            ]);

            if (productsRes.err === 0) {
                setProducts(productsRes.data || []);
            } else {
                setError(productsRes.msg || 'Không thể tải danh sách sản phẩm');
            }

            if (categoriesRes.err === 0) {
                setCategories(categoriesRes.data || []);
            }

            if (suppliersRes.err === 0) {
                setSuppliers(suppliersRes.data || []);
            }
        } catch (err) {
            setError('Lỗi khi tải dữ liệu: ' + err.message);
        }
    };

    const handleDeleteClick = (product) => {
        setSelectedProduct(product);
        setShowModal(true);
    };

    const confirmDelete = async () => {
        if (!selectedProduct) return;

        setError(null);
        setSuccess(null);

        try {
            const result = await deleteProduct(selectedProduct.product_id);
            if (result.err === 0) {
                setSuccess('Xóa sản phẩm thành công');
                await loadData();
            } else {
                setError(result.msg || 'Không thể xóa sản phẩm');
            }
        } catch (err) {
            setError('Lỗi khi xóa sản phẩm: ' + err.message);
        }

        setShowModal(false);
        setSelectedProduct(null);
    };

    const handleOpenAdd = () => {
        setEditData({
            product_id: null,
            sku: '',
            name: '',
            hq_price: '',
            category_id: '',
            supplier_id: '',
            description: ''
        });
        setIsEditMode(false);
        setError(null);
        setSuccess(null);
        setShowEditDialog(true);
    };

    const handleOpenEdit = (prod) => {
        setEditData({
            product_id: prod.product_id,
            sku: prod.sku || '',
            name: prod.name || '',
            hq_price: prod.hq_price || '',
            category_id: prod.category_id || '',
            supplier_id: prod.supplier_id || '',
            description: prod.description || ''
        });
        setIsEditMode(true);
        setError(null);
        setSuccess(null);
        setShowEditDialog(true);
    };

    const handleCloseEditDialog = () => {
        setShowEditDialog(false);
        setError(null);
        setSuccess(null);
    };

    const handleEditField = (e) => {
        const { name, value } = e.target;
        setEditData(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveProduct = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        // Validate required fields
        if (!editData.sku || !editData.name) {
            setError('Vui lòng điền đầy đủ thông tin bắt buộc (Mã SKU và Tên sản phẩm)');
            return;
        }

        try {
            const productData = {
                sku: editData.sku.trim(),
                name: editData.name.trim(),
                hq_price: parseFloat(editData.hq_price) || 0,
                category_id: editData.category_id || null,
                supplier_id: editData.supplier_id || null,
                description: editData.description?.trim() || null
            };

            let result;
            if (isEditMode) {
                result = await updateProduct(editData.product_id, productData);
                if (result.err === 0) {
                    setSuccess('Cập nhật sản phẩm thành công');
                    await loadData();
                    setShowEditDialog(false);
                } else {
                    setError(result.msg || 'Không thể cập nhật sản phẩm');
                }
            } else {
                result = await createProduct(productData);
                if (result.err === 0) {
                    setSuccess('Thêm sản phẩm thành công');
                    await loadData();
                    setShowEditDialog(false);
                } else {
                    setError(result.msg || 'Không thể thêm sản phẩm');
                }
            }
        } catch (err) {
            setError('Lỗi khi lưu sản phẩm: ' + err.message);
        }
    };

    // Định nghĩa cột
    const columns = useMemo(
        () => [
            {
                accessorKey: 'sku',
                header: 'Mã SKU',
                size: 120,
            },
            {
                accessorKey: 'name',
                header: 'Tên sản phẩm',
                size: 200,
            },
            {
                accessorKey: 'hq_price',
                header: 'Giá HQ',
                size: 120,
                Cell: ({ cell }) => formatCurrency(cell.getValue() || 0),
            },
            {
                accessorKey: 'category.name',
                header: 'Danh mục',
                size: 150,
                Cell: ({ row }) => row.original.category?.name || '-',
            },
            {
                accessorKey: 'supplier.name',
                header: 'Nhà cung cấp',
                size: 150,
                Cell: ({ row }) => row.original.supplier?.name || '-',
            },
            {
                accessorKey: 'description',
                header: 'Mô tả',
                size: 200,
                Cell: ({ cell }) => {
                    const desc = cell.getValue();
                    return desc ? (desc.length > 50 ? desc.substring(0, 50) + '...' : desc) : '-';
                },
            },
        ],
        [],
    );

    return (
        <div style={{ padding: '20px' }}>
            {/* Thông báo lỗi/thành công */}
            {error && (
                <Alert variant="danger" dismissible onClose={() => setError(null)} style={{ marginBottom: '20px' }}>
                    {error}
                </Alert>
            )}
            {success && (
                <Alert variant="success" dismissible onClose={() => setSuccess(null)} style={{ marginBottom: '20px' }}>
                    {success}
                </Alert>
            )}

            {/* Modal xác nhận xóa */}
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
                muiTableBodyRowProps={({ row }) => ({
                    onClick: (event) => {
                        // Prevent navigation when clicking on action buttons
                        if (event.target.closest('button')) return;
                        navigate(`/warehouse/products/${row.original.product_id}`);
                    },
                    sx: {
                        cursor: 'pointer', // Change cursor on hover
                    },
                })}
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
            <Dialog open={showEditDialog} onClose={handleCloseEditDialog} fullWidth maxWidth="sm">
                <form onSubmit={handleSaveProduct}>
                    <DialogTitle>{isEditMode ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}</DialogTitle>
                    <DialogContent dividers>
                        {error && (
                            <Alert variant="danger" style={{ marginBottom: '15px' }}>
                                {error}
                            </Alert>
                        )}
                        {success && (
                            <Alert variant="success" style={{ marginBottom: '15px' }}>
                                {success}
                            </Alert>
                        )}
                        <TextField
                            label="Mã SKU"
                            name="sku"
                            value={editData.sku}
                            required
                            onChange={handleEditField}
                            fullWidth
                            margin="normal"
                            disabled={isEditMode}
                            helperText={isEditMode ? "Không thể thay đổi mã SKU" : ""}
                        />
                        <TextField
                            label="Tên sản phẩm"
                            name="name"
                            value={editData.name}
                            required
                            onChange={handleEditField}
                            fullWidth
                            margin="normal"
                        />
                        <TextField
                            label="Giá HQ (VND)"
                            name="hq_price"
                            type="number"
                            value={editData.hq_price}
                            required
                            inputProps={{ min: 0, step: 1000 }}
                            onChange={handleEditField}
                            fullWidth
                            margin="normal"
                            helperText="Giá tại trụ sở chính"
                        />
                        <FormControl fullWidth margin="normal">
                            <InputLabel>Danh mục</InputLabel>
                            <Select
                                name="category_id"
                                value={editData.category_id || ''}
                                onChange={handleEditField}
                                label="Danh mục"
                            >
                                <MenuItem value="">
                                    <em>Không chọn</em>
                                </MenuItem>
                                {categories.map((cat) => (
                                    <MenuItem key={cat.category_id} value={cat.category_id}>
                                        {cat.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth margin="normal">
                            <InputLabel>Nhà cung cấp</InputLabel>
                            <Select
                                name="supplier_id"
                                value={editData.supplier_id || ''}
                                onChange={handleEditField}
                                label="Nhà cung cấp"
                            >
                                <MenuItem value="">
                                    <em>Không chọn</em>
                                </MenuItem>
                                {suppliers.map((sup) => (
                                    <MenuItem key={sup.supplier_id} value={sup.supplier_id}>
                                        {sup.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            label="Mô tả"
                            name="description"
                            value={editData.description}
                            onChange={handleEditField}
                            fullWidth
                            margin="normal"
                            multiline
                            rows={3}
                        />
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

