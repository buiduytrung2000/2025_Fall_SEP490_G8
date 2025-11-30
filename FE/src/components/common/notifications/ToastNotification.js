import { toast } from 'react-toastify';

/**
 * ToastNotification - Wrapper đồng bộ cho toast notifications
 * Đảm bảo tất cả thông báo có style và behavior nhất quán
 */
class ToastNotification {
    /**
     * Hiển thị thông báo thành công
     * @param {string} message - Nội dung thông báo
     * @param {Object} options - Tùy chọn bổ sung
     */
    static success(message, options = {}) {
        return toast.success(message, {
            position: 'top-right',
            autoClose: options.autoClose || 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            ...options
        });
    }

    /**
     * Hiển thị thông báo lỗi
     * @param {string} message - Nội dung thông báo
     * @param {Object} options - Tùy chọn bổ sung
     */
    static error(message, options = {}) {
        return toast.error(message, {
            position: 'top-right',
            autoClose: options.autoClose || 4000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            ...options
        });
    }

    /**
     * Hiển thị thông báo cảnh báo
     * @param {string} message - Nội dung thông báo
     * @param {Object} options - Tùy chọn bổ sung
     */
    static warning(message, options = {}) {
        return toast.warning(message, {
            position: 'top-right',
            autoClose: options.autoClose || 3500,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            ...options
        });
    }

    /**
     * Hiển thị thông báo thông tin
     * @param {string} message - Nội dung thông báo
     * @param {Object} options - Tùy chọn bổ sung
     */
    static info(message, options = {}) {
        return toast.info(message, {
            position: 'top-right',
            autoClose: options.autoClose || 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            ...options
        });
    }

    /**
     * Hiển thị thông báo mặc định
     * @param {string} message - Nội dung thông báo
     * @param {Object} options - Tùy chọn bổ sung
     */
    static default(message, options = {}) {
        return toast(message, {
            position: 'top-right',
            autoClose: options.autoClose || 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            ...options
        });
    }

    /**
     * Hiển thị thông báo promise (cho async operations)
     * @param {Promise} promise - Promise cần theo dõi
     * @param {Object} messages - Object chứa messages: { pending, success, error }
     * @param {Object} options - Tùy chọn bổ sung
     */
    static promise(promise, messages, options = {}) {
        return toast.promise(promise, messages, {
            position: 'top-right',
            ...options
        });
    }
}

export default ToastNotification;

