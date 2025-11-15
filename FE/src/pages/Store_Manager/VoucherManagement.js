import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Modal, Form, Badge, Tabs, Tab } from 'react-bootstrap';
import { FaPlus, FaEdit, FaTrash, FaGift, FaUserPlus } from 'react-icons/fa';
import { toast } from 'react-toastify';
import * as voucherTemplateApi from '../../api/voucherTemplateApi';
import * as customerApi from '../../api/customerApi';

function VoucherManagement() {
    const [templates, setTemplates] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [availableTemplates, setAvailableTemplates] = useState([]);
    
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    
    const [formData, setFormData] = useState({
        voucher_code_prefix: '',
        voucher_name: '',
        discount_type: 'percentage',
        discount_value: '',
        min_purchase_amount: 0,
        max_discount_amount: '',
        required_loyalty_points: 0,
        validity_days: 30,
        is_active: true
    });

    useEffect(() => {
        loadTemplates();
        loadCustomers();
    }, []);

    const loadTemplates = async () => {
        try {
            const res = await voucherTemplateApi.getAllVoucherTemplates();
            console.log('Voucher templates response:', res);
            if (res && res.err === 0) {
                setTemplates(res.data || []);
            } else {
                console.error('Error loading templates:', res);
                toast.error(res?.msg || 'Lỗi khi tải danh sách voucher template');
            }
        } catch (error) {
            console.error('Exception loading templates:', error);
            toast.error('Lỗi khi tải danh sách voucher template: ' + error.message);
        }
    };

    const loadCustomers = async () => {
        try {
            const res = await customerApi.getAllCustomers();
            if (res && res.err === 0) {
                setCustomers(res.data);
            }
        } catch (error) {
            toast.error('Lỗi khi tải danh sách khách hàng');
        }
    };

    const loadAvailableTemplatesForCustomer = async (customerId) => {
        try {
            const res = await voucherTemplateApi.getAvailableTemplatesForCustomer(customerId);
            if (res && res.err === 0) {
                setAvailableTemplates(res.data);
            }
        } catch (error) {
            toast.error('Lỗi khi tải danh sách voucher khả dụng');
        }
    };

    const handleShowTemplateModal = (template = null) => {
        if (template) {
            setEditingTemplate(template);
            setFormData({
                voucher_code_prefix: template.voucher_code_prefix,
                voucher_name: template.voucher_name,
                discount_type: template.discount_type,
                discount_value: template.discount_value,
                min_purchase_amount: template.min_purchase_amount,
                max_discount_amount: template.max_discount_amount || '',
                required_loyalty_points: template.required_loyalty_points,
                validity_days: template.validity_days,
                is_active: template.is_active
            });
        } else {
            setEditingTemplate(null);
            setFormData({
                voucher_code_prefix: '',
                voucher_name: '',
                discount_type: 'percentage',
                discount_value: '',
                min_purchase_amount: 0,
                max_discount_amount: '',
                required_loyalty_points: 0,
                validity_days: 30,
                is_active: true
            });
        }
        setShowTemplateModal(true);
    };

    const handleCloseTemplateModal = () => {
        setShowTemplateModal(false);
        setEditingTemplate(null);
    };

    const handleSaveTemplate = async () => {
        try {
            let res;
            if (editingTemplate) {
                res = await voucherTemplateApi.updateVoucherTemplate(editingTemplate.voucher_template_id, formData);
            } else {
                res = await voucherTemplateApi.createVoucherTemplate(formData);
            }

            if (res && res.err === 0) {
                toast.success(editingTemplate ? 'Cập nhật voucher template thành công' : 'Tạo voucher template thành công');
                handleCloseTemplateModal();
                loadTemplates();
            } else {
                toast.error(res.msg || 'Có lỗi xảy ra');
            }
        } catch (error) {
            toast.error('Lỗi khi lưu voucher template');
        }
    };

    const handleDeleteTemplate = async (id) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa voucher template này?')) {
            try {
                const res = await voucherTemplateApi.deleteVoucherTemplate(id);
                if (res && res.err === 0) {
                    toast.success('Xóa voucher template thành công');
                    loadTemplates();
                } else {
                    toast.error(res.msg || 'Có lỗi xảy ra');
                }
            } catch (error) {
                toast.error('Lỗi khi xóa voucher template');
            }
        }
    };

    const handleShowAssignModal = async (customer) => {
        setSelectedCustomer(customer);
        await loadAvailableTemplatesForCustomer(customer.customer_id);
        setShowAssignModal(true);
    };

    const handleAssignVoucher = async (templateId) => {
        try {
            const res = await voucherTemplateApi.addVoucherFromTemplate(selectedCustomer.customer_id, templateId);
            if (res && res.err === 0) {
                toast.success(res.msg || 'Thêm voucher thành công');
                await loadAvailableTemplatesForCustomer(selectedCustomer.customer_id);
            } else {
                toast.error(res.msg || 'Có lỗi xảy ra');
            }
        } catch (error) {
            toast.error('Lỗi khi thêm voucher');
        }
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    };

    return (
        <Container fluid className="py-4">
            <h2 className="mb-4">Quản lý Voucher</h2>

            <Tabs defaultActiveKey="templates" className="mb-3">
                <Tab eventKey="templates" title="Voucher Templates">
                    <Card>
                        <Card.Header className="d-flex justify-content-between align-items-center">
                            <h5 className="mb-0">Danh sách Voucher Template</h5>
                            <Button variant="primary" onClick={() => handleShowTemplateModal()}>
                                <FaPlus /> Tạo mới
                            </Button>
                        </Card.Header>
                        <Card.Body>
                            <Table striped bordered hover responsive>
                                <thead>
                                    <tr>
                                        <th>Mã tiền tố</th>
                                        <th>Tên voucher</th>
                                        <th>Loại giảm giá</th>
                                        <th>Giá trị</th>
                                        <th>Đơn tối thiểu</th>
                                        <th>Giảm tối đa</th>
                                        <th>Điểm yêu cầu</th>
                                        <th>Hiệu lực (ngày)</th>
                                        <th>Trạng thái</th>
                                        <th>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {templates.map(template => (
                                        <tr key={template.voucher_template_id}>
                                            <td>{template.voucher_code_prefix}</td>
                                            <td>{template.voucher_name}</td>
                                            <td>{template.discount_type === 'percentage' ? 'Phần trăm' : 'Số tiền cố định'}</td>
                                            <td>
                                                {template.discount_type === 'percentage' 
                                                    ? `${template.discount_value}%` 
                                                    : formatCurrency(template.discount_value)}
                                            </td>
                                            <td>{formatCurrency(template.min_purchase_amount)}</td>
                                            <td>{template.max_discount_amount ? formatCurrency(template.max_discount_amount) : 'Không giới hạn'}</td>
                                            <td>{template.required_loyalty_points}</td>
                                            <td>{template.validity_days}</td>
                                            <td>
                                                <Badge bg={template.is_active ? 'success' : 'secondary'}>
                                                    {template.is_active ? 'Hoạt động' : 'Vô hiệu hóa'}
                                                </Badge>
                                            </td>
                                            <td>
                                                <Button 
                                                    variant="warning" 
                                                    size="sm" 
                                                    className="me-2"
                                                    onClick={() => handleShowTemplateModal(template)}
                                                >
                                                    <FaEdit />
                                                </Button>
                                                <Button 
                                                    variant="danger" 
                                                    size="sm"
                                                    onClick={() => handleDeleteTemplate(template.voucher_template_id)}
                                                >
                                                    <FaTrash />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Tab>

                <Tab eventKey="assign" title="Gán Voucher cho Khách hàng">
                    <Card>
                        <Card.Header>
                            <h5 className="mb-0">Danh sách Khách hàng</h5>
                        </Card.Header>
                        <Card.Body>
                            <Table striped bordered hover responsive>
                                <thead>
                                    <tr>
                                        <th>Tên khách hàng</th>
                                        <th>Số điện thoại</th>
                                        <th>Điểm tích lũy</th>
                                        <th>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {customers.map(customer => (
                                        <tr key={customer.customer_id}>
                                            <td>{customer.name}</td>
                                            <td>{customer.phone}</td>
                                            <td>{customer.loyalty_point || 0}</td>
                                            <td>
                                                <Button 
                                                    variant="success" 
                                                    size="sm"
                                                    onClick={() => handleShowAssignModal(customer)}
                                                >
                                                    <FaUserPlus /> Thêm voucher
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Tab>
            </Tabs>

            {/* Template Modal */}
            <Modal show={showTemplateModal} onHide={handleCloseTemplateModal} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>{editingTemplate ? 'Chỉnh sửa' : 'Tạo mới'} Voucher Template</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Mã tiền tố *</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={formData.voucher_code_prefix}
                                        onChange={(e) => setFormData({...formData, voucher_code_prefix: e.target.value})}
                                        placeholder="VD: WELCOME, LOYAL100"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Tên voucher *</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={formData.voucher_name}
                                        onChange={(e) => setFormData({...formData, voucher_name: e.target.value})}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Loại giảm giá *</Form.Label>
                                    <Form.Select
                                        value={formData.discount_type}
                                        onChange={(e) => setFormData({...formData, discount_type: e.target.value})}
                                    >
                                        <option value="percentage">Phần trăm (%)</option>
                                        <option value="fixed_amount">Số tiền cố định (VND)</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Giá trị giảm giá *</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={formData.discount_value}
                                        onChange={(e) => setFormData({...formData, discount_value: e.target.value})}
                                        placeholder={formData.discount_type === 'percentage' ? '10' : '50000'}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Đơn hàng tối thiểu (VND)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={formData.min_purchase_amount}
                                        onChange={(e) => setFormData({...formData, min_purchase_amount: e.target.value})}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Giảm tối đa (VND)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={formData.max_discount_amount}
                                        onChange={(e) => setFormData({...formData, max_discount_amount: e.target.value})}
                                        placeholder="Để trống nếu không giới hạn"
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Điểm tích lũy yêu cầu</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={formData.required_loyalty_points}
                                        onChange={(e) => setFormData({...formData, required_loyalty_points: e.target.value})}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Số ngày hiệu lực</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={formData.validity_days}
                                        onChange={(e) => setFormData({...formData, validity_days: e.target.value})}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Form.Group className="mb-3">
                            <Form.Check
                                type="checkbox"
                                label="Kích hoạt"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseTemplateModal}>
                        Hủy
                    </Button>
                    <Button variant="primary" onClick={handleSaveTemplate}>
                        {editingTemplate ? 'Cập nhật' : 'Tạo mới'}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Assign Voucher Modal */}
            <Modal show={showAssignModal} onHide={() => setShowAssignModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>
                        Thêm voucher cho {selectedCustomer?.name}
                        <Badge bg="info" className="ms-2">{selectedCustomer?.loyalty_point || 0} điểm</Badge>
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {availableTemplates.length === 0 ? (
                        <p className="text-center text-muted">Không có voucher khả dụng cho khách hàng này</p>
                    ) : (
                        <Table striped bordered hover>
                            <thead>
                                <tr>
                                    <th>Tên voucher</th>
                                    <th>Giảm giá</th>
                                    <th>Đơn tối thiểu</th>
                                    <th>Điểm yêu cầu</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {availableTemplates.map(template => (
                                    <tr key={template.voucher_template_id}>
                                        <td>{template.voucher_name}</td>
                                        <td>
                                            {template.discount_type === 'percentage'
                                                ? `${template.discount_value}%`
                                                : formatCurrency(template.discount_value)}
                                        </td>
                                        <td>{formatCurrency(template.min_purchase_amount)}</td>
                                        <td>{template.required_loyalty_points}</td>
                                        <td>
                                            <Button
                                                variant="success"
                                                size="sm"
                                                onClick={() => handleAssignVoucher(template.voucher_template_id)}
                                            >
                                                <FaGift /> Thêm
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowAssignModal(false)}>
                        Đóng
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
}

export default VoucherManagement;

