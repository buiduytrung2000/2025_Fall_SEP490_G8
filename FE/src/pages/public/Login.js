// src/pages/public/Login.js
import React, { useState } from "react";
import { Formik, Form, Field } from "formik";
import { loginValidationSchema } from "../../validation/Login_validation";
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
  FormControlLabel,
  Checkbox,
  Stack,
  Link
} from "@mui/material";
import { Lock, AccountCircle, Visibility, VisibilityOff, Store, Facebook, Twitter, Google, LockOutlined } from "@mui/icons-material";
import { toast } from "react-toastify";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const Login = () => {
  
  
  const [showPass, setShowPass] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const roleToPath = {
    Admin: "/admin/permissions",
    Manager: "/manager/dashboard",
    CEO: "/ceo/dashboard",
    Cashier: "/my-schedule",
    Warehouse: "/warehouse/inventory",
    Supplier: "/supplier/portal",
  };

  const validationSchema = loginValidationSchema;

  const handleSubmit = async (values, { setSubmitting }) => {
    
    const response = await login(values.email, values.password);
    if (response.success) {
      toast.success("Đăng nhập thành công");
      navigate(roleToPath[response.user.role] || "/");
    } else {
      const msg = response.message || "Đăng nhập thất bại";
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
              Welcome Back !
            </Typography>
            <Box sx={{ position: 'absolute', left: 20, bottom: -34, width: 84, height: 84, borderRadius: '50%', bgcolor: '#fff', boxShadow: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Store sx={{ fontSize: 36, color: '#3a57e8' }} />
            </Box>
          </Box>



          <Formik
            initialValues={{ email: "", password: "" }}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ errors, touched, isSubmitting, handleChange, values, setFieldValue }) => (
              <Form autoComplete="off">
                <TextField
                  fullWidth
                  name="email"
                  label="Email"
                  type="email"
                  value={values.email}
                  onChange={handleChange}
                  margin="normal"
                  autoFocus
                  placeholder="Enter email"
                  error={touched.email && Boolean(errors.email)}
                  helperText={touched.email && errors.email}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start"><AccountCircle /></InputAdornment>
                    )
                  }}
                />

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

                <FormControlLabel sx={{ mt: 0.5 }} control={<Checkbox size="small" color="primary" onChange={(e) => setFieldValue('rememberMe', e.target.checked)} />} label={<Typography variant="body2">Remember me</Typography>} />

                <Button
                  fullWidth
                  type="submit"
                  size="large"
                  variant="contained"
                  disabled={isSubmitting}
                  sx={{ mt: 1.5, borderRadius: 2, fontWeight: 700, boxShadow: 2, textTransform: 'none' }}
                >
                  {isSubmitting ? "Đang đăng nhập..." : "Log In"}
                </Button>

                <Box textAlign="center" mt={3}>
                  <Typography variant="subtitle2" color="text.secondary">Sign in with</Typography>
                  <Stack direction="row" spacing={2} justifyContent="center" mt={1.2}>
                    <IconButton size="small" sx={{ bgcolor: '#eef2ff', color: '#3b5998' }}><Facebook fontSize="small" /></IconButton>
                    <IconButton size="small" sx={{ bgcolor: '#eef2ff', color: '#1DA1F2' }}><Twitter fontSize="small" /></IconButton>
                    <IconButton size="small" sx={{ bgcolor: '#eef2ff', color: '#DB4437' }}><Google fontSize="small" /></IconButton>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" mt={2}>
                    <LockOutlined sx={{ fontSize: 16, color: 'text.disabled' }} />
                    <Link component="button" variant="body2" color="primary">Forgot your password?</Link>
                  </Stack>
                </Box>
              </Form>
            )}
          </Formik>

          <Box mt={3.5} textAlign="center">
            <Typography variant="body2" color="text.secondary">
              Don't have an account ? <Link component="button" onClick={() => navigate('/register')} color="primary">Signup now</Link>
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
export default Login;
