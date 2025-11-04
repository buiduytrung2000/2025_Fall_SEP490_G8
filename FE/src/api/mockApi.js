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
// Warehouse inventory mock (with category/unit/minStock and storage area)
const mockWarehouseInventory = [
    { sku: 'SP01', name: 'Nước lọc', category: 'Đồ uống', unit: 'Thùng', stock: 15, minStock: 30, area: 'Kho chính' },
    { sku: 'SP02', name: 'Mỳ tôm', category: 'Thực phẩm khô', unit: 'Thùng', stock: 40, minStock: 30, area: 'Kho đồ khô' },
    { sku: 'SP03', name: 'Sữa tươi', category: 'Sữa', unit: 'Thùng', stock: 0, minStock: 20, area: 'Kho lạnh' },
    { sku: 'SP04', name: 'Bia 333', category: 'Đồ uống', unit: 'Thùng', stock: 120, minStock: 50, area: 'Kho chính' },
    { sku: 'SP05', name: 'Kem', category: 'Đông lạnh', unit: 'Thùng', stock: 22, minStock: 30, area: 'Kho lạnh' },
];
// Store inventory mock
const mockStoreInventory = [
    { sku: 'CC-001', name: 'Coca-Cola lon 330ml', category: 'Nước ngọt', unit: 'Lon', price: 10000, stock: 48, minStock: 30 },
    { sku: 'PS-001', name: 'Pepsi lon 330ml', category: 'Nước ngọt', unit: 'Lon', price: 10000, stock: 22, minStock: 30 },
    { sku: 'OM-001', name: 'Mì ly Omachi', category: 'Mì - Phở', unit: 'Ly', price: 12000, stock: 120, minStock: 50 },
    { sku: 'BM-001', name: 'Bánh mì sandwich', category: 'Bánh - Snack', unit: 'Gói', price: 18000, stock: 12, minStock: 20 },
];

// Warehouse invoices (phiếu nhập/nội bộ) for approval
let mockWarehouseInvoices = [
    { id: 'INV-001', supplier: 'Coca-Cola', date: '2025-11-01', total: 7250000, status: 'Pending' },
    { id: 'INV-002', supplier: 'Oishi', date: '2025-11-02', total: 3150000, status: 'Approved' },
    { id: 'INV-003', supplier: 'Pepsi', date: '2025-11-03', total: 4890000, status: 'Pending' },
];

// --- Orders between Store and Warehouse/Supplier ---
let mockStoreOrders = [
    // type: 'ToWarehouse' | 'ToSupplier'
    { id: 'SO-001', type: 'ToWarehouse', target: 'Main Warehouse', createdBy: 'Shop Manager A', branch: 'CN1', date: '2025-11-02', items: 3, total: 2500000, status: 'Pending', perishable: false },
    { id: 'SO-002', type: 'ToSupplier', target: 'Coca-Cola', createdBy: 'Shop Manager A', branch: 'CN2', date: '2025-11-03', items: 2, total: 1500000, status: 'Approved', perishable: true, supplier: 'Coca-Cola' },
];

// Orders forwarded to suppliers by warehouse (for perishables)
let mockSupplierOrders = [
    // { id, fromOrderId, store: 'Store A', supplier, date, total, status }
];
// order line items mock
const mockOrderLines = {
    'SO-001': [
        { sku: 'SP01', name: 'Nước lọc', unit: 'Thùng', ordered: 10, actual: 10, exportPrice: 850000, amount: 8500000, status: 'Hoàn tất' },
        { sku: 'SP02', name: 'Mỳ tôm', unit: 'Thùng', ordered: 15, actual: 14, exportPrice: 1200000, amount: 18000000, status: 'Đang kiểm tra' },
        { sku: 'SP03', name: 'Sữa', unit: 'Thùng', ordered: 20, actual: 0, exportPrice: 950000, amount: 19000000, status: 'Chờ kiểm tra' },
    ],
};

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
// New APIs for Store Inventory
export const getStoreInventory = () => apiCall(mockStoreInventory);
// Warehouse inventory APIs
export const getWarehouseInventory = () => apiCall(mockWarehouseInventory);
export const getWarehouseCapacity = () => apiCall({
    totalProducts: mockWarehouseInventory.length,
    lowStockCount: mockWarehouseInventory.filter(i => i.stock > 0 && i.stock < i.minStock).length,
    outOfStockCount: mockWarehouseInventory.filter(i => i.stock === 0).length,
    capacity: { main: 75, dry: 60, cold: 85 }
});

// --- Warehouse invoice APIs ---
export const getWarehouseInvoices = () => apiCall([...mockWarehouseInvoices]);
export const approveWarehouseInvoice = (id) => {
    mockWarehouseInvoices = mockWarehouseInvoices.map(inv => inv.id === id ? { ...inv, status: 'Approved' } : inv);
    return apiCall({ success: true });
}
export const rejectWarehouseInvoice = (id) => {
    mockWarehouseInvoices = mockWarehouseInvoices.map(inv => inv.id === id ? { ...inv, status: 'Rejected' } : inv);
    return apiCall({ success: true });
}

// --- Store Orders APIs ---
export const getStoreOrders = () => apiCall([...mockStoreOrders]);
export const createStoreOrder = (order) => {
    const id = `SO-${String(mockStoreOrders.length + 1).padStart(3,'0')}`;
    const newOrder = { id, branch: 'CN1', ...order, status: 'Pending' };
    mockStoreOrders = [newOrder, ...mockStoreOrders];
    return apiCall({ success: true, order: newOrder });
};
export const approveStoreOrder = (id) => {
    mockStoreOrders = mockStoreOrders.map(o => o.id === id ? { ...o, status: 'Approved' } : o);
    return apiCall({ success: true });
};
export const rejectStoreOrder = (id) => {
    mockStoreOrders = mockStoreOrders.map(o => o.id === id ? { ...o, status: 'Rejected' } : o);
    return apiCall({ success: true });
};

// Warehouse forwards perishable order to supplier
export const forwardStoreOrderToSupplier = (id, supplierName = 'Fresh Supplier') => {
    const order = mockStoreOrders.find(o => o.id === id);
    if (!order) return apiCall({ success: false });
    const updated = { ...order, status: 'ForwardedToSupplier', supplier: supplierName };
    mockStoreOrders = mockStoreOrders.map(o => o.id === id ? updated : o);
    const supplierOrder = {
        id: `SUP-${String(mockSupplierOrders.length + 1).padStart(3,'0')}`,
        fromOrderId: id,
        store: order.createdBy,
        supplier: supplierName,
        date: order.date,
        total: order.total,
        status: 'Pending'
    };
    mockSupplierOrders = [supplierOrder, ...mockSupplierOrders];
    return apiCall({ success: true });
};

export const getSupplierOrders = () => apiCall([...mockSupplierOrders]);
export const supplierShipOrder = (supplierOrderId) => {
    mockSupplierOrders = mockSupplierOrders.map(so => so.id === supplierOrderId ? { ...so, status: 'ShippedToStore' } : so);
    // reflect to store order
    const sup = mockSupplierOrders.find(so => so.id === supplierOrderId);
    if (sup) {
        mockStoreOrders = mockStoreOrders.map(o => o.id === sup.fromOrderId ? { ...o, status: 'SupplierShipped' } : o);
    }
    return apiCall({ success: true });
};

// Approve at warehouse and send to supplier (new flow)
export const approveAndSendToSupplier = (id, supplierName = 'Default Supplier') => {
    const order = mockStoreOrders.find(o => o.id === id);
    if (!order) return apiCall({ success: false });
    mockStoreOrders = mockStoreOrders.map(o => o.id === id ? { ...o, status: 'SentToSupplier', supplier: supplierName } : o);
    const supplierOrder = {
        id: `SUP-${String(mockSupplierOrders.length + 1).padStart(3,'0')}`,
        fromOrderId: id,
        store: order.createdBy,
        supplier: supplierName,
        date: order.date,
        total: order.total,
        status: 'Pending'
    };
    mockSupplierOrders = [supplierOrder, ...mockSupplierOrders];
    return apiCall({ success: true });
};

export const supplierApproveOrder = (supplierOrderId) => {
    mockSupplierOrders = mockSupplierOrders.map(so => so.id === supplierOrderId ? { ...so, status: 'Approved' } : so);
    return apiCall({ success: true });
};

// Generic status update for store orders
export const updateStoreOrderStatus = (id, status) => {
    mockStoreOrders = mockStoreOrders.map(o => o.id === id ? { ...o, status } : o);
    return apiCall({ success: true });
};

export const getStoreOrderById = (id) => {
    const order = mockStoreOrders.find(o => o.id === id);
    const lines = mockOrderLines[id] || [];
    return apiCall({ order, lines });
};

// -------- Shift Reports (Store) --------
const mockShiftSummaries = [
    { id: 'S-2025-11-03-AM', date: '2025-11-03', shift: 'Sáng', cashier: 'Cashier 01', orders: 48, revenue: 5150000, refunds: 1, missing: 0 },
    { id: 'S-2025-11-03-PM', date: '2025-11-03', shift: 'Tối', cashier: 'Trần Thị Bình', orders: 37, revenue: 3920000, refunds: 0, missing: 1 },
    { id: 'S-2025-11-04-AM', date: '2025-11-04', shift: 'Sáng', cashier: 'Nguyễn Văn An', orders: 52, revenue: 6010000, refunds: 2, missing: 0 },
];
export const getShiftSummaries = (from, to) => {
    // ignore filters for mock
    return apiCall(mockShiftSummaries);
};
export const getShiftKpis = () => apiCall({
    revenueToday: 9070000,
    ordersToday: 85,
    avgOrderValue: 106706,
    refundRate: 0.9,
});