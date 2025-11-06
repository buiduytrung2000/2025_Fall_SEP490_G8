// src/pages/public/Register.js
import React, { useState } from "react";
import { Formik, Form, Field } from "formik";
import { registerValidationSchema } from "../../validation/Login_validation";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  Stack,
  Link,
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from "@mui/material";
import { Lock, AccountCircle, Visibility, VisibilityOff, Store, LockOutlined } from "@mui/icons-material";
import { toast } from "react-toastify";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const Register = () => {
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const roleToPath = {
    Admin: "/admin/permissions",
    Manager: "/manager/dashboard",
    CEO: "/ceo/dashboard",
    Cashier: "/my-schedule",
    Warehouse: "/warehouse/inventory",
    Supplier: "/supplier/portal",
  };

  const roles = [
    { value: 'CEO', label: 'CEO' },
    { value: 'Store_Manager', label: 'Store Manager' },
    { value: 'Cashier', label: 'Cashier' },
    { value: 'Warehouse', label: 'Warehouse' },
    { value: 'Supplier', label: 'Supplier' }
  ];

  const handleSubmit = async (values, { setSubmitting }) => {
    setError("");
    
    const userData = {
      username: values.username,
      password: values.password,
      role: values.role,
      email: values.email, // Email is now required
    };

    // Add optional fields
    if (values.store_id) userData.store_id = parseInt(values.store_id);

    const response = await register(userData);
    if (response.success) {
      toast.success(response.message || "Đăng ký thành công!");
      navigate(roleToPath[response.user.role] || "/");
    } else {
      const msg = response.message || "Đăng ký thất bại";
      setError(msg);
      toast.error(msg);
    }
    setSubmitting(false);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        minWidth: "100vw",
        background: "#f7f8fc",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2
      }}
    >
      <Card
        sx={{
          px: { xs: 2, sm: 4 },
          py: { xs: 2, sm: 4 },
          width: "100%",
          maxWidth: 520,
          borderRadius: 3,
          boxShadow: 6,
          bgcolor: "#fff"
        }}
      >
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ position: 'relative', background: '#e8e9ff', borderRadius: 2, p: 2.5, pr: 3, mb: 4, overflow: 'visible', textAlign: 'right' }}>
            <Typography variant="h6" fontWeight={700} color="#3a57e8" mb={0.5}>
              Create Account
            </Typography>
            <Box sx={{ position: 'absolute', left: 20, bottom: -34, width: 84, height: 84, borderRadius: '50%', bgcolor: '#fff', boxShadow: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Store sx={{ fontSize: 36, color: '#3a57e8' }} />
            </Box>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Formik
            initialValues={{ 
              username: "", 
              password: "", 
              confirmPassword: "",
              role: "",
              email: "",
              store_id: ""
            }}
            validationSchema={registerValidationSchema}
            onSubmit={handleSubmit}
          >
            {({ errors, touched, isSubmitting, handleChange, values, setFieldValue }) => (
              <Form autoComplete="off">
                <TextField
                  fullWidth
                  name="username"
                  label="Username"
                  value={values.username}
                  onChange={handleChange}
                  margin="normal"
                  autoFocus
                  placeholder="Enter username"
                  error={touched.username && Boolean(errors.username)}
                  helperText={touched.username && errors.username}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start"><AccountCircle /></InputAdornment>
                    )
                  }}
                />

                <FormControl fullWidth margin="normal" error={touched.role && Boolean(errors.role)}>
                  <InputLabel>Vai trò (Role)</InputLabel>
                  <Select
                    name="role"
                    value={values.role}
                    onChange={handleChange}
                    label="Vai trò (Role)"
                  >
                    {roles.map((role) => (
                      <MenuItem key={role.value} value={role.value}>
                        {role.label}
                      </MenuItem>
                    ))}
                  </Select>
                  {touched.role && errors.role && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                      {errors.role}
                    </Typography>
                  )}
                </FormControl>

                <TextField
                  fullWidth
                  name="password"
                  label="Mật khẩu"
                  type={showPass ? "text" : "password"}
                  value={values.password}
                  onChange={handleChange}
                  margin="normal"
                  placeholder="Enter Password"
                  error={touched.password && Boolean(errors.password)}
                  helperText={touched.password && errors.password}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start"><Lock /></InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton aria-label="toggle password visibility" onClick={() => setShowPass(v => !v)} edge="end" size="small">
                          {showPass ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />

                <TextField
                  fullWidth
                  name="confirmPassword"
                  label="Xác nhận mật khẩu"
                  type={showConfirmPass ? "text" : "password"}
                  value={values.confirmPassword}
                  onChange={handleChange}
                  margin="normal"
                  placeholder="Confirm Password"
                  error={touched.confirmPassword && Boolean(errors.confirmPassword)}
                  helperText={touched.confirmPassword && errors.confirmPassword}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start"><LockOutlined /></InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton aria-label="toggle password visibility" onClick={() => setShowConfirmPass(v => !v)} edge="end" size="small">
                          {showConfirmPass ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />

                <TextField
                  fullWidth
                  name="email"
                  label="Email"
                  type="email"
                  value={values.email}
                  onChange={handleChange}
                  margin="normal"
                  placeholder="Enter email"
                  error={touched.email && Boolean(errors.email)}
                  helperText={touched.email && errors.email}
                />

                <TextField
                  fullWidth
                  name="store_id"
                  label="Store ID (Tùy chọn)"
                  type="number"
                  value={values.store_id}
                  onChange={handleChange}
                  margin="normal"
                  placeholder="Enter store ID (optional)"
                  error={touched.store_id && Boolean(errors.store_id)}
                  helperText={touched.store_id && errors.store_id}
                />

                <Button
                  fullWidth
                  type="submit"
                  size="large"
                  variant="contained"
                  disabled={isSubmitting}
                  sx={{ mt: 1.5, borderRadius: 2, fontWeight: 700, boxShadow: 2, textTransform: 'none' }}
                >
                  {isSubmitting ? "Đang đăng ký..." : "Register"}
                </Button>
              </Form>
            )}
          </Formik>

          <Box mt={3.5} textAlign="center">
            <Typography variant="body2" color="text.secondary">
              Đã có tài khoản? <Link component="button" onClick={() => navigate('/login')} color="primary">Đăng nhập ngay</Link>
            </Typography>
            <Typography variant="caption" color="GrayText" display="block" mt={2.5}>
              © 2025 CCMS
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Register;

