import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, InputGroup, Spinner } from 'react-bootstrap';
import { FaMoneyBillWave, FaPrint, FaCheckCircle, FaTimes } from 'react-icons/fa';
import { generateAndPrintInvoice } from '../utils/invoicePDF';
import '../assets/CashPaymentModal.css';

const CashPaymentModal = ({ 
    show, 
    onHide, 
    paymentData, 
    onComplete,
    onPrintInvoice 
}) => {
    const [cashReceived, setCashReceived] = useState('');
    const [changeAmount, setChangeAmount] = useState(0);
    const [isCompleting, setIsCompleting] = useState(false);
    const [paymentCompleted, setPaymentCompleted] = useState(false);

    const totalAmount = paymentData?.total_amount || 0;

    // Calculate change amount when cash received changes
    useEffect(() => {
        if (cashReceived) {
            const received = parseFloat(cashReceived) || 0;
            const change = Math.max(0, received - totalAmount);
            setChangeAmount(change);
        } else {
            setChangeAmount(0);
        }
    }, [cashReceived, totalAmount]);

    const handleCashReceivedChange = (e) => {
        const value = e.target.value;
        // Only allow numbers and decimal point
        if (value === '' || /^\d*\.?\d*$/.test(value)) {
            setCashReceived(value);
        }
    };

    const handleComplete = async () => {
        if (!cashReceived || parseFloat(cashReceived) < totalAmount) {
            alert('Vui lòng nhập số tiền khách đưa không ít hơn số tiền phải trả');
            return;
        }

        setIsCompleting(true);
        try {
            await onComplete({
                cash_received: parseFloat(cashReceived),
                change_amount: changeAmount,
                transaction_id: paymentData?.transaction_id
            });
            setPaymentCompleted(true);
        } catch (error) {
            console.error('Error completing payment:', error);
            alert('Lỗi khi hoàn thành thanh toán');
        } finally {
            setIsCompleting(false);
        }
    };

    const handlePrintInvoice = async () => {
        if (paymentData?.transaction_id) {
            await generateAndPrintInvoice(paymentData.transaction_id);
        }
    };

    const handleClose = () => {
        if (paymentCompleted) {
            setCashReceived('');
            setChangeAmount(0);
            setPaymentCompleted(false);
            onHide();
        }
    };

    const formatCurrency = (number) => {
        return new Intl.NumberFormat('vi-VN', { 
            style: 'currency', 
            currency: 'VND' 
        }).format(number);
    };

    return (
        <Modal 
            show={show} 
            onHide={handleClose}
            centered
            backdrop={paymentCompleted ? true : 'static'}
            keyboard={paymentCompleted}
        >
            <Modal.Header closeButton={paymentCompleted}>
                <Modal.Title>
                    {paymentCompleted ? (
                        <span className="text-success">
                            <FaCheckCircle /> Thanh toán thành công
                        </span>
                    ) : (
                        <span>
                            <FaMoneyBillWave /> Thanh toán tiền mặt
                        </span>
                    )}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {paymentCompleted ? (
                    <div className="payment-success text-center">
                        <FaCheckCircle size={80} className="text-success mb-3" />
                        <h4>Thanh toán thành công!</h4>
                        <p className="text-muted">Mã giao dịch: #{paymentData?.transaction_id}</p>
                        
                        <div className="payment-summary mt-4 p-3 bg-light rounded">
                            <div className="row mb-2">
                                <div className="col-6 text-start">
                                    <strong>Số tiền phải trả:</strong>
                                </div>
                                <div className="col-6 text-end">
                                    {formatCurrency(totalAmount)}
                                </div>
                            </div>
                            <div className="row mb-2">
                                <div className="col-6 text-start">
                                    <strong>Tiền khách đưa:</strong>
                                </div>
                                <div className="col-6 text-end">
                                    {formatCurrency(parseFloat(cashReceived))}
                                </div>
                            </div>
                            <hr />
                            <div className="row">
                                <div className="col-6 text-start">
                                    <strong>Tiền trả lại:</strong>
                                </div>
                                <div className="col-6 text-end text-success">
                                    <strong>{formatCurrency(changeAmount)}</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div>
                        {paymentData?.customer_name && (
                            <div className="customer-info mb-3 p-2 bg-light rounded">
                                <p className="mb-1">
                                    <strong>Khách hàng:</strong> {paymentData.customer_name}
                                </p>
                                {paymentData.customer_phone && (
                                    <p className="mb-0">
                                        <strong>SĐT:</strong> {paymentData.customer_phone}
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="payment-info mb-4 p-3 bg-light rounded">
                            <div className="mb-3">
                                <strong>Số tiền phải trả:</strong>
                                <div className="text-primary fs-5">
                                    {formatCurrency(totalAmount)}
                                </div>
                            </div>
                        </div>

                        <Form>
                            <Form.Group className="mb-3">
                                <Form.Label>
                                    <strong>Tiền khách đưa</strong>
                                </Form.Label>
                                <InputGroup>
                                    <InputGroup.Text>₫</InputGroup.Text>
                                    <Form.Control
                                        type="text"
                                        placeholder="Nhập số tiền khách đưa"
                                        value={cashReceived}
                                        onChange={handleCashReceivedChange}
                                        autoFocus
                                        className="text-end"
                                    />
                                </InputGroup>
                            </Form.Group>

                            <div className="change-display p-3 bg-success bg-opacity-10 rounded mb-3">
                                <div className="d-flex justify-content-between align-items-center">
                                    <span className="fw-bold">Tiền trả lại:</span>
                                    <span className="fs-5 text-success fw-bold">
                                        {formatCurrency(changeAmount)}
                                    </span>
                                </div>
                            </div>
                        </Form>
                    </div>
                )}
            </Modal.Body>
            <Modal.Footer>
                {paymentCompleted ? (
                    <>
                        <Button 
                            variant="primary" 
                            onClick={handlePrintInvoice}
                        >
                            <FaPrint /> In hóa đơn
                        </Button>
                        <Button 
                            variant="secondary" 
                            onClick={handleClose}
                        >
                            <FaTimes /> Đóng
                        </Button>
                    </>
                ) : (
                    <>
                        <Button
                            variant="secondary"
                            onClick={onHide}
                        >
                            <FaTimes /> Hủy
                        </Button>
                        <Button
                            variant="success"
                            onClick={handleComplete}
                            disabled={!cashReceived || parseFloat(cashReceived) < totalAmount || isCompleting}
                        >
                            {isCompleting ? (
                                <>
                                    <Spinner animation="border" size="sm" className="me-2" />
                                    Đang xử lý...
                                </>
                            ) : (
                                <>
                                    <FaCheckCircle /> Hoàn thành
                                </>
                            )}
                        </Button>
                    </>
                )}
            </Modal.Footer>
        </Modal>
    );
};

export default CashPaymentModal;

