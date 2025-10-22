// src/pages/Supplier/SupplierPortal.js
import React, { useState, useEffect } from 'react';
import { Table, Button, Spinner, Badge } from 'react-bootstrap';
import { getPurchaseOrders } from '../../api/mockApi';

const SupplierPortal = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getPurchaseOrders().then(data => {
            setOrders(data);
            setLoading(false);
        });
    }, []);

    if (loading) return <Spinner animation="border" />;
    return (
        <div>
            <h2>Đơn đặt hàng</h2>
             <Table striped bordered hover>
                <thead>
                    <tr>
                        <th>Mã ĐH</th>
                        <th>Ngày đặt</th>
                        <th>Tổng tiền</th>
                        <th>Trạng thái</th>
                        <th>Hành động</th>
                    </tr>
                </thead>
                <tbody>
                    {orders.map(order => (
                        <tr key={order.id}>
                            <td>{order.id}</td>
                            <td>{order.date}</td>
                            <td>{order.total.toLocaleString()} VNĐ</td>
                            <td><Badge bg={order.status === 'Approved' ? 'success' : 'warning'}>{order.status}</Badge></td>
                            <td>
                                <Button variant="primary" size="sm">Xem chi tiết & Nhập hóa đơn</Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </div>
    );
};
export default SupplierPortal;