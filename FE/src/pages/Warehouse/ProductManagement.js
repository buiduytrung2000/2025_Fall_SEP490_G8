// src/pages/Warehouse/ProductManagement.js
import React, { useState, useEffect, useMemo } from 'react';
import { Alert } from 'react-bootstrap';
import {
    getAllProducts, createProduct, updateProduct, toggleProductStatus, getAllCategories, getAllSuppliers,
    getProductPriceHistory, createPricingRule, updatePricingRule, deletePricingRule, getProduct, getAllPricingRules, getAllUnits
} from '../../api/productApi';
import { getInventoryByProduct } from '../../api/inventoryApi';
import { MaterialReactTable } from 'material-react-table';
import { useNavigate } from 'react-router-dom';
import { Box, IconButton, Button, Chip, Switch, Tooltip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, CircularProgress, Grid, Card, CardContent, Divider, List, ListItem, ListItemText } from '@mui/material';
import { Edit, AttachMoney, CheckCircle, Cancel, Delete } from '@mui/icons-material';
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

// Ngày bắt đầu mặc định = ngày hiện tại + 1
const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
};

// Hằng số cho quy tắc "Vĩnh viễn"
const PERMANENT_END_ISO = '9999-12-31T23:59:59.999Z';

const getPermanentEndDate = () => new Date(PERMANENT_END_ISO);

const isPermanentEndDateValue = (value) => {
    if (!value) return false;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    return date.getUTCFullYear() >= 9999;
};

const getEndDateLabel = (value) => {
    if (!value) return 'Vĩnh viễn';
    if (isPermanentEndDateValue(value)) return 'Vĩnh viễn';
    return new Date(value).toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
};

const ProductManagement = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [units, setUnits] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [filterCategory, setFilterCategory] = useState('');
    const [filterSupplier, setFilterSupplier] = useState('');
    const [editData, setEditData] = useState({
        product_id: null,
        sku: '',
        name: '',
        hq_price: '',
        import_price: '',
        category_id: '',
        supplier_id: '',
        description: '',
        base_unit_id: '',
        package_unit_id: '',
        conversion_factor: '',
        is_active: true
    });
    const [isEditMode, setIsEditMode] = useState(false);
    const [error, setError] = useState(null);

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

    // Delete confirmation modal states
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [ruleToDelete, setRuleToDelete] = useState(null);
    const [deletingRule, setDeletingRule] = useState(false);

    // Toggle status confirmation modal states
    const [showToggleConfirm, setShowToggleConfirm] = useState(false);
    const [productToToggle, setProductToToggle] = useState(null);
    const [togglingStatus, setTogglingStatus] = useState(false);

    // Active pricing rules map: product_id -> active rule
    const [activePricingRules, setActivePricingRules] = useState({});

    // Get store_id from localStorage or default to 1
    const selectedStoreId = (() => {
        const stored = localStorage.getItem('store_id');
        return stored ? parseInt(stored) : 1;
    })();

    // Load products, categories, suppliers
    useEffect(() => {
        loadData();
    }, []);

    const loadActivePricingRules = async () => {
        try {
            const pricingRulesRes = await getAllPricingRules({ store_id: selectedStoreId, status: 'active' });
            if (pricingRulesRes.err === 0) {
                const rulesMap = {};
                (pricingRulesRes.data || []).forEach(rule => {
                    if (rule.product_id && rule.status === 'active') {
                        rulesMap[rule.product_id] = rule;
                    }
                });
                setActivePricingRules(rulesMap);
            }
        } catch (err) {
            console.error('Lỗi khi tải active pricing rules:', err);
        }
    };

    const loadData = async () => {
        setError(null);
        try {
            const [productsRes, categoriesRes, suppliersRes, unitsRes, pricingRulesRes] = await Promise.all([
                // Load all products including inactive ones
                getAllProducts({ include_inactive: true }),
                getAllCategories(),
                getAllSuppliers(),
                getAllUnits(),
                // Load active pricing rules for current store
                getAllPricingRules({ store_id: selectedStoreId, status: 'active' })
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

            if (unitsRes.err === 0) {
                setUnits(unitsRes.data || []);
            }

            // Map active pricing rules by product_id
            if (pricingRulesRes.err === 0) {
                const rulesMap = {};
                (pricingRulesRes.data || []).forEach(rule => {
                    if (rule.product_id && rule.status === 'active') {
                        rulesMap[rule.product_id] = rule;
                    }
                });
                setActivePricingRules(rulesMap);
            }
        } catch (err) {
            setError('Lỗi khi tải dữ liệu: ' + err.message);
        }
    };

    const handleToggleStatus = (product) => {
        setProductToToggle(product);
        setShowToggleConfirm(true);
    };

    const confirmToggleStatus = async () => {
        if (!productToToggle) return;

        setTogglingStatus(true);
        try {
            const result = await toggleProductStatus(productToToggle.product_id);
            if (result.err === 0) {
                const newStatus = result.data?.is_active;
                toast.success(
                    newStatus
                        ? `✓ Đã kích hoạt sản phẩm "${productToToggle.name}"`
                        : `✓ Đã tắt sản phẩm "${productToToggle.name}"`
                );
                await loadData();
                setShowToggleConfirm(false);
                setProductToToggle(null);
            } else {
                toast.error(result.msg || 'Không thể thay đổi trạng thái sản phẩm');
            }
        } catch (err) {
            toast.error('Lỗi khi thay đổi trạng thái: ' + err.message);
        } finally {
            setTogglingStatus(false);
        }
    };

    // Filter products based on category and supplier
    const filteredProducts = useMemo(() => {
        let filtered = products;

        if (filterCategory) {
            filtered = filtered.filter(p => p.category_id === parseInt(filterCategory));
        }

        if (filterSupplier) {
            filtered = filtered.filter(p => p.supplier_id === parseInt(filterSupplier));
        }

        return filtered;
    }, [products, filterCategory, filterSupplier]);

    const handleOpenAdd = () => {
        setEditData({
            product_id: null,
            sku: '',
            name: '',
            hq_price: '',
            category_id: '',
            supplier_id: '',
            description: '',
            base_unit_id: '',
            package_unit_id: '',
            conversion_factor: ''
        });
        setIsEditMode(false);
        setError(null);
        setShowEditDialog(true);
    };

    const handleOpenEdit = async (prod) => {
        // Load product details including ProductUnit
        try {
            const productRes = await getProduct(prod.product_id);
            let packageUnitId = '';
            let conversionFactor = '';
            
            if (productRes.err === 0 && productRes.data) {
                const productData = productRes.data;
                // Try to get package unit from units array if available
                if (productData.units && productData.units.length > 0) {
                    // Find the package unit (usually the one with highest conversion_to_base)
                    const packageUnit = productData.units
                        .filter(pu => pu.unit_id !== productData.base_unit_id)
                        .sort((a, b) => (b.conversion_to_base || 0) - (a.conversion_to_base || 0))[0];
                    
                    if (packageUnit) {
                        packageUnitId = packageUnit.unit_id;
                        conversionFactor = packageUnit.conversion_to_base || '';
                    }
                }
            }
            
            setEditData({
                product_id: prod.product_id,
                sku: prod.sku || '',
                name: prod.name || '',
                hq_price: prod.hq_price || '',
                category_id: prod.category_id || '',
                supplier_id: prod.supplier_id || '',
                description: prod.description || '',
                base_unit_id: prod.base_unit_id || '',
                package_unit_id: packageUnitId,
                conversion_factor: conversionFactor
            });
        } catch (err) {
            // Fallback to basic data if API fails
            setEditData({
                product_id: prod.product_id,
                sku: prod.sku || '',
                name: prod.name || '',
                hq_price: prod.hq_price || '',
                category_id: prod.category_id || '',
                supplier_id: prod.supplier_id || '',
                description: prod.description || '',
                base_unit_id: prod.base_unit_id || '',
                package_unit_id: '',
                conversion_factor: ''
            });
        }
        
        setIsEditMode(true);
        setError(null);
        setShowEditDialog(true);
    };

    const handleCloseEditDialog = () => {
        setShowEditDialog(false);
        setError(null);
    };

    const handleEditField = (e) => {
        const { name, value } = e.target;
        setEditData(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveProduct = async (e) => {
        e.preventDefault();
        setError(null);

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
                import_price: parseFloat(editData.import_price) || 0,
                category_id: editData.category_id || null,
                supplier_id: editData.supplier_id || null,
                description: editData.description?.trim() || null,
                base_unit_id: editData.base_unit_id || null,
                package_unit_id: editData.package_unit_id || null,
                conversion_factor: editData.conversion_factor ? parseFloat(editData.conversion_factor) : null,
                is_active: editData.is_active !== undefined ? editData.is_active : true
            };

            let result;
            if (isEditMode) {
                result = await updateProduct(editData.product_id, productData);
                if (result.err === 0) {
                    toast.success('Cập nhật sản phẩm thành công');
                    await loadData();
                    setShowEditDialog(false);
                } else {
                    setError(result.msg || 'Không thể cập nhật sản phẩm');
                }
            } else {
                result = await createProduct(productData);
                if (result.err === 0) {
                    toast.success('Thêm sản phẩm thành công');
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
                const history = (response.data || []).map(rule => {
                    const isPermanent = isPermanentEndDateValue(rule.end_date);
                    return {
                    rule_id: rule.rule_id,
                    type: rule.type,
                    value: parseFloat(rule.value),
                    start_date: rule.start_date ? rule.start_date.split('T')[0] : '',
                        end_date: isPermanent
                            ? ''
                            : (rule.end_date ? rule.end_date.split('T')[0] : ''),
                        end_date_raw: rule.end_date,
                        status: rule.status || 'upcoming', // Lấy status từ DB
                    created_at: rule.created_at,
                    store: rule.store
                    };
                });
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
        setPriceValue(product.latest_import_price || '0');
        
        // Load price history trước để tính ngày bắt đầu mặc định
        await loadPriceHistory(product.product_id);
        
        // Tìm quy tắc hiện tại (quy tắc có start_date lớn nhất)
        let defaultStartDate = getTomorrowDate();
        if (priceHistory && priceHistory.length > 0) {
            // Sắp xếp theo start_date giảm dần để lấy quy tắc mới nhất
            const sortedRules = [...priceHistory].sort((a, b) => {
                const dateA = new Date(a.start_date || 0);
                const dateB = new Date(b.start_date || 0);
                return dateB - dateA;
            });
            const latestRule = sortedRules[0];
            if (latestRule && latestRule.start_date) {
                // Ngày bắt đầu mặc định = ngày sau ngày bắt đầu của quy tắc cũ
                const latestStartDate = new Date(latestRule.start_date);
                latestStartDate.setDate(latestStartDate.getDate() + 1);
                defaultStartDate = latestStartDate.toISOString().split('T')[0];
            }
        }
        
        setStartDate(defaultStartDate);
        setEndDate('');
        setShowPriceModal(true);
    };

    const handleEditRule = (rule) => {
        setEditingRule(rule);
        setPriceType(rule.type);
        setPriceValue(rule.value.toString());
        const startDateFormatted = rule.start_date
            ? (rule.start_date.includes('T') ? rule.start_date.split('T')[0] : rule.start_date)
            : getTomorrowDate();
        const endDateFormatted = rule.end_date && !isPermanentEndDateValue(rule.end_date)
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

        // Luôn dùng fixed_price
        if (!priceType) {
            setPriceType('fixed_price');
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

        // Ngày bắt đầu áp dụng = ngày được chọn + 1 ngày
        const selectedDate = new Date(startDate);
        selectedDate.setDate(selectedDate.getDate() + 1);
        const actualStartDate = selectedDate.toISOString().split('T')[0];
        const startDateObj = new Date(actualStartDate);
        startDateObj.setHours(0, 0, 0, 0);

        if (endDate && new Date(endDate) < new Date(actualStartDate)) {
            toast.error('Ngày kết thúc phải sau ngày bắt đầu áp dụng');
            return;
        }

        // Kiểm tra nếu ngày bắt đầu trùng với quy tắc khác
        if (priceHistory && priceHistory.length > 0) {
            
            // Tìm quy tắc có start_date lớn nhất (quy tắc cũ gần nhất)
            const sortedRules = [...priceHistory]
                .filter(rule => {
                    // Bỏ qua quy tắc đang sửa
                    if (editingRule && rule.rule_id === editingRule.rule_id) return false;
                    return rule.start_date;
                })
                .sort((a, b) => {
                    const dateA = new Date(a.start_date);
                    const dateB = new Date(b.start_date);
                    return dateB - dateA; // Sắp xếp giảm dần
                });
            
            if (sortedRules.length > 0) {
                const latestRule = sortedRules[0];
                const latestStartDate = new Date(latestRule.start_date);
                latestStartDate.setHours(0, 0, 0, 0);
                
                // Kiểm tra nếu ngày bắt đầu trùng với quy tắc khác
                if (startDateObj.getTime() === latestStartDate.getTime()) {
                    toast.error('Ngày bắt đầu không được trùng với ngày bắt đầu của quy tắc đã tồn tại');
                    return;
                }
            }
        }

        const ruleData = {
            product_id: selectedProduct.product_id,
            store_id: selectedStoreId,
            type: priceType,
            value: priceValueNum,
            start_date: actualStartDate + 'T00:00:00',
            end_date: endDate ? endDate + 'T23:59:59' : PERMANENT_END_ISO
        };

        try {
            let response;
            if (editingRule) {
                response = await updatePricingRule(editingRule.rule_id, ruleData);
            } else {
                // Tạo quy tắc mới
                response = await createPricingRule(ruleData);
                
                // Nếu tạo thành công, kiểm tra và tách quy tắc cũ nếu cần
                if (response.err === 0 && priceHistory && priceHistory.length > 0) {
                    const newStartDate = new Date(actualStartDate);
                    newStartDate.setHours(0, 0, 0, 0);
                    const newEndDate = endDate ? new Date(endDate) : getPermanentEndDate();
                    newEndDate.setHours(23, 59, 59, 999);
                    
                    // Tìm quy tắc có overlap với quy tắc mới
                    const coveringRule = priceHistory.find(rule => {
                        if (!rule.start_date) return false;
                        const ruleStart = new Date(rule.start_date);
                        ruleStart.setHours(0, 0, 0, 0);
                        
                        // Quy tắc cũ phải bắt đầu trước hoặc bằng ngày bắt đầu quy tắc mới
                        if (ruleStart > newStartDate) return false;
                        
                        const ruleEnd = isPermanentEndDateValue(rule.end_date_raw || rule.end_date) 
                            ? getPermanentEndDate() 
                            : new Date(rule.end_date_raw || rule.end_date);
                        ruleEnd.setHours(23, 59, 59, 999);
                        
                        // Quy tắc cũ phải kết thúc sau hoặc bằng ngày bắt đầu quy tắc mới (có overlap)
                        return ruleEnd >= newStartDate;
                    });
                    
                    if (coveringRule) {
                        try {
                            const coveringStart = new Date(coveringRule.start_date);
                            coveringStart.setHours(0, 0, 0, 0);
                            const coveringEnd = isPermanentEndDateValue(coveringRule.end_date_raw || coveringRule.end_date)
                                ? getPermanentEndDate()
                                : new Date(coveringRule.end_date_raw || coveringRule.end_date);
                            coveringEnd.setHours(23, 59, 59, 999);
                            
                            // Cập nhật phần trước quy tắc mới (nếu có)
                            if (coveringStart < newStartDate) {
                                const beforeEndDate = new Date(newStartDate);
                                beforeEndDate.setDate(beforeEndDate.getDate() - 1);
                                beforeEndDate.setHours(23, 59, 59, 999);
                                
                                await updatePricingRule(coveringRule.rule_id, {
                                    end_date: beforeEndDate.toISOString()
                                });
                            } else {
                                // Nếu start_date trùng, xóa quy tắc cũ
                                await deletePricingRule(coveringRule.rule_id);
                            }
                            
                            // Tạo phần sau quy tắc mới (nếu có)
                            // Kiểm tra nếu quy tắc cũ kết thúc sau quy tắc mới
                            const isCoveringEndPermanent = isPermanentEndDateValue(coveringRule.end_date_raw || coveringRule.end_date);
                            const isNewEndPermanent = !endDate || isPermanentEndDateValue(endDate);
                            
                            if (isCoveringEndPermanent && !isNewEndPermanent) {
                                // Quy tắc cũ vĩnh viễn, quy tắc mới có ngày kết thúc → tạo phần sau
                                const afterStartDate = new Date(newEndDate);
                                afterStartDate.setDate(afterStartDate.getDate() + 1);
                                afterStartDate.setHours(0, 0, 0, 0);
                                
                                await createPricingRule({
                                    product_id: selectedProduct.product_id,
                                    store_id: selectedStoreId,
                                    type: coveringRule.type,
                                    value: coveringRule.value,
                                    start_date: afterStartDate.toISOString().split('T')[0] + 'T00:00:00',
                                    end_date: PERMANENT_END_ISO
                                });
                            } else if (!isCoveringEndPermanent && !isNewEndPermanent && coveringEnd > newEndDate) {
                                // Cả 2 đều có ngày kết thúc và quy tắc cũ kết thúc sau quy tắc mới
                                const afterStartDate = new Date(newEndDate);
                                afterStartDate.setDate(afterStartDate.getDate() + 1);
                                afterStartDate.setHours(0, 0, 0, 0);
                                
                                const afterEndDate = coveringEnd.toISOString();
                                
                                await createPricingRule({
                                    product_id: selectedProduct.product_id,
                                    store_id: selectedStoreId,
                                    type: coveringRule.type,
                                    value: coveringRule.value,
                                    start_date: afterStartDate.toISOString().split('T')[0] + 'T00:00:00',
                                    end_date: afterEndDate
                                });
                            }
                        } catch (splitErr) {
                            console.error('Lỗi khi tách quy tắc cũ:', splitErr);
                            toast.error('Lỗi khi tách quy tắc cũ');
                        }
                    }
                    
                    // Tìm và xóa các quy tắc nằm hoàn toàn trong khoảng thời gian của quy tắc mới
                    const containedRules = priceHistory.filter(rule => {
                        if (!rule.start_date) return false;
                        const ruleStart = new Date(rule.start_date);
                        ruleStart.setHours(0, 0, 0, 0);
                        
                        // Quy tắc cũ phải bắt đầu sau hoặc bằng ngày bắt đầu quy tắc mới
                        if (ruleStart < newStartDate) return false;
                        
                        const ruleEnd = isPermanentEndDateValue(rule.end_date_raw || rule.end_date) 
                            ? getPermanentEndDate() 
                            : new Date(rule.end_date_raw || rule.end_date);
                        ruleEnd.setHours(23, 59, 59, 999);
                        
                        const isNewEndPermanent = !endDate || isPermanentEndDateValue(endDate);
                        
                        // Quy tắc cũ phải nằm hoàn toàn trong quy tắc mới
                        if (isNewEndPermanent) {
                            // Quy tắc mới vĩnh viễn → quy tắc cũ chỉ cần bắt đầu sau newStartDate
                            return ruleStart >= newStartDate;
                        } else {
                            // Quy tắc mới có ngày kết thúc → quy tắc cũ phải nằm hoàn toàn trong khoảng
                            return ruleStart >= newStartDate && ruleEnd <= newEndDate;
                        }
                    });
                    
                    if (containedRules.length > 0) {
                        try {
                            for (const containedRule of containedRules) {
                                await deletePricingRule(containedRule.rule_id);
                            }
                        } catch (deleteErr) {
                            console.error('Lỗi khi xóa quy tắc:', deleteErr);
                            toast.error('Lỗi khi xóa quy tắc cũ');
                        }
                    }
                    
                    // Logic cũ: cập nhật quy tắc trước đó (nếu không có coveringRule và không có containedRules)
                    if (!coveringRule && containedRules.length === 0) {
                        const sortedRules = [...priceHistory].sort((a, b) => {
                            const dateA = new Date(a.start_date || 0);
                            const dateB = new Date(b.start_date || 0);
                            return dateB - dateA;
                        });
                        
                        const previousRule = sortedRules.find(rule => {
                            const ruleStart = new Date(rule.start_date);
                            const newStart = new Date(actualStartDate);
                            return ruleStart < newStart;
                        });
                        
                        if (previousRule) {
                            const newEndDate = new Date(startDate);
                            newEndDate.setDate(newEndDate.getDate() - 1);
                            const endDateStr = newEndDate.toISOString().split('T')[0] + 'T23:59:59';
                            
                            try {
                                await updatePricingRule(previousRule.rule_id, {
                                    end_date: endDateStr
                                });
                                toast.info('Đã tự động cập nhật ngày kết thúc của quy tắc trước đó');
                            } catch (updateErr) {
                                console.error('Lỗi khi cập nhật quy tắc cũ:', updateErr);
                            }
                        }
                    }
                }
            }

            if (response.err === 0) {
                toast.success(editingRule ? 'Cập nhật giá thành công' : 'Tạo quy tắc giá thành công');
                handleClosePriceModal();
                await loadPriceHistory(selectedProduct.product_id);
                // Reload active pricing rules to update the table
                await loadActivePricingRules();
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

    const handleDeleteRule = (ruleId) => {
        setRuleToDelete(ruleId);
        setShowDeleteConfirm(true);
    };

    const confirmDeleteRule = async () => {
        if (!ruleToDelete) return;

        setDeletingRule(true);
        try {
            const response = await deletePricingRule(ruleToDelete);
            if (response.err === 0) {
                toast.success('Xóa quy tắc giá thành công');
                if (selectedProduct) {
                    await loadPriceHistory(selectedProduct.product_id);
                }
                // Reload active pricing rules to update the table
                await loadActivePricingRules();
                setShowDeleteConfirm(false);
                setRuleToDelete(null);
            } else {
                toast.error(response.msg || 'Có lỗi xảy ra');
            }
        } catch (err) {
            toast.error('Lỗi kết nối: ' + err.message);
        } finally {
            setDeletingRule(false);
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
        setDetailPriceValue(product.latest_import_price || '0');
        setDetailStartDate(getTomorrowDate());
        setDetailEndDate('');
        setDetailEditingRule(null);

        try {
            const [productRes, inventoryRes, priceHistoryRes] = await Promise.all([
                getProduct(product.product_id),
                getInventoryByProduct(product.product_id),
                getProductPriceHistory(product.product_id, selectedStoreId)
            ]);

            if (productRes.err === 0) {
                setProductDetail(productRes.data);
                setDetailPriceValue(productRes.data.latest_import_price || '0');
            } else {
                toast.error(productRes.msg || 'Không thể tải thông tin sản phẩm');
            }

            if (inventoryRes.err === 0) {
                setProductInventory(inventoryRes.data || []);
            }

            if (priceHistoryRes.err === 0) {
                const normalized = (priceHistoryRes.data || []).map(rule => {
                    const isPermanent = isPermanentEndDateValue(rule.end_date);
                    return {
                        ...rule,
                        start_date: rule.start_date,
                        end_date: isPermanent ? null : rule.end_date,
                        end_date_raw: rule.end_date
                    };
                });
                setProductPriceHistory(normalized);
                
                // Tính ngày bắt đầu mặc định dựa trên quy tắc cũ
                let defaultStartDate = getTomorrowDate();
                if (normalized && normalized.length > 0) {
                    // Sắp xếp theo start_date giảm dần để lấy quy tắc mới nhất
                    const sortedRules = [...normalized].sort((a, b) => {
                        const dateA = new Date(a.start_date || 0);
                        const dateB = new Date(b.start_date || 0);
                        return dateB - dateA;
                    });
                    const latestRule = sortedRules[0];
                    if (latestRule && latestRule.start_date) {
                        // Ngày bắt đầu mặc định = ngày sau ngày bắt đầu của quy tắc cũ
                        const latestStartDate = new Date(latestRule.start_date);
                        latestStartDate.setDate(latestStartDate.getDate() + 1);
                        defaultStartDate = latestStartDate.toISOString().split('T')[0];
                    }
                }
                setDetailStartDate(defaultStartDate);
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
            : getTomorrowDate();
        const endDateFormatted = rule.end_date && !isPermanentEndDateValue(rule.end_date)
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

        // Luôn dùng fixed_price
        if (!detailPriceType) {
            setDetailPriceType('fixed_price');
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

        // Ngày bắt đầu áp dụng = ngày được chọn + 1 ngày
        const selectedDateDetail = new Date(detailStartDate);
        selectedDateDetail.setDate(selectedDateDetail.getDate() + 1);
        const actualStartDateDetail = selectedDateDetail.toISOString().split('T')[0];
        const startDateObj = new Date(actualStartDateDetail);
        startDateObj.setHours(0, 0, 0, 0);

        if (detailEndDate && new Date(detailEndDate) < new Date(actualStartDateDetail)) {
            toast.error('Ngày kết thúc phải sau ngày bắt đầu áp dụng');
            return;
        }

        // Kiểm tra nếu ngày bắt đầu trùng với quy tắc khác
        if (productPriceHistory && productPriceHistory.length > 0) {
            
            // Tìm quy tắc có start_date lớn nhất (quy tắc cũ gần nhất)
            const sortedRules = [...productPriceHistory]
                .filter(rule => {
                    // Bỏ qua quy tắc đang sửa
                    if (detailEditingRule && rule.rule_id === detailEditingRule.rule_id) return false;
                    return rule.start_date;
                })
                .sort((a, b) => {
                    const dateA = new Date(a.start_date);
                    const dateB = new Date(b.start_date);
                    return dateB - dateA; // Sắp xếp giảm dần
                });
            
            if (sortedRules.length > 0) {
                const latestRule = sortedRules[0];
                const latestStartDate = new Date(latestRule.start_date);
                latestStartDate.setHours(0, 0, 0, 0);
                
                // Kiểm tra nếu ngày bắt đầu trùng với quy tắc khác
                if (startDateObj.getTime() === latestStartDate.getTime()) {
                    toast.error('Ngày bắt đầu không được trùng với ngày bắt đầu của quy tắc đã tồn tại');
                    return;
                }
            }
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
            start_date: actualStartDateDetail + 'T00:00:00',
            end_date: detailEndDate ? detailEndDate + 'T23:59:59' : PERMANENT_END_ISO
        };

        setSavingPrice(true);
        try {
            let response;
            if (detailEditingRule) {
                response = await updatePricingRule(detailEditingRule.rule_id, ruleData);
            } else {
                // Tạo quy tắc mới
                response = await createPricingRule(ruleData);
                
                // Nếu tạo thành công, kiểm tra và tách quy tắc cũ nếu cần
                if (response.err === 0 && productPriceHistory && productPriceHistory.length > 0) {
                    const newStartDate = new Date(actualStartDateDetail);
                    newStartDate.setHours(0, 0, 0, 0);
                    const newEndDate = detailEndDate ? new Date(detailEndDate) : getPermanentEndDate();
                    newEndDate.setHours(23, 59, 59, 999);
                    
                    // Tìm quy tắc có overlap với quy tắc mới
                    const coveringRule = productPriceHistory.find(rule => {
                        if (!rule.start_date) return false;
                        const ruleStart = new Date(rule.start_date);
                        ruleStart.setHours(0, 0, 0, 0);
                        
                        // Quy tắc cũ phải bắt đầu trước hoặc bằng ngày bắt đầu quy tắc mới
                        if (ruleStart > newStartDate) return false;
                        
                        const ruleEnd = isPermanentEndDateValue(rule.end_date_raw || rule.end_date) 
                            ? getPermanentEndDate() 
                            : new Date(rule.end_date_raw || rule.end_date);
                        ruleEnd.setHours(23, 59, 59, 999);
                        
                        // Quy tắc cũ phải kết thúc sau hoặc bằng ngày bắt đầu quy tắc mới (có overlap)
                        return ruleEnd >= newStartDate;
                    });
                    
                    if (coveringRule) {
                        try {
                            const coveringStart = new Date(coveringRule.start_date);
                            coveringStart.setHours(0, 0, 0, 0);
                            const coveringEnd = isPermanentEndDateValue(coveringRule.end_date_raw || coveringRule.end_date)
                                ? getPermanentEndDate()
                                : new Date(coveringRule.end_date_raw || coveringRule.end_date);
                            coveringEnd.setHours(23, 59, 59, 999);
                            
                            // Cập nhật phần trước quy tắc mới (nếu có)
                            if (coveringStart < newStartDate) {
                                const beforeEndDate = new Date(newStartDate);
                                beforeEndDate.setDate(beforeEndDate.getDate() - 1);
                                beforeEndDate.setHours(23, 59, 59, 999);
                                
                                await updatePricingRule(coveringRule.rule_id, {
                                    end_date: beforeEndDate.toISOString()
                                });
                            } else {
                                // Nếu start_date trùng, xóa quy tắc cũ
                                await deletePricingRule(coveringRule.rule_id);
                            }
                            
                            // Tạo phần sau quy tắc mới (nếu có)
                            // Kiểm tra nếu quy tắc cũ kết thúc sau quy tắc mới
                            const isCoveringEndPermanent = isPermanentEndDateValue(coveringRule.end_date_raw || coveringRule.end_date);
                            const isNewEndPermanent = !detailEndDate || isPermanentEndDateValue(detailEndDate);
                            
                            if (isCoveringEndPermanent && !isNewEndPermanent) {
                                // Quy tắc cũ vĩnh viễn, quy tắc mới có ngày kết thúc → tạo phần sau
                                const afterStartDate = new Date(newEndDate);
                                afterStartDate.setDate(afterStartDate.getDate() + 1);
                                afterStartDate.setHours(0, 0, 0, 0);
                                
                                await createPricingRule({
                                    product_id: productDetail.product_id,
                                    store_id: selectedStoreId,
                                    type: coveringRule.type,
                                    value: coveringRule.value,
                                    start_date: afterStartDate.toISOString().split('T')[0] + 'T00:00:00',
                                    end_date: PERMANENT_END_ISO
                                });
                            } else if (!isCoveringEndPermanent && !isNewEndPermanent && coveringEnd > newEndDate) {
                                // Cả 2 đều có ngày kết thúc và quy tắc cũ kết thúc sau quy tắc mới
                                const afterStartDate = new Date(newEndDate);
                                afterStartDate.setDate(afterStartDate.getDate() + 1);
                                afterStartDate.setHours(0, 0, 0, 0);
                                
                                const afterEndDate = coveringEnd.toISOString();
                                
                                await createPricingRule({
                                    product_id: productDetail.product_id,
                                    store_id: selectedStoreId,
                                    type: coveringRule.type,
                                    value: coveringRule.value,
                                    start_date: afterStartDate.toISOString().split('T')[0] + 'T00:00:00',
                                    end_date: afterEndDate
                                });
                            }
                        } catch (splitErr) {
                            console.error('Lỗi khi tách quy tắc cũ:', splitErr);
                            toast.error('Lỗi khi tách quy tắc cũ');
                        }
                    }
                    
                    // Tìm và xóa các quy tắc nằm hoàn toàn trong khoảng thời gian của quy tắc mới
                    const containedRules = productPriceHistory.filter(rule => {
                        if (!rule.start_date) return false;
                        const ruleStart = new Date(rule.start_date);
                        ruleStart.setHours(0, 0, 0, 0);
                        
                        // Quy tắc cũ phải bắt đầu sau hoặc bằng ngày bắt đầu quy tắc mới
                        if (ruleStart < newStartDate) return false;
                        
                        const ruleEnd = isPermanentEndDateValue(rule.end_date_raw || rule.end_date) 
                            ? getPermanentEndDate() 
                            : new Date(rule.end_date_raw || rule.end_date);
                        ruleEnd.setHours(23, 59, 59, 999);
                        
                        const isNewEndPermanent = !detailEndDate || isPermanentEndDateValue(detailEndDate);
                        
                        // Quy tắc cũ phải nằm hoàn toàn trong quy tắc mới
                        if (isNewEndPermanent) {
                            // Quy tắc mới vĩnh viễn → quy tắc cũ chỉ cần bắt đầu sau newStartDate
                            return ruleStart >= newStartDate;
                        } else {
                            // Quy tắc mới có ngày kết thúc → quy tắc cũ phải nằm hoàn toàn trong khoảng
                            return ruleStart >= newStartDate && ruleEnd <= newEndDate;
                        }
                    });
                    
                    if (containedRules.length > 0) {
                        try {
                            for (const containedRule of containedRules) {
                                await deletePricingRule(containedRule.rule_id);
                            }
                        } catch (deleteErr) {
                            console.error('Lỗi khi xóa quy tắc:', deleteErr);
                            toast.error('Lỗi khi xóa quy tắc cũ');
                        }
                    }
                    
                    // Logic cũ: cập nhật quy tắc trước đó (nếu không có coveringRule và không có containedRules)
                    if (!coveringRule && containedRules.length === 0) {
                        const sortedRules = [...productPriceHistory].sort((a, b) => {
                            const dateA = new Date(a.start_date || 0);
                            const dateB = new Date(b.start_date || 0);
                            return dateB - dateA;
                        });
                        
                        const previousRule = sortedRules.find(rule => {
                            const ruleStart = new Date(rule.start_date);
                            const newStart = new Date(actualStartDateDetail);
                            return ruleStart < newStart;
                        });
                        
                        if (previousRule) {
                            const newEndDate = new Date(detailStartDate);
                            newEndDate.setDate(newEndDate.getDate() - 1);
                            const endDateStr = newEndDate.toISOString().split('T')[0] + 'T23:59:59';
                            
                            try {
                                await updatePricingRule(previousRule.rule_id, {
                                    end_date: endDateStr
                                });
                                toast.info('Đã tự động cập nhật ngày kết thúc của quy tắc trước đó');
                            } catch (updateErr) {
                                console.error('Lỗi khi cập nhật quy tắc cũ:', updateErr);
                            }
                        }
                    }
                }
            }

            if (response.err === 0) {
                toast.success(detailEditingRule ? 'Cập nhật giá thành công' : 'Tạo quy tắc giá thành công');
                // Reset form
                setDetailEditingRule(null);
                setDetailPriceType('fixed_price');
                setDetailPriceValue(productDetail.latest_import_price || '0');
                
                // Tính lại ngày bắt đầu mặc định sau khi reload
                const priceHistoryRes = await getProductPriceHistory(productDetail.product_id, selectedStoreId);
                if (priceHistoryRes.err === 0) {
                    const normalized = (priceHistoryRes.data || []).map(rule => {
                        const isPermanent = isPermanentEndDateValue(rule.end_date);
                        return {
                            ...rule,
                            start_date: rule.start_date,
                            end_date: isPermanent ? null : rule.end_date,
                            end_date_raw: rule.end_date
                        };
                    });
                    setProductPriceHistory(normalized);
                    
                    // Tính ngày bắt đầu mặc định
                    let defaultStartDate = getTomorrowDate();
                    if (normalized && normalized.length > 0) {
                        const sortedRules = [...normalized].sort((a, b) => {
                            const dateA = new Date(a.start_date || 0);
                            const dateB = new Date(b.start_date || 0);
                            return dateB - dateA;
                        });
                        const latestRule = sortedRules[0];
                        if (latestRule && latestRule.start_date) {
                            const latestStartDate = new Date(latestRule.start_date);
                            latestStartDate.setDate(latestStartDate.getDate() + 1);
                            defaultStartDate = latestStartDate.toISOString().split('T')[0];
                        }
                    }
                    setDetailStartDate(defaultStartDate);
                }
                setDetailEndDate('');
                // Reload active pricing rules to update the table
                await loadActivePricingRules();
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

    const handleDeletePriceInDetail = (ruleId) => {
        setRuleToDelete(ruleId);
        setShowDeleteConfirm(true);
    };

    const confirmDeletePriceInDetail = async () => {
        if (!ruleToDelete) return;

        setDeletingRule(true);
        try {
            const response = await deletePricingRule(ruleToDelete);
            if (response.err === 0) {
                toast.success('Xóa quy tắc giá thành công');
                // Reload price history
                if (productDetail) {
                    const priceHistoryRes = await getProductPriceHistory(productDetail.product_id, selectedStoreId);
                    if (priceHistoryRes.err === 0) {
                        setProductPriceHistory(priceHistoryRes.data || []);
                    }
                }
                // Reload active pricing rules to update the table
                await loadActivePricingRules();
                setShowDeleteConfirm(false);
                setRuleToDelete(null);
            } else {
                toast.error(response.msg || 'Có lỗi xảy ra');
            }
        } catch (err) {
            toast.error('Lỗi kết nối: ' + err.message);
        } finally {
            setDeletingRule(false);
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
                accessorKey: 'stt',
                header: 'STT',
                size: 50,
                Cell: ({ row }) => row.index + 1,
            },
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
                accessorKey: 'latest_import_price',
                header: 'Giá nhập',
                size: 120,
                Cell: ({ cell }) => {
                    const price = cell.getValue();
                    return formatCurrency(price || 0);
                },
            },
            {
                accessorKey: 'selling_price',
                header: 'Giá bán',
                size: 120,
                Cell: ({ row }) => {
                    const product = row.original;
                    // Lấy giá từ pricing rule active, nếu không có thì dùng giá nhập
                    const activeRule = activePricingRules[product.product_id];
                    if (activeRule && activeRule.value) {
                        return formatCurrency(activeRule.value);
                    }
                    // Mặc định là giá nhập
                    return formatCurrency(product.latest_import_price || 0);
                },
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
            {
                accessorKey: 'is_active',
                header: 'Trạng thái',
                size: 120,
                Cell: ({ cell }) => (
                    <Chip
                        icon={cell.getValue() ? <CheckCircle /> : <Cancel />}
                        label={cell.getValue() ? 'Hoạt động' : 'Đã tắt'}
                        color={cell.getValue() ? 'success' : 'default'}
                        size="small"
                        variant={cell.getValue() ? 'filled' : 'outlined'}
                    />
                ),
            },
        ],
        [activePricingRules],
    );

    // Định nghĩa cột cho bảng lịch sử giá
    const priceHistoryColumns = useMemo(() => {
        return [
            {
                accessorKey: 'index',
                header: 'STT',
                size: 60,
                Cell: ({ row }) => row.index + 1,
            },
            {
                accessorKey: 'value',
                header: 'Giá trị',
                size: 150,
                Cell: ({ cell, row }) => {
                    const value = cell.getValue();
                    const type = row.original.type;
                    const displayValue = type === 'fixed_price'
                        ? formatCurrency(value || productDetail?.latest_import_price)
                        : formatCurrency(value || productDetail?.latest_import_price) + (type === 'markup' ? ' (+)' : ' (-)');
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
                Cell: ({ row, cell }) => getEndDateLabel(row.original.end_date_raw || cell.getValue()),
            },
            {
                accessorKey: 'status',
                header: 'Trạng thái',
                size: 150,
                Cell: ({ row }) => {
                    const item = row.original;
                    // Ưu tiên sử dụng status từ DB, nếu không có thì tính toán lại
                    let status = '';
                    let statusColor = 'default';

                    if (item.status) {
                        // Sử dụng status từ DB
                        if (item.status === 'active') {
                            status = 'Đang áp dụng';
                            statusColor = 'success';
                        } else if (item.status === 'upcoming') {
                            status = 'Chuẩn bị áp dụng';
                            statusColor = 'warning';
                        } else if (item.status === 'expired') {
                            status = 'Đã hết hạn';
                            statusColor = 'default';
                        }
                    } else {
                        // Tính toán lại nếu không có status từ DB (dữ liệu cũ)
                    const now = new Date();
                    now.setHours(0, 0, 0, 0);
                    const startDate = item.start_date ? new Date(item.start_date) : null;
                    const endDate = item.end_date ? new Date(item.end_date) : null;

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

            {/* Bộ lọc */}
            <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <FormControl sx={{ minWidth: 200 }}>
                    <InputLabel>Danh mục</InputLabel>
                    <Select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        label="Danh mục"
                    >
                        <MenuItem value="">
                            <em>Tất cả</em>
                        </MenuItem>
                        {categories.map((cat) => (
                            <MenuItem key={cat.category_id} value={cat.category_id}>
                                {cat.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl sx={{ minWidth: 200 }}>
                    <InputLabel>Nhà cung cấp</InputLabel>
                    <Select
                        value={filterSupplier}
                        onChange={(e) => setFilterSupplier(e.target.value)}
                        label="Nhà cung cấp"
                    >
                        <MenuItem value="">
                            <em>Tất cả</em>
                        </MenuItem>
                        {suppliers.map((sup) => (
                            <MenuItem key={sup.supplier_id} value={sup.supplier_id}>
                                {sup.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {(filterCategory || filterSupplier) && (
                    <Button
                        variant="outlined"
                        onClick={() => {
                            setFilterCategory('');
                            setFilterSupplier('');
                        }}
                    >
                        Xóa bộ lọc
                    </Button>
                )}
            </Box>

            <MaterialReactTable
                columns={columns}
                data={filteredProducts}
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
                // Nút Sửa và Toggle trạng thái ở mỗi hàng
                renderRowActions={({ row }) => (
                    <Box sx={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <Tooltip title="Chỉnh sửa sản phẩm">
                            <IconButton
                                color="warning"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEdit(row.original);
                                }}
                            >
                                <Edit />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title={row.original.is_active ? "Tắt sản phẩm" : "Bật sản phẩm"}>
                            <Switch
                                checked={row.original.is_active}
                                onChange={(e) => {
                                    e.stopPropagation();
                                    handleToggleStatus(row.original);
                                }}
                                color={row.original.is_active ? "success" : "default"}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </Tooltip>
                    </Box>
                )}
                // Tùy chỉnh tiêu đề
                muiTableHeadCellProps={{
                    sx: {
                        backgroundColor: '#f5f5f5',
                        fontWeight: 'bold',
                    },
                }}
                localization={{
                    actions: 'Thao tác'
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
                            <InputLabel>Nhà cung cấp chính</InputLabel>
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
                        <FormControl fullWidth margin="normal">
                            <InputLabel>Đơn vị lẻ</InputLabel>
                            <Select
                                name="base_unit_id"
                                value={editData.base_unit_id || ''}
                                onChange={handleEditField}
                                label="Đơn vị lẻ"
                            >
                                <MenuItem value="">
                                    <em>Không chọn</em>
                                </MenuItem>
                                {units.map((unit) => (
                                    <MenuItem key={unit.unit_id} value={unit.unit_id}>
                                        {unit.name} ({unit.symbol})
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth margin="normal">
                            <InputLabel>Đơn vị lớn</InputLabel>
                            <Select
                                name="package_unit_id"
                                value={editData.package_unit_id || ''}
                                onChange={handleEditField}
                                label="Đơn vị lớn"
                            >
                                <MenuItem value="">
                                    <em>Không chọn</em>
                                </MenuItem>
                                {units
                                    .filter(unit => unit.unit_id !== editData.base_unit_id)
                                    .map((unit) => (
                                        <MenuItem key={unit.unit_id} value={unit.unit_id}>
                                            {unit.name} ({unit.symbol})
                                        </MenuItem>
                                    ))}
                            </Select>
                        </FormControl>
                        {editData.package_unit_id && (
                            <TextField
                                label="Hệ số quy đổi"
                                name="conversion_factor"
                                type="number"
                                inputProps={{ min: 0, step: 0.01 }}
                                value={editData.conversion_factor}
                                onChange={handleEditField}
                                fullWidth
                                margin="normal"
                                helperText="Số đơn vị lẻ trong 1 đơn vị lớn (ví dụ: 12 nếu 1 thùng = 12 chai)"
                            />
                        )}
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
            <Dialog open={showPriceModal} onClose={handleClosePriceModal} fullWidth maxWidth="lg">
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
                                    setPriceValue(selectedProduct?.latest_import_price || '0');
                                    
                                    // Tính ngày bắt đầu mặc định dựa trên quy tắc cũ
                                    let defaultStartDate = getTomorrowDate();
                                    if (priceHistory && priceHistory.length > 0) {
                                        const sortedRules = [...priceHistory].sort((a, b) => {
                                            const dateA = new Date(a.start_date || 0);
                                            const dateB = new Date(b.start_date || 0);
                                            return dateB - dateA;
                                        });
                                        const latestRule = sortedRules[0];
                                        if (latestRule && latestRule.start_date) {
                                            const latestStartDate = new Date(latestRule.start_date);
                                            latestStartDate.setDate(latestStartDate.getDate() + 1);
                                            defaultStartDate = latestStartDate.toISOString().split('T')[0];
                                        }
                                    }
                                    setStartDate(defaultStartDate);
                                    setEndDate('');
                                }}
                            >
                                Thêm quy tắc giá mới
                            </Button>
                        </Box>

                        <TextField
                            label="Giá bán (₫)"
                            type="number"
                            inputProps={{ min: 0 }}
                            value={priceValue}
                            onChange={(e) => setPriceValue(e.target.value)}
                            fullWidth
                            margin="normal"
                            required
                            helperText="Giá bán cho sản phẩm"
                        />

                        <TextField
                            label="Chọn ngày"
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            fullWidth
                            margin="normal"
                            InputLabelProps={{ shrink: true }}
                            required
                            helperText="Ngày bắt đầu áp dụng giá sẽ là ngày sau ngày được chọn"
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
                                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Giá trị</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Ngày bắt đầu</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Ngày kết thúc</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Thao tác</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {priceHistory && priceHistory.length > 0 ? (
                                            priceHistory.map((rule) => (
                                                    <TableRow key={rule.rule_id} hover>
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
                                                        {rule.end_date ? new Date(rule.end_date).toLocaleString('vi-VN', {
                                                            year: 'numeric',
                                                            month: '2-digit',
                                                            day: '2-digit',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                            second: '2-digit'
                                                        }) : 'Không giới hạn'}
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                                                                <IconButton
                                                                    color="primary"
                                                                    size="small"
                                                                    onClick={() => handleEditRule(rule)}
                                                                    title="Chỉnh sửa"
                                                                disabled={rule.status === 'active'}
                                                                >
                                                                    <Edit fontSize="small" />
                                                                </IconButton>
                                                                <IconButton
                                                                    color="error"
                                                                    size="small"
                                                                    onClick={() => handleDeleteRule(rule.rule_id)}
                                                                    title="Xóa"
                                                                disabled={rule.status === 'active'}
                                                                >
                                                                <Delete fontSize="small" />
                                                                </IconButton>
                                                            </Box>
                                                        </TableCell>
                                                    </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
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
                                                        {(() => {
                                                            // Lấy giá từ pricing rule đang active, nếu không có thì lấy từ giá nhập (order)
                                                            const activeRule = productPriceHistory?.find(rule => rule.status === 'active');
                                                            if (activeRule && activeRule.value) {
                                                                return formatCurrency(activeRule.value);
                                                            }
                                                            // Lấy giá nhập từ order (latest_import_price)
                                                            const importPrice = productDetail?.latest_import_price;
                                                            if (importPrice && importPrice > 0) {
                                                                return formatCurrency(importPrice);
                                                            }
                                                            // Nếu không có giá từ order, hiển thị 0
                                                            return formatCurrency(0);
                                                        })()}
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
                                                        Tổng kho trong kho tổng
                                                    </Typography>
                                                    <Typography variant="h4" color="warning.main">
                                                        {productInventory
                                                            .filter(item => item.location_type === 'Warehouse' || item.location_name === 'Kho tổng')
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
                                    <Card sx={{ minWidth: '850px', maxWidth: '100%' }}>
                                        <CardContent sx={{ p: 4 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                                                <AttachMoney sx={{ mr: 1 }} />
                                                <Typography variant="h6">
                                                    {detailEditingRule ? 'Sửa quy tắc giá' : 'Thêm quy tắc giá mới'}
                                                </Typography>
                                            </Box>
                                            <Divider sx={{ mb: 4 }} />

                                            <form onSubmit={handleSavePriceInDetail}>
                                                <Grid container spacing={3}>
                                                    <Grid item xs={12} sm={6} md={4}>
                                                        <TextField
                                                            label="Giá bán (₫)"
                                                            type="number"
                                                            inputProps={{ min: 0 }}
                                                            value={detailPriceValue}
                                                            onChange={(e) => setDetailPriceValue(e.target.value)}
                                                            fullWidth
                                                            required
                                                            helperText="Giá bán cho sản phẩm"
                                                            sx={{ mb: 1 }}
                                                        />
                                                    </Grid>

                                                    <Grid item xs={12} sm={6} md={4}>
                                                        <TextField
                                                            label="Chọn ngày"
                                                            type="date"
                                                            value={detailStartDate}
                                                            onChange={(e) => setDetailStartDate(e.target.value)}
                                                            fullWidth
                                                            InputLabelProps={{ shrink: true }}
                                                            required
                                                            helperText="Ngày bắt đầu áp dụng giá sẽ là ngày sau ngày được chọn"
                                                            sx={{ mb: 1 }}
                                                        />
                                                    </Grid>

                                                    <Grid item xs={12} sm={6} md={4}>
                                                        <TextField
                                                            label="Ngày kết thúc (tùy chọn)"
                                                            type="date"
                                                            value={detailEndDate}
                                                            onChange={(e) => setDetailEndDate(e.target.value)}
                                                            fullWidth
                                                            InputLabelProps={{ shrink: true }}
                                                            inputProps={{ min: detailStartDate || undefined }}
                                                            helperText="Để trống = vĩnh viễn"
                                                            sx={{ mb: 1 }}
                                                        />
                                                    </Grid>

                                                    <Grid item xs={12} sx={{ mt: 2 }}>
                                                        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                                                            {detailEditingRule && (
                                                                <Button
                                                                    variant="outlined"
                                                                    color="secondary"
                                                                    onClick={() => {
                                                                        setDetailEditingRule(null);
                                                                        setDetailPriceType('fixed_price');
                                                                        setDetailPriceValue(productDetail?.latest_import_price || '0');
                                                                        
                                                                        // Tính ngày bắt đầu mặc định dựa trên quy tắc cũ
                                                                        let defaultStartDate = getTomorrowDate();
                                                                        if (productPriceHistory && productPriceHistory.length > 0) {
                                                                            const sortedRules = [...productPriceHistory].sort((a, b) => {
                                                                                const dateA = new Date(a.start_date || 0);
                                                                                const dateB = new Date(b.start_date || 0);
                                                                                return dateB - dateA;
                                                                            });
                                                                            const latestRule = sortedRules[0];
                                                                            if (latestRule && latestRule.start_date) {
                                                                                const latestStartDate = new Date(latestRule.start_date);
                                                                                latestStartDate.setDate(latestStartDate.getDate() + 1);
                                                                                defaultStartDate = latestStartDate.toISOString().split('T')[0];
                                                                            }
                                                                        }
                                                                        setDetailStartDate(defaultStartDate);
                                                                        setDetailEndDate('');
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
                                    <Card sx={{ minWidth: '850px', maxWidth: '100%' }}>
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
                                                        // Chỉ disable khi status là 'active' (đang áp dụng)
                                                        // Cho phép sửa/xóa khi status là 'upcoming' (chuẩn bị áp dụng)
                                                        const isActive = item.status === 'active';

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
                                                        noRecordsToDisplay: 'Chưa có lịch sử thay đổi giá',
                                                        actions: 'Thao tác'
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

            {/* Toggle Status Confirmation Modal */}
            <Dialog
                open={showToggleConfirm}
                onClose={() => !togglingStatus && setShowToggleConfirm(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    {productToToggle && (productToToggle.is_active ? 'Xác nhận tắt sản phẩm' : 'Xác nhận kích hoạt sản phẩm')}
                </DialogTitle>
                <DialogContent>
                    <Typography>
                        {productToToggle && (
                            <>
                                Bạn có chắc chắn muốn {productToToggle.is_active ? 'tắt' : 'kích hoạt'} sản phẩm{' '}
                                <strong>"{productToToggle.name}"</strong>?
                            </>
                        )}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => {
                            setShowToggleConfirm(false);
                            setProductToToggle(null);
                        }}
                        disabled={togglingStatus}
                        variant="outlined"
                    >
                        Hủy
                    </Button>
                    <Button
                        onClick={confirmToggleStatus}
                        disabled={togglingStatus}
                        variant="contained"
                        color={productToToggle?.is_active ? 'warning' : 'success'}
                    >
                        {togglingStatus ? 'Đang xử lý...' : (productToToggle?.is_active ? 'Tắt' : 'Kích hoạt')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog
                open={showDeleteConfirm}
                onClose={() => !deletingRule && setShowDeleteConfirm(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Xác nhận xóa quy tắc giá</DialogTitle>
                <DialogContent>
                    <Typography>
                        Bạn có chắc chắn muốn xóa quy tắc giá này? Hành động này không thể hoàn tác.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => {
                            setShowDeleteConfirm(false);
                            setRuleToDelete(null);
                        }}
                        disabled={deletingRule}
                        variant="outlined"
                    >
                        Hủy
                    </Button>
                    <Button
                        onClick={() => {
                            if (productDetail) {
                                confirmDeletePriceInDetail();
                            } else {
                                confirmDeleteRule();
                            }
                        }}
                        disabled={deletingRule}
                        variant="contained"
                        color="error"
                    >
                        {deletingRule ? 'Đang xóa...' : 'Xóa'}
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};
export default ProductManagement;

