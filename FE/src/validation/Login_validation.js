import * as Yup from 'yup';

export const loginValidationSchema = Yup.object({
    email: Yup.string()
        .email('Email không hợp lệ')
        .required('Bắt buộc'),
    password: Yup.string()
        .min(3, 'Tối thiểu 3 ký tự')
        .required('Bắt buộc')
});


