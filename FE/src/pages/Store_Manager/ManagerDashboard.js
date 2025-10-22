// src/pages/Manager/ProductManagement.js
import React, { useState, useEffect } from 'react';
import { Table, Button, Spinner } from 'react-bootstrap';
import { getProducts } from '../../api/mockApi';
import ConfirmationModal from '../../components/common/ConfirmationModal';

const ProductManagement = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);

    useEffect(() => {
        getProducts().then(data => {
            setProducts(data);
            setLoading(false);
        });
    }, []);

    const handleDeleteClick = (product) => {
        setSelectedProduct(product);
        setShowModal(true);
    };

    const confirmDelete = () => {
        console.log("Deleting product:", selectedProduct.name);
        // Add logic to call delete API here
        setShowModal(false);
        setSelectedProduct(null);
    };

    if (loading) return <Spinner animation="border" />;

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h2>Quản lý Sản phẩm</h2>
                <Button variant="primary">Thêm sản phẩm mới</Button>
            </div>
            <Table striped bordered hover>
                <thead>
                    <tr>
                        <th>Mã SP</th>
                        <th>Tên sản phẩm</th>
                        <th>Giá bán</th>
                        <th>Tồn kho</th>
                        <th>Hành động</th>
                    </tr>
                </thead>
                <tbody>
                    {products.map(product => (
                        <tr key={product.id}>
                            <td>{product.code}</td>
                            <td>{product.name}</td>
                            <td>{product.price.toLocaleString()} VNĐ</td>
                            <td>{product.stock}</td>
                            <td>
                                <Button variant="warning" size="sm" className="me-2">Sửa</Button>
                                <Button variant="danger" size="sm" onClick={() => handleDeleteClick(product)}>Xóa</Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>
            <ConfirmationModal 
                show={showModal}
                onHide={() => setShowModal(false)}
                onConfirm={confirmDelete}
                title="Xác nhận xóa"
                message={`Bạn có chắc chắn muốn xóa sản phẩm "${selectedProduct?.name}" không?`}
            />
        </div>
    );
};
export default ProductManagement;