// src/pages/Cashier/POS.js
// GHI ĐÈ TOÀN BỘ FILE NÀY

import React, { useState, useMemo } from 'react';
import { Container, Row, Col, Form, Button, ListGroup, Card, InputGroup } from 'react-bootstrap';
import { 
    FaBars, FaSearch, FaQrcode, FaCartPlus, 
    FaShoppingCart, FaUserCircle, FaTimes 
} from 'react-icons/fa';
import '../../assets/POS.css'; 

// Hàm helper để format tiền tệ
const formatCurrency = (number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(number);
}

// Dữ liệu sản phẩm giả (mock data)
const mockProducts = [
    { id: 1, name: 'Bánh Chocolate', price: 22000, oldPrice: 25000, category: 'Đồ ăn', code: 'BC001' },
    { id: 2, name: 'Coca Cola', price: 10800, category: 'Đồ uống', code: 'CC002' },
    { id: 3, name: 'Kẹo Chocopie', price: 47000, category: 'Đồ ăn', code: 'KC003' },
    { id: 4, name: 'Nước suối Aquafina', price: 5000, category: 'Đồ uống', code: 'NS004' },
    { id: 5, name: 'Bim bim Ostar', price: 7000, category: 'Đồ ăn', code: 'BB005' },
];

// Dữ liệu giỏ hàng giả ban đầu (khớp với wireframe)
const initialCart = [
    { id: 1, name: 'Bánh Chocolate', price: 22000, qty: 2 },
    { id: 2, name: 'Coca Cola', price: 10800, qty: 1 },
    { id: 3, name: 'Kẹo Chocopie', price: 47000, qty: 1 },
];


const POS = () => {
    const [products, setProducts] = useState(mockProducts);
    const [cart, setCart] = useState(initialCart);
    const [activeFilter, setActiveFilter] = useState('Tất cả');
    const [searchTerm, setSearchTerm] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');

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