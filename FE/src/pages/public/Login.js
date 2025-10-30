// src/pages/public/Login.js
import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton
} from "@mui/material";
import { Lock, AccountCircle, Visibility, VisibilityOff, Store } from "@mui/icons-material";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
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

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    const response = await login(username, password);
    if (response.success) {
      navigate(roleToPath[response.user.role] || "/");
    } else {
      setError(response.message);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        minWidth: "100vw",
        background: "linear-gradient(135deg, #74ebd5 0%, #ACB6E5 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Card
        sx={{
          px: { xs: 2, sm: 4 },
          py: { xs: 2, sm: 4 },
          width: "100%",
          maxWidth: 390,
          borderRadius: 5,
          border: 'none',
          boxShadow: 9,
          bgcolor: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(4px)",
        }}
      >
        <CardContent sx={{ p: 0 }}>
          <Box display="flex" justifyContent="center" alignItems="center" mb={1}>
            <Store sx={{ fontSize: 54, color: "primary.main", mr: 1 }} />
          </Box>

          <Typography variant="h5" fontWeight={700} color="primary.main" align="center" mb={0.5}>
            Đăng nhập hệ thống CCMS
          </Typography>
          <Typography variant="body2" color="GrayText" align="center" mb={2}>
            Quản lý bán hàng & lịch làm việc
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <form onSubmit={handleLogin} autoComplete="off">
            <TextField
              fullWidth
              label="Tên đăng nhập"
              value={username}
              onChange={e => setUsername(e.target.value)}
              margin="normal"
              required
              autoFocus
              placeholder="Ví dụ: admin, manager, cashier ..."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start"><AccountCircle /></InputAdornment>
                )
              }}
            />

            <TextField
              fullWidth
              label="Mật khẩu"
              type={showPass ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              margin="normal"
              required
              placeholder="VD: 123"
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

            <Button
              fullWidth
              type="submit"
              size="large"
              variant="contained"
              sx={{ mt: 2, borderRadius: 3, fontWeight: 700, boxShadow: 2 }}
            >
              Đăng nhập
            </Button>
          </form>

          <Box mt={3} textAlign="center">
            <Alert severity="info" variant="outlined" sx={{ fontSize: 13, px: 2, py: 0.5, mb: 1 }}>
              <strong>Tài khoản demo:</strong> admin, manager, cashier ... <br />Mật khẩu: <b>123</b>
            </Alert>
            <Typography variant="caption" color="GrayText">
              © 2025 CCMS
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
export default Login;
