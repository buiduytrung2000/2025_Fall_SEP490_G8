import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Form, Button, Badge, Spinner } from 'react-bootstrap';
import { FaCalendarAlt, FaMoneyBillWave, FaQrcode, FaSearch, FaPrint, FaFileExcel } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { getTransactionHistory } from '../../api/paymentApi';
import { generateAndPrintInvoice } from '../../utils/invoicePDF';
import { exportPaymentHistoryToExcel } from '../../utils/exportExcel';
import '../../assets/PaymentHistory.css';

const PaymentHistory = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(() => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    });
    const [paymentMethod, setPaymentMethod] = useState('all');

    useEffect(() => {
        fetchTransactions();
    }, [selectedDate, paymentMethod]);

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const filters = {
                date: selectedDate
            };

            if (paymentMethod !== 'all') {
                filters.payment_method = paymentMethod;
            }

            const response = await getTransactionHistory(filters);
            
            if (response.err === 0) {
                setTransactions(response.data || []);
            } else {
                toast.error(response.msg || 'Không thể tải lịch sử thanh toán');
                setTransactions([]);
            }
        } catch (error) {
            console.error('Error fetching transactions:', error);
            toast.error('Lỗi khi tải dữ liệu');
            setTransactions([]);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    };

    const formatDateTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const getPaymentMethodBadge = (method) => {
        if (method === 'cash') {
            return <Badge bg="success"><FaMoneyBillWave /> Tiền mặt</Badge>;
        } else if (method === 'bank_transfer') {
            return <Badge bg="info"><FaQrcode /> QR Banking</Badge>;
        }
        return <Badge bg="secondary">{method}</Badge>;
    };

    const getTotalAmount = () => {
        return transactions.reduce((sum, transaction) => sum + parseFloat(transaction.total_amount || 0), 0);
    };

    const getTotalTransactions = () => {
        return transactions.length;
    };

    const handlePrintInvoice = async (transactionId) => {
        try {
            await generateAndPrintInvoice(transactionId);
        } catch (error) {
            console.error('Error printing invoice:', error);
            toast.error('Lỗi khi in hóa đơn');
        }
    };

    const handleExportExcel = () => {
        try {
            exportPaymentHistoryToExcel(transactions, { date: selectedDate, paymentMethod });
            toast.success('Xuất file Excel thành công');
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            toast.error('Lỗi khi xuất file Excel');
        }
    };

    return (
        <Container fluid className="payment-history-container">
            <Row className="mb-4">
                <Col>
                    <h2 className="page-title">
                        <FaCalendarAlt className="me-2" />
                        Lịch sử thanh toán
                    </h2>
                </Col>
            </Row>

            {/* Filters */}
            <Row className="mb-4">
                <Col md={6}>
                    <Form.Group>
                        <Form.Label>Chọn ngày</Form.Label>
                        <Form.Control
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                    </Form.Group>
                </Col>
                <Col md={6}>
                    <Form.Group>
                        <Form.Label>Phương thức thanh toán</Form.Label>
                        <Form.Select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                        >
                            <option value="all">Tất cả</option>
                            <option value="cash">Tiền mặt</option>
                            <option value="qr">QR Banking</option>
                        </Form.Select>
                    </Form.Group>
                </Col>
            </Row>

            {/* Summary Cards */}
            <Row className="mb-4">
                <Col md={4}>
                    <Card className="summary-card">
                        <Card.Body>
                            <h5>Tổng số giao dịch</h5>
                            <h2 className="text-primary">{getTotalTransactions()}</h2>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card className="summary-card">
                        <Card.Body>
                            <h5>Tổng doanh thu</h5>
                            <h2 className="text-success">{formatCurrency(getTotalAmount())}</h2>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card className="summary-card">
                        <Card.Body>
                            <Button
                                variant="success"
                                className="w-100 mt-3"
                                onClick={handleExportExcel}
                                disabled={transactions.length === 0}
                            >
                                <FaFileExcel className="me-2" />
                                Xuất Excel
                            </Button>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Transactions Table */}
            <Card>
                <Card.Body>
                    {loading ? (
                        <div className="text-center py-5">
                            <Spinner animation="border" variant="primary" />
                            <p className="mt-3">Đang tải dữ liệu...</p>
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="text-center py-5">
                            <p className="text-muted">Không có giao dịch nào trong ngày này</p>
                        </div>
                    ) : (
                        <Table responsive hover>
                            <thead>
                                <tr>
                                    <th>Mã GD</th>
                                    <th>Thời gian</th>
                                    <th>Khách hàng</th>
                                    <th>Số lượng SP</th>
                                    <th>Tổng tiền</th>
                                    <th>Phương thức</th>
                                    <th>Trạng thái</th>
                                    <th>Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((transaction) => (
                                    <tr key={transaction.transaction_id}>
                                        <td>#{transaction.transaction_id}</td>
                                        <td>{formatDateTime(transaction.created_at)}</td>
                                        <td>
                                            {transaction.customer ? (
                                                <>
                                                    {transaction.customer.name}
                                                    <br />
                                                    <small className="text-muted">{transaction.customer.phone}</small>
                                                </>
                                            ) : (
                                                <span className="text-muted">Khách vãng lai</span>
                                            )}
                                        </td>
                                        <td>{transaction.items?.length || 0}</td>
                                        <td className="fw-bold">{formatCurrency(transaction.total_amount)}</td>
                                        <td>{getPaymentMethodBadge(transaction.payment?.method)}</td>
                                        <td>
                                            <Badge bg="success">Hoàn thành</Badge>
                                        </td>
                                        <td>
                                            <Button
                                                variant="outline-primary"
                                                size="sm"
                                                onClick={() => handlePrintInvoice(transaction.transaction_id)}
                                                title="In hóa đơn"
                                            >
                                                <FaPrint /> In
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </Card.Body>
            </Card>
        </Container>
    );
};

export default PaymentHistory;

