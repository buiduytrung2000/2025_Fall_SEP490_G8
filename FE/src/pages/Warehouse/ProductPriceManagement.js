import React, { useState, useEffect, useMemo } from 'react';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton } from '@mui/material';
import { MaterialReactTable } from 'material-react-table';
import { getProducts } from '../../api/mockApi';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';

const ProductPriceManagement = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showPriceModal, setShowPriceModal] = useState(false);
    const [newPrice, setNewPrice] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [priceHistoryMap, setPriceHistoryMap] = useState({});
    const [showAddModal, setShowAddModal] = useState(false);
    const [addCode, setAddCode] = useState('');
    const [addName, setAddName] = useState('');
    const [addPrice, setAddPrice] = useState('');

    useEffect(() => {
        getProducts().then(data => {
            setProducts(data.map(p => ({...p, price: p.price || 20000})));
            const initHistory = {};
            data.forEach(p => {
                initHistory[p.id] = [
                    { price: p.price || 20000, startDate: '2024-01-01', endDate: '' }
                ];
            });
            setPriceHistoryMap(initHistory);
            setLoading(false);
        });
    }, []);

    // Cột table sản phẩm
    const columns = useMemo(() => [
        { accessorKey: 'code', header: 'Mã sản phẩm' },
        { accessorKey: 'name', header: 'Tên sản phẩm' },
        {
            accessorKey: 'price',
            header: 'Giá hiện tại',
            size: 120,
            Cell: ({ cell }) => <span style={{ color: '#1976d2', fontWeight: 700 }}>{parseInt(cell.getValue()).toLocaleString()}₫</span>,
        },
    ], []);

    const handleShowPriceModal = (prod) => {
        setSelectedProduct(prod);
        setNewPrice(prod.price);
        setStartDate('');
        setEndDate('');
        setShowPriceModal(true);
    };
    const handleClosePriceModal = () => setShowPriceModal(false);
    const handleUpdatePrice = (e) => {
        e.preventDefault();
        setProducts(ps => ps.map(item =>
            item.id === selectedProduct.id ? { ...item, price: newPrice } : item
        ));
        setPriceHistoryMap(prev => ({
            ...prev,
            [selectedProduct.id]: [
                { price: newPrice, startDate, endDate },
                ...(prev[selectedProduct.id] || [])
            ],
        }));
        setShowPriceModal(false);
    };

    const handleOpenAddModal = () => {
        setAddCode(''); setAddName(''); setAddPrice(''); setShowAddModal(true);
    };
    const handleCloseAddModal = () => setShowAddModal(false);
    const handleAddProduct = (e) => {
        e.preventDefault();
        const newId = products.length > 0 ? Math.max(...products.map(p => p.id))+1 : 1;
        const product = {
            id: newId,
            code: addCode,
            name: addName,
            price: addPrice
        };
        setProducts(ps => [product, ...ps]);
        setPriceHistoryMap(prev => ({
            ...prev,
            [product.id]: [
                { price: addPrice, startDate: new Date().toISOString().slice(0,10), endDate: '' }
            ]
        }));
        setShowAddModal(false);
    };

    // MRT columns cho bảng lịch sử giá (khi đã chọn sp)
    const historyColumns = useMemo(() => [
        {
            accessorKey: 'price',
            header: 'Giá',
            Cell: ({ cell }) => <>{parseInt(cell.getValue()).toLocaleString()}₫</>,
            size: 100,
        },
        {
            accessorKey: 'startDate',
            header: 'Bắt đầu áp dụng',
            size: 120,
        },
        {
            accessorKey: 'endDate',
            header: 'Kết thúc áp dụng',
            size: 120,
            Cell: ({ cell }) => cell.getValue() || '-',
        },
    ], []);

    if (loading) return <div style={{textAlign:'center',marginTop:50}}>Loading...</div>;
    return (
        <div className="container py-3">
            <h4 className="mb-4 fw-bold">Quản lý giá sản phẩm</h4>
            <Button
                variant="contained"
                color="success"
                startIcon={<AddIcon />}
                sx={{ mb: 2 }}
                onClick={handleOpenAddModal}
            >Thêm sản phẩm mới</Button>
            <MaterialReactTable
                columns={columns}
                data={products}
                enableRowActions
                renderRowActions={({ row }) => (
                    <IconButton color="primary" onClick={() => handleShowPriceModal(row.original)} title="Cập nhật giá">
                        <EditIcon />
                    </IconButton>
                )}
                muiTableHeadCellProps={{
                    sx: {
                        backgroundColor: '#f5f5f5',
                        fontWeight: 'bold',
                    },
                }}
            />
            {/* Lịch sử giá dùng MRT luôn */}
            {selectedProduct && priceHistoryMap[selectedProduct.id] && (
                <div className="mt-4">
                    <h6 className="mb-2 fw-bold">Lịch sử thay đổi giá: {selectedProduct.name} ({selectedProduct.code})</h6>
                    <MaterialReactTable
                        columns={historyColumns}
                        data={priceHistoryMap[selectedProduct.id]}
                        enableRowActions={false}
                        enableTopToolbar={false}
                        enableColumnActions={false}
                        muiTablePaperProps={{ sx:{backgroundColor:'#fff'} }}
                        muiTableContainerProps={{ sx: { borderRadius:2, border: '1px solid #eee' } }}
                    />
                </div>
            )}
            {/* Modal cập nhật giá dùng MUI Dialog */}
            <Dialog open={showPriceModal} onClose={handleClosePriceModal} fullWidth maxWidth="xs">
                <form onSubmit={handleUpdatePrice}>
                    <DialogTitle>Cập nhật giá cho {selectedProduct?.name}</DialogTitle>
                    <DialogContent dividers>
                        <TextField
                            label="Giá mới (₫)"
                            type="number"
                            inputProps={{ min: 0 }}
                            value={newPrice}
                            onChange={e => setNewPrice(e.target.value)}
                            fullWidth
                            margin="normal"
                            required
                        />
                        <TextField
                            label="Bắt đầu áp dụng từ ngày"
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            fullWidth
                            margin="normal"
                            InputLabelProps={{ shrink: true }}
                            required
                        />
                        <TextField
                            label="Kết thúc áp dụng (tuỳ chọn)"
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            fullWidth
                            margin="normal"
                            InputLabelProps={{ shrink: true }}
                            inputProps={{ min: startDate||undefined }}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClosePriceModal} color="secondary" variant="outlined">Huỷ</Button>
                        <Button type="submit" variant="contained" color="primary">Lưu</Button>
                    </DialogActions>
                </form>
            </Dialog>
            <Dialog open={showAddModal} onClose={handleCloseAddModal} fullWidth maxWidth="xs">
                <form onSubmit={handleAddProduct}>
                    <DialogTitle>Thêm sản phẩm mới</DialogTitle>
                    <DialogContent dividers>
                        <TextField
                            label="Mã sản phẩm"
                            value={addCode}
                            onChange={e => setAddCode(e.target.value)}
                            fullWidth
                            margin="normal"
                            required
                        />
                        <TextField
                            label="Tên sản phẩm"
                            value={addName}
                            onChange={e => setAddName(e.target.value)}
                            fullWidth
                            margin="normal"
                            required
                        />
                        <TextField
                            label="Giá khởi tạo (₫)"
                            type="number"
                            inputProps={{ min: 0 }}
                            value={addPrice}
                            onChange={e => setAddPrice(e.target.value)}
                            fullWidth
                            margin="normal"
                            required
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseAddModal} color="secondary" variant="outlined">Huỷ</Button>
                        <Button type="submit" variant="contained" color="primary">Thêm</Button>
                    </DialogActions>
                </form>
            </Dialog>
        </div>
    );
};
export default ProductPriceManagement;
