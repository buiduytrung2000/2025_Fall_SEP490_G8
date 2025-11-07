import React, { useState, useEffect, useMemo } from 'react';
import { 
    Button, Dialog, DialogTitle, DialogContent, DialogActions, 
    TextField, IconButton, Box, Typography, MenuItem, Select, 
    FormControl, InputLabel, CircularProgress, Alert, Chip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Checkbox
} from '@mui/material';
import { MaterialReactTable } from 'material-react-table';
import { 
    getAllProducts,
    getProductsForPriceManagement,
    getProductPriceHistory, 
    createPricingRule, 
    updatePricingRule,
    deletePricingRule,
    getCurrentPrice
} from '../../api/productApi';
import { useAuth } from '../../contexts/AuthContext';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { toast } from 'react-toastify';

const ProductPriceManagement = () => {
    const { user } = useAuth();
    const [products, setProducts] = useState([]);
    
    const [loading, setLoading] = useState(true);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showPriceModal, setShowPriceModal] = useState(false);
    const [priceHistory, setPriceHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    // Get store_id from localStorage or default to 1
    const selectedStoreId = (() => {
        const stored = localStorage.getItem('store_id');
        return stored ? parseInt(stored) : 1;
    })();
    const [error, setError] = useState(null);
    
    // Form states
    const [priceType, setPriceType] = useState('fixed_price');
    const [priceValue, setPriceValue] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [editingRule, setEditingRule] = useState(null);
    
    // Bulk apply states
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkPriceType, setBulkPriceType] = useState('fixed_price');
    const [bulkPriceValue, setBulkPriceValue] = useState('');
    const [bulkStartDate, setBulkStartDate] = useState('');
    const [bulkEndDate, setBulkEndDate] = useState('');
    const [applyingBulk, setApplyingBulk] = useState(false);

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        setLoading(true);
        setError(null);
        try {
            // Try the new API first
            let response = await getProductsForPriceManagement({ 
                store_id: selectedStoreId 
            });
            
            // If new API fails, fallback to old API
            if (response.err !== 0 || !response.data) {
                response = await getAllProducts();
            }
            
            if (response.err === 0) {
                const productsData = response.data || [];
                
                // If using fallback API, add current_price field
                const processedData = productsData.map((product, index) => {
                    // Ensure product is a plain object - remove any Sequelize instance methods
                    let productObj = product;
                    if (product && typeof product === 'object') {
                        // Convert to plain object if it's a Sequelize instance
                        if (product.get && typeof product.get === 'function') {
                            productObj = product.get({ plain: true });
                        } else if (product.toJSON && typeof product.toJSON === 'function') {
                            productObj = product.toJSON();
                        } else {
                            // Already a plain object, but make a copy to avoid mutations
                            productObj = { ...product };
                        }
                    } else {
                        productObj = {};
                    }
                    
                    // Flatten nested objects to avoid issues with MaterialReactTable
                    const categoryName = productObj.category?.name || productObj.category_name || '';
                    const supplierName = productObj.supplier?.name || productObj.supplier_name || '';
                    
                    const processed = {
                        id: productObj.product_id || productObj.id || index, // Add id for MaterialReactTable
                        product_id: productObj.product_id || productObj.id || null,
                        name: String(productObj.name || ''),
                        sku: String(productObj.sku || ''),
                        hq_price: parseFloat(productObj.hq_price || 0),
                        current_price: productObj.current_price !== undefined 
                            ? parseFloat(productObj.current_price) 
                            : parseFloat(productObj.hq_price || 0),
                        price_source: String(productObj.price_source || 'hq_price'),
                        description: productObj.description || null,
                        category_id: productObj.category_id || null,
                        supplier_id: productObj.supplier_id || null,
                        category_name: categoryName, // Flatten category name
                        supplier_name: supplierName, // Flatten supplier name
                        // Keep nested objects for other uses but don't rely on them in table
                        _category: productObj.category || null,
                        _supplier: productObj.supplier || null,
                        _active_pricing_rule: productObj.active_pricing_rule || null
                    };
                    return processed;
                });
                
                setProducts(processedData);
                
                if (processedData.length === 0) {
                    setError('Không có sản phẩm nào trong hệ thống. Vui lòng thêm sản phẩm trước.');
                }
            } else {
                setError(response.msg || 'Không thể tải danh sách sản phẩm');
            }
        } catch (err) {
            setError('Lỗi kết nối: ' + err.message);
            // Try fallback on error
            try {
                const fallbackResponse = await getAllProducts();
                if (fallbackResponse.err === 0 && fallbackResponse.data) {
                    const processedData = (fallbackResponse.data || []).map(product => ({
                        ...product,
                        current_price: parseFloat(product.hq_price || 0),
                        price_source: 'hq_price'
                    }));
                    setProducts(processedData);
                    setError(null);
                }
            } catch (fallbackErr) {
                console.error('Fallback API also failed:', fallbackErr);
            }
        } finally {
            setLoading(false);
        }
    };

    const loadPriceHistory = async (productId) => {
        if (!productId) return;
        setLoadingHistory(true);
        try {
            const response = await getProductPriceHistory(productId, selectedStoreId);
            if (response.err === 0) {
                const history = (response.data || []).map(rule => ({
                    rule_id: rule.rule_id,
                    type: rule.type,
                    value: parseFloat(rule.value),
                    start_date: rule.start_date ? rule.start_date.split('T')[0] : '',
                    end_date: rule.end_date ? rule.end_date.split('T')[0] : '',
                    created_at: rule.created_at,
                    store: rule.store
                }));
                setPriceHistory(history);
            } else {
                setPriceHistory([]);
            }
        } catch (err) {
            setPriceHistory([]);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleShowPriceModal = async (product) => {
        setSelectedProduct(product);
        setEditingRule(null);
        setPriceType('fixed_price');
        setPriceValue(product.hq_price || '0');
        setStartDate(new Date().toISOString().split('T')[0]);
        // Set end date to 1 year from now
        const nextYear = new Date();
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        setEndDate(nextYear.toISOString().split('T')[0]);
        setShowPriceModal(true);
        await loadPriceHistory(product.product_id);
    };

    const handleEditRule = (rule) => {
        setEditingRule(rule);
        setPriceType(rule.type);
        setPriceValue(rule.value.toString());
        setStartDate(rule.start_date);
        setEndDate(rule.end_date || '');
        setShowPriceModal(true);
    };

    const handleClosePriceModal = () => {
        setShowPriceModal(false);
        setSelectedProduct(null);
        setEditingRule(null);
        setPriceHistory([]);
    };

    const handleSavePrice = async (e) => {
        e.preventDefault();
        if (!selectedProduct) {
            toast.error('Vui lòng chọn sản phẩm');
            return;
        }

        // Validation
        if (!priceType) {
            toast.error('Vui lòng chọn loại quy tắc giá');
            return;
        }

        const priceValueNum = parseFloat(priceValue);
        if (isNaN(priceValueNum) || priceValueNum < 0) {
            toast.error('Giá trị không hợp lệ. Vui lòng nhập số dương');
            return;
        }

        if (!startDate) {
            toast.error('Vui lòng chọn ngày bắt đầu');
            return;
        }

        // Validate end date if provided
        if (endDate && new Date(endDate) < new Date(startDate)) {
            toast.error('Ngày kết thúc phải sau ngày bắt đầu');
            return;
        }

        const ruleData = {
            product_id: selectedProduct.product_id,
            store_id: selectedStoreId,
            type: priceType,
            value: priceValueNum,
            start_date: startDate + 'T00:00:00',
            end_date: endDate ? endDate + 'T23:59:59' : null
        };

        if (!endDate) {
            // Set end date far in the future if not provided
            const farFuture = new Date();
            farFuture.setFullYear(farFuture.getFullYear() + 100);
            ruleData.end_date = farFuture.toISOString();
        }

        try {
            let response;
            if (editingRule) {
                response = await updatePricingRule(editingRule.rule_id, ruleData);
            } else {
                response = await createPricingRule(ruleData);
            }

            if (response.err === 0) {
                toast.success(editingRule ? 'Cập nhật giá thành công' : 'Tạo quy tắc giá thành công');
                handleClosePriceModal();
                await loadPriceHistory(selectedProduct.product_id);
                // Reload products to show updated prices
                await loadProducts();
            } else {
                toast.error(response.msg || 'Có lỗi xảy ra');
            }
        } catch (err) {
            toast.error('Lỗi kết nối: ' + err.message);
        }
    };

    const handleDeleteRule = async (ruleId) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa quy tắc giá này?')) return;
        
        try {
            const response = await deletePricingRule(ruleId);
            if (response.err === 0) {
                toast.success('Xóa quy tắc giá thành công');
                if (selectedProduct) {
                    await loadPriceHistory(selectedProduct.product_id);
                }
                // Reload products to show updated prices
                await loadProducts();
            } else {
                toast.error(response.msg || 'Có lỗi xảy ra');
            }
        } catch (err) {
            toast.error('Lỗi kết nối: ' + err.message);
        }
    };

    // Calculate current price for display
    const getCurrentPriceDisplay = (product) => {
        if (!product) return 0;
        // Use current_price from API if available, otherwise use hq_price
        if (product.current_price !== undefined) {
            return parseFloat(product.current_price || 0);
        }
        return parseFloat(product.hq_price || 0);
    };

    // Format currency
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('vi-VN', { 
            style: 'currency', 
            currency: 'VND' 
        }).format(value);
    };

    // Handle row selection - sync with MaterialReactTable
    const [rowSelection, setRowSelection] = useState({});
    
    useEffect(() => {
        // Update selectedProducts when rowSelection changes
        if (products && products.length > 0) {
            const selected = Object.keys(rowSelection)
                .filter(key => rowSelection[key])
                .map(key => {
                    // Try to find product by id
                    const product = products.find(p => 
                        String(p.product_id) === key || 
                        String(p.id) === key ||
                        products.indexOf(p).toString() === key
                    );
                    return product;
                })
                .filter(Boolean);
            setSelectedProducts(selected);
        }
    }, [rowSelection, products]);

    const handleOpenBulkModal = () => {
        if (selectedProducts.length === 0) {
            toast.warning('Vui lòng chọn ít nhất một sản phẩm');
            return;
        }
        setBulkPriceType('fixed_price');
        setBulkPriceValue('');
        setBulkStartDate(new Date().toISOString().split('T')[0]);
        const nextYear = new Date();
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        setBulkEndDate(nextYear.toISOString().split('T')[0]);
        setShowBulkModal(true);
    };

    const handleCloseBulkModal = () => {
        setShowBulkModal(false);
        setBulkPriceValue('');
    };

    const handleApplyBulkPrice = async (e) => {
        e.preventDefault();
        if (selectedProducts.length === 0) {
            toast.warning('Vui lòng chọn ít nhất một sản phẩm');
            return;
        }

        // Validation
        if (!bulkPriceType) {
            toast.error('Vui lòng chọn loại quy tắc giá');
            return;
        }

        const priceValueNum = parseFloat(bulkPriceValue);
        if (isNaN(priceValueNum) || priceValueNum < 0) {
            toast.error('Giá trị không hợp lệ. Vui lòng nhập số dương');
            return;
        }

        if (!bulkStartDate) {
            toast.error('Vui lòng chọn ngày bắt đầu');
            return;
        }

        // Validate end date if provided
        if (bulkEndDate && new Date(bulkEndDate) < new Date(bulkStartDate)) {
            toast.error('Ngày kết thúc phải sau ngày bắt đầu');
            return;
        }

        setApplyingBulk(true);
        let successCount = 0;
        let failCount = 0;

        const ruleData = {
            store_id: selectedStoreId,
            type: bulkPriceType,
            value: priceValueNum,
            start_date: bulkStartDate + 'T00:00:00',
            end_date: bulkEndDate ? bulkEndDate + 'T23:59:59' : null
        };

        if (!bulkEndDate) {
            const farFuture = new Date();
            farFuture.setFullYear(farFuture.getFullYear() + 100);
            ruleData.end_date = farFuture.toISOString();
        }

        // Apply price to all selected products
        for (const product of selectedProducts) {
            try {
                const response = await createPricingRule({
                    ...ruleData,
                    product_id: product.product_id
                });

                if (response.err === 0) {
                    successCount++;
                } else {
                    failCount++;
                }
            } catch (err) {
                failCount++;
            }
        }

        setApplyingBulk(false);
        handleCloseBulkModal();
        setSelectedProducts([]);
        setRowSelection({});

        if (successCount > 0) {
            toast.success(`Áp dụng giá thành công cho ${successCount} sản phẩm`);
        }
        if (failCount > 0) {
            toast.error(`Không thể áp dụng giá cho ${failCount} sản phẩm`);
        }

        // Reload products
        await loadProducts();
    };

    // Columns for products table
    const productColumns = useMemo(() => [
        { 
            accessorKey: 'sku', 
            header: 'Mã sản phẩm',
            size: 120
        },
        { 
            accessorKey: 'name', 
            header: 'Tên sản phẩm' 
        },
        {
            accessorKey: 'hq_price',
            header: 'Giá HQ',
            size: 120,
            Cell: ({ cell }) => (
                <span style={{ color: '#1976d2', fontWeight: 600 }}>
                    {formatCurrency(parseFloat(cell.getValue() || 0))}
                </span>
            ),
        },
        {
            id: 'current_price',
            header: 'Giá hiện tại',
            size: 120,
            accessorFn: (row) => row.current_price || row.hq_price || 0,
            Cell: ({ row }) => {
                const price = getCurrentPriceDisplay(row.original);
                return (
                    <span style={{ color: '#2e7d32', fontWeight: 700 }}>
                        {formatCurrency(price)}
                    </span>
                );
            },
        },
    ], []);

    // Columns for price history table
    const historyColumns = useMemo(() => [
        {
            accessorKey: 'type',
            header: 'Loại',
            size: 120,
            Cell: ({ cell }) => {
                const type = cell.getValue();
                const labels = {
                    'fixed_price': 'Giá cố định',
                    'markup': 'Tăng giá',
                    'markdown': 'Giảm giá'
                };
                const colors = {
                    'fixed_price': 'primary',
                    'markup': 'error',
                    'markdown': 'success'
                };
                return <Chip label={labels[type] || type} color={colors[type] || 'default'} size="small" />;
            }
        },
        {
            accessorKey: 'value',
            header: 'Giá trị',
            size: 120,
            Cell: ({ cell, row }) => {
                const value = parseFloat(cell.getValue());
                const type = row.original.type;
                if (type === 'fixed_price') {
                    return formatCurrency(value);
                } else {
                    return formatCurrency(value) + (type === 'markup' ? ' (+)' : ' (-)');
                }
            }
        },
        {
            accessorKey: 'start_date',
            header: 'Bắt đầu',
            size: 120,
        },
        {
            accessorKey: 'end_date',
            header: 'Kết thúc',
            size: 120,
            Cell: ({ cell }) => {
                const date = cell.getValue();
                if (!date || date.includes('2099')) return 'Không giới hạn';
                return date;
            }
        },
        {
            id: 'actions',
            header: 'Thao tác',
            size: 100,
            Cell: ({ row }) => (
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton 
                        size="small" 
                        color="primary" 
                        onClick={() => handleEditRule(row.original)}
                    >
                        <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                        size="small" 
                        color="error" 
                        onClick={() => handleDeleteRule(row.original.rule_id)}
                    >
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Box>
            )
        }
    ], []);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ padding: 3 }}>
            <Typography variant="h5" component="h2" fontWeight="bold" sx={{ mb: 3 }}>
                Quản lý giá sản phẩm
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Bulk action */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center', flexWrap: 'wrap' }}>
                {selectedProducts.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <Typography variant="body2" color="primary" sx={{ fontWeight: 600 }}>
                            Đã chọn: {selectedProducts.length} sản phẩm
                        </Typography>
            <Button
                variant="contained"
                color="success"
                startIcon={<AddIcon />}
                            onClick={handleOpenBulkModal}
                        >
                            Áp dụng giá cho {selectedProducts.length} sản phẩm
                        </Button>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={() => {
                                setSelectedProducts([]);
                                setRowSelection({});
                            }}
                        >
                            Bỏ chọn tất cả
                        </Button>
                    </Box>
                )}
            </Box>


            {/* Products table */}
            {products && Array.isArray(products) && products.length > 0 ? (
                <>
                    {/* Products table using Material-UI Table */}
                    <Paper elevation={2} sx={{ mb: 2 }}>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                        <TableCell padding="checkbox">
                                            <Checkbox
                                                indeterminate={selectedProducts.length > 0 && selectedProducts.length < products.length}
                                                checked={products.length > 0 && selectedProducts.length === products.length}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedProducts([...products]);
                                                        const selection = {};
                                                        products.forEach((p, idx) => {
                                                            selection[String(p.product_id || p.id || idx)] = true;
                                                        });
                                                        setRowSelection(selection);
                                                    } else {
                                                        setSelectedProducts([]);
                                                        setRowSelection({});
                                                    }
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Mã SP</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Tên sản phẩm</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Giá HQ</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Giá hiện tại</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>Thao tác</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {products.map((product) => {
                                        const isSelected = selectedProducts.some(p => p.product_id === product.product_id || p.id === product.id);
                                        return (
                                            <TableRow 
                                                key={product.product_id || product.id} 
                                                hover
                                                selected={isSelected}
                                            >
                                                <TableCell padding="checkbox">
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedProducts(prev => [...prev, product]);
                                                                setRowSelection(prev => ({
                                                                    ...prev,
                                                                    [String(product.product_id || product.id)]: true
                                                                }));
                                                            } else {
                                                                setSelectedProducts(prev => prev.filter(p => 
                                                                    p.product_id !== product.product_id && p.id !== product.id
                                                                ));
                                                                setRowSelection(prev => {
                                                                    const newSelection = { ...prev };
                                                                    delete newSelection[String(product.product_id || product.id)];
                                                                    return newSelection;
                                                                });
                                                            }
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell>{product.sku}</TableCell>
                                                <TableCell>{product.name}</TableCell>
                                                <TableCell align="right">
                                                    <span style={{ color: '#1976d2', fontWeight: 600 }}>
                                                        {formatCurrency(product.hq_price || 0)}
                                                    </span>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <span style={{ color: '#2e7d32', fontWeight: 700 }}>
                                                        {formatCurrency(getCurrentPriceDisplay(product))}
                                                    </span>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <IconButton 
                                                        color="primary" 
                                                        size="small"
                                                        onClick={() => handleShowPriceModal(product)} 
                                                        title="Quản lý giá"
                                                    >
                                                        <EditIcon />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                    
                    {/* MaterialReactTable - Temporarily hidden */}
                    {/* 
                    <Box>
                        <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
                            MaterialReactTable Data: {products.length} products
                        </Typography>
                        <MaterialReactTable
                            columns={productColumns}
                            data={products}
                            enableRowSelection={true}
                            onRowSelectionChange={setRowSelection}
                            state={{ 
                                rowSelection: rowSelection || {},
                                isLoading: loading 
                            }}
                            enableRowActions={true}
                            manualFiltering={false}
                            manualSorting={false}
                            manualPagination={false}
                            getRowId={(row) => {
                                if (row && typeof row === 'object') {
                                    const id = row.product_id || row.id;
                                    if (id !== undefined && id !== null) {
                                        return String(id);
                                    }
                                }
                                const index = products.findIndex(p => p === row);
                                return index >= 0 ? `row-${index}` : `row-${Date.now()}-${Math.random()}`;
                            }}
                            debugTable={process.env.NODE_ENV === 'development'}
                            enableBottomToolbar={true}
                            enableTopToolbar={true}
                            renderRowActions={({ row }) => (
                                <IconButton 
                                    color="primary" 
                                    onClick={() => handleShowPriceModal(row.original)} 
                                    title="Quản lý giá"
                                >
                                    <EditIcon />
                                </IconButton>
                            )}
                            muiTableHeadCellProps={{
                                sx: {
                                    backgroundColor: '#f5f5f5',
                                    fontWeight: 'bold',
                                },
                            }}
                            initialState={{
                                pagination: { pageSize: 10 },
                                showGlobalFilter: true
                            }}
                            enableGlobalFilter={true}
                            enableColumnFilters={false}
                            enableDensityToggle={false}
                            enableFullScreenToggle={false}
                            enableHiding={false}
                        />
                    </Box>
                    */}
                </>
            ) : (
                !loading && (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography variant="body1" color="text.secondary">
                            Không có sản phẩm nào để hiển thị
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            Số lượng sản phẩm: {products?.length || 0}
                        </Typography>
                    </Box>
                )
            )}

            {/* Price history section */}
            {selectedProduct && (
                <Box sx={{ mt: 4 }}>
                    <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                        Lịch sử giá: {selectedProduct.name} ({selectedProduct.sku})
                    </Typography>
                    <Button
                        variant="contained"
                        color="primary"
                        sx={{ mb: 2 }}
                        onClick={() => {
                            setEditingRule(null);
                            setPriceType('fixed_price');
                            setPriceValue(selectedProduct.hq_price || '0');
                            setStartDate(new Date().toISOString().split('T')[0]);
                            const nextYear = new Date();
                            nextYear.setFullYear(nextYear.getFullYear() + 1);
                            setEndDate(nextYear.toISOString().split('T')[0]);
                            setShowPriceModal(true);
                        }}
                    >
                        Thêm quy tắc giá mới
                    </Button>
                    {loadingHistory ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <Paper elevation={2} sx={{ mt: 2 }}>
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Loại</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Giá trị</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Ngày bắt đầu</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Ngày kết thúc</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Thao tác</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {priceHistory && priceHistory.length > 0 ? (
                                            priceHistory.slice(0, 5).map((rule) => {
                                                const typeLabels = {
                                                    'fixed_price': 'Giá cố định',
                                                    'markup': 'Tăng giá',
                                                    'markdown': 'Giảm giá'
                                                };
                                                const typeColors = {
                                                    'fixed_price': 'primary',
                                                    'markup': 'error',
                                                    'markdown': 'success'
                                                };
                                                return (
                                                    <TableRow key={rule.rule_id} hover>
                                                        <TableCell>
                                                            <Chip 
                                                                label={typeLabels[rule.type] || rule.type}
                                                                color={typeColors[rule.type] || 'default'}
                                                                size="small"
                                                            />
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            {rule.type === 'fixed_price' 
                                                                ? formatCurrency(rule.value)
                                                                : `${rule.value}%`
                                                            }
                                                        </TableCell>
                                                        <TableCell>
                                                            {rule.start_date ? new Date(rule.start_date).toLocaleDateString('vi-VN') : 'N/A'}
                                                        </TableCell>
                                                        <TableCell>
                                                            {rule.end_date ? new Date(rule.end_date).toLocaleDateString('vi-VN') : 'Không giới hạn'}
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <IconButton 
                                                                color="error" 
                                                                size="small"
                                                                onClick={() => handleDeleteRule(rule.rule_id)}
                                                                title="Xóa"
                                                            >
                                                                <DeleteIcon />
                                                            </IconButton>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                                                    <Typography variant="body2" color="text.secondary">
                                                        Chưa có lịch sử giá
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    )}
                </Box>
            )}

            {/* Price modal */}
            <Dialog open={showPriceModal} onClose={handleClosePriceModal} fullWidth maxWidth="sm">
                <form onSubmit={handleSavePrice}>
                    <DialogTitle>
                        {editingRule ? 'Sửa quy tắc giá' : 'Thêm quy tắc giá mới'}
                        {selectedProduct && ` - ${selectedProduct.name}`}
                    </DialogTitle>
                    <DialogContent dividers>
                        <FormControl fullWidth margin="normal" required>
                            <InputLabel>Loại quy tắc giá</InputLabel>
                            <Select
                                value={priceType}
                                label="Loại quy tắc giá"
                                onChange={(e) => setPriceType(e.target.value)}
                            >
                                <MenuItem value="fixed_price">Giá cố định</MenuItem>
                                <MenuItem value="markup">Tăng giá (cộng thêm)</MenuItem>
                                <MenuItem value="markdown">Giảm giá (trừ đi)</MenuItem>
                            </Select>
                        </FormControl>

                        <TextField
                            label={priceType === 'fixed_price' ? 'Giá cố định (₫)' : 
                                   priceType === 'markup' ? 'Số tiền tăng (₫)' : 
                                   'Số tiền giảm (₫)'}
                            type="number"
                            inputProps={{ min: 0, step: 1000 }}
                            value={priceValue}
                            onChange={(e) => setPriceValue(e.target.value)}
                            fullWidth
                            margin="normal"
                            required
                            helperText={
                                priceType === 'fixed_price' ? 'Giá bán cố định cho sản phẩm' :
                                priceType === 'markup' ? `Giá bán = Giá HQ + ${formatCurrency(parseFloat(priceValue) || 0)}` :
                                `Giá bán = Giá HQ - ${formatCurrency(parseFloat(priceValue) || 0)}`
                            }
                        />

                        <TextField
                            label="Bắt đầu áp dụng từ ngày"
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            fullWidth
                            margin="normal"
                            InputLabelProps={{ shrink: true }}
                            required
                        />

                        <TextField
                            label="Kết thúc áp dụng (để trống = không giới hạn)"
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            fullWidth
                            margin="normal"
                            InputLabelProps={{ shrink: true }}
                            inputProps={{ min: startDate || undefined }}
                            helperText="Để trống nếu muốn áp dụng vĩnh viễn"
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClosePriceModal} color="secondary" variant="outlined">
                            Huỷ
                        </Button>
                        <Button type="submit" variant="contained" color="primary">
                            {editingRule ? 'Cập nhật' : 'Tạo mới'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

            {/* Bulk Apply Price Modal */}
            <Dialog open={showBulkModal} onClose={handleCloseBulkModal} fullWidth maxWidth="sm">
                <form onSubmit={handleApplyBulkPrice}>
                    <DialogTitle>
                        Áp dụng giá cho {selectedProducts.length} sản phẩm
                    </DialogTitle>
                    <DialogContent dividers>
                        <Alert severity="info" sx={{ mb: 2 }}>
                            Bạn đang áp dụng giá cho {selectedProducts.length} sản phẩm đã chọn.
                        </Alert>

                        <FormControl fullWidth margin="normal" required>
                            <InputLabel>Loại quy tắc giá</InputLabel>
                            <Select
                                value={bulkPriceType}
                                label="Loại quy tắc giá"
                                onChange={(e) => setBulkPriceType(e.target.value)}
                            >
                                <MenuItem value="fixed_price">Giá cố định</MenuItem>
                                <MenuItem value="markup">Tăng giá (cộng thêm)</MenuItem>
                                <MenuItem value="markdown">Giảm giá (trừ đi)</MenuItem>
                            </Select>
                        </FormControl>

                        <TextField
                            label={bulkPriceType === 'fixed_price' ? 'Giá cố định (₫)' : 
                                   bulkPriceType === 'markup' ? 'Số tiền tăng (₫)' : 
                                   'Số tiền giảm (₫)'}
                            type="number"
                            inputProps={{ min: 0, step: 1000 }}
                            value={bulkPriceValue}
                            onChange={(e) => setBulkPriceValue(e.target.value)}
                            fullWidth
                            margin="normal"
                            required
                            helperText={
                                bulkPriceType === 'fixed_price' ? 'Giá bán cố định cho tất cả sản phẩm đã chọn' :
                                bulkPriceType === 'markup' ? `Giá bán = Giá HQ + ${formatCurrency(parseFloat(bulkPriceValue) || 0)}` :
                                `Giá bán = Giá HQ - ${formatCurrency(parseFloat(bulkPriceValue) || 0)}`
                            }
                        />

                        <TextField
                            label="Bắt đầu áp dụng từ ngày"
                            type="date"
                            value={bulkStartDate}
                            onChange={(e) => setBulkStartDate(e.target.value)}
                            fullWidth
                            margin="normal"
                            InputLabelProps={{ shrink: true }}
                            required
                        />

                        <TextField
                            label="Kết thúc áp dụng (để trống = không giới hạn)"
                            type="date"
                            value={bulkEndDate}
                            onChange={(e) => setBulkEndDate(e.target.value)}
                            fullWidth
                            margin="normal"
                            InputLabelProps={{ shrink: true }}
                            inputProps={{ min: bulkStartDate || undefined }}
                            helperText="Để trống nếu muốn áp dụng vĩnh viễn"
                        />

                        {/* Show selected products list */}
                        <Box sx={{ mt: 2, maxHeight: 200, overflow: 'auto' }}>
                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                Danh sách sản phẩm sẽ được áp dụng giá:
                            </Typography>
                            {selectedProducts.map((product, index) => (
                                <Typography key={product.product_id} variant="body2" sx={{ mb: 0.5 }}>
                                    {index + 1}. {product.name} ({product.sku}) - HQ: {formatCurrency(parseFloat(product.hq_price || 0))}
                                </Typography>
                            ))}
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button 
                            onClick={handleCloseBulkModal} 
                            color="secondary" 
                            variant="outlined"
                            disabled={applyingBulk}
                        >
                            Huỷ
                        </Button>
                        <Button 
                            type="submit" 
                            variant="contained" 
                            color="primary"
                            disabled={applyingBulk}
                        >
                            {applyingBulk ? (
                                <>
                                    <CircularProgress size={20} sx={{ mr: 1 }} />
                                    Đang áp dụng...
                                </>
                            ) : (
                                `Áp dụng cho ${selectedProducts.length} sản phẩm`
                            )}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </Box>
    );
};

export default ProductPriceManagement;
