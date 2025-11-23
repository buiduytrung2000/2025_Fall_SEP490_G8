// src/pages/Warehouse/ProductManagement.js
import React, { useState, useEffect, useMemo } from 'react';
import { Alert } from 'react-bootstrap';
import { 
    getAllProducts, createProduct, updateProduct, deleteProduct, getAllCategories, getAllSuppliers,
    getProductPriceHistory, createPricingRule, updatePricingRule, deletePricingRule, getProduct
} from '../../api/productApi';
import { getInventoryByProduct } from '../../api/inventoryApi';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { MaterialReactTable } from 'material-react-table';
import { useNavigate } from 'react-router-dom';
import { Box, IconButton, Button, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, CircularProgress, Grid, Card, CardContent, Divider, List, ListItem, ListItemText } from '@mui/material';
import { Edit, Delete, AttachMoney } from '@mui/icons-material';
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
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';

// Hàm helper format tiền
const formatCurrency = (number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(number);

const ProductManagement = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
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
    
    // Price management states
    const [showPriceModal, setShowPriceModal] = useState(false);
    const [priceHistory, setPriceHistory] = useState([]);
    const [loadingPriceHistory, setLoadingPriceHistory] = useState(false);
    const [priceType, setPriceType] = useState('fixed_price');
    const [priceValue, setPriceValue] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [editingRule, setEditingRule] = useState(null);
    
    // Product detail modal states
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [productDetail, setProductDetail] = useState(null);
    const [productInventory, setProductInventory] = useState([]);
    const [productPriceHistory, setProductPriceHistory] = useState([]);
    const [loadingDetail, setLoadingDetail] = useState(false);
    
    // Price edit form in detail modal
    const [detailPriceType, setDetailPriceType] = useState('fixed_price');
    const [detailPriceValue, setDetailPriceValue] = useState('');
    const [detailStartDate, setDetailStartDate] = useState('');
    const [detailEndDate, setDetailEndDate] = useState('');
    const [detailEditingRule, setDetailEditingRule] = useState(null);
    const [savingPrice, setSavingPrice] = useState(false);
    
    // Get store_id from localStorage or default to 1
    const selectedStoreId = (() => {
        const stored = localStorage.getItem('store_id');
        return stored ? parseInt(stored) : 1;
    })();

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

    // Price management functions
    const loadPriceHistory = async (productId) => {
        if (!productId) return;
        setLoadingPriceHistory(true);
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
            setLoadingPriceHistory(false);
        }
    };

    const handleShowPriceModal = async (product) => {
        setSelectedProduct(product);
        setEditingRule(null);
        setPriceType('fixed_price');
        setPriceValue(product.hq_price || '0');
        setStartDate(new Date().toISOString().split('T')[0]);
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
        const startDateFormatted = rule.start_date 
            ? (rule.start_date.includes('T') ? rule.start_date.split('T')[0] : rule.start_date)
            : new Date().toISOString().split('T')[0];
        const endDateFormatted = rule.end_date 
            ? (rule.end_date.includes('T') ? rule.end_date.split('T')[0] : rule.end_date)
            : '';
        setStartDate(startDateFormatted);
        setEndDate(endDateFormatted);
    };

    const handleClosePriceModal = () => {
        setShowPriceModal(false);
        setEditingRule(null);
    };

    const handleSavePrice = async (e) => {
        e.preventDefault();
        if (!selectedProduct) {
            toast.error('Vui lòng chọn sản phẩm');
            return;
        }

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
            } else {
                let errorMsg = response.msg || 'Có lỗi xảy ra';
                if (errorMsg.includes('Overlapping pricing rule')) {
                    errorMsg = 'Quy tắc giá bị trùng lặp. Vui lòng kiểm tra lịch sử giá và chọn khoảng thời gian khác.';
                }
                toast.error(errorMsg);
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
            } else {
                toast.error(response.msg || 'Có lỗi xảy ra');
            }
        } catch (err) {
            toast.error('Lỗi kết nối: ' + err.message);
        }
    };

    // Product detail modal functions
    const handleShowProductDetail = async (product) => {
        setShowDetailModal(true);
        setLoadingDetail(true);
        setProductDetail(null);
        setProductInventory([]);
        setProductPriceHistory([]);
        // Reset price form
        setDetailPriceType('fixed_price');
        setDetailPriceValue(product.hq_price || '0');
        setDetailStartDate(new Date().toISOString().split('T')[0]);
        const nextYear = new Date();
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        setDetailEndDate(nextYear.toISOString().split('T')[0]);
        setDetailEditingRule(null);
        
        try {
            const [productRes, inventoryRes, priceHistoryRes] = await Promise.all([
                getProduct(product.product_id),
                getInventoryByProduct(product.product_id),
                getProductPriceHistory(product.product_id, selectedStoreId)
            ]);

            if (productRes.err === 0) {
                setProductDetail(productRes.data);
                setDetailPriceValue(productRes.data.hq_price || '0');
            } else {
                toast.error(productRes.msg || 'Không thể tải thông tin sản phẩm');
            }

            if (inventoryRes.err === 0) {
                setProductInventory(inventoryRes.data || []);
            }

            if (priceHistoryRes.err === 0) {
                setProductPriceHistory(priceHistoryRes.data || []);
            }
        } catch (err) {
            toast.error('Lỗi khi tải chi tiết sản phẩm: ' + err.message);
        } finally {
            setLoadingDetail(false);
        }
    };

    const handleCloseDetailModal = () => {
        setShowDetailModal(false);
        setProductDetail(null);
        setProductInventory([]);
        setProductPriceHistory([]);
        setDetailEditingRule(null);
    };

    const handleEditPriceInDetail = (rule) => {
        // Kiểm tra xem giá có đang áp dụng không
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const startDate = rule.start_date ? new Date(rule.start_date) : null;
        const endDate = rule.end_date ? new Date(rule.end_date) : null;
        
        let isActive = false;
        if (startDate) {
            startDate.setHours(0, 0, 0, 0);
            if (endDate) {
                endDate.setHours(23, 59, 59, 999);
                if (now >= startDate && now <= endDate) {
                    isActive = true;
                }
            } else {
                // Không có end_date = vĩnh viễn
                if (now >= startDate) {
                    isActive = true;
                }
            }
        }
        
        if (isActive) {
            toast.error('Không thể sửa giá đang áp dụng');
            return;
        }
        
        setDetailEditingRule(rule);
        setDetailPriceType(rule.type);
        setDetailPriceValue(rule.value.toString());
        const startDateFormatted = rule.start_date 
            ? (rule.start_date.includes('T') ? rule.start_date.split('T')[0] : rule.start_date)
            : new Date().toISOString().split('T')[0];
        const endDateFormatted = rule.end_date 
            ? (rule.end_date.includes('T') ? rule.end_date.split('T')[0] : rule.end_date)
            : '';
        setDetailStartDate(startDateFormatted);
        setDetailEndDate(endDateFormatted);
    };

    const handleSavePriceInDetail = async (e) => {
        e.preventDefault();
        if (!productDetail) {
            toast.error('Vui lòng chọn sản phẩm');
            return;
        }

        if (!detailPriceType) {
            toast.error('Vui lòng chọn loại quy tắc giá');
            return;
        }

        const priceValueNum = parseFloat(detailPriceValue);
        if (isNaN(priceValueNum) || priceValueNum < 0) {
            toast.error('Giá trị không hợp lệ. Vui lòng nhập số dương');
            return;
        }

        if (!detailStartDate) {
            toast.error('Vui lòng chọn ngày bắt đầu');
            return;
        }

        if (detailEndDate && new Date(detailEndDate) < new Date(detailStartDate)) {
            toast.error('Ngày kết thúc phải sau ngày bắt đầu');
            return;
        }

        // Kiểm tra nếu đang sửa giá đang áp dụng
        if (detailEditingRule) {
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            const startDate = detailEditingRule.start_date ? new Date(detailEditingRule.start_date) : null;
            const endDate = detailEditingRule.end_date ? new Date(detailEditingRule.end_date) : null;
            
            let isActive = false;
            if (startDate) {
                startDate.setHours(0, 0, 0, 0);
                if (endDate) {
                    endDate.setHours(23, 59, 59, 999);
                    if (now >= startDate && now <= endDate) {
                        isActive = true;
                    }
                } else {
                    // Không có end_date = vĩnh viễn
                    if (now >= startDate) {
                        isActive = true;
                    }
                }
            }
            
            if (isActive) {
                toast.error('Không thể sửa giá đang áp dụng');
                return;
            }
        }

        const ruleData = {
            product_id: productDetail.product_id,
            store_id: selectedStoreId,
            type: detailPriceType,
            value: priceValueNum,
            start_date: detailStartDate + 'T00:00:00',
            end_date: detailEndDate ? detailEndDate + 'T23:59:59' : null
        };

        if (!detailEndDate) {
            const farFuture = new Date();
            farFuture.setFullYear(farFuture.getFullYear() + 100);
            ruleData.end_date = farFuture.toISOString();
        }

        setSavingPrice(true);
        try {
            let response;
            if (detailEditingRule) {
                response = await updatePricingRule(detailEditingRule.rule_id, ruleData);
            } else {
                response = await createPricingRule(ruleData);
            }

            if (response.err === 0) {
                toast.success(detailEditingRule ? 'Cập nhật giá thành công' : 'Tạo quy tắc giá thành công');
                // Reset form
                setDetailEditingRule(null);
                setDetailPriceType('fixed_price');
                setDetailPriceValue(productDetail.hq_price || '0');
                setDetailStartDate(new Date().toISOString().split('T')[0]);
                const nextYear = new Date();
                nextYear.setFullYear(nextYear.getFullYear() + 1);
                setDetailEndDate(nextYear.toISOString().split('T')[0]);
                // Reload price history
                const priceHistoryRes = await getProductPriceHistory(productDetail.product_id, selectedStoreId);
                if (priceHistoryRes.err === 0) {
                    setProductPriceHistory(priceHistoryRes.data || []);
                }
            } else {
                let errorMsg = response.msg || 'Có lỗi xảy ra';
                if (errorMsg.includes('Overlapping pricing rule')) {
                    errorMsg = 'Quy tắc giá bị trùng lặp. Vui lòng kiểm tra lịch sử giá và chọn khoảng thời gian khác.';
                }
                toast.error(errorMsg);
            }
        } catch (err) {
            toast.error('Lỗi kết nối: ' + err.message);
        } finally {
            setSavingPrice(false);
        }
    };

    const handleDeletePriceInDetail = async (ruleId) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa quy tắc giá này?')) return;
        
        try {
            const response = await deletePricingRule(ruleId);
            if (response.err === 0) {
                toast.success('Xóa quy tắc giá thành công');
                // Reload price history
                if (productDetail) {
                    const priceHistoryRes = await getProductPriceHistory(productDetail.product_id, selectedStoreId);
                    if (priceHistoryRes.err === 0) {
                        setProductPriceHistory(priceHistoryRes.data || []);
                    }
                }
            } else {
                toast.error(response.msg || 'Có lỗi xảy ra');
            }
        } catch (err) {
            toast.error('Lỗi kết nối: ' + err.message);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('vi-VN');
    };

    // Định nghĩa cột cho bảng sản phẩm
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

    // Định nghĩa cột cho bảng lịch sử giá
    const priceHistoryColumns = useMemo(() => {
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

        return [
            {
                accessorKey: 'index',
                header: 'STT',
                size: 60,
                Cell: ({ row }) => row.index + 1,
            },
            {
                accessorKey: 'type',
                header: 'Loại',
                size: 120,
                Cell: ({ cell }) => {
                    const type = cell.getValue();
                    return (
                        <Chip 
                            label={typeLabels[type] || type}
                            color={typeColors[type] || 'default'}
                            size="small"
                        />
                    );
                },
            },
            {
                accessorKey: 'value',
                header: 'Giá trị',
                size: 150,
                Cell: ({ cell, row }) => {
                    const value = cell.getValue();
                    const type = row.original.type;
                    const displayValue = type === 'fixed_price' 
                        ? formatCurrency(value || productDetail?.hq_price)
                        : formatCurrency(value || productDetail?.hq_price) + (type === 'markup' ? ' (+)' : ' (-)');
                    return (
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#2e7d32' }}>
                            {displayValue}
                        </Typography>
                    );
                },
            },
            {
                accessorKey: 'start_date',
                header: 'Ngày bắt đầu',
                size: 150,
                Cell: ({ cell }) => cell.getValue() ? formatDate(cell.getValue()) : 'N/A',
            },
            {
                accessorKey: 'end_date',
                header: 'Ngày kết thúc',
                size: 150,
                Cell: ({ cell }) => cell.getValue() ? formatDate(cell.getValue()) : 'Không giới hạn',
            },
            {
                accessorKey: 'status',
                header: 'Trạng thái',
                size: 150,
                Cell: ({ row }) => {
                    const item = row.original;
                    const now = new Date();
                    now.setHours(0, 0, 0, 0);
                    const startDate = item.start_date ? new Date(item.start_date) : null;
                    const endDate = item.end_date ? new Date(item.end_date) : null;
                    
                    let status = '';
                    let statusColor = 'default';
                    
                    if (startDate) {
                        startDate.setHours(0, 0, 0, 0);
                        if (endDate) {
                            endDate.setHours(23, 59, 59, 999);
                            if (now >= startDate && now <= endDate) {
                                status = 'Đang áp dụng';
                                statusColor = 'success';
                            } else if (now < startDate) {
                                status = 'Chuẩn bị áp dụng';
                                statusColor = 'warning';
                            } else {
                                status = 'Đã hết hạn';
                                statusColor = 'default';
                            }
                        } else {
                            if (now >= startDate) {
                                status = 'Đang áp dụng';
                                statusColor = 'success';
                            } else {
                                status = 'Chuẩn bị áp dụng';
                                statusColor = 'warning';
                            }
                        }
                    }
                    
                    return (
                        <Chip 
                            label={status}
                            color={statusColor}
                            size="small"
                        />
                    );
                },
            },
        ];
    }, [productDetail]);

    return (
        <div style={{ padding: '20px' }}>
            {/* Title */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
                    Quản lý Sản phẩm
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Quản lý thông tin sản phẩm, giá cả và tồn kho
                </Typography>
            </Box>

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
                positionActionsColumn="last"
                muiTableBodyRowProps={({ row }) => ({
                    onClick: (event) => {
                        // Prevent navigation when clicking on action buttons
                        if (event.target.closest('button')) return;
                        handleShowProductDetail(row.original);
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
                        <IconButton color="warning" onClick={(e) => { e.stopPropagation(); handleOpenEdit(row.original); }}>
                            <Edit />
                        </IconButton>
                        <IconButton color="error" onClick={(e) => { e.stopPropagation(); handleDeleteClick(row.original); }}>
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

            {/* Price Management Modal */}
            <Dialog open={showPriceModal} onClose={handleClosePriceModal} fullWidth maxWidth="md">
                <form onSubmit={handleSavePrice}>
                    <DialogTitle>
                        {editingRule ? 'Sửa quy tắc giá' : 'Thêm quy tắc giá mới'}
                        {selectedProduct && ` - ${selectedProduct.name}`}
                    </DialogTitle>
                    <DialogContent dividers>
                        <Box sx={{ mb: 3 }}>
                            <Button
                                variant="contained"
                                color="primary"
                                sx={{ mb: 2 }}
                                onClick={() => {
                                    setEditingRule(null);
                                    setPriceType('fixed_price');
                                    setPriceValue(selectedProduct?.hq_price || '0');
                                    setStartDate(new Date().toISOString().split('T')[0]);
                                    const nextYear = new Date();
                                    nextYear.setFullYear(nextYear.getFullYear() + 1);
                                    setEndDate(nextYear.toISOString().split('T')[0]);
                                }}
                            >
                                Thêm quy tắc giá mới
                            </Button>
                        </Box>

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

                        <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>Lịch sử giá</Typography>
                        {loadingPriceHistory ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                                <CircularProgress />
                            </Box>
                        ) : (
                            <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
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
                                            priceHistory.map((rule) => {
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
                                                                : formatCurrency(rule.value) + (rule.type === 'markup' ? ' (+)' : ' (-)')
                                                            }
                                                        </TableCell>
                                                        <TableCell>
                                                            {rule.start_date ? new Date(rule.start_date).toLocaleDateString('vi-VN') : 'N/A'}
                                                        </TableCell>
                                                        <TableCell>
                                                            {rule.end_date ? new Date(rule.end_date).toLocaleDateString('vi-VN') : 'Không giới hạn'}
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                                                                <IconButton 
                                                                    color="primary" 
                                                                    size="small"
                                                                    onClick={() => handleEditRule(rule)}
                                                                    title="Chỉnh sửa"
                                                                >
                                                                    <Edit fontSize="small" />
                                                                </IconButton>
                                                                <IconButton 
                                                                    color="error" 
                                                                    size="small"
                                                                    onClick={() => handleDeleteRule(rule.rule_id)}
                                                                    title="Xóa"
                                                                >
                                                                    <Delete fontSize="small" />
                                                                </IconButton>
                                                            </Box>
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
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClosePriceModal} color="secondary" variant="outlined">
                            Đóng
                        </Button>
                        <Button type="submit" variant="contained" color="primary">
                            {editingRule ? 'Cập nhật' : 'Tạo mới'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

            {/* Product Detail Modal */}
            <Dialog 
                open={showDetailModal} 
                onClose={handleCloseDetailModal} 
                maxWidth="lg"
                PaperProps={{
                    sx: { maxHeight: '90vh' }
                }}
            >
                <DialogTitle>
                    <Typography variant="h5" component="div">
                        Chi tiết sản phẩm
                    </Typography>
                </DialogTitle>
                <DialogContent dividers sx={{ overflowY: 'auto' }}>
                    {loadingDetail ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                            <CircularProgress />
                        </Box>
                    ) : productDetail ? (
                        <>
                        <Grid container spacing={3}>
                            {/* LEFT COLUMN - Product Details */}
                            <Grid item xs={12} md={8}>
                                {/* Product Details Card */}
                                <Card sx={{ mb: 3 }}>
                                    <CardContent>
                                        <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
                                            {productDetail.name}
                                        </Typography>
                                        
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                            <Box>
                                                <Typography variant="body2" color="text.secondary" component="span">
                                                    <strong>Mã sản phẩm:</strong>{' '}
                                                </Typography>
                                                <Typography variant="body1" component="span">
                                                    {productDetail.sku}
                                                </Typography>
                                            </Box>
                                            
                                            <Box>
                                                <Typography variant="body2" color="text.secondary" component="span">
                                                    <strong>Giá bán:</strong>{' '}
                                                </Typography>
                                                <Typography variant="body1" color="success.main" component="span" sx={{ fontWeight: 600 }}>
                                                    {formatCurrency(productDetail.hq_price || 0)}
                                                </Typography>
                                            </Box>
                                            
                                            <Box>
                                                <Typography variant="body2" color="text.secondary" component="span">
                                                    <strong>Danh mục:</strong>{' '}
                                                </Typography>
                                                <Typography variant="body1" component="span">
                                                    {productDetail.category?.name || 'N/A'}
                                                </Typography>
                                            </Box>
                                            
                                            <Box>
                                                <Typography variant="body2" color="text.secondary" component="span">
                                                    <strong>Nhà cung cấp:</strong>{' '}
                                                </Typography>
                                                <Typography variant="body1" component="span">
                                                    {productDetail.supplier?.name || 'N/A'}
                                                </Typography>
                                            </Box>
                                        </Box>
                                        
                                        {productDetail.description && (
                                            <Box sx={{ mt: 2 }}>
                                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                                    <strong>Mô tả:</strong>
                                                </Typography>
                                                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                                                    {productDetail.description}
                                                </Typography>
                                            </Box>
                                        )}
                                    </CardContent>
                                </Card>
                            </Grid>

                            {/* RIGHT COLUMN - Statistics & Inventory */}
                            <Grid item xs={12} md={4}>
                                <Grid container spacing={2}>
                                    {/* Current Stock Card */}
                                    <Grid item xs={12}>
                                        <Card>
                                            <CardContent sx={{ textAlign: 'center' }}>
                                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                                    Số lượng tồn kho hiện tại
                                                </Typography>
                                                <Typography variant="h4" color="warning.main">
                                                    {productInventory
                                                        .filter(item => item.location_type !== 'Warehouse' && item.location_name !== 'Kho tổng')
                                                        .reduce((sum, item) => sum + (item.stock || 0), 0)}
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>

                                    {/* Inventory by Store */}
                                    <Grid item xs={12}>
                                        <Card>
                                            <CardContent>
                                                <Typography variant="h6" gutterBottom>
                                                    Tồn kho theo cửa hàng
                                                </Typography>
                                                <Divider sx={{ mb: 2 }} />
                                                {productInventory.length > 0 ? (() => {
                                                    // Lọc bỏ kho tổng, chỉ hiển thị cửa hàng
                                                    const storeInventories = productInventory.filter(item => 
                                                        item.location_type !== 'Warehouse' && 
                                                        item.location_name !== 'Kho tổng'
                                                    );
                                                    return storeInventories.length > 0 ? (
                                                        <List dense>
                                                            {storeInventories.map((item, idx) => (
                                                                <React.Fragment key={idx}>
                                                                    <ListItem sx={{ px: 0 }}>
                                                                        <ListItemText
                                                                            primary={item.location_name || item.store?.name || 'N/A'}
                                                                            secondary={`Số lượng: ${item.stock || 0}`}
                                                                        />
                                                                    </ListItem>
                                                                    {idx < storeInventories.length - 1 && <Divider />}
                                                                </React.Fragment>
                                                            ))}
                                                        </List>
                                                    ) : (
                                                        <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                                                            Không có dữ liệu tồn kho tại cửa hàng
                                                        </Typography>
                                                    );
                                                })() : (
                                                    <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                                                        Không có dữ liệu tồn kho
                                                    </Typography>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Grid>

                        {/* Price Change Form Card - Separate Row */}
                        <Grid container spacing={3} sx={{ mt: 2 }}>
                            <Grid item xs={12}>
                                <Card>
                                    <CardContent>
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                            <AttachMoney sx={{ mr: 1 }} />
                                            <Typography variant="h6">
                                                {detailEditingRule ? 'Sửa quy tắc giá' : 'Thêm quy tắc giá mới'}
                                            </Typography>
                                        </Box>
                                        <Divider sx={{ mb: 2 }} />
                                        
                                        <form onSubmit={handleSavePriceInDetail}>
                                            <Grid container spacing={2}>
                                                <Grid item xs={12} sm={6} md={3}>
                                                    <FormControl fullWidth required>
                                                        <InputLabel>Loại quy tắc giá</InputLabel>
                                                        <Select
                                                            value={detailPriceType}
                                                            label="Loại quy tắc giá"
                                                            onChange={(e) => setDetailPriceType(e.target.value)}
                                                        >
                                                            <MenuItem value="fixed_price">Giá cố định</MenuItem>
                                                            <MenuItem value="markup">Tăng giá (cộng thêm)</MenuItem>
                                                            <MenuItem value="markdown">Giảm giá (trừ đi)</MenuItem>
                                                        </Select>
                                                    </FormControl>
                                                </Grid>

                                                <Grid item xs={12} sm={6} md={3}>
                                                    <TextField
                                                        label={detailPriceType === 'fixed_price' ? 'Giá cố định (₫)' : 
                                                               detailPriceType === 'markup' ? 'Số tiền tăng (₫)' : 
                                                               'Số tiền giảm (₫)'}
                                                        type="number"
                                                        inputProps={{ min: 0, step: 1000 }}
                                                        value={detailPriceValue}
                                                        onChange={(e) => setDetailPriceValue(e.target.value)}
                                                        fullWidth
                                                        required
                                                        helperText={
                                                            detailPriceType === 'fixed_price' ? 'Giá bán cố định' :
                                                            detailPriceType === 'markup' ? `+ ${formatCurrency(parseFloat(detailPriceValue) || 0)}` :
                                                            `- ${formatCurrency(parseFloat(detailPriceValue) || 0)}`
                                                        }
                                                    />
                                                </Grid>

                                                <Grid item xs={12} sm={6} md={3}>
                                                    <TextField
                                                        label="Ngày bắt đầu"
                                                        type="date"
                                                        value={detailStartDate}
                                                        onChange={(e) => setDetailStartDate(e.target.value)}
                                                        fullWidth
                                                        InputLabelProps={{ shrink: true }}
                                                        required
                                                    />
                                                </Grid>

                                                <Grid item xs={12} sm={6} md={3}>
                                                    <TextField
                                                        label="Ngày kết thúc (tùy chọn)"
                                                        type="date"
                                                        value={detailEndDate}
                                                        onChange={(e) => setDetailEndDate(e.target.value)}
                                                        fullWidth
                                                        InputLabelProps={{ shrink: true }}
                                                        inputProps={{ min: detailStartDate || undefined }}
                                                        helperText="Để trống = vĩnh viễn"
                                                    />
                                                </Grid>

                                                <Grid item xs={12}>
                                                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                                        {detailEditingRule && (
                                                            <Button
                                                                variant="outlined"
                                                                color="secondary"
                                                                onClick={() => {
                                                                    setDetailEditingRule(null);
                                                                    setDetailPriceType('fixed_price');
                                                                    setDetailPriceValue(productDetail?.hq_price || '0');
                                                                    setDetailStartDate(new Date().toISOString().split('T')[0]);
                                                                    const nextYear = new Date();
                                                                    nextYear.setFullYear(nextYear.getFullYear() + 1);
                                                                    setDetailEndDate(nextYear.toISOString().split('T')[0]);
                                                                }}
                                                            >
                                                                Hủy
                                                            </Button>
                                                        )}
                                                        <Button
                                                            type="submit"
                                                            variant="contained"
                                                            color="primary"
                                                            disabled={savingPrice}
                                                            startIcon={savingPrice ? <CircularProgress size={20} /> : null}
                                                        >
                                                            {savingPrice ? 'Đang lưu...' : (detailEditingRule ? 'Cập nhật' : 'Tạo mới')}
                                                        </Button>
                                                    </Box>
                                                </Grid>
                                            </Grid>
                                        </form>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>

                        {/* Price History Card - Separate Row */}
                        <Grid container sx={{ mt: 2 }}>
                            <Grid item xs={12}>
                                <Card>
                                    <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, px: 2, pt: 2 }}>
                                            <AttachMoney sx={{ mr: 1 }} />
                                            <Typography variant="h6">
                                                Lịch sử thay đổi giá
                                            </Typography>
                                        </Box>
                                        <Divider sx={{ mb: 2 }} />

                                        <Box sx={{ px: 2, pb: 2 }}>
                                            <MaterialReactTable
                                                columns={priceHistoryColumns}
                                                data={productPriceHistory}
                                                enableRowActions
                                                positionActionsColumn="last"
                                                enableColumnActions={false}
                                                enableColumnFilters={false}
                                                enableSorting={false}
                                                enableTopToolbar={false}
                                                enableBottomToolbar={false}
                                                enablePagination={false}
                                                muiTableContainerProps={{
                                                    sx: { maxHeight: 400 }
                                                }}
                                                muiTablePaperProps={{
                                                    elevation: 0,
                                                    sx: { boxShadow: 'none' }
                                                }}
                                                renderRowActions={({ row }) => {
                                                    const item = row.original;
                                                    // Xác định trạng thái để disable nút sửa/xóa
                                                    const now = new Date();
                                                    now.setHours(0, 0, 0, 0);
                                                    const startDate = item.start_date ? new Date(item.start_date) : null;
                                                    const endDate = item.end_date ? new Date(item.end_date) : null;
                                                    
                                                    let isActive = false;
                                                    
                                                    if (startDate) {
                                                        startDate.setHours(0, 0, 0, 0);
                                                        if (endDate) {
                                                            endDate.setHours(23, 59, 59, 999);
                                                            if (now >= startDate && now <= endDate) {
                                                                isActive = true;
                                                            }
                                                        } else {
                                                            if (now >= startDate) {
                                                                isActive = true;
                                                            }
                                                        }
                                                    }
                                                    
                                                    return (
                                                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                            <IconButton 
                                                                size="small" 
                                                                color="warning"
                                                                onClick={() => handleEditPriceInDetail(item)}
                                                                title="Sửa"
                                                                disabled={isActive}
                                                            >
                                                                <Edit fontSize="small" />
                                                            </IconButton>
                                                            <IconButton 
                                                                size="small" 
                                                                color="error"
                                                                onClick={() => handleDeletePriceInDetail(item.rule_id)}
                                                                title="Xóa"
                                                                disabled={isActive}
                                                            >
                                                                <Delete fontSize="small" />
                                                            </IconButton>
                                                        </Box>
                                                    );
                                                }}
                                                localization={{
                                                    noRecordsToDisplay: 'Chưa có lịch sử thay đổi giá'
                                                }}
                                            />
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>
                        </>
                    ) : (
                        <Alert severity="warning">Không tìm thấy thông tin sản phẩm</Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDetailModal} variant="outlined">
                        Đóng
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};
export default ProductManagement;

