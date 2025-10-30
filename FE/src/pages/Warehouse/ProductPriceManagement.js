import React, { useState, useEffect } from 'react';
import { Button, Modal, Form, Table, Spinner } from 'react-bootstrap';
import { getProducts } from '../../api/mockApi';

const ProductPriceManagement = () => {
    const [products, setProducts] = useState([]); // [{id, name, price, code}]
    const [loading, setLoading] = useState(true);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showPriceModal, setShowPriceModal] = useState(false);
    const [newPrice, setNewPrice] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    // Dummy state for price history map: { productId: [{ price, startDate, endDate }] }
    const [priceHistoryMap, setPriceHistoryMap] = useState({});

    useEffect(() => {
        getProducts().then(data => {
            setProducts(data.map(p => ({...p, price: p.price || 20000})));
            // Initialize each product with dummy price history
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

    // Open modal for price update
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

    if (loading) return <Spinner animation="border" className="mt-5" />;
    return (
        <div className="container py-3">
            <h4 className="mb-4 fw-bold">Quản lý giá sản phẩm</h4>
            <Table bordered hover responsive className="align-middle bg-white shadow-sm">
                <thead className="table-light">
                    <tr>
                        <th>#</th>
                        <th>Mã sản phẩm</th>
                        <th>Tên sản phẩm</th>
                        <th>Giá hiện tại</th>
                        <th>Cập nhật</th>
                    </tr>
                </thead>
                <tbody>
                    {products.map((prod, idx) => (
                        <tr key={prod.id}>
                            <td>{idx+1}</td>
                            <td>{prod.code}</td>
                            <td>{prod.name}</td>
                            <td className="fw-bold text-primary">{parseInt(prod.price).toLocaleString()}₫</td>
                            <td><Button size="sm" variant="outline-primary" onClick={() => handleShowPriceModal(prod)}>Cập nhật giá</Button></td>
                        </tr>
                    ))}
                </tbody>
            </Table>
            {/* Lịch sử giá */}
            {selectedProduct && priceHistoryMap[selectedProduct.id] && (
                <div className="mt-4">
                    <h6 className="mb-2 fw-bold">Lịch sử thay đổi giá: {selectedProduct.name} ({selectedProduct.code})</h6>
                    <Table bordered size="sm" className="bg-white">
                        <thead>
                            <tr>
                                <th>Giá</th>
                                <th>Bắt đầu áp dụng</th>
                                <th>Kết thúc áp dụng</th>
                            </tr>
                        </thead>
                        <tbody>
                            {priceHistoryMap[selectedProduct.id].map((item, idx) => (
                                <tr key={idx}>
                                    <td>{parseInt(item.price).toLocaleString()}₫</td>
                                    <td>{item.startDate || '-'}</td>
                                    <td>{item.endDate || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </div>
            )}
            {/* Modal cập nhật giá */}
            <Modal show={showPriceModal} onHide={handleClosePriceModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Cập nhật giá cho {selectedProduct && selectedProduct.name}</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleUpdatePrice}>
                    <Modal.Body>
                        <Form.Group className="mb-3">
                            <Form.Label>Giá mới (₫)</Form.Label>
                            <Form.Control
                                type="number"
                                min={0}
                                value={newPrice}
                                onChange={e => setNewPrice(e.target.value)}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Bắt đầu áp dụng từ ngày</Form.Label>
                            <Form.Control
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-2">
                            <Form.Label>Kết thúc áp dụng (tuỳ chọn)</Form.Label>
                            <Form.Control
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                min={startDate}
                            />
                            <Form.Text className="text-muted">Để trống nếu giá chưa có ngày kết thúc</Form.Text>
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleClosePriceModal}>Huỷ</Button>
                        <Button type="submit" variant="primary">Lưu</Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </div>
    );
};
export default ProductPriceManagement;
