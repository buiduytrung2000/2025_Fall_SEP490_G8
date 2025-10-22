// src/pages/Warehouse/InventoryManagement.js
import React, { useState, useEffect } from 'react';
import { Table, Button, Spinner } from 'react-bootstrap';
import { getProducts } from '../../api/mockApi';

const InventoryManagement = () => {
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getProducts().then(data => {
            setInventory(data);
            setLoading(false);
        });
    }, []);

    if (loading) return <Spinner animation="border" />;
    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h2>Quản lý Tồn kho</h2>
                <div>
                     <Button variant="success" className="me-2">Nhập kho</Button>
                     <Button variant="info">Xuất kho</Button>
                </div>
            </div>
             <Table striped bordered hover>
                <thead>
                    <tr>
                        <th>Mã SP</th>
                        <th>Tên sản phẩm</th>
                        <th>Số lượng tồn</th>
                    </tr>
                </thead>
                <tbody>
                    {inventory.map(item => (
                        <tr key={item.id}>
                            <td>{item.code}</td>
                            <td>{item.name}</td>
                            <td>{item.stock}</td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </div>
    );
};
export default InventoryManagement;