import React, { useState, useEffect } from 'react';
import { Modal, Button, Spinner } from 'react-bootstrap';
import { FaQrcode, FaPrint, FaTimes, FaCheckCircle } from 'react-icons/fa';
import { checkPaymentStatus } from '../api/paymentApi';
import '../assets/PaymentModal.css';

const PaymentModal = ({ 
    show, 
    onHide, 
    paymentData, 
    onPaymentSuccess,
    onPrintInvoice 
}) => {
    const [paymentStatus, setPaymentStatus] = useState('pending'); // pending, checking, completed, failed
    const [checkingInterval, setCheckingInterval] = useState(null);

    useEffect(() => {
        if (show && paymentData) {
            // If payment method is cash, set status to completed immediately
            if (paymentData.payment_method === 'cash') {
                setPaymentStatus('completed');
            } else if (paymentData.order_code) {
                // For QR payment, start checking payment status every 3 seconds
                const interval = setInterval(async () => {
                    setPaymentStatus('checking');
                    const result = await checkPaymentStatus(paymentData.order_code);

                    if (result && result.err === 0) {
                        const status = result.data.status;

                        if (status === 'PAID') {
                            setPaymentStatus('completed');
                            clearInterval(interval);
                            if (onPaymentSuccess) {
                                onPaymentSuccess(paymentData.transaction_id);
                            }
                        } else if (status === 'CANCELLED') {
                            setPaymentStatus('failed');
                            clearInterval(interval);
                        }
                    }
                }, 3000);

                setCheckingInterval(interval);

                return () => {
                    if (interval) {
                        clearInterval(interval);
                    }
                };
            }
        }
    }, [show, paymentData]);

    const handleClose = () => {
        if (checkingInterval) {
            clearInterval(checkingInterval);
        }
        setPaymentStatus('pending');
        onHide();
    };

    const handlePrintInvoice = () => {
        if (onPrintInvoice && paymentData.transaction_id) {
            onPrintInvoice(paymentData.transaction_id);
        }
    };

    return (
        <Modal 
            show={show} 
            onHide={handleClose}
            centered
            backdrop={paymentStatus === 'completed' ? true : 'static'}
            keyboard={paymentStatus === 'completed'}
        >
            <Modal.Header closeButton={paymentStatus === 'completed'}>
                <Modal.Title>
                    {paymentStatus === 'completed' ? (
                        <span className="text-success">
                            <FaCheckCircle /> Thanh toán thành công
                        </span>
                    ) : paymentData?.payment_method === 'cash' ? (
                        <span className="text-success">
                            <FaCheckCircle /> Thanh toán thành công
                        </span>
                    ) : (
                        <span>
                            <FaQrcode /> Quét mã QR để thanh toán
                        </span>
                    )}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="text-center">
                {paymentStatus === 'completed' ? (
                    <div className="payment-success">
                        <FaCheckCircle size={80} className="text-success mb-3" />
                        <h4>Thanh toán thành công!</h4>
                        <p className="text-muted">Mã giao dịch: #{paymentData?.transaction_id}</p>
                    </div>
                ) : (
                    <>
                        {paymentData?.customer_name && (
                            <div className="customer-info mb-3">
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
                        
                        {paymentData?.qr_code ? (
                            <div className="qr-code-container">
                                <img 
                                    src={paymentData.qr_code} 
                                    alt="QR Code" 
                                    className="qr-code-image"
                                />
                            </div>
                        ) : (
                            <Spinner animation="border" variant="primary" />
                        )}
                        
                        <div className="payment-info mt-3">
                            <p className="mb-1">
                                <strong>Số tiền:</strong>{' '}
                                {new Intl.NumberFormat('vi-VN', { 
                                    style: 'currency', 
                                    currency: 'VND' 
                                }).format(paymentData?.total_amount || 0)}
                            </p>
                            <p className="mb-0 text-muted">
                                Mã đơn hàng: #{paymentData?.order_code}
                            </p>
                        </div>

                        {paymentStatus === 'checking' && (
                            <div className="checking-status mt-3">
                                <Spinner animation="border" size="sm" className="me-2" />
                                <span>Đang kiểm tra trạng thái thanh toán...</span>
                            </div>
                        )}

                        {paymentStatus === 'failed' && (
                            <div className="alert alert-danger mt-3">
                                Thanh toán đã bị hủy hoặc thất bại
                            </div>
                        )}
                    </>
                )}
            </Modal.Body>
            <Modal.Footer>
                {paymentStatus === 'completed' ? (
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
                            variant="link" 
                            onClick={() => window.open(paymentData?.checkout_url, '_blank')}
                            disabled={!paymentData?.checkout_url}
                        >
                            Mở trang thanh toán
                        </Button>
                        <Button 
                            variant="secondary" 
                            onClick={handleClose}
                            disabled={paymentStatus === 'checking'}
                        >
                            Hủy
                        </Button>
                    </>
                )}
            </Modal.Footer>
        </Modal>
    );
};

export default PaymentModal;

