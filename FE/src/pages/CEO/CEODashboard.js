// src/pages/CEO/CEODashboard.js
import React from 'react';
import { Row, Col, Card } from 'react-bootstrap';
import { FaMoneyBillWave, FaBoxOpen, FaUsers } from 'react-icons/fa';

const CEODashboard = () => {
    return (
        <div>
            <h2>Bảng điều khiển cho CEO</h2>
            <p>Dữ liệu kinh doanh tổng hợp toàn chuỗi.</p>
            <Row>
                <Col md={4}>
                    <Card bg="primary" text="white" className="mb-2">
                        <Card.Body className="d-flex align-items-center">
                            <FaMoneyBillWave size={50} className="me-3" />
                            <div>
                                <Card.Title>Tổng doanh thu (Tháng)</Card.Title>
                                <Card.Text className="fs-4">5,150,000,000 VNĐ</Card.Text>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                 <Col md={4}>
                    <Card bg="success" text="white" className="mb-2">
                        <Card.Body className="d-flex align-items-center">
                            <FaBoxOpen size={50} className="me-3" />
                            <div>
                                <Card.Title>Tổng số đơn hàng (Hôm nay)</Card.Title>
                                <Card.Text className="fs-4">1,205</Card.Text>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                 <Col md={4}>
                    <Card bg="info" text="white" className="mb-2">
                        <Card.Body className="d-flex align-items-center">
                            <FaUsers size={50} className="me-3" />
                            <div>
                                <Card.Title>Khách hàng mới (Tháng)</Card.Title>
                                <Card.Text className="fs-4">890</Card.Text>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
            {/* Trong tương lai, thêm các biểu đồ phân tích ở đây */}
        </div>
    );
};
export default CEODashboard;