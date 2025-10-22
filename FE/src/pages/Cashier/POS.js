// src/pages/Cashier/POS.js
import React, { useState } from 'react';
import { Container, Row, Col, Form, Button, ListGroup, Card, Badge } from 'react-bootstrap';
import { BsUpcScan } from 'react-icons/bs';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const POS = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [cart, setCart] = useState([]);
    const [productCode, setProductCode] = useState('');

    const handleLogout = () => {
        logout();
        navigate('/login');
    }
    
    // Giả lập tìm sản phẩm
    const handleAddProduct = (e) => {
        e.preventDefault();
        if(!productCode) return;
        const mockProduct = { name: `Sản phẩm ${productCode}`, price: Math.floor(Math.random() * 20000) + 5000};
        const existingItem = cart.find(item => item.name === mockProduct.name);
        if(existingItem) {
            setCart(cart.map(item => item.name === mockProduct.name ? {...item, qty: item.qty + 1} : item));
        } else {
            setCart([...cart, {...mockProduct, qty: 1}]);
        }
        setProductCode('');
    }

    const total = cart.reduce((sum, item) => sum + item.qty * item.price, 0);

    return (
        <Container fluid style={{ height: '100vh', backgroundColor: '#f0f2f5' }}>
            <Row>
                <Col md={7} className="p-3">
                    <Card style={{ height: 'calc(100vh - 30px)' }}>
                        <Card.Header><h4>Hóa đơn</h4></Card.Header>
                        <Card.Body style={{ overflowY: 'auto' }}>
                             <ListGroup variant="flush">
                                {cart.map((item, index) => (
                                    <ListGroup.Item key={index} className="d-flex justify-content-between align-items-center">
                                        <div>
                                            <Badge bg="secondary" className="me-2">{item.qty}</Badge>
                                            {item.name}
                                        </div>
                                        <span>{(item.price * item.qty).toLocaleString()} VNĐ</span>
                                    </ListGroup.Item>
                                ))}
                                {cart.length === 0 && <p className="text-muted text-center">Chưa có sản phẩm nào</p>}
                            </ListGroup>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={5} className="p-3">
                    <Card className="mb-3">
                        <Card.Body className="d-flex justify-content-between align-items-center">
                            <span>Chào, {user?.name}</span>
                            <Button variant="outline-danger" size="sm" onClick={handleLogout}>Đăng xuất</Button>
                        </Card.Body>
                    </Card>
                    <Card className="mb-3">
                        <Card.Body>
                            <Form onSubmit={handleAddProduct}>
                                <Form.Group className="d-flex">
                                    <Form.Control type="text" placeholder="Quét hoặc nhập mã sản phẩm..." value={productCode} onChange={e => setProductCode(e.target.value)} autoFocus/>
                                    <Button type="submit" variant="outline-primary"><BsUpcScan /></Button>
                                </Form.Group>
                            </Form>
                        </Card.Body>
                    </Card>
                    <Card>
                        <Card.Body>
                            <h4 className="d-flex justify-content-between">
                                <span>TỔNG CỘNG:</span>
                                <span>{total.toLocaleString()} VNĐ</span>
                            </h4>
                            <hr />
                            <div className="d-grid gap-2">
                                <Button variant="success" size="lg" disabled={cart.length === 0}>Thanh Toán</Button>
                                <Button variant="danger" size="lg" onClick={() => setCart([])} disabled={cart.length === 0}>Hủy</Button>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};
export default POS;