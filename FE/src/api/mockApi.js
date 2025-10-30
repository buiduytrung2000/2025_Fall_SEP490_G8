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
const mockStaff = [
    { id: 101, name: 'Nguyễn Văn An', phone: '0901234567', role: 'Cashier', shift: 'Sáng' },
    { id: 102, name: 'Trần Thị Bình', phone: '0907654321', role: 'Cashier', shift: 'Tối' },
    { id: 103, name: 'Lê Minh Cường', phone: '0912345678', role: 'Warehouse Staff', shift: 'Hành chính' },
];

const mockSchedules = {
    'Thứ 2': { 
        'Ca Sáng (6h-14h)': { employeeId: 101, status: 'Confirmed' }, 
        'Ca Tối (14h-22h)': { employeeId: 102, status: 'Confirmed' } 
    },
    'Thứ 3': { 
        'Ca Sáng (6h-14h)': { employeeId: 101, status: 'Confirmed' }, 
        'Ca Tối (14h-22h)': { employeeId: 102, status: 'Pending' } 
    },
    'Thứ 4': { 
        'Ca Sáng (6h-14h)': { employeeId: 101, status: 'Confirmed' }, 
        'Ca Tối (14h-22h)': { employeeId: 103, status: 'Confirmed' } 
    },
    'Thứ 5': { 
        'Ca Sáng (6h-14h)': { employeeId: 102, status: 'Confirmed' }, 
        'Ca Tối (14h-22h)': { employeeId: 103, status: 'Confirmed' } 
    },
    'Thứ 6': { 
        'Ca Sáng (6h-14h)': { employeeId: 101, status: 'Confirmed' }, 
        'Ca Tối (14h-22h)': { employeeId: 102, status: 'Confirmed' } 
    },
    'Thứ 7': { 
        'Ca Sáng (6h-14h)': { employeeId: 102, status: 'Confirmed' }, 
        'Ca Tối (14h-22h)': { employeeId: 103, status: 'Pending' } 
    },
    'Chủ Nhật': { 
        'Ca Sáng (6h-14h)': { employeeId: 103, status: 'Confirmed' }, 
        'Ca Tối (14h-22h)': { employeeId: 101, status: 'Confirmed' } 
    },
};

export const getStaff = () => apiCall(mockStaff);
export const getSchedules = () => apiCall(mockSchedules); 
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
const mockRevenue7Days = [
    { name: 'T2', DoanhThu: 4000000 },
    { name: 'T3', DoanhThu: 3000000 },
    { name: 'T4', DoanhThu: 2000000 },
    { name: 'T5', DoanhThu: 2780000 },
    { name: 'T6', DoanhThu: 1890000 },
    { name: 'T7', DoanhThu: 2390000 },
    { name: 'CN', DoanhThu: 3490000 },
];

const mockTopProducts = [
    { id: 1, name: 'Bánh mì sandwich', sold: 120, revenue: 1200000 }, // <-- Sửa tên
    { id: 2, name: 'Sữa tươi không đường', sold: 98, revenue: 343000 },
    { id: 3, name: 'Nước ngọt Coca-Cola', sold: 75, revenue: 375000 },
    { id: 4, name: 'Mì ly Omachi', sold: 50, revenue: 850000 },
    { id: 5, name: 'Bim bim Oishi', sold: 45, revenue: 270000 },
];
const mockKpis = {
    todayRevenue: 5150000,
    todayOrders: 32,
    newCustomers: 5,
};

// --- EXPORT CÁC HÀM MỚI ---
export const getRevenueLast7Days = () => apiCall(mockRevenue7Days);
export const getTopSellingProducts = () => apiCall(mockTopProducts);
export const getManagerKpis = () => apiCall(mockKpis);