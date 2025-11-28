// src/App.js
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Layout
import MainLayout from "./components/layout/MainLayout";

// Pages
import Login from "./pages/public/Login";
import Register from "./pages/public/Register";
import Unauthorized from "./pages/public/Unauthorized";
import POS from "./pages/Cashier/POS";
import ManagerDashboard from "./pages/Store_Manager/ManagerDashboard";
import AdminPermissions from "./pages/Admin/AdminPermissions";
import UserManagement from "./pages/Admin/UserManagement";
import CEODashboard from "./pages/CEO/CEODashboard";
import CEORevenueBoard from "./pages/CEO/CEORevenueBoard";
import CEOOrdersBoard from "./pages/CEO/CEOOrdersBoard";
import InventoryManagement from "./pages/Warehouse/InventoryManagement";
import SupplierPortal from "./pages/Supplier/SupplierPortal";
import SupplierOrderDetail from "./pages/Supplier/SupplierOrderDetail";
import StaffManagement from "./pages/Store_Manager/StaffManagement";
import ScheduleManagement from "./pages/Store_Manager/ScheduleManagement";
import StoreInventory from "./pages/Store_Manager/InventoryManagement";
import PurchaseOrders from "./pages/Store_Manager/PurchaseOrders";
import VoucherManagement from "./pages/Store_Manager/VoucherManagement";
import WarehouseIncomingOrders from "./pages/Warehouse/IncomingOrders";
import WarehouseBranchOrders from "./pages/Warehouse/BranchOrders";
import WarehouseOrderUpdate from "./pages/Warehouse/OrderUpdate";
import WarehouseOrderShipment from "./pages/Warehouse/OrderShipment";
import ProtectedRoute from "./routes/ProtectedRoutes";
import MySchedule from "./pages/Cashier/MySchedule";
import ShiftChangeRequest from "./pages/Cashier/ShiftChangeRequest";
import WarehouseProductManagement from "./pages/Warehouse/ProductManagement";
import InvoicesManagement from "./pages/Warehouse/InvoicesManagement";
import ShiftReports from "./pages/Store_Manager/ShiftReports";
import CashierPaymentHistory from "./pages/Cashier/PaymentHistory";
import ManagerPaymentHistory from "./pages/Store_Manager/PaymentHistory";
import ShiftChangeRequestManagement from "./pages/Store_Manager/ShiftChangeRequestManagement";
import WarehouseInventoryList from "./pages/Warehouse/InventoryList";
import WarehouseInventoryDetail from "./pages/Warehouse/InventoryDetail";
import SupplierManagement from "./pages/Warehouse/SupplierManagement";
import ProductDetail from "./pages/Warehouse/ProductDetail";
import MyShiftReports from "./pages/Cashier/MyShiftReports";
import OrderList from "./pages/Warehouse/Orders/OrderList";
import OrderDetail from "./pages/Warehouse/Orders/OrderDetail";
// Component để chuyển hướng người dùng đã đăng nhập
const AuthenticatedRedirect = () => {
  const { user } = useAuth();
  // Nếu chưa đăng nhập, hiển thị trang login
  if (!user) return <Login />;

  return <MainLayout />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Root route - shows login if not authenticated, otherwise shows main layout */}
          <Route path="/" element={<AuthenticatedRedirect />}>
            <Route
              path="/admin/permissions"
              element={
                <ProtectedRoute allowedRoles={["Admin"]}>
                  <AdminPermissions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute allowedRoles={["Admin"]}>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/dashboard"
              element={
                <ProtectedRoute allowedRoles={["Manager"]}>
                  <ManagerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/inventory"
              element={
                <ProtectedRoute allowedRoles={["Manager"]}>
                  <StoreInventory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/reports/shifts"
              element={
                <ProtectedRoute allowedRoles={["Manager"]}>
                  <ShiftReports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/orders"
              element={
                <ProtectedRoute allowedRoles={["Manager"]}>
                  <PurchaseOrders />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/staff"
              element={
                <ProtectedRoute allowedRoles={["Manager"]}>
                  <StaffManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/schedule"
              element={
                <ProtectedRoute allowedRoles={["Manager"]}>
                  <ScheduleManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/payment-history"
              element={
                <ProtectedRoute allowedRoles={["Manager"]}>
                  <ManagerPaymentHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/shift-change-requests"
              element={
                <ProtectedRoute allowedRoles={["Manager"]}>
                  <ShiftChangeRequestManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/vouchers"
              element={
                <ProtectedRoute allowedRoles={["Manager"]}>
                  <VoucherManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ceo/dashboard"
              element={
                <ProtectedRoute allowedRoles={["CEO"]}>
                  <CEODashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ceo/revenue"
              element={
                <ProtectedRoute allowedRoles={["CEO"]}>
                  <CEORevenueBoard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ceo/orders"
              element={
                <ProtectedRoute allowedRoles={["CEO"]}>
                  <CEOOrdersBoard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/cashier/pos"
              element={
                <ProtectedRoute allowedRoles={["Cashier"]}>
                  <POS />
                </ProtectedRoute>
              }
            />

            <Route
              path="/cashier/payment-history"
              element={
                <ProtectedRoute allowedRoles={["Cashier"]}>
                  <CashierPaymentHistory />
                </ProtectedRoute>
              }
            />

            <Route
              path="/my-schedule"
              element={
                <ProtectedRoute allowedRoles={["Cashier", "Warehouse"]}>
                  <MySchedule />
                </ProtectedRoute>
              }
            />
            <Route
              path="/shift-change-request"
              element={
                <ProtectedRoute allowedRoles={["Cashier"]}>
                  <ShiftChangeRequest />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cashier/shift-reports"
              element={
                <ProtectedRoute allowedRoles={["Cashier"]}>
                  <MyShiftReports />
                </ProtectedRoute>
              }
            />

            {/* <Route
              path="/warehouse/inventory"
              element={
                <ProtectedRoute allowedRoles={["Warehouse"]}>
                  <InventoryManagement />
                </ProtectedRoute>
              }
            /> */}
            <Route
              path="/warehouse/products"
              element={
                <ProtectedRoute allowedRoles={["Warehouse", "Manager", "CEO"]}>
                  <WarehouseProductManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/warehouse/products/:productId"
              element={
                <ProtectedRoute allowedRoles={["Warehouse", "Manager", "CEO"]}>
                  <ProductDetail />
                </ProtectedRoute>
              }
            />

            {/* Warehouse → Supplier Orders */}
            <Route
              path="/warehouse/orders"
              element={
                <ProtectedRoute allowedRoles={["Warehouse", "CEO"]}>
                  <OrderList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/warehouse/orders/:orderId"
              element={
                <ProtectedRoute allowedRoles={["Warehouse", "CEO"]}>
                  <OrderDetail />
                </ProtectedRoute>
              }
            />


            <Route
              path="/warehouse/inventory"
              element={
                <ProtectedRoute allowedRoles={["Warehouse", "CEO"]}>
                  <WarehouseInventoryList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/warehouse/inventory/:id"
              element={
                <ProtectedRoute allowedRoles={["Warehouse", "CEO"]}>
                  <WarehouseInventoryDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/warehouse/suppliers"
              element={
                <ProtectedRoute allowedRoles={["Warehouse"]}>
                  <SupplierManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/warehouse/invoices"
              element={
                <ProtectedRoute allowedRoles={["Warehouse"]}>
                  <InvoicesManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/warehouse/incoming-orders"
              element={
                <ProtectedRoute allowedRoles={["Warehouse"]}>
                  <WarehouseIncomingOrders />
                </ProtectedRoute>
              }
            />
            <Route
              path="/warehouse/branch-orders"
              element={
                <ProtectedRoute allowedRoles={["Warehouse"]}>
                  <WarehouseBranchOrders />
                </ProtectedRoute>
              }
            />
            <Route
              path="/warehouse/branch-orders/:id"
              element={
                <ProtectedRoute allowedRoles={["Warehouse"]}>
                  <WarehouseOrderUpdate />
                </ProtectedRoute>
              }
            />
            <Route
              path="/warehouse/order-shipment/:id"
              element={
                <ProtectedRoute allowedRoles={["Warehouse"]}>
                  <WarehouseOrderShipment />
                </ProtectedRoute>
              }
            />
            <Route
              path="/supplier/portal"
              element={
                <ProtectedRoute allowedRoles={["Supplier"]}>
                  <SupplierPortal />
                </ProtectedRoute>
              }
            />
            <Route
              path="/supplier/orders/:orderId"
              element={
                <ProtectedRoute allowedRoles={["Supplier"]}>
                  <SupplierOrderDetail />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        <ToastContainer position="top-right" autoClose={2500} hideProgressBar={false} newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="colored" />
      </Router>
    </AuthProvider>
  );
}

export default App;
