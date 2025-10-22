// src/api/mockApi.js
const mockUsers = [
    { id: 1, username: 'admin', password: '123', name: 'Super Admin', role: 'Admin' },
    { id: 2, username: 'manager', password: '123', name: 'Shop Manager A', role: 'Manager' },
    { id: 3, username: 'ceo', password: '123', name: 'Mr. CEO', role: 'CEO' },
    { id: 4, username: 'cashier', password: '123', name: 'Cashier 01', role: 'Cashier' },
    { id: 5, username: 'warehouse', password: '123', name: 'Warehouse Staff', role: 'Warehouse' },
    { id: 6, username: 'supplier', password: '123', name: 'Supplier Coca', role: 'Supplier' },
];

const mockProducts = [
    { id: 1, code: 'CC1', name: 'Coca-Cola', price: 10000, stock: 150 },
    { id: 2, code: 'PS1', name: 'Pepsi', price: 10000, stock: 120 },
    { id: 3, code: 'SN1', name: 'Snack Oishi', price: 5000, stock: 200 },
    { id: 4, code: 'MI1', name: 'Mì Hảo Hảo', price: 3500, stock: 500 },
];

const mockPurchaseOrders = [
    { id: 'PO001', supplier: 'Supplier Coca', date: '2025-10-22', total: 5000000, status: 'Approved' },
    { id: 'PO002', supplier: 'Supplier Oishi', date: '2025-10-23', total: 2000000, status: 'Pending' },
]

// Simulate API call delay
const apiCall = (data) => new Promise(resolve => setTimeout(() => resolve(data), 500));

export const loginApi = (username, password) => {
    const user = mockUsers.find(u => u.username === username && u.password === password);
    if (user) {
        return apiCall({ success: true, user: { name: user.name, role: user.role } });
    }
    return apiCall({ success: false, message: 'Invalid credentials' });
}

export const getUsers = () => apiCall(mockUsers.map(u => ({ id: u.id, name: u.name, role: u.role })));
export const getProducts = () => apiCall(mockProducts);
export const getPurchaseOrders = () => apiCall(mockPurchaseOrders);