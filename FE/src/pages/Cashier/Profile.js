import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Stack,
  Divider,
} from "@mui/material";
import { toast } from "react-toastify";
import {
  getCurrentUser,
  updateMyProfile,
  changeMyPassword,
} from "../../api/userApi";
import { useAuth } from "../../contexts/AuthContext";
import { ToastNotification, PrimaryButton } from "../../components/common";

const Profile = () => {
  const { user, updateUserInfo } = useAuth();
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    phone: "",
    email: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const loadProfile = async () => {
    setLoadingProfile(true);
    try {
      const res = await getCurrentUser();
      if (res.err === 0 && (res.response || res.data)) {
        const data = res.response || res.data;
        setProfileForm({
          full_name: data.full_name || "",
          phone: data.phone || "",
          email: data.email || "",
        });

        if (data.full_name) {
          updateUserInfo?.({ name: data.full_name });
        }
      } else {
        ToastNotification.error(res.msg || "Không thể tải thông tin hồ sơ.");
      }
    } catch (error) {
      ToastNotification.error("Không thể tải thông tin hồ sơ.");
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleProfileChange = (field) => (event) => {
    setProfileForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handlePasswordChange = (field) => (event) => {
    setPasswordForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    if (!profileForm.full_name?.trim()) {
      ToastNotification.error("Vui lòng nhập họ và tên.");
      return;
    }

    setSavingProfile(true);
    try {
      const res = await updateMyProfile({
        full_name: profileForm.full_name.trim(),
        phone: profileForm.phone?.trim() || "",
      });
      if (res.err === 0) {
        ToastNotification.success("Đã cập nhật hồ sơ.");
        updateUserInfo?.({ name: profileForm.full_name.trim() });
        await loadProfile();
      } else {
        ToastNotification.error(res.msg || "Cập nhật hồ sơ thất bại.");
      }
    } catch (error) {
      ToastNotification.error("Cập nhật hồ sơ thất bại.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    const { current_password, new_password, confirm_password } = passwordForm;

    if (!current_password || !new_password || !confirm_password) {
      ToastNotification.error("Vui lòng điền đầy đủ thông tin mật khẩu.");
      return;
    }

    if (new_password.length < 6) {
      ToastNotification.error("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }

    if (new_password !== confirm_password) {
      ToastNotification.error("Xác nhận mật khẩu không khớp.");
      return;
    }

    if (current_password === new_password) {
      ToastNotification.error("Mật khẩu mới phải khác mật khẩu hiện tại.");
      return;
    }

    setChangingPassword(true);
    try {
      const res = await changeMyPassword({
        current_password,
        new_password,
      });

      if (res.err === 0) {
        ToastNotification.success("Đổi mật khẩu thành công.");
        setPasswordForm({
          current_password: "",
          new_password: "",
          confirm_password: "",
        });
      } else {
        ToastNotification.error(res.msg || "Đổi mật khẩu thất bại.");
      }
    } catch (error) {
      ToastNotification.error("Đổi mật khẩu thất bại.");
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <Box sx={{ px: { xs: 1, md: 3 }, py: 3 }}>
      <Typography variant="h4" fontWeight={700} mb={3}>
        Hồ sơ cá nhân
      </Typography>

      <Stack spacing={3}>
        <Card>
          <CardContent component="form" onSubmit={handleProfileSubmit}>
            <Typography variant="h6" fontWeight={600} mb={1}>
              Thông tin nhân viên
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Cập nhật tên hiển thị và số điện thoại để quản lý liên lạc.
            </Typography>

            <Stack spacing={2}>
              <TextField
                label="Họ và tên"
                value={profileForm.full_name}
                onChange={handleProfileChange("full_name")}
                required
                disabled={loadingProfile || savingProfile}
              />
              <TextField
                label="Email"
                value={profileForm.email}
                disabled
              />
              <TextField
                label="Số điện thoại"
                value={profileForm.phone}
                onChange={handleProfileChange("phone")}
                disabled={loadingProfile || savingProfile}
              />
            </Stack>

            <Box mt={3} display="flex" justifyContent="flex-end">
              <PrimaryButton
                type="submit"
                disabled={savingProfile || loadingProfile}
                loading={savingProfile}
              >
                Lưu thay đổi
              </PrimaryButton>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent component="form" onSubmit={handlePasswordSubmit}>
            <Typography variant="h6" fontWeight={600} mb={1}>
              Đổi mật khẩu
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Giữ an toàn tài khoản bằng cách đổi mật khẩu định kỳ.
            </Typography>

            <Stack spacing={2}>
              <TextField
                type="password"
                label="Mật khẩu hiện tại"
                value={passwordForm.current_password}
                onChange={handlePasswordChange("current_password")}
                disabled={changingPassword}
              />
              <Divider />
              <TextField
                type="password"
                label="Mật khẩu mới"
                value={passwordForm.new_password}
                onChange={handlePasswordChange("new_password")}
                helperText="Tối thiểu 6 ký tự."
                disabled={changingPassword}
              />
              <TextField
                type="password"
                label="Xác nhận mật khẩu mới"
                value={passwordForm.confirm_password}
                onChange={handlePasswordChange("confirm_password")}
                disabled={changingPassword}
              />
            </Stack>

            <Box mt={3} display="flex" justifyContent="flex-end">
              <PrimaryButton
                type="submit"
                variant="outlined"
                disabled={changingPassword}
                loading={changingPassword}
              >
                Đổi mật khẩu
              </PrimaryButton>
            </Box>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
};

export default Profile;

