
import React, { useState, useMemo, useEffect } from 'react';
import { Form, Button, InputGroup, ListGroup, Spinner } from 'react-bootstrap';
import {
     FaSearch, FaQrcode, FaCartPlus,
    FaShoppingCart, FaUserCircle, FaTimes
} from 'react-icons/fa';
import '../../assets/POS.css';
import { getProductsByStore } from '../../api/productApi';
import { useAuth } from '../../contexts/AuthContext';
import { searchCustomerByPhone, createCustomer } from '../../api/customerApi';
import { getAvailableVouchers, validateVoucher } from '../../api/voucherApi';
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
            const res = await getAvailableVouchers(customerId);
            if (res && res.err === 0) {
                setVouchers(res.data || []);
            } else {
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
                {/* Cart Header */}
                <div className="cart-header">
                    <Button variant="link" className="btn-saved-carts p-0">Giỏ hàng hiện lại</Button>
                    <h4>
                        <FaShoppingCart className="cart-icon" />
                        Giỏ hàng
                    </h4>
                </div>

                {/* Customer Info */}
                <div className="cart-customer">
                    <h6><FaUserCircle className="me-2" /> Thông tin khách hàng</h6>

                    {selectedCustomer ? (
                        <div className="selected-customer-info p-2 border rounded bg-light mb-2">
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <strong>{selectedCustomer.name}</strong>
                                    <br />
                                    <small className="text-muted">{selectedCustomer.phone}</small>
                                    <br />
                                    <span className="badge bg-primary">{selectedCustomer.tier}</span>
                                    <span className="ms-2 text-muted">{selectedCustomer.loyalty_point || 0} điểm</span>
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
                    <div className="cart-voucher mb-3">
                        <h6 className="mb-2">
                            <FaCartPlus className="me-2" /> Áp mã giảm giá
                        </h6>

                        {loadingVouchers ? (
                            <div className="text-center py-2">
                                <Spinner animation="border" size="sm" />
                                <small className="text-muted ms-2">Đang tải voucher...</small>
                            </div>
                        ) : vouchers.length > 0 ? (
                            <>
                                {selectedVoucher ? (
                                    <div className="selected-voucher p-2 border rounded bg-success bg-opacity-10 mb-2">
                                        <div className="d-flex justify-content-between align-items-center">
                                            <div>
                                                <strong className="text-success">{selectedVoucher.voucher_name}</strong>
                                                <br />
                                                <small className="text-muted">
                                                    Giảm {selectedVoucher.discount_type === 'percentage'
                                                        ? `${selectedVoucher.discount_value}%`
                                                        : formatCurrency(selectedVoucher.discount_value)}
                                                </small>
                                            </div>
                                            <Button
                                                variant="outline-danger"
                                                size="sm"
                                                onClick={handleRemoveVoucher}
                                            >
                                                <FaTimes />
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                        <ListGroup>
                                            {vouchers.map((voucher) => (
                                                <ListGroup.Item
                                                    key={voucher.customer_voucher_id}
                                                    action
                                                    onClick={() => handleSelectVoucher(voucher)}
                                                    disabled={cart.length === 0 || subtotal < voucher.min_purchase_amount}
                                                    style={{
                                                        cursor: cart.length === 0 || subtotal < voucher.min_purchase_amount ? 'not-allowed' : 'pointer',
                                                        padding: '8px 12px',
                                                        opacity: cart.length === 0 || subtotal < voucher.min_purchase_amount ? 0.6 : 1
                                                    }}
                                                >
                                                    <div>
                                                        <strong style={{ fontSize: '13px' }}>{voucher.voucher_name}</strong>
                                                        <br />
                                                        <small className="text-muted">
                                                            Giảm {voucher.discount_type === 'percentage'
                                                                ? `${voucher.discount_value}%`
                                                                : formatCurrency(voucher.discount_value)}
                                                            {voucher.min_purchase_amount > 0 &&
                                                                ` - Đơn tối thiểu ${formatCurrency(voucher.min_purchase_amount)}`}
                                                        </small>
                                                        <br />
                                                        <small className="text-muted">
                                                            HSD: {new Date(voucher.end_date).toLocaleDateString('vi-VN')}
                                                        </small>
                                                    </div>
                                                </ListGroup.Item>
                                            ))}
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

                {/* Cart Items */}
                <div className="cart-items-list">
                    {cart.map(item => (
                        <div className="cart-item" key={item.id}>
                            <div className="cart-item-details">
                                <div className="cart-item-info">
                                    <span className="item-name">{item.name}</span>
                                    <span className="item-price">
                                        {formatCurrency(item.price)} x {item.qty}
                                    </span>
                                </div>
                                <div className="cart-item-total">
                                    <span className="item-total-price">{formatCurrency(item.price * item.qty)}</span>
                                    <FaTimes 
                                        className="btn-remove-item" 
                                        onClick={() => handleRemoveFromCart(item.id)}
                                    />
                                </div>
                            </div>
                            <div className="qty-adjuster">
                                <Button 
                                    variant="outline-secondary" 
                                    size="sm"
                                    onClick={() => handleUpdateQty(item.id, item.qty - 1)}
                                >-</Button>
                                <span className="qty-display">{item.qty}</span>
                                <Button 
                                    variant="outline-secondary" 
                                    size="sm"
                                    onClick={() => handleUpdateQty(item.id, item.qty + 1)}
                                >+</Button>
                            </div>
                        </div>
                    ))}
                    {cart.length === 0 && <p className="text-muted text-center mt-3">Giỏ hàng trống</p>}
                </div>

                {/* Cart Summary */}
                <div className="cart-summary-wrapper">
                    <div className="cart-summary">
                        <div>
                            <span>Tạm tính</span>
                            <span>{formatCurrency(subtotal)}</span>
                        </div>
                        <div>
                            <span>VAT (10%)</span>
                            <span>{formatCurrency(vat)}</span>
                        </div>
                        {voucherDiscount > 0 && (
                            <div className="text-success">
                                <span>Giảm giá (Voucher)</span>
                                <span>-{formatCurrency(voucherDiscount)}</span>
                            </div>
                        )}
                        <div className="summary-total">
                            <strong>Tổng cộng</strong>
                            <strong>{formatCurrency(total)}</strong>
                        </div>
                    </div>
                    <Button 
                        variant="primary" 
                        size="lg" 
                        className="w-100 mt-3" 
                        disabled={cart.length === 0}
                    >
                        Thanh toán
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default POS;