
import React, { useState, useMemo, useEffect } from 'react';
import { Form, Button, InputGroup, ListGroup, Spinner } from 'react-bootstrap';
import {
     FaSearch, FaQrcode, FaCartPlus,
    FaShoppingCart, FaUserCircle, FaTimes, FaMoneyBillWave, FaCreditCard, FaTicketAlt
} from 'react-icons/fa';
import '../../assets/POS.css';
import { getProductsByStore } from '../../api/productApi';
import { useAuth } from '../../contexts/AuthContext';
import { searchCustomerByPhone, createCustomer } from '../../api/customerApi';
import { getAvailableVouchers, validateVoucher, updateCustomerLoyaltyPoints, generateVouchersForCustomer } from '../../api/voucherApi';
import { createCashPayment, createQRPayment } from '../../api/paymentApi';
import PaymentModal from '../../components/PaymentModal';
import { toast } from 'react-toastify';

// Hàm helper để format tiền tệ
const formatCurrency = (number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(number);
}



const POS = () => {
    const { user } = useAuth();
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [activeFilter, setActiveFilter] = useState('Tất cả');
    const [searchTerm, setSearchTerm] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newCustomer, setNewCustomer] = useState({
        name: '',
        phone: '',
        email: ''
    });
    const [vouchers, setVouchers] = useState([]);
    const [selectedVoucher, setSelectedVoucher] = useState(null);
    const [loadingVouchers, setLoadingVouchers] = useState(false);

    // Payment states
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null); // 'cash' or 'qr'
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [qrPaymentData, setQrPaymentData] = useState(null);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);

    // Tải sản phẩm theo store_id của cashier
    useEffect(() => {
        const load = async () => {
            // Ưu tiên lấy store_id từ user (nếu backend cung cấp), fallback từ localStorage hoặc 1 để test
            const storedStoreId = (() => {
                if (user && user.store_id) return user.store_id;
                try {
                    const persisted = localStorage.getItem('store_id');
                    if (persisted) return Number(persisted);
                } catch {}
                return 1; // fallback test
            })();

            const res = await getProductsByStore(storedStoreId);
            if (res && res.err === 0 && Array.isArray(res.data)) {
                const mapped = res.data.map(item => {
                    const p = item.product || {};
                    const currentPrice = Number(p.current_price || p.hq_price || 0);
                    const hqPrice = Number(p.hq_price || 0);
                    return {
                        id: p.product_id,
                        name: p.name || 'Sản phẩm',
                        price: currentPrice,
                        oldPrice: currentPrice !== hqPrice ? hqPrice : undefined,
                        category: p.category?.name || p.category?.category_name || 'Tất cả',
                        code: p.sku || ''
                    };
                });
                setProducts(mapped);
            } else {
                setProducts([]);
            }
        };
        load();
    }, [user]);

    // Lọc sản phẩm dựa trên filter và search term
    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesCategory = activeFilter === 'Tất cả' || p.category === activeFilter;
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  p.code.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesCategory && matchesSearch;
        });
    }, [products, activeFilter, searchTerm]);

    // Thêm sản phẩm vào giỏ
    const handleAddToCart = (product) => {
        setCart(currentCart => {
            const itemInCart = currentCart.find(item => item.id === product.id);
            if (itemInCart) {
                // Tăng số lượng
                return currentCart.map(item =>
                    item.id === product.id ? { ...item, qty: item.qty + 1 } : item
                );
            } else {
                // Thêm mới
                return [...currentCart, { ...product, qty: 1 }];
            }
        });
    };

    // Cập nhật số lượng
    const handleUpdateQty = (productId, newQty) => {
        if (newQty <= 0) {
            // Xóa nếu số lượng là 0
            handleRemoveFromCart(productId);
        } else {
            setCart(currentCart =>
                currentCart.map(item =>
                    item.id === productId ? { ...item, qty: newQty } : item
                )
            );
        }
    };

    // Xóa khỏi giỏ
    const handleRemoveFromCart = (productId) => {
        setCart(currentCart => currentCart.filter(item => item.id !== productId));
    };

    // Tính toán tiền
    const subtotal = useMemo(() => {
        return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    }, [cart]);

    // Tính giảm giá từ voucher
    const voucherDiscount = useMemo(() => {
        if (!selectedVoucher || cart.length === 0) return 0;

        let discount = 0;
        if (selectedVoucher.discount_type === 'percentage') {
            discount = (subtotal * selectedVoucher.discount_value) / 100;
            if (selectedVoucher.max_discount_amount && discount > selectedVoucher.max_discount_amount) {
                discount = selectedVoucher.max_discount_amount;
            }
        } else {
            discount = selectedVoucher.discount_value;
        }
        return discount;
    }, [selectedVoucher, subtotal, cart.length]);

    const vat = useMemo(() => subtotal * 0.1, [subtotal]);
    const total = useMemo(() => subtotal + vat - voucherDiscount, [subtotal, vat, voucherDiscount]);

    // Tìm kiếm khách hàng khi nhập số điện thoại
    useEffect(() => {
        const delaySearch = setTimeout(() => {
            if (customerPhone.trim().length >= 3) {
                handleSearchCustomer();
            } else {
                setSearchResults([]);
                setShowCreateForm(false);
            }
        }, 500); // Debounce 500ms

        return () => clearTimeout(delaySearch);
    }, [customerPhone]);

    // Xử lý tìm kiếm khách hàng
    const handleSearchCustomer = async () => {
        setIsSearching(true);
        try {
            const res = await searchCustomerByPhone(customerPhone);
            if (res && res.err === 0) {
                setSearchResults(res.data || []);
                setShowCreateForm(false);
            } else {
                setSearchResults([]);
                // Nếu không tìm thấy và đủ 10 số, hiển thị form tạo mới
                if (customerPhone.trim().length >= 10) {
                    setShowCreateForm(true);
                    setNewCustomer(prev => ({ ...prev, phone: customerPhone }));
                }
            }
        } catch (error) {
            console.error('Error searching customer:', error);
            toast.error('Lỗi khi tìm kiếm khách hàng');
        } finally {
            setIsSearching(false);
        }
    };

    // Xử lý chọn khách hàng
    const handleSelectCustomer = async (customer) => {
        setSelectedCustomer(customer);
        setCustomerPhone('');
        setSearchResults([]);
        setShowCreateForm(false);
        toast.success(`Đã chọn khách hàng: ${customer.name}`);

        // Load vouchers for selected customer
        await loadCustomerVouchers(customer.customer_id);
    };

    // Load vouchers for customer
    const loadCustomerVouchers = async (customerId) => {
        setLoadingVouchers(true);
        try {
            console.log('Loading vouchers for customer:', customerId);
            const res = await getAvailableVouchers(customerId);
            console.log('Vouchers response:', res);

            if (res && res.err === 0) {
                setVouchers(res.data || []);
                console.log('Vouchers loaded:', res.data?.length || 0);

                // Nếu không có voucher nào, tự động tạo voucher cho khách hàng
                if (res.data.length === 0) {
                    console.log('No vouchers found, generating...');
                    toast.info('Đang tạo voucher cho khách hàng...');
                    const generateRes = await generateVouchersForCustomer(customerId);
                    console.log('Generate vouchers response:', generateRes);

                    if (generateRes && generateRes.err === 0) {
                        toast.success(generateRes.msg);
                        // Reload vouchers
                        const reloadRes = await getAvailableVouchers(customerId);
                        console.log('Reloaded vouchers:', reloadRes);
                        if (reloadRes && reloadRes.err === 0) {
                            setVouchers(reloadRes.data || []);
                        }
                    } else {
                        console.error('Failed to generate vouchers:', generateRes);
                    }
                }
            } else {
                console.error('Failed to load vouchers:', res);
                setVouchers([]);
            }
        } catch (error) {
            console.error('Error loading vouchers:', error);
            setVouchers([]);
        } finally {
            setLoadingVouchers(false);
        }
    };

    // Xử lý chọn voucher
    const handleSelectVoucher = async (voucher) => {
        if (cart.length === 0) {
            toast.warning('Vui lòng thêm sản phẩm vào giỏ hàng trước khi áp dụng voucher');
            return;
        }

        // Check minimum purchase amount
        if (subtotal < voucher.min_purchase_amount) {
            toast.error(`Đơn hàng tối thiểu ${formatCurrency(voucher.min_purchase_amount)} để sử dụng voucher này`);
            return;
        }

        try {
            const res = await validateVoucher(voucher.voucher_code, selectedCustomer.customer_id, subtotal);
            if (res && res.err === 0) {
                setSelectedVoucher(voucher);
                toast.success(`Đã áp dụng voucher: ${voucher.voucher_name}`);
            } else {
                toast.error(res.msg || 'Không thể áp dụng voucher');
            }
        } catch (error) {
            console.error('Error validating voucher:', error);
            toast.error('Lỗi khi áp dụng voucher');
        }
    };

    // Xử lý hủy voucher
    const handleRemoveVoucher = () => {
        setSelectedVoucher(null);
        toast.info('Đã hủy áp dụng voucher');
    };

    // Xử lý chọn phương thức thanh toán
    const handleSelectPaymentMethod = (method) => {
        setSelectedPaymentMethod(method);
    };

    // Xử lý thanh toán
    const handleCheckout = async () => {
        if (cart.length === 0) {
            toast.warning('Giỏ hàng trống');
            return;
        }

        if (!selectedPaymentMethod) {
            toast.warning('Vui lòng chọn phương thức thanh toán');
            return;
        }

        setIsProcessingPayment(true);

        try {
            // Prepare cart items for payment
            const cartItems = cart.map(item => ({
                product_id: item.id,
                product_name: item.name,
                quantity: item.qty,
                unit_price: item.price
            }));

            const paymentData = {
                store_id: user?.store_id || null,
                cashier_id: user?.user_id || user?.id || null,
                customer_id: selectedCustomer?.customer_id || null,
                cart_items: cartItems,
                subtotal: subtotal,
                tax_amount: vat,
                discount_amount: voucherDiscount,
                voucher_code: selectedVoucher?.voucher_code || null,
                total_amount: total,
                customer_name: selectedCustomer?.name || 'Customer',
                customer_phone: selectedCustomer?.phone || ''
            };

            if (selectedPaymentMethod === 'cash') {
                // Cash payment
                const res = await createCashPayment(paymentData);

                if (res && res.err === 0) {
                    toast.success('Thanh toán thành công!');

                    // Show payment success modal with print invoice option
                    setQrPaymentData({
                        transaction_id: res.data.transaction_id,
                        payment_id: res.data.payment_id,
                        order_code: res.data.transaction_id,
                        total_amount: total,
                        payment_method: 'cash',
                        customer_name: selectedCustomer?.name || 'Khách vãng lai',
                        customer_phone: selectedCustomer?.phone || ''
                    });
                    setShowPaymentModal(true);

                    // Reload customer data if customer is selected
                    if (selectedCustomer) {
                        await loadCustomerVouchers(selectedCustomer.customer_id);
                        // Fetch updated customer info
                        const customerRes = await searchCustomerByPhone(selectedCustomer.phone);
                        if (customerRes && customerRes.err === 0 && customerRes.data) {
                            setSelectedCustomer(customerRes.data);
                        }
                    }

                    // Clear cart and reset
                    setCart([]);
                    setSelectedVoucher(null);
                    setSelectedPaymentMethod(null);
                } else {
                    toast.error(res.msg || 'Thanh toán thất bại');
                }
            } else if (selectedPaymentMethod === 'qr') {
                // QR payment
                const res = await createQRPayment(paymentData);

                console.log('QR Payment Response:', res);
                console.log('QR Code from response:', res?.data?.qr_code);

                if (res && res.err === 0) {
                    // Show QR modal
                    const qrData = {
                        ...res.data,
                        customer_name: selectedCustomer?.name || 'Customer',
                        customer_phone: selectedCustomer?.phone || '',
                        total_amount: total
                    };
                    console.log('Setting QR Payment Data:', qrData);
                    setQrPaymentData(qrData);
                    setShowPaymentModal(true);
                } else {
                    toast.error(res.msg || 'Không thể tạo mã QR thanh toán');
                }
            }

        } catch (error) {
            console.error('Error during checkout:', error);
            toast.error('Lỗi khi thanh toán');
        } finally {
            setIsProcessingPayment(false);
        }
    };

    // Xử lý khi thanh toán QR thành công
    const handleQRPaymentSuccess = async (transactionId) => {
        toast.success('Thanh toán QR thành công!');

        // Reload customer data and vouchers (loyalty points already updated by webhook)
        if (selectedCustomer) {
            // Fetch updated customer info
            const customerRes = await searchCustomerByPhone(selectedCustomer.phone);
            if (customerRes && customerRes.err === 0 && customerRes.data) {
                setSelectedCustomer(customerRes.data);
                toast.info(`Điểm tích lũy mới: ${customerRes.data.loyalty_point || 0} điểm`);
            }

            // Reload vouchers
            await loadCustomerVouchers(selectedCustomer.customer_id);
        }

        // Clear cart and reset
        setCart([]);
        setSelectedVoucher(null);
        setSelectedPaymentMethod(null);
    };

    // Xử lý in hóa đơn
    const handlePrintInvoice = (transactionId) => {
        // TODO: Implement print invoice functionality
        toast.info('Chức năng in hóa đơn đang được phát triển');
        setShowPaymentModal(false);
    };

    // Xử lý tạo khách hàng mới
    const handleCreateCustomer = async () => {
        if (!newCustomer.name || !newCustomer.phone) {
            toast.error('Vui lòng nhập tên và số điện thoại');
            return;
        }

        try {
            const res = await createCustomer(newCustomer);
            if (res && res.err === 0) {
                toast.success('Tạo khách hàng thành công');
                handleSelectCustomer(res.data);
            } else {
                toast.error(res.msg || 'Tạo khách hàng thất bại');
            }
        } catch (error) {
            console.error('Error creating customer:', error);
            toast.error('Lỗi khi tạo khách hàng');
        }
    };

    // Helper function để lấy màu badge theo tier
    const getTierBadgeColor = (tier) => {
        switch (tier?.toLowerCase()) {
            case 'gold': return 'warning';
            case 'silver': return 'secondary';
            case 'bronze': return 'danger';
            default: return 'primary';
        }
    };


    return (
        <div className="pos-container">
            {/* ------------------- BÊN TRÁI: SẢN PHẨM ------------------- */}
            <div className="pos-main">
                {/* Header */}
                <header className="pos-header">
                    
                    <h2>CCMS System</h2>
                </header>

                {/* Search */}
                <div className="pos-search">
                    <InputGroup>
                        <InputGroup.Text><FaSearch /></InputGroup.Text>
                        <Form.Control
                            type="text"
                            placeholder="Tìm kiếm sản phẩm hoặc mã vạch..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Button variant="light" className="btn-scan">
                            <FaQrcode className="me-2" /> Quét mã
                        </Button>
                    </InputGroup>
                </div>

                {/* Filters */}
                <div className="pos-filters">
                    {['Tất cả', 'Đồ ăn', 'Đồ uống'].map(filter => (
                        <Button
                            key={filter}
                            variant={activeFilter === filter ? 'primary' : 'outline-secondary'}
                            onClick={() => setActiveFilter(filter)}
                        >
                            {filter}
                        </Button>
                    ))}
                </div>

                {/* Product List */}
                <div className="pos-product-list">
                    {filteredProducts.map(product => (
                        <div className="product-item" key={product.id}>
                            <span className="product-name">{product.name}</span>
                            {product.oldPrice && (
                                <span className="product-price-old">{formatCurrency(product.oldPrice)}</span>
                            )}
                            <span className="product-price">{formatCurrency(product.price)}</span>
                            <Button
                                variant="light"
                                className="btn-add-cart"
                                onClick={() => handleAddToCart(product)}
                            >
                                <FaCartPlus />
                            </Button>
                        </div>
                    ))}
                </div>
            </div>

            {/* ------------------- BÊN PHẢI: GIỎ HÀNG ------------------- */}
            <div className="pos-cart">
                {/* Cart Header - Compact */}
                <div className="cart-header py-2 px-3 border-bottom">
                    <div className="d-flex justify-content-between align-items-center">
                        <h5 className="mb-0">
                            <FaShoppingCart className="me-2" />
                            Giỏ hàng
                        </h5>
                        <Button variant="link" className="p-0 small text-decoration-none">
                            Giỏ hàng hiện lại
                        </Button>
                    </div>
                </div>

                {/* Customer Info - Compact */}
                <div className="cart-customer px-3 py-2 bg-light border-bottom">
                    <div className="small fw-semibold text-muted mb-2">
                        <FaUserCircle className="me-1" /> Thông tin khách hàng
                    </div>

                    {selectedCustomer ? (
                        <div className="d-flex justify-content-between align-items-center">
                            <div className="flex-grow-1">
                                <div className="fw-bold">{selectedCustomer.name}</div>
                                <div className="small text-muted">{selectedCustomer.phone}</div>
                                <div className="mt-1">
                                    <span className="badge bg-primary" style={{ fontSize: '10px' }}>
                                        {selectedCustomer.tier}
                                    </span>
                                    <span className="ms-2 small text-muted">
                                        {selectedCustomer.loyalty_point || 0} điểm
                                    </span>
                                </div>
                            </div>
                            <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => {
                                    setSelectedCustomer(null);
                                    setCustomerPhone('');
                                    setSearchResults([]);
                                    setShowCreateForm(false);
                                    setVouchers([]);
                                    setSelectedVoucher(null);
                                }}
                            >
                                <FaTimes />
                            </Button>
                        </div>
                    ) : (
                        <>
                            <InputGroup className="mb-2">
                                <InputGroup.Text>
                                    <FaSearch />
                                </InputGroup.Text>
                                <Form.Control
                                    type="tel"
                                    placeholder="Nhập số điện thoại khách hàng..."
                                    value={customerPhone}
                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                    autoComplete="off"
                                />
                                {customerPhone && (
                                    <Button
                                        variant="outline-secondary"
                                        onClick={() => {
                                            setCustomerPhone('');
                                            setSearchResults([]);
                                            setShowCreateForm(false);
                                        }}
                                    >
                                        <FaTimes />
                                    </Button>
                                )}
                            </InputGroup>

                            {/* Loading Spinner */}
                            {isSearching && (
                                <div className="text-center py-2">
                                    <Spinner animation="border" size="sm" />
                                    <small className="text-muted ms-2">Đang tìm kiếm...</small>
                                </div>
                            )}

                            {/* Customer Search Results */}
                            {!isSearching && searchResults.length > 0 && (
                                <div className="mb-2">
                                    <small className="text-muted">Kết quả tìm kiếm:</small>
                                    <ListGroup style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                        {searchResults.map((customer) => (
                                            <ListGroup.Item
                                                key={customer.customer_id}
                                                action
                                                onClick={() => handleSelectCustomer(customer)}
                                                style={{ cursor: 'pointer', padding: '8px 12px' }}
                                            >
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <div>
                                                        <div className="d-flex align-items-center gap-2">
                                                            <FaUserCircle size={20} className="text-secondary" />
                                                            <div>
                                                                <strong style={{ fontSize: '14px' }}>{customer.name}</strong>
                                                                <br />
                                                                <small className="text-muted">{customer.phone}</small>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-end">
                                                        <span className={`badge bg-${getTierBadgeColor(customer.tier)}`}>
                                                            {customer.tier}
                                                        </span>
                                                        <br />
                                                        <small className="text-muted">
                                                            {customer.loyalty_point || 0} điểm
                                                        </small>
                                                    </div>
                                                </div>
                                            </ListGroup.Item>
                                        ))}
                                    </ListGroup>
                                </div>
                            )}

                            {/* Create New Customer Form */}
                            {showCreateForm && (
                                <div className="p-2 border rounded bg-light mb-2">
                                    <small className="fw-bold mb-2 d-block">Tạo khách hàng mới</small>
                                    <Form>
                                        <Form.Group className="mb-2">
                                            <Form.Control
                                                size="sm"
                                                type="text"
                                                placeholder="Tên khách hàng *"
                                                value={newCustomer.name}
                                                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                                            />
                                        </Form.Group>
                                        <Form.Group className="mb-2">
                                            <Form.Control
                                                size="sm"
                                                type="tel"
                                                placeholder="Số điện thoại *"
                                                value={newCustomer.phone}
                                                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                                            />
                                        </Form.Group>
                                        <Form.Group className="mb-2">
                                            <Form.Control
                                                size="sm"
                                                type="email"
                                                placeholder="Email (tùy chọn)"
                                                value={newCustomer.email}
                                                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                                            />
                                        </Form.Group>
                                        <div className="d-flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="primary"
                                                onClick={handleCreateCustomer}
                                                className="flex-grow-1"
                                            >
                                                Tạo
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline-secondary"
                                                onClick={() => setShowCreateForm(false)}
                                            >
                                                Hủy
                                            </Button>
                                        </div>
                                    </Form>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Voucher Section - Only show when customer is selected */}
                {selectedCustomer && (
                    <div className="cart-voucher px-3 py-2 border-bottom">
                        <div className="small fw-semibold text-muted mb-2">
                            <FaTicketAlt className="me-1" /> Áp mã giảm giá
                        </div>

                        {loadingVouchers ? (
                            <div className="text-center py-2">
                                <Spinner animation="border" size="sm" />
                                <small className="text-muted ms-2">Đang tải voucher...</small>
                            </div>
                        ) : vouchers.length > 0 ? (
                            <>
                                {selectedVoucher ? (
                                    <div className="selected-voucher p-2 border rounded bg-success bg-opacity-10">
                                        <div className="d-flex justify-content-between align-items-start">
                                            <div className="flex-grow-1">
                                                <div className="d-flex align-items-center gap-1 mb-1">
                                                    <FaTicketAlt className="text-success" size={12} />
                                                    <strong className="text-success small">{selectedVoucher.voucher_name}</strong>
                                                </div>
                                                <div className="small text-muted">
                                                    Giảm {selectedVoucher.discount_type === 'percentage'
                                                        ? `${selectedVoucher.discount_value}%`
                                                        : formatCurrency(selectedVoucher.discount_value)}
                                                    {selectedVoucher.max_discount_amount > 0 && selectedVoucher.discount_type === 'percentage' && (
                                                        <span> (Tối đa {formatCurrency(selectedVoucher.max_discount_amount)})</span>
                                                    )}
                                                </div>
                                                <div className="small text-muted">
                                                    HSD: {new Date(selectedVoucher.end_date).toLocaleDateString('vi-VN')}
                                                </div>
                                            </div>
                                            <Button
                                                variant="outline-danger"
                                                size="sm"
                                                onClick={handleRemoveVoucher}
                                                style={{ padding: '2px 6px' }}
                                            >
                                                <FaTimes size={12} />
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ maxHeight: '150px', overflowY: 'auto' }} className="border rounded">
                                        <ListGroup variant="flush">
                                            {vouchers.map((voucher) => {
                                                const isDisabled = cart.length === 0 || subtotal < voucher.min_purchase_amount;
                                                return (
                                                    <ListGroup.Item
                                                        key={voucher.customer_voucher_id}
                                                        action
                                                        onClick={() => !isDisabled && handleSelectVoucher(voucher)}
                                                        disabled={isDisabled}
                                                        className={`${isDisabled ? 'opacity-50' : ''}`}
                                                        style={{
                                                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                            padding: '8px 10px'
                                                        }}
                                                    >
                                                        <div className="d-flex justify-content-between align-items-start mb-1">
                                                            <div className="d-flex align-items-center gap-1">
                                                                <FaTicketAlt className="text-primary" size={12} />
                                                                <strong style={{ fontSize: '13px' }}>{voucher.voucher_name}</strong>
                                                            </div>
                                                            {voucher.required_loyalty_points > 0 && (
                                                                <span className="badge bg-warning text-dark" style={{ fontSize: '10px' }}>
                                                                    {voucher.required_loyalty_points} điểm
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="small text-muted">
                                                            Giảm {voucher.discount_type === 'percentage'
                                                                ? `${voucher.discount_value}%`
                                                                : formatCurrency(voucher.discount_value)}
                                                            {voucher.max_discount_amount > 0 && voucher.discount_type === 'percentage' && (
                                                                <span> (Tối đa {formatCurrency(voucher.max_discount_amount)})</span>
                                                            )}
                                                        </div>
                                                        <div className="small text-muted">
                                                            HSD: {new Date(voucher.end_date).toLocaleDateString('vi-VN')}
                                                            {voucher.min_purchase_amount > 0 && (
                                                                <span> • Tối thiểu {formatCurrency(voucher.min_purchase_amount)}</span>
                                                            )}
                                                        </div>
                                                        {isDisabled && subtotal < voucher.min_purchase_amount && (
                                                            <div className="small text-danger">
                                                                Cần mua thêm {formatCurrency(voucher.min_purchase_amount - subtotal)}
                                                            </div>
                                                        )}
                                                    </ListGroup.Item>
                                                );
                                            })}
                                        </ListGroup>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-2 text-muted">
                                <small>Khách hàng chưa có voucher nào</small>
                            </div>
                        )}
                    </div>
                )}

                {/* Cart Items - Scrollable */}
                <div className="cart-items-list px-3 py-2" style={{
                    flex: '1 1 auto',
                    overflowY: 'auto',
                    maxHeight: 'calc(100vh - 550px)',
                    minHeight: '150px'
                }}>
                    {cart.map(item => (
                        <div className="cart-item border-bottom pb-2 mb-2" key={item.id}>
                            <div className="d-flex justify-content-between align-items-start mb-1">
                                <div className="flex-grow-1">
                                    <div className="fw-bold small">{item.name}</div>
                                    <div className="text-muted" style={{ fontSize: '12px' }}>
                                        {formatCurrency(item.price)} × {item.qty}
                                        {item.stock !== undefined && (
                                            <span className="ms-2 text-info">
                                                (Còn: {item.stock})
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-end">
                                    <div className="fw-bold text-primary small">
                                        {formatCurrency(item.price * item.qty)}
                                    </div>
                                    <FaTimes
                                        className="btn-remove-item text-danger"
                                        onClick={() => handleRemoveFromCart(item.id)}
                                        style={{ cursor: 'pointer', fontSize: '12px' }}
                                    />
                                </div>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                                <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    onClick={() => handleUpdateQty(item.id, item.qty - 1)}
                                    disabled={item.qty <= 1}
                                    style={{ padding: '2px 8px', fontSize: '12px' }}
                                >-</Button>
                                <span className="px-2 fw-bold small">{item.qty}</span>
                                <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    onClick={() => handleUpdateQty(item.id, item.qty + 1)}
                                    disabled={item.stock !== undefined && item.qty >= item.stock}
                                    style={{ padding: '2px 8px', fontSize: '12px' }}
                                >+</Button>
                            </div>
                        </div>
                    ))}
                    {cart.length === 0 && (
                        <div className="text-center py-4 text-muted">
                            <FaShoppingCart size={36} className="mb-2 opacity-25" />
                            <p className="small mb-0">Giỏ hàng trống</p>
                        </div>
                    )}
                </div>

                {/* Cart Summary - Fixed at bottom */}
                <div className="cart-summary-wrapper border-top px-3 py-2 bg-white" style={{
                    flex: '0 0 auto'
                }}>
                    <div className="cart-summary">
                        <div className="d-flex justify-content-between mb-1 small">
                            <span className="text-muted">Tạm tính</span>
                            <span className="fw-semibold">{formatCurrency(subtotal)}</span>
                        </div>
                        <div className="d-flex justify-content-between mb-1 small">
                            <span className="text-muted">VAT (10%)</span>
                            <span className="fw-semibold">{formatCurrency(vat)}</span>
                        </div>
                        {voucherDiscount > 0 && (
                            <div className="d-flex justify-content-between mb-1 text-success small">
                                <span>
                                    <FaTicketAlt className="me-1" size={12} />
                                    Giảm giá
                                </span>
                                <span className="fw-bold">-{formatCurrency(voucherDiscount)}</span>
                            </div>
                        )}
                        <div className="d-flex justify-content-between pt-2 border-top">
                            <strong className="fs-6">Tổng cộng</strong>
                            <strong className="fs-5 text-primary">{formatCurrency(total)}</strong>
                        </div>
                    </div>

                    {/* Payment Method Selection */}
                    {cart.length > 0 && (
                        <div className="payment-method-section mt-2">
                            <label className="form-label fw-semibold small mb-2">Phương thức thanh toán</label>
                            <div className="d-flex gap-2">
                                <Button
                                    variant={selectedPaymentMethod === 'cash' ? 'primary' : 'outline-primary'}
                                    className="flex-fill"
                                    size="sm"
                                    onClick={() => handleSelectPaymentMethod('cash')}
                                >
                                    <FaMoneyBillWave className="me-1" size={14} />
                                    Tiền mặt
                                </Button>
                                <Button
                                    variant={selectedPaymentMethod === 'qr' ? 'primary' : 'outline-primary'}
                                    className="flex-fill"
                                    size="sm"
                                    onClick={() => handleSelectPaymentMethod('qr')}
                                >
                                    <FaCreditCard className="me-1" size={14} />
                                    QR Banking
                                </Button>
                            </div>
                        </div>
                    )}

                    <Button
                        variant="success"
                        className="w-100 mt-2"
                        disabled={cart.length === 0 || !selectedPaymentMethod || isProcessingPayment}
                        onClick={handleCheckout}
                    >
                        {isProcessingPayment ? (
                            <>
                                <Spinner animation="border" size="sm" className="me-2" />
                                Đang xử lý...
                            </>
                        ) : (
                            'Thanh toán'
                        )}
                    </Button>
                </div>
            </div>

            {/* Payment Modal for QR */}
            <PaymentModal
                show={showPaymentModal}
                onHide={() => {
                    setShowPaymentModal(false);
                    setQrPaymentData(null);
                    setSelectedPaymentMethod(null);
                    setIsProcessingPayment(false);
                }}
                paymentData={qrPaymentData}
                onPaymentSuccess={handleQRPaymentSuccess}
                onPrintInvoice={handlePrintInvoice}
            />
        </div>
    );
};

export default POS;