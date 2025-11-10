import React, { useState, useEffect } from 'react';
import { Modal, Form, InputGroup, ListGroup, Button, Spinner } from 'react-bootstrap';
import { FaSearch, FaUserCircle, FaTimes } from 'react-icons/fa';
import { searchCustomerByPhone, createCustomer } from '../../api/customerApi';
import { toast } from 'react-toastify';

const CustomerSearchModal = ({ show, onHide, onSelectCustomer }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newCustomer, setNewCustomer] = useState({
        name: '',
        phone: '',
        email: ''
    });

    // Tìm kiếm khách hàng khi người dùng nhập số điện thoại
    useEffect(() => {
        const delaySearch = setTimeout(() => {
            if (searchTerm.trim().length >= 3) {
                handleSearch();
            } else {
                setCustomers([]);
            }
        }, 500); // Debounce 500ms

        return () => clearTimeout(delaySearch);
    }, [searchTerm]);

    const handleSearch = async () => {
        setLoading(true);
        try {
            const res = await searchCustomerByPhone(searchTerm);
            if (res && res.err === 0) {
                setCustomers(res.data || []);
                setShowCreateForm(false);
            } else {
                setCustomers([]);
                // Nếu không tìm thấy, hiển thị form tạo mới
                if (searchTerm.trim().length >= 10) {
                    setShowCreateForm(true);
                    setNewCustomer(prev => ({ ...prev, phone: searchTerm }));
                }
            }
        } catch (error) {
            console.error('Error searching customer:', error);
            toast.error('Lỗi khi tìm kiếm khách hàng');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectCustomer = (customer) => {
        onSelectCustomer(customer);
        handleClose();
    };

    const handleCreateCustomer = async () => {
        if (!newCustomer.name || !newCustomer.phone) {
            toast.error('Vui lòng nhập tên và số điện thoại');
            return;
        }

        try {
            const res = await createCustomer(newCustomer);
            if (res && res.err === 0) {
                toast.success('Tạo khách hàng thành công');
                onSelectCustomer(res.data);
                handleClose();
            } else {
                toast.error(res.msg || 'Tạo khách hàng thất bại');
            }
        } catch (error) {
            console.error('Error creating customer:', error);
            toast.error('Lỗi khi tạo khách hàng');
        }
    };

    const handleClose = () => {
        setSearchTerm('');
        setCustomers([]);
        setShowCreateForm(false);
        setNewCustomer({ name: '', phone: '', email: '' });
        onHide();
    };

    const getTierBadgeColor = (tier) => {
        switch (tier) {
            case 'platinum': return 'primary';
            case 'gold': return 'warning';
            case 'silver': return 'secondary';
            default: return 'light';
        }
    };

    return (
        <Modal show={show} onHide={handleClose} size="md" centered>
            <Modal.Header closeButton>
                <Modal.Title>
                    <FaUserCircle className="me-2" />
                    Tra cứu khách hàng
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {/* Search Input */}
                <InputGroup className="mb-3">
                    <InputGroup.Text>
                        <FaSearch />
                    </InputGroup.Text>
                    <Form.Control
                        type="text"
                        placeholder="Nhập số điện thoại khách hàng..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        autoFocus
                    />
                    {searchTerm && (
                        <Button 
                            variant="outline-secondary" 
                            onClick={() => setSearchTerm('')}
                        >
                            <FaTimes />
                        </Button>
                    )}
                </InputGroup>

                {/* Loading Spinner */}
                {loading && (
                    <div className="text-center py-3">
                        <Spinner animation="border" size="sm" />
                        <p className="text-muted mt-2">Đang tìm kiếm...</p>
                    </div>
                )}

                {/* Customer List */}
                {!loading && customers.length > 0 && (
                    <div>
                        <h6 className="text-muted mb-2">Kết quả tìm kiếm:</h6>
                        <ListGroup>
                            {customers.map((customer) => (
                                <ListGroup.Item
                                    key={customer.customer_id}
                                    action
                                    onClick={() => handleSelectCustomer(customer)}
                                    className="d-flex justify-content-between align-items-center"
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div>
                                        <div className="d-flex align-items-center gap-2">
                                            <FaUserCircle size={24} className="text-secondary" />
                                            <div>
                                                <strong>{customer.name}</strong>
                                                <br />
                                                <small className="text-muted">{customer.phone}</small>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-end">
                                        <span className={`badge bg-${getTierBadgeColor(customer.tier)}`}>
                                            {customer.tier}
                                        </span>
                                        <br />
                                        <small className="text-muted">
                                            {customer.loyalty_point || 0} điểm
                                        </small>
                                    </div>
                                </ListGroup.Item>
                            ))}
                        </ListGroup>
                    </div>
                )}

                {/* No Results */}
                {!loading && searchTerm.length >= 3 && customers.length === 0 && !showCreateForm && (
                    <div className="text-center py-3">
                        <p className="text-muted">Không tìm thấy khách hàng</p>
                    </div>
                )}

                {/* Create New Customer Form */}
                {showCreateForm && (
                    <div className="mt-3 p-3 border rounded bg-light">
                        <h6 className="mb-3">Tạo khách hàng mới</h6>
                        <Form>
                            <Form.Group className="mb-2">
                                <Form.Label>Tên khách hàng <span className="text-danger">*</span></Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="Nhập tên khách hàng"
                                    value={newCustomer.name}
                                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                                />
                            </Form.Group>
                            <Form.Group className="mb-2">
                                <Form.Label>Số điện thoại <span className="text-danger">*</span></Form.Label>
                                <Form.Control
                                    type="tel"
                                    placeholder="Nhập số điện thoại"
                                    value={newCustomer.phone}
                                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                                />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Email (tùy chọn)</Form.Label>
                                <Form.Control
                                    type="email"
                                    placeholder="Nhập email"
                                    value={newCustomer.email}
                                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                                />
                            </Form.Group>
                            <div className="d-flex gap-2">
                                <Button 
                                    variant="primary" 
                                    onClick={handleCreateCustomer}
                                    className="flex-grow-1"
                                >
                                    Tạo khách hàng
                                </Button>
                                <Button 
                                    variant="outline-secondary" 
                                    onClick={() => setShowCreateForm(false)}
                                >
                                    Hủy
                                </Button>
                            </div>
                        </Form>
                    </div>
                )}

                {/* Empty State */}
                {!loading && !searchTerm && (
                    <div className="text-center py-4 text-muted">
                        <FaSearch size={48} className="mb-3 opacity-25" />
                        <p>Nhập số điện thoại để tìm kiếm khách hàng</p>
                    </div>
                )}
            </Modal.Body>
        </Modal>
    );
};

export default CustomerSearchModal;

