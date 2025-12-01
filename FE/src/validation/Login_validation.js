import * as Yup from 'yup';

// Custom email validation function - returns error message string or true
const validateEmail = (value) => {
    if (!value) return true; // Let required handle empty values
    
    // Check for multiple @ symbols
    const atCount = (value.match(/@/g) || []).length;
    if (atCount !== 1) {
        return 'Email không hợp lệ: Phải có đúng một ký tự @';
    }
    
    // Split email into local and domain parts
    const parts = value.split('@');
    if (parts.length !== 2) {
        return 'Email không hợp lệ: Sai định dạng';
    }
    
    const [localPart, domainPart] = parts;
    
    // Check local part
    if (!localPart || localPart.length === 0) {
        return 'Email không hợp lệ: Thiếu phần tên người dùng';
    }
    
    // Check if local part starts or ends with dot
    if (localPart.startsWith('.') || localPart.endsWith('.')) {
        return 'Email không hợp lệ: Phần tên người dùng không được bắt đầu hoặc kết thúc bằng dấu chấm';
    }
    
    // Check for consecutive dots in local part
    if (localPart.includes('..')) {
        return 'Email không hợp lệ: Không được có dấu chấm liên tiếp';
    }
    
    // Check for invalid characters in local part (allow letters, numbers, dots, hyphens, underscores, plus)
    if (!/^[a-zA-Z0-9._+-]+$/.test(localPart)) {
        return 'Email không hợp lệ: Phần tên người dùng chứa ký tự không hợp lệ';
    }
    
    // Check domain part
    if (!domainPart || domainPart.length === 0) {
        return 'Email không hợp lệ: Thiếu phần domain';
    }
    
    // Check if domain starts or ends with dot or hyphen
    if (domainPart.startsWith('.') || domainPart.startsWith('-') || 
        domainPart.endsWith('.') || domainPart.endsWith('-')) {
        return 'Email không hợp lệ: Domain không được bắt đầu hoặc kết thúc bằng dấu chấm hoặc gạch ngang';
    }
    
    // Check for consecutive dots in domain
    if (domainPart.includes('..')) {
        return 'Email không hợp lệ: Domain không được có dấu chấm liên tiếp';
    }
    
    // Check if domain has TLD (must have at least one dot)
    if (!domainPart.includes('.')) {
        return 'Email không hợp lệ: Domain phải có phần mở rộng (ví dụ: .com, .org)';
    }
    
    // Check TLD length (should be at least 2 characters)
    const tld = domainPart.split('.').pop();
    if (!tld || tld.length < 2) {
        return 'Email không hợp lệ: Phần mở rộng domain không hợp lệ';
    }
    
    // Check for HTML entities (like &#12354;)
    if (/&#\d+;/.test(value)) {
        return 'Email không hợp lệ: Không được chứa HTML entities';
    }
    
    // Check for spaces or special characters that shouldn't be in email
    if (/\s/.test(value) || /[<>()]/.test(value)) {
        return 'Email không hợp lệ: Không được chứa khoảng trắng hoặc ký tự đặc biệt';
    }
    
    // Validate domain part characters (letters, numbers, dots, hyphens only)
    if (!/^[a-zA-Z0-9.-]+$/.test(domainPart)) {
        return 'Email không hợp lệ: Domain chứa ký tự không hợp lệ';
    }
    
    return true;
};

export const loginValidationSchema = Yup.object({
    email: Yup.string()
        .required('Email là bắt buộc')
        .test('custom-email', function(value) {
            const result = validateEmail(value);
            if (result === true) return true;
            return this.createError({ message: result });
        })
        .email('Email không hợp lệ'),
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


