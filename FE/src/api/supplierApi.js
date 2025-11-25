import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Get all suppliers
export const getAllSuppliers = async () => {
    try {
        const response = await axios.get(`${API_URL}/api/v1/supplier`);
        return response.data;
    } catch (error) {
        console.error('Error fetching suppliers:', error);
        return {
            err: -1,
            msg: error.response?.data?.msg || 'Lỗi khi tải danh sách nhà cung cấp',
            data: null
        };
    }
};

// Get one supplier by ID
export const getSupplierById = async (supplierId) => {
    try {
        const response = await axios.get(`${API_URL}/api/v1/supplier/${supplierId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching supplier:', error);
        return {
            err: -1,
            msg: error.response?.data?.msg || 'Lỗi khi tải thông tin nhà cung cấp',
            data: null
        };
    }
};

// Create new supplier
export const createSupplier = async (supplierData) => {
    try {
        const response = await axios.post(`${API_URL}/api/v1/supplier`, supplierData);
        return response.data;
    } catch (error) {
        console.error('Error creating supplier:', error);
        return {
            err: -1,
            msg: error.response?.data?.msg || 'Lỗi khi tạo nhà cung cấp',
            data: null
        };
    }
};

// Update supplier
export const updateSupplier = async (supplierId, supplierData) => {
    try {
        const response = await axios.put(`${API_URL}/api/v1/supplier/${supplierId}`, supplierData);
        return response.data;
    } catch (error) {
        console.error('Error updating supplier:', error);
        return {
            err: -1,
            msg: error.response?.data?.msg || 'Lỗi khi cập nhật nhà cung cấp',
            data: null
        };
    }
};

// Delete supplier
export const deleteSupplier = async (supplierId) => {
    try {
        const response = await axios.delete(`${API_URL}/api/v1/supplier/${supplierId}`);
        return response.data;
    } catch (error) {
        console.error('Error deleting supplier:', error);
        return {
            err: -1,
            msg: error.response?.data?.msg || 'Lỗi khi xóa nhà cung cấp',
            data: null
        };
    }
};

// Get supplier user accounts (role = Supplier)
export const getSupplierAccounts = async () => {
    try {
        const response = await axios.get(`${API_URL}/api/v1/supplier/accounts/list`);
        return response.data;
    } catch (error) {
        console.error('Error fetching supplier accounts:', error);
        return {
            err: -1,
            msg: error.response?.data?.msg || 'Lỗi khi tải danh sách tài khoản Supplier',
            data: null
        };
    }
};

