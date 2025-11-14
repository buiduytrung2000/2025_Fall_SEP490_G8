
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Form, Button, InputGroup, Modal } from 'react-bootstrap';
import {
    FaSearch, FaQrcode, FaCartPlus,
    FaShoppingCart, FaUserCircle, FaTimes, FaSignInAlt, FaSignOutAlt
} from 'react-icons/fa';
import '../../assets/POS.css';
import { getProductsByStore, getProduct } from '../../api/productApi';
import { checkoutCart } from '../../api/transactionApi';
import { getMyOpenShift, checkinShift, checkoutShift } from '../../api/shiftApi';
import { getMySchedules } from '../../api/scheduleApi';
import { useAuth } from '../../contexts/AuthContext';

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
    const [searchMessage, setSearchMessage] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    // Hide full product list by default
    const [showProducts, setShowProducts] = useState(false);
    const [customerPhone, setCustomerPhone] = useState('');

    // Payment states
    const [checkoutMessage, setCheckoutMessage] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [paymentReference, setPaymentReference] = useState('');
    const [paymentGiven, setPaymentGiven] = useState('');
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    // Shift states
    const [isShiftActive, setIsShiftActive] = useState(false);
    const [shiftId, setShiftId] = useState(null);
    const [openingCash, setOpeningCash] = useState('');
    const [cashSalesTotal, setCashSalesTotal] = useState(0); // tổng bán bằng tiền mặt trong ca
    const [showCheckinModal, setShowCheckinModal] = useState(false);
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    const [closingCashInput, setClosingCashInput] = useState('');
    const [scheduleAttendanceStatus, setScheduleAttendanceStatus] = useState(null); // Lưu trạng thái điểm danh từ schedule
    const [hasTodaySchedule, setHasTodaySchedule] = useState(false); // Kiểm tra có lịch làm việc hôm nay không

    // Load trạng thái ca từ API (open shift) và check schedule attendance_status
    useEffect(() => {
        const fetchOpenShift = async () => {
            const storedStoreId = (() => {
                if (user && user.store_id) return user.store_id;
                try { const persisted = localStorage.getItem('store_id'); if (persisted) return Number(persisted); } catch {}
                return 1;
            })();
            const resp = await getMyOpenShift(storedStoreId);
            if (resp && resp.err === 0 && resp.data) {
                setIsShiftActive(true);
                setShiftId(resp.data.shift_id);
                setOpeningCash(String(resp.data.opening_cash || 0));
                setCashSalesTotal(Number(resp.data.cash_sales_total || 0));
                // Lưu attendance_status từ schedule nếu có
                if (resp.data.schedule && resp.data.schedule.attendance_status) {
                    setScheduleAttendanceStatus(resp.data.schedule.attendance_status);
                    setHasTodaySchedule(true); // Có schedule vì đã check-in thành công
                } else {
                    setHasTodaySchedule(false);
                }
            } else {
                setIsShiftActive(false);
                setShiftId(null);
                setCashSalesTotal(0);
                // Check schedule của ngày hôm nay để xem đã checkout chưa
                const today = new Date().toISOString().split('T')[0];
                try {
                    const scheduleResp = await getMySchedules(today, today);
                    if (scheduleResp && scheduleResp.err === 0 && scheduleResp.data && scheduleResp.data.length > 0) {
                        // Tìm schedule của ngày hôm nay
                        const todaySchedule = scheduleResp.data.find(s => s.work_date === today);
                        if (todaySchedule) {
                            setHasTodaySchedule(true);
                            if (todaySchedule.attendance_status === 'checked_out') {
                                setScheduleAttendanceStatus('checked_out');
                            } else {
                                setScheduleAttendanceStatus(todaySchedule.attendance_status || null);
                            }
                        } else {
                            setHasTodaySchedule(false);
                            setScheduleAttendanceStatus(null);
                        }
                    } else {
                        setHasTodaySchedule(false);
                        setScheduleAttendanceStatus(null);
                    }
                } catch (e) {
                    setHasTodaySchedule(false);
                    setScheduleAttendanceStatus(null);
                }
            }
        };
        fetchOpenShift();
    }, [user]);

    const refreshOpenShift = useCallback(async () => {
        const storedStoreId = (() => {
            if (user && user.store_id) return user.store_id;
            try { const persisted = localStorage.getItem('store_id'); if (persisted) return Number(persisted); } catch {}
            return 1;
        })();
        const resp = await getMyOpenShift(storedStoreId);
        if (resp && resp.err === 0 && resp.data) {
            setIsShiftActive(true);
            setShiftId(resp.data.shift_id);
            setOpeningCash(String(resp.data.opening_cash || 0));
            setCashSalesTotal(Number(resp.data.cash_sales_total || 0));
            // Lưu attendance_status từ schedule nếu có
            if (resp.data.schedule && resp.data.schedule.attendance_status) {
                setScheduleAttendanceStatus(resp.data.schedule.attendance_status);
                setHasTodaySchedule(true);
            } else {
                setHasTodaySchedule(false);
            }
        } else {
            setIsShiftActive(false);
            setShiftId(null);
            setCashSalesTotal(0);
            setOpeningCash('');
            // Check schedule của ngày hôm nay để xem đã checkout chưa
            const today = new Date().toISOString().split('T')[0];
            try {
                const scheduleResp = await getMySchedules(today, today);
                if (scheduleResp && scheduleResp.err === 0 && scheduleResp.data && scheduleResp.data.length > 0) {
                    const todaySchedule = scheduleResp.data.find(s => s.work_date === today);
                    if (todaySchedule) {
                        setHasTodaySchedule(true);
                        if (todaySchedule.attendance_status === 'checked_out') {
                            setScheduleAttendanceStatus('checked_out');
                        } else {
                            setScheduleAttendanceStatus(todaySchedule.attendance_status || null);
                        }
                    } else {
                        setHasTodaySchedule(false);
                        setScheduleAttendanceStatus(null);
                    }
                } else {
                    setHasTodaySchedule(false);
                    setScheduleAttendanceStatus(null);
                }
            } catch (e) {
                setHasTodaySchedule(false);
                setScheduleAttendanceStatus(null);
            }
        }
    }, [user]);

    // Auto-refresh shift data mỗi 10 giây để cập nhật realtime
    useEffect(() => {
        if (!isShiftActive) return; // Chỉ refresh khi đang trong ca
        
        const interval = setInterval(() => {
            refreshOpenShift();
        }, 10000); // Refresh mỗi 10 giây

        return () => clearInterval(interval);
    }, [isShiftActive, refreshOpenShift]);

    // Tải sản phẩm theo store_id của cashier
    useEffect(() => {
        const load = async () => {
            // Ưu tiên lấy store_id từ user (nếu backend cung cấp), fallback từ localStorage hoặc 1 để test
            const storedStoreId = (() => {
                if (user && user.store_id) return user.store_id;
                try {
                    const persisted = localStorage.getItem('store_id');
                    if (persisted) return Number(persisted);
                } catch { }
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

    // Handle search submit (Enter key): if term is numeric, try fetch by product id
    const handleSearchSubmit = async () => {
        setSearchMessage('');
        const term = searchTerm.trim();
        if (!term) return;

        // If the user entered only digits, treat as product_id search
        if (/^\d+$/.test(term)) {
            const res = await getProduct(term);
            if (res && res.err === 0 && res.data) {
                const p = res.data;
                const productObj = {
                    id: p.product_id,
                    name: p.name || 'Sản phẩm',
                    price: Number(p.hq_price || 0),
                    oldPrice: undefined,
                    category: p.category?.name || 'Tất cả',
                    code: p.sku || ''
                };

                // Add to cart (increase qty if exists)
                setCart(currentCart => {
                    const item = currentCart.find(i => i.id === productObj.id);
                    if (item) {
                        return currentCart.map(i => i.id === productObj.id ? { ...i, qty: i.qty + 1 } : i);
                    }
                    return [...currentCart, { ...productObj, qty: 1 }];
                });

                setSearchMessage('Đã thêm sản phẩm vào giỏ');
                setSearchTerm('');
                return;
            } else {
                setSearchMessage('Không tìm thấy sản phẩm theo ID');
                return;
            }
        }
        // otherwise leave to name/code filtering (handled by filteredProducts)
    };

    // Debounced live suggestions when typing, scoped to products available in the cashier's store
    useEffect(() => {
        if (!searchTerm || searchTerm.trim().length === 0) {
            setSuggestions([]);
            return;
        }

        const handle = setTimeout(() => {
            try {
                // Use local `products` (already loaded by getProductsByStore) and filter them
                const mappedAll = products.map(p => ({
                    id: p.id,
                    name: p.name,
                    sku: p.code,
                    price: Number(p.price || 0),
                    category: p.category || null
                }));

                const q = searchTerm.trim().toLowerCase();
                const filtered = mappedAll.filter(m => {
                    const nameMatch = m.name && m.name.toLowerCase().includes(q);
                    const skuMatch = m.sku && m.sku.toLowerCase().includes(q);
                    const idMatch = String(m.id).includes(q);
                    return nameMatch || skuMatch || idMatch;
                });

                const limited = filtered.slice(0, 10);
                setSuggestions(limited);
                setShowSuggestions(true);
            } catch (err) {
                setSuggestions([]);
            }
        }, 300);

        return () => clearTimeout(handle);
    }, [searchTerm, products]);

    // Add product from suggestion to cart
    const handleSelectSuggestion = (p) => {
        const productObj = {
            id: p.id,
            name: p.name || 'Sản phẩm',
            price: p.price || 0,
            oldPrice: undefined,
            category: p.category || 'Tất cả',
            code: p.sku || ''
        };

        // add to cart (reuse handleAddToCart logic but avoid duplicate lookup)
        setCart(currentCart => {
            const item = currentCart.find(i => i.id === productObj.id);
            if (item) return currentCart.map(i => i.id === productObj.id ? { ...i, qty: i.qty + 1 } : i);
            return [...currentCart, { ...productObj, qty: 1 }];
        });

        setSearchTerm('');
        setSuggestions([]);
        setShowSuggestions(false);
        setSearchMessage('Đã thêm sản phẩm vào giỏ');
    };

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

    const vat = useMemo(() => subtotal * 0.1, [subtotal]);
    const total = useMemo(() => subtotal + vat, [subtotal, vat]);

    // Tính tiền mặt dự kiến khi kết ca
    const expectedCashAtClose = useMemo(() => {
        const open = Number(openingCash || 0);
        const sales = Number(cashSalesTotal || 0);
        return open + sales; // có thể cộng thêm/ trừ chi khác nếu sau này có
    }, [openingCash, cashSalesTotal]);

    return (
        <div className="pos-container">
            {/* ------------------- BÊN TRÁI: SẢN PHẨM ------------------- */}
            <div className="pos-main">
                {/* Header */}
                <header className="pos-header d-flex justify-content-between align-items-center">
                    <h2>CCMS System</h2>
                    <div className="d-flex align-items-center gap-2">
                        {isShiftActive ? (
                            <>
                                <div className="me-2 small">
                                    Đang trong ca • Tiền đầu ca: <strong>{formatCurrency(Number(openingCash || 0))}</strong> • Tiền mặt bán được: <strong>{formatCurrency(cashSalesTotal)}</strong>
                                </div>
                                <Button variant="warning" size="sm" onClick={() => { setClosingCashInput(''); setShowCheckoutModal(true); }}>
                                    <FaSignOutAlt className="me-1" /> Kết ca
                                </Button>
                            </>
                        ) : scheduleAttendanceStatus === 'checked_out' ? (
                            <div className="text-muted small">
                                Đã kết ca hôm nay
                            </div>
                        ) : !hasTodaySchedule ? (
                            <div className="text-muted small">
                                Không có lịch làm việc hôm nay
                            </div>
                        ) : (
                            <Button variant="success" size="sm" onClick={() => setShowCheckinModal(true)}>
                                <FaSignInAlt className="me-1" /> Bắt đầu ca (Check-in)
                            </Button>
                        )}
                    </div>
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
                            onKeyDown={async (e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    await handleSearchSubmit();
                                }
                            }}
                            onFocus={() => {
                                if (suggestions.length > 0) setShowSuggestions(true);
                            }}
                            onBlur={() => {
                                // small timeout to allow suggestion onMouseDown to fire
                                setTimeout(() => setShowSuggestions(false), 120);
                            }}
                        />
                        <Button variant="light" className="btn-scan">
                            <FaQrcode className="me-2" /> Quét mã
                        </Button>
                    </InputGroup>
                    {searchMessage && <div className="text-muted small mt-1">{searchMessage}</div>}
                    {/* Suggestions dropdown */}
                    {showSuggestions && suggestions.length > 0 && (
                        <div className="pos-suggestions card mt-1" style={{ maxHeight: 240, overflowY: 'auto' }}>
                            {suggestions.map(s => (
                                <div
                                    key={s.id}
                                    className="p-2 suggestion-item d-flex justify-content-between align-items-center"
                                    onMouseDown={() => handleSelectSuggestion(s)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{s.name}</div>
                                        <div className="text-muted small">{s.sku}</div>
                                    </div>
                                    <div style={{ marginLeft: 12 }}>{formatCurrency(s.price)}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Product List (hidden by default) */}
                {showProducts && (
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
                )}
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
                    <Form.Control
                        type="tel"
                        placeholder="Nhập số điện thoại"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                    />
                </div>

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
                        <div className="summary-total">
                            <strong>Tổng cộng</strong>
                            <strong>{formatCurrency(total)}</strong>
                        </div>
                    </div>
                    {/* Payment method selector */}
                    <div className="mb-2 d-flex align-items-center">
                        <Form.Select
                            aria-label="Chọn phương thức thanh toán"
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            style={{ width: 220 }}
                            className="me-2"
                            disabled={!isShiftActive}
                        >
                            <option value="cash">Tiền mặt</option>
                            <option value="bank_transfer">Chuyển khoản</option>
                        </Form.Select>

                        {paymentMethod === 'bank_transfer' && (
                            <Form.Control
                                type="text"
                                placeholder="Mã GD / Thông tin chuyển khoản"
                                value={paymentReference}
                                onChange={(e) => setPaymentReference(e.target.value)}
                                style={{ width: 300 }}
                                disabled={!isShiftActive}
                            />
                        )}

                        {paymentMethod === 'cash' && (
                            <div className="d-flex align-items-center ms-2">
                                <Form.Control
                                    type="number"
                                    min={0}
                                    placeholder="Số tiền khách đưa"
                                    value={paymentGiven}
                                    onChange={(e) => setPaymentGiven(e.target.value)}
                                    style={{ width: 220 }}
                                    disabled={!isShiftActive}
                                />
                                <div className="ms-3">
                                    <div className="small text-muted">Tiền phải trả:</div>
                                    <div style={{ fontWeight: 600 }}>{formatCurrency(total)}</div>
                                </div>
                                <div className="ms-3">
                                    <div className="small text-muted">Tiền thối:</div>
                                    <div
                                        style={{
                                            fontWeight: 600,
                                            color: paymentGiven && Number(paymentGiven) < total ? 'red' : 'inherit'
                                        }}
                                    >
                                        {paymentGiven ? formatCurrency(Math.max(Number(paymentGiven) - total, 0)) : formatCurrency(0)}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <Button
                        variant="primary"
                        size="lg"
                        className="w-100 mt-3"
                        disabled={cart.length === 0 || !isShiftActive}
                        onClick={async () => {
                            setCheckoutMessage('');
                            if (cart.length === 0) return;
                            if (!isShiftActive) {
                                setCheckoutMessage('Vui lòng check-in bắt đầu ca trước khi thanh toán');
                                return;
                            }

                            // For cash, require paymentGiven and ensure >= total
                            if (paymentMethod === 'cash') {
                                const givenNum = Number(paymentGiven);
                                if (!paymentGiven || isNaN(givenNum)) {
                                    setCheckoutMessage('Vui lòng nhập số tiền khách đưa');
                                    return;
                                }
                                if (givenNum < total) {
                                    setCheckoutMessage('Số tiền khách đưa nhỏ hơn tổng đơn hàng');
                                    return;
                                }
                            }

                            if (paymentMethod === 'bank_transfer' && !paymentReference.trim()) {
                                setCheckoutMessage('Vui lòng nhập mã giao dịch/chú thích chuyển khoản');
                                return;
                            }

                            // Show confirmation modal
                            setShowPaymentModal(true);
                        }}
                    >
                        Thanh toán
                    </Button>
                    {!isShiftActive && (
                        <div className="text-danger small mt-2">Chưa bắt đầu ca. Hãy Check-in để bán hàng.</div>
                    )}
                    {checkoutMessage && <div className="text-success small mt-2">{checkoutMessage}</div>}
                </div>
            </div>

            {/* Payment Confirmation Modal */}
            <Modal show={showPaymentModal} onHide={() => setShowPaymentModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Xác nhận thanh toán</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {paymentMethod === 'cash' ? (
                        <div>
                            <div className="mb-3">
                                <h6>Chi tiết thanh toán</h6>
                                <div className="d-flex justify-content-between mb-2">
                                    <span>Tạm tính:</span>
                                    <strong>{formatCurrency(subtotal)}</strong>
                                </div>
                                <div className="d-flex justify-content-between mb-2">
                                    <span>VAT (10%):</span>
                                    <strong>{formatCurrency(vat)}</strong>
                                </div>
                                <hr />
                                <div className="d-flex justify-content-between mb-3">
                                    <span style={{ fontSize: 18, fontWeight: 600 }}>Phải trả:</span>
                                    <strong style={{ fontSize: 18, color: '#dc3545' }}>
                                        {formatCurrency(total)}
                                    </strong>
                                </div>
                            </div>
                            <div className="mb-3">
                                <Form.Group>
                                    <Form.Label>Số tiền khách đưa (VND)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        min={0}
                                        placeholder="Nhập số tiền"
                                        value={paymentGiven}
                                        onChange={(e) => setPaymentGiven(e.target.value)}
                                        autoFocus
                                    />
                                </Form.Group>
                            </div>
                            <div className="p-3 bg-light rounded">
                                <div className="d-flex justify-content-between">
                                    <span className="text-muted">Tiền phải trả lại:</span>
                                    <span
                                        style={{
                                            fontSize: 20,
                                            fontWeight: 700,
                                            color: paymentGiven && Number(paymentGiven) < total ? 'red' : '#28a745'
                                        }}
                                    >
                                        {paymentGiven && Number(paymentGiven) >= total
                                            ? formatCurrency(Number(paymentGiven) - total)
                                            : formatCurrency(0)}
                                    </span>
                                </div>
                                {paymentGiven && Number(paymentGiven) < total && (
                                    <div className="text-danger small mt-2">
                                        ⚠️ Số tiền nhập chưa đủ
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div className="mb-3">
                                <h6>Chi tiết thanh toán</h6>
                                <div className="d-flex justify-content-between mb-2">
                                    <span>Tạm tính:</span>
                                    <strong>{formatCurrency(subtotal)}</strong>
                                </div>
                                <div className="d-flex justify-content-between mb-2">
                                    <span>VAT (10%):</span>
                                    <strong>{formatCurrency(vat)}</strong>
                                </div>
                                <hr />
                                <div className="d-flex justify-content-between mb-3">
                                    <span style={{ fontSize: 18, fontWeight: 600 }}>Phải trả:</span>
                                    <strong style={{ fontSize: 18, color: '#dc3545' }}>
                                        {formatCurrency(total)}
                                    </strong>
                                </div>
                            </div>
                            <div className="mb-3">
                                <Form.Group>
                                    <Form.Label>Mã giao dịch / Tham chiếu</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Nhập mã giao dịch"
                                        value={paymentReference}
                                        onChange={(e) => setPaymentReference(e.target.value)}
                                        autoFocus
                                    />
                                </Form.Group>
                            </div>
                            <div className="alert alert-info">
                                <small>Đơn hàng sẽ chờ xác nhận thanh toán chuyển khoản</small>
                            </div>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowPaymentModal(false)}>
                        Hủy
                    </Button>
                    <Button
                        variant="primary"
                        onClick={async () => {
                            const givenNum = paymentMethod === 'cash' ? Number(paymentGiven) : null;
                            if (paymentMethod === 'cash' && givenNum < total) {
                                return;
                            }

                            const storedStoreId = (() => {
                                if (user && user.store_id) return user.store_id;
                                try {
                                    const persisted = localStorage.getItem('store_id');
                                    if (persisted) return Number(persisted);
                                } catch { }
                                return 1;
                            })();

                            const given = paymentMethod === 'cash' ? givenNum : null;
                            const change = paymentMethod === 'cash' ? Math.max(given - total, 0) : 0;

                            const payload = {
                                store_id: storedStoreId,
                                shift_id: shiftId, // Gửi shift_id để gắn transaction vào ca
                                customer_id: null,
                                payment: {
                                    method: paymentMethod,
                                    amount: total,
                                    status: paymentMethod === 'cash' ? 'completed' : 'pending',
                                    paid_at: paymentMethod === 'cash' ? new Date() : null,
                                    reference: paymentMethod === 'bank_transfer' ? (paymentReference || null) : null,
                                    given_amount: paymentMethod === 'cash' ? given : null,
                                    change_amount: paymentMethod === 'cash' ? change : null
                                },
                                items: cart.map(item => ({ product_id: item.id, quantity: item.qty, unit_price: item.price }))
                            };

                            const res = await checkoutCart(payload);
                            if (res && res.err === 0) {
                                const successMsg = paymentMethod === 'cash'
                                    ? `Thanh toán thành công. Tiền thối: ${formatCurrency(change)}`
                                    : 'Đã gửi yêu cầu thanh toán chuyển khoản (chờ xác nhận)';
                                setCheckoutMessage(successMsg);

                                // Cộng dồn doanh thu tiền mặt trong ca
                                // Làm mới thông tin ca (lấy từ server)
                                await refreshOpenShift();

                                setCart([]);
                                setPaymentReference('');
                                setPaymentMethod('cash');
                                setPaymentGiven('');
                                setShowPaymentModal(false);
                            } else {
                                setCheckoutMessage(res?.msg || 'Thanh toán thất bại');
                                setShowPaymentModal(false);
                            }
                        }}
                    >
                        Xác nhận thanh toán
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Check-in Modal */}
            <Modal show={showCheckinModal} onHide={() => setShowCheckinModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Bắt đầu ca làm việc</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group>
                        <Form.Label>Tiền mặt đầu ca (VND)</Form.Label>
                        <Form.Control
                            type="number"
                            min={0}
                            placeholder="Nhập số tiền trong két trước ca"
                            value={openingCash}
                            onChange={(e) => setOpeningCash(e.target.value)}
                            autoFocus
                        />
                    </Form.Group>
                    <div className="mt-3 text-muted small">
                        Số tiền này sẽ dùng để đối soát khi kết ca.
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowCheckinModal(false)}>Hủy</Button>
                    <Button
                        variant="success"
                        onClick={async () => {
                            // Kiểm tra lại có lịch làm việc hôm nay không
                            if (!hasTodaySchedule) {
                                alert('Bạn không có lịch làm việc hôm nay. Vui lòng liên hệ quản lý để được phân công lịch.');
                                setShowCheckinModal(false);
                                return;
                            }
                            
                            const open = Number(openingCash);
                            if (isNaN(open) || open < 0) {
                                alert('Vui lòng nhập số tiền hợp lệ');
                                return;
                            }
                            const storedStoreId = (() => {
                                if (user && user.store_id) return user.store_id;
                                try { const persisted = localStorage.getItem('store_id'); if (persisted) return Number(persisted); } catch {}
                                return 1;
                            })();
                            const resp = await checkinShift({ store_id: storedStoreId, opening_cash: open });
                            if (resp && resp.err === 0 && resp.data) {
                                // Cập nhật ngay lập tức từ response
                                setIsShiftActive(true);
                                setShiftId(resp.data.shift_id);
                                setOpeningCash(String(resp.data.opening_cash || open));
                                setCashSalesTotal(Number(resp.data.cash_sales_total || 0));
                                
                                // Refresh lại để đảm bảo có data mới nhất
                                await refreshOpenShift();
                                
                                setShowCheckinModal(false);
                                setOpeningCash('');
                            } else {
                                alert(resp?.msg || 'Không thể bắt đầu ca');
                            }
                        }}
                    >
                        Xác nhận bắt đầu ca
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Checkout (End shift) Modal */}
            <Modal show={showCheckoutModal} onHide={() => setShowCheckoutModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Kết ca làm việc</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="mb-3">
                        <div className="d-flex justify-content-between">
                            <span>Tiền đầu ca:</span>
                            <strong>{formatCurrency(Number(openingCash || 0))}</strong>
                        </div>
                        <div className="d-flex justify-content-between">
                            <span>Tổng bán tiền mặt:</span>
                            <strong>{formatCurrency(cashSalesTotal)}</strong>
                        </div>
                        <hr />
                        <div className="d-flex justify-content-between">
                            <span>Tiền mặt dự kiến trong két:</span>
                            <strong>{formatCurrency(expectedCashAtClose)}</strong>
                        </div>
                    </div>
                    <Form.Group>
                        <Form.Label>Kiểm đếm thực tế (VND)</Form.Label>
                        <Form.Control
                            type="number"
                            min={0}
                            placeholder="Nhập số tiền thực tế trong két"
                            value={closingCashInput}
                            onChange={(e) => setClosingCashInput(e.target.value)}
                            autoFocus
                        />
                    </Form.Group>
                    {closingCashInput !== '' && (
                        <div className="mt-3">
                            <div className="d-flex justify-content-between">
                                <span>Chênh lệch:</span>
                                <strong style={{ color: Number(closingCashInput) === expectedCashAtClose ? '#28a745' : '#dc3545' }}>
                                    {formatCurrency(Number(closingCashInput || 0) - expectedCashAtClose)}
                                </strong>
                            </div>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowCheckoutModal(false)}>Hủy</Button>
                    <Button
                        variant="warning"
                        onClick={async () => {
                            const actual = Number(closingCashInput);
                            if (isNaN(actual) || actual < 0) {
                                alert('Vui lòng nhập số tiền hợp lệ');
                                return;
                            }
                            if (!shiftId) {
                                alert('Không tìm thấy ca làm việc');
                                return;
                            }
                            const resp = await checkoutShift({ shift_id: shiftId, closing_cash: actual });
                            if (resp && resp.err === 0) {
                                setIsShiftActive(false);
                                setShiftId(null);
                                setCashSalesTotal(0);
                                setOpeningCash('');
                                setClosingCashInput('');
                                setPaymentGiven('');
                                setPaymentReference('');
                                // Đánh dấu đã checkout để không hiển thị nút check-in nữa
                                setScheduleAttendanceStatus('checked_out');
                                setShowCheckoutModal(false);
                                alert('Kết ca thành công!');
                            } else {
                                alert(resp?.msg || 'Không thể kết ca');
                            }
                        }}
                    >
                        Xác nhận kết ca
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default POS;
