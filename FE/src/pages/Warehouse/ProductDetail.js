import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Grid,
    CircularProgress,
    Alert,
    Card,
    CardContent,
    TextField,
    List,
    ListItem,
    ListItemText,
    Divider
} from '@mui/material';
import { PrimaryButton, ActionButton, Icon } from '../../components/common';
import { getProduct, getProductPriceHistory } from '../../api/productApi';
import { getInventoryByProduct } from '../../api/inventoryApi';

const formatCurrency = (number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(number);
const formatDate = (dateString) => new Date(dateString).toLocaleString('vi-VN');

const ProductDetail = () => {
    const { productId } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [inventory, setInventory] = useState([]);
    const [priceHistory, setPriceHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // State for price change form
    const [newPrice, setNewPrice] = useState('');
    const [effectiveDate, setEffectiveDate] = useState('');
    const [priceChangeReason, setPriceChangeReason] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [productRes, inventoryRes, priceHistoryRes] = await Promise.all([
                    getProduct(productId),
                    getInventoryByProduct(productId),
                    getProductPriceHistory(productId)
                ]);

                if (productRes.err !== 0) throw new Error(productRes.msg || 'Không thể tải thông tin sản phẩm.');
                setProduct(productRes.data);

                if (inventoryRes.err !== 0) throw new Error(inventoryRes.msg || 'Không thể tải thông tin tồn kho.');
                setInventory(inventoryRes.data || []);

                if (priceHistoryRes.err !== 0) throw new Error(priceHistoryRes.msg || 'Không thể tải lịch sử giá.');
                setPriceHistory(priceHistoryRes.data || []);

            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [productId]);

    // Calculate total stock from inventory
    const totalStock = inventory.reduce((sum, item) => sum + (item.stock || 0), 0);

    // Handler for price update
    const handlePriceUpdate = async () => {
        // TODO: Implement API call to update price
        console.log('Update price:', { newPrice, effectiveDate, priceChangeReason });
        alert('Chức năng cập nhật giá sẽ được triển khai sau');
    };

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Box>;
    }

    if (error) {
        return <Alert severity="error" sx={{ m: 3 }}>{error}</Alert>;
    }

    if (!product) {
        return <Alert severity="warning" sx={{ m: 3 }}>Không tìm thấy sản phẩm.</Alert>;
    }

    return (


        <Box sx={{ p: 3 }}>
            {/* Header with back button */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <ActionButton
                    icon={<Icon name="ArrowBack" />}
                    onClick={() => navigate(-1)}
                    sx={{ mr: 2 }}
                />
                <Box>
                    <Typography variant="h5" component="h1">
                        Chi tiết sản phẩm
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Quản lý thông tin và giá sản phẩm
                    </Typography>
                </Box>
            </Box >


            {/* Two-column Grid Layout */}
            <Grid container spacing={3}>
                {/* LEFT COLUMN - Product Details & Price History */}
                <Grid item xs={12} md={8}>
                    {/* Product Details Card */}
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', gap: 3 }}>
                                {/* Product Image Placeholder */}
                                <Box
                                    sx={{
                                        width: 150,
                                        height: 150,
                                        border: '2px solid #ddd',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        backgroundColor: '#f5f5f5'
                                    }}
                                >
                                    <Typography variant="h1" color="text.disabled">×</Typography>
                                </Box>

                                {/* Product Information */}
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="h5" gutterBottom>
                                        {product.name}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        <strong>Mã sản phẩm:</strong> {product.sku}
                                    </Typography>
                                    <Typography variant="h6" color="success.main" gutterBottom>
                                        <strong>Giá bán:</strong> {formatCurrency(product.hq_price)}
                                    </Typography>
                                    <Typography variant="body2" paragraph>
                                        <strong>Mô tả:</strong> {product.description || 'Không có mô tả'}
                                    </Typography>

                                    {/* Additional Fields in Two Columns */}
                                    <Grid container spacing={2}>
                                        <Grid item xs={6}>
                                            <Typography variant="body2">
                                                <strong>Danh mục:</strong>
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {product.category?.name || 'N/A'}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="body2">
                                                <strong>Thương hiệu:</strong>
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {product.supplier?.name || 'N/A'}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="body2">
                                                <strong>Đơn vị:</strong>
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {product.unit || 'N/A'}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="body2">
                                                <strong>Trọng lượng:</strong>
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {product.weight || 'N/A'}
                                            </Typography>
                                        </Grid>
                                    </Grid>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>

                    {/* Price History Card */}
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Icon name="AttachMoney" sx={{ mr: 1 }} />
                                <Typography variant="h6">
                                    Lịch sử thay đổi giá
                                </Typography>
                            </Box>
                            <Divider sx={{ mb: 2 }} />

                            {priceHistory.length === 0 ? (
                                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
                                    Chưa có lịch sử thay đổi giá
                                </Typography>
                            ) : (
                                <List>
                                    {priceHistory.map((item, index) => (
                                        <React.Fragment key={item.rule_id || index}>
                                            <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                                                <ListItemText
                                                    primary={
                                                        <Box>
                                                            <Typography component="span" variant="body2">
                                                                <strong style={{ textDecoration: 'line-through', color: '#999' }}>
                                                                    {formatCurrency(item.old_price || product.hq_price)}
                                                                </strong>
                                                                {' → '}
                                                                <strong style={{ color: '#2e7d32' }}>
                                                                    {formatCurrency(item.value)}
                                                                </strong>
                                                            </Typography>
                                                        </Box>
                                                    }
                                                    secondary={
                                                        <Box sx={{ mt: 0.5 }}>
                                                            <Typography variant="body2" color="text.secondary">
                                                                {item.reason || item.type || 'Tăng giá theo thị trường'}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                Bởi: {item.created_by || 'Nguyễn Văn A'} • {formatDate(item.start_date)}
                                                            </Typography>
                                                        </Box>
                                                    }
                                                />
                                            </ListItem>
                                            {index < priceHistory.length - 1 && <Divider />}
                                        </React.Fragment>
                                    ))}
                                </List>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* RIGHT COLUMN - Statistics & Price Change Form */}
                <Grid item xs={12} md={4}>
                    {/* Statistics Cards */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        {/* Quantity Sold Card */}
                        <Grid item xs={12}>
                            <Card>
                                <CardContent sx={{ textAlign: 'center' }}>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        Số lượng đã bán
                                    </Typography>
                                    <Typography variant="h4" color="primary">
                                        1,247
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Current Stock Card */}
                        <Grid item xs={12}>
                            <Card>
                                <CardContent sx={{ textAlign: 'center' }}>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        Số lượng tồn kho hiện tại
                                    </Typography>
                                    <Typography variant="h4" color="warning.main">
                                        {totalStock}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    {/* Price Change Form Card */}
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Icon name="AttachMoney" sx={{ mr: 1 }} />
                                <Typography variant="h6">
                                    Thay đổi giá
                                </Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Cập nhật giá sản phẩm
                            </Typography>
                            <Divider sx={{ my: 2 }} />

                            {/* Current Price (Read-only) */}
                            <TextField
                                fullWidth
                                label="Giá hiện tại"
                                value={formatCurrency(product.hq_price)}
                                disabled
                                sx={{ mb: 2 }}
                                size="small"
                            />

                            {/* New Price Input */}
                            <TextField
                                fullWidth
                                label="Giá mới"
                                placeholder="Nhập giá mới"
                                value={newPrice}
                                onChange={(e) => setNewPrice(e.target.value)}
                                type="number"
                                sx={{ mb: 2 }}
                                size="small"
                            />

                            {/* Effective Date Picker */}
                            <TextField
                                fullWidth
                                label="Ngày thay đổi áp dụng cho sản phẩm"
                                type="date"
                                value={effectiveDate}
                                onChange={(e) => setEffectiveDate(e.target.value)}
                                InputLabelProps={{
                                    shrink: true,
                                }}
                                sx={{ mb: 2 }}
                                size="small"
                            />

                            {/* Reason Input */}
                            <TextField
                                fullWidth
                                label="Lý do thay đổi (không bắt buộc)"
                                placeholder="Nhập lý do thay đổi"
                                value={priceChangeReason}
                                onChange={(e) => setPriceChangeReason(e.target.value)}
                                multiline
                                rows={2}
                                sx={{ mb: 2 }}
                                size="small"
                            />

                            {/* Update Button */}
                            <PrimaryButton
                                fullWidth
                                onClick={handlePriceUpdate}
                                disabled={!newPrice || !effectiveDate}
                            >
                                Cập nhật giá
                            </PrimaryButton>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default ProductDetail;

