// src/pages/public/Login.js
import React, { useState } from "react";
import { Formik, Form } from "formik";
import { loginValidationSchema } from "../../validation/Login_validation";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Typography,
  InputAdornment,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { PrimaryButton, ActionButton, Icon } from "../../components/common";
import { ToastNotification } from "../../components/common";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const REMEMBER_ME_KEY = "rememberedEmail";

const Login = () => {
  const [showPass, setShowPass] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Load remembered email from localStorage
  const getRememberedEmail = () => {
    try {
      return localStorage.getItem(REMEMBER_ME_KEY) || "";
    } catch {
      return "";
    }
  };

  // Save email to localStorage
  const saveRememberedEmail = (email) => {
    try {
      if (email) {
        localStorage.setItem(REMEMBER_ME_KEY, email);
      } else {
        localStorage.removeItem(REMEMBER_ME_KEY);
      }
    } catch (error) {
      console.error("Error saving remembered email:", error);
    }
  };

  const roleToPath = {
    Admin: "/admin/permissions",
    Manager: "/manager/dashboard",
    CEO: "/ceo/dashboard",
    Cashier: "/cashier/pos",
    Warehouse: "/warehouse/inventory",
    Supplier: "/supplier/portal",
  };

  const validationSchema = loginValidationSchema;

  const handleSubmit = async (values, { setSubmitting }) => {
    const response = await login(values.email, values.password);
    if (response.success) {
      // Save email if rememberMe is checked
      if (values.rememberMe) {
        saveRememberedEmail(values.email);
      } else {
        // Remove saved email if rememberMe is unchecked
        saveRememberedEmail("");
      }
      ToastNotification.success("Đăng nhập thành công");
      navigate(roleToPath[response.user.role] || "/");
    } else {
      const msg = response.message || "Đăng nhập thất bại";
      ToastNotification.error(msg);
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
        p: 2,
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
          bgcolor: "#fff",
        }}
      >
        <CardContent sx={{ p: 0 }}>
          <Box
            sx={{
              position: "relative",
              background: "#e8e9ff",
              borderRadius: 2,
              p: 2.5,
              pr: 3,
              mb: 4,
              overflow: "visible",
              textAlign: "right",
            }}
          >
            <Typography variant="h6" fontWeight={700} color="#3a57e8" mb={0.5}>
              Chào mừng trở lại !
            </Typography>
            <Box
              sx={{
                position: "absolute",
                left: 20,
                bottom: -34,
                width: 84,
                height: 84,
                borderRadius: "50%",
                bgcolor: "#fff",
                boxShadow: 3,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="Store" sx={{ fontSize: 36, color: "#3a57e8" }} />
            </Box>
          </Box>

          <Formik
            initialValues={{ 
              email: getRememberedEmail(), 
              password: "",
              rememberMe: !!getRememberedEmail()
            }}
            validationSchema={validationSchema}
            validateOnChange={true}
            validateOnBlur={true}
            onSubmit={handleSubmit}
          >
            {({
              errors,
              touched,
              isSubmitting,
              handleChange,
              handleBlur,
              values,
              setFieldValue,
            }) => (
              <Form autoComplete="off">
                <TextField
                  fullWidth
                  name="email"
                  label="Email"
                  type="email"
                  value={values.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  margin="normal"
                  autoFocus
                  placeholder="Nhập email của bạn "
                  error={(touched.email || values.email) && Boolean(errors.email)}
                  helperText={(touched.email || values.email) && errors.email}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Icon name="AccountCircle" />
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  fullWidth
                  name="password"
                  label="Mật khẩu"
                  type={showPass ? "text" : "password"}
                  value={values.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  margin="normal"
                  placeholder="Nhập mật khẩu của bạn"
                  error={(touched.password || values.password) && Boolean(errors.password)}
                  helperText={(touched.password || values.password) && errors.password}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Icon name="Lock" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <ActionButton
                          icon={<Icon name={showPass ? "VisibilityOff" : "Visibility"} />}
                          onClick={() => setShowPass((v) => !v)}
                          size="small"
                          sx={{ mr: 1 }}
                        />
                      </InputAdornment>
                    ),
                  }}
                />

                <FormControlLabel
                  sx={{ mt: 0.5 }}
                  control={
                    <Checkbox
                      size="small"
                      color="primary"
                      checked={values.rememberMe || false}
                      onChange={(e) =>
                        setFieldValue("rememberMe", e.target.checked)
                      }
                    />
                  }
                  label={
                    <Typography variant="body2">Ghi nhớ đăng nhập</Typography>
                  }
                />

                <PrimaryButton
                  fullWidth
                  type="submit"
                  size="large"
                  disabled={isSubmitting}
                  sx={{
                    mt: 1.5,
                    borderRadius: 2,
                    fontWeight: 700,
                    boxShadow: 2,
                    textTransform: "none",
                  }}
                >
                  {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
                </PrimaryButton>
              </Form>
            )}
          </Formik>

          <Box mt={3.5} textAlign="center">
            <Typography
              variant="caption"
              color="GrayText"
              display="block"
              mt={2.5}
            >
              © 2025 CCMS
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
export default Login;
