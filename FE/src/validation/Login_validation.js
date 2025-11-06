import * as Yup from 'yup';

export const loginValidationSchema = Yup.object({
    email: Yup.string()
        .email('Email không hợp lệ')
        .required('Email là bắt buộc'),
    password: Yup.string()
        .min(3, 'Mật khẩu phải có ít nhất 3 ký tự')
        .required('Mật khẩu là bắt buộc')
});

export const registerValidationSchema = Yup.object({
    username: Yup.string()
        .min(3, 'Username phải có ít nhất 3 ký tự')
        .required('Username là bắt buộc'),
    password: Yup.string()
        .min(3, 'Mật khẩu phải có ít nhất 3 ký tự')
        .required('Mật khẩu là bắt buộc'),
    confirmPassword: Yup.string()
        .oneOf([Yup.ref('password'), null], 'Mật khẩu xác nhận không khớp')
        .required('Xác nhận mật khẩu là bắt buộc'),
    role: Yup.string()
        .oneOf(['CEO', 'Store_Manager', 'Cashier', 'Warehouse', 'Supplier'], 'Vai trò không hợp lệ')
        .required('Vai trò là bắt buộc'),
    email: Yup.string()
        .email('Email không hợp lệ')
        .required('Email là bắt buộc'),
    store_id: Yup.number()
        .positive('Store ID phải là số dương')
        .integer('Store ID phải là số nguyên')
});


