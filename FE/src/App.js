// src/App.js
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

// Layout
import MainLayout from "./components/layout/MainLayout";

// Pages
import Login from "./pages/public/Login";
import Unauthorized from "./pages/public/Unauthorized";
import POS from "./pages/Cashier/POS";
import ManagerDashboard from "./pages/Store_Manager/ManagerDashboard";
import ManagerProducts from "./pages/Store_Manager/ProductManagement";
import AdminPermissions from "./pages/Admin/AdminPermissions";
import CEODashboard from "./pages/CEO/CEODashboard";
import InventoryManagement from "./pages/Warehouse/InventoryManagement";
import SupplierPortal from "./pages/Supplier/SupplierPortal";
import StaffManagement from "./pages/Store_Manager/StaffManagement";
import ScheduleManagement from "./pages/Store_Manager/ScheduleManagement";
import ProtectedRoute from "./routes/ProtectedRoutes";
import MySchedule from "./pages/Cashier/MySchedule";
// Component để chuyển hướng người dùng đã đăng nhập
const AuthenticatedRedirect = () => {
  const { user } = useAuth();
  // Chuyển hướng về trang login nếu chưa đăng nhập
  if (!user) return <Navigate to="/login" replace />;
  // Nếu đã đăng nhập thì ở yên trang hiện tại (trong MainLayout)
  // Hoặc có thể chuyển về trang chính của vai trò đó
  return <MainLayout />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          
          {/* Main application layout for other roles */}
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
              path="/manager/dashboard"
              element={
                <ProtectedRoute allowedRoles={["Manager"]}>
                  <ManagerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/products"
              element={
                <ProtectedRoute allowedRoles={["Manager"]}>
                  <ManagerProducts />
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
              path="/ceo/dashboard"
              element={
                <ProtectedRoute allowedRoles={["CEO"]}>
                  <CEODashboard />
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
              path="/my-schedule"
              element={
                <ProtectedRoute allowedRoles={["Cashier", "Warehouse"]}>
                  <MySchedule />
                </ProtectedRoute>
              }
            />

            <Route
              path="/warehouse/inventory"
              element={
                <ProtectedRoute allowedRoles={["Warehouse"]}>
                  <InventoryManagement />
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
          </Route>

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
