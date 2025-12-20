
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
    Box,
    Button,
    TextField,
    InputAdornment,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    List,
    ListItem,
    ListItemText,
    ListItemButton,
    CircularProgress,
    Typography,
    Paper,
    Grid,
    Divider,
    Chip,
    IconButton,
    Badge,
    Stack,
    Alert
} from '@mui/material';
import {
    Search as SearchIcon,
    QrCode as QrCodeIcon,
    ShoppingCart as ShoppingCartIcon,
    Person as PersonIcon,
    Close as CloseIcon,
    Login as LoginIcon,
    Logout as LogoutIcon,
    AttachMoney as AttachMoneyIcon,
    CreditCard as CreditCardIcon,
    LocalOffer as LocalOfferIcon,
    Delete as DeleteIcon
} from '@mui/icons-material';
import { getProductsByStore } from '../../api/productApi';
import { getMyOpenShift, checkinShift, checkoutShift } from '../../api/shiftApi';
import { getMySchedules } from '../../api/scheduleApi';
import { useAuth } from '../../contexts/AuthContext';
import { searchCustomerByPhone, createCustomer } from '../../api/customerApi';
import { getAvailableVouchers, validateVoucher, generateVouchersForCustomer } from '../../api/voucherApi';
import { createCashPayment, createQRPayment } from '../../api/paymentApi';
import PaymentModal from '../../components/PaymentModal';
import CashPaymentModal from '../../components/CashPaymentModal';
import { ToastNotification } from '../../components/common';
import { findProductByBarcode } from '../../api/barcodeApi';

// Hàm helper để format tiền tệ
const formatCurrency = (number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(number);
}


const POS = () => {
    const { user } = useAuth();
    const [products, setProducts] = useState([]);

    // Load cart from localStorage on mount
    const getInitialCart = () => {
        try {
            const stored = localStorage.getItem('pos_cart');
            if (stored) {
                const parsed = JSON.parse(stored);
                return Array.isArray(parsed) ? parsed : [];
            }
        } catch (error) {
            console.error('Error loading cart from localStorage:', error);
        }
        return [];
    };

    const [cart, setCart] = useState(getInitialCart());
    const [searchTerm, setSearchTerm] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const lastScannedCodeRef = useRef(''); // Track mã đã scan để tránh scan lại
    const scanCompleteTimeRef = useRef(0); // Track thời điểm scan thành công để block input tiếp theo
    const completedScanCodeRef = useRef(''); // Lưu mã đã scan thành công để block input tiếp theo từ máy quét
    const [customerPhone, setCustomerPhone] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newCustomer, setNewCustomer] = useState({
        name: '',
        phone: ''
    });
    const [vouchers, setVouchers] = useState([]);
    const [selectedVoucher, setSelectedVoucher] = useState(null);
    const [loadingVouchers, setLoadingVouchers] = useState(false);

    // Payment states
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null); // 'cash' or 'qr'
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showCashPaymentModal, setShowCashPaymentModal] = useState(false);
    const [cashPaymentData, setCashPaymentData] = useState(null);
    const [qrPaymentData, setQrPaymentData] = useState(null);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);

    // Shift states
    const [isShiftActive, setIsShiftActive] = useState(false);
    const [shiftId, setShiftId] = useState(null);
    const [openingCash, setOpeningCash] = useState(''); // Số tiền đầu ca hiển thị trên header
    const [openingCashInput, setOpeningCashInput] = useState(''); // Input trong modal check-in
    const [checkinNote, setCheckinNote] = useState(''); // Note khi check-in
    const [isLateCheckin, setIsLateCheckin] = useState(false); // Kiểm tra check-in muộn
    const [cashSalesTotal, setCashSalesTotal] = useState(0); // tổng bán bằng tiền mặt trong ca
    const [bankTransferTotal, setBankTransferTotal] = useState(0); // tổng bán bằng chuyển khoản trong ca
    const [totalSales, setTotalSales] = useState(0); // tổng doanh thu (tiền mặt + chuyển khoản)
    const [showCheckinModal, setShowCheckinModal] = useState(false);
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    const [checkoutNote, setCheckoutNote] = useState('');
    const [closingCashInput, setClosingCashInput] = useState('');
    const [scheduleAttendanceStatus, setScheduleAttendanceStatus] = useState(null); // Lưu trạng thái điểm danh từ schedule
    const [hasTodaySchedule, setHasTodaySchedule] = useState(false); // Kiểm tra có lịch làm việc hôm nay không
    const [selectedScheduleId, setSelectedScheduleId] = useState(null); // Lưu schedule_id được chọn để check-in
    const [hasUncheckedSchedule, setHasUncheckedSchedule] = useState(false); // Có ca chưa check-in trong ngày (bao gồm cả ca chưa đến giờ)
    const [canCheckInNow, setCanCheckInNow] = useState(false); // Có ca đang trong khung giờ có thể check-in
    const [hasCheckedOutToday, setHasCheckedOutToday] = useState(false); // Đã có ca nào hôm nay kết ca
    const [showClearCartModal, setShowClearCartModal] = useState(false); // Modal xác nhận clear cart

    // Helper function: Kiểm tra schedule có phải chưa check-in không
    const isUncheckedSchedule = useCallback((schedule) => {
        const status = schedule?.attendance_status;
        return status === null ||
            status === undefined ||
            status === '' ||
            status === 'not_check' ||
            status === 'not_checked_in' ||
            (typeof status === 'string' && status.trim() === '');
    }, []);

    // Helper function: Load và xử lý schedules của ngày hôm nay
    const loadTodaySchedules = async () => {
        const today = new Date().toISOString().split('T')[0];
        try {
            const scheduleResp = await getMySchedules(today, today);
            if (scheduleResp && scheduleResp.err === 0 && scheduleResp.data && scheduleResp.data.length > 0) {
                // Chỉ lấy schedule đúng ngày hôm nay
                const todaySchedules = scheduleResp.data.filter(s => {
                    if (!s.work_date) return false;
                    const workDateStr = s.work_date.split('T')[0];
                    return workDateStr === today;
                });
                return todaySchedules;
            }
            return [];
        } catch (e) {
            console.error('Error loading schedules:', e);
            return [];
        }
    };

    // Helper function: Xử lý schedules và cập nhật state
    const processSchedules = useCallback((todaySchedules) => {
        if (!todaySchedules || todaySchedules.length === 0) {
            setHasTodaySchedule(false);
            setScheduleAttendanceStatus(null);
            setHasUncheckedSchedule(false);
            setCanCheckInNow(false);
            setHasCheckedOutToday(false);
            setSelectedScheduleId(null);
            return;
        }

        // Kiểm tra tất cả các ca có đều absent không
        const allAbsent = todaySchedules.every(s => s.attendance_status === 'absent');
        if (allAbsent) {
            setHasTodaySchedule(false);
            setScheduleAttendanceStatus('absent');
            setHasUncheckedSchedule(false);
            setCanCheckInNow(false);
            setHasCheckedOutToday(false);
            setSelectedScheduleId(null);
            return;
        }

        // Tìm ca đang active (checked_in)
        const activeSchedule = todaySchedules.find(s => s.attendance_status === 'checked_in');

        // Tìm tất cả ca chưa check-in
        const uncheckedSchedules = todaySchedules.filter(isUncheckedSchedule);

        // Tìm ca đã checkout (bất kỳ ca nào trong ngày đã kết ca)
        const checkedOutSchedule = todaySchedules.find(s => s.attendance_status === 'checked_out');
        const hasCheckedOut = !!checkedOutSchedule;

        // Xác định schedule được chọn để hiển thị status
        let selectedSchedule = activeSchedule || uncheckedSchedules[0] || checkedOutSchedule || todaySchedules[0];

        // Cập nhật state cơ bản
        setHasTodaySchedule(true);
        setScheduleAttendanceStatus(selectedSchedule?.attendance_status || null);
        setHasUncheckedSchedule(uncheckedSchedules.length > 0);
        setHasCheckedOutToday(hasCheckedOut);

        // Lưu schedule_id để check-in (ưu tiên ca chưa check-in)
        if (uncheckedSchedules.length > 0) {
            console.log('Unchecked schedules:', uncheckedSchedules.map(s => ({
                schedule_id: s.schedule_id,
                shift_template_id: s.shift_template_id,
                work_date: s.work_date,
                attendance_status: s.attendance_status,
                shiftTemplate: s.shiftTemplate
            })));

            // Nếu có nhiều ca chưa check-in, ưu tiên ca đang trong thời gian làm việc
            let selectedUncheckedSchedule = null;
            const now = new Date();
            let canCheckIn = false;

            for (const s of uncheckedSchedules) {
                const shiftTemplate = s.shiftTemplate || s.shift_template;
                if (!shiftTemplate || !shiftTemplate.start_time || !shiftTemplate.end_time) continue;

                const workDate = new Date(s.work_date);
                const [startHour, startMinute] = shiftTemplate.start_time.split(':').map(Number);
                const [endHour, endMinute] = shiftTemplate.end_time.split(':').map(Number);

                const shiftStart = new Date(workDate);
                shiftStart.setHours(startHour, startMinute, 0, 0);

                const shiftEnd = new Date(workDate);
                shiftEnd.setHours(endHour, endMinute, 0, 0);

                // Xử lý ca qua đêm
                if (shiftEnd < shiftStart) {
                    shiftEnd.setDate(shiftEnd.getDate() + 1);
                }

                // Kiểm tra có đang trong ca không
                if (now >= shiftStart && now <= shiftEnd) {
                    selectedUncheckedSchedule = s;
                    console.log(`Ca đang trong thời gian làm việc: Schedule ID ${s.schedule_id} (${shiftTemplate.start_time} - ${shiftTemplate.end_time})`);
                    canCheckIn = true;
                    break;
                }
            }

            // Nếu không có ca nào đang trong thời gian, chọn ca đầu tiên
            if (!selectedUncheckedSchedule) {
                selectedUncheckedSchedule = uncheckedSchedules[0];
            }

            const selectedId = selectedUncheckedSchedule.schedule_id;
            console.log('Selected schedule_id for check-in:', selectedId, 'from shift_template_id:', selectedUncheckedSchedule.shift_template_id);
            setSelectedScheduleId(selectedId);
            setCanCheckInNow(canCheckIn);
        } else if (selectedSchedule) {
            setSelectedScheduleId(selectedSchedule.schedule_id);
            setCanCheckInNow(false);
        } else {
            setSelectedScheduleId(null);
            setCanCheckInNow(false);
        }
    }, [isUncheckedSchedule]);

    // Load trạng thái ca từ API (open shift) và check schedule attendance_status
    useEffect(() => {
        const fetchOpenShift = async () => {
            const storedStoreId = (() => {
                if (user && user.store_id) return user.store_id;
                try { const persisted = localStorage.getItem('store_id'); if (persisted) return Number(persisted); } catch { }
                return 1;
            })();

            const resp = await getMyOpenShift(storedStoreId);

            if (resp && resp.err === 0 && resp.data) {
                // Có ca đang mở
                setIsShiftActive(true);
                setShiftId(resp.data.shift_id);
                setOpeningCash(String(resp.data.opening_cash || 0));
                setCashSalesTotal(Number(resp.data.cash_sales_total || 0));
                setBankTransferTotal(Number(resp.data.bank_transfer_total || 0));
                setTotalSales(Number(resp.data.total_sales || 0));

                // Nếu có schedule info từ shift, dùng luôn
                if (resp.data.schedule && resp.data.schedule.attendance_status) {
                    setScheduleAttendanceStatus(resp.data.schedule.attendance_status);
                    setHasTodaySchedule(true);
                    setHasUncheckedSchedule(false); // Đang trong ca, không có ca chưa check-in
                    setCanCheckInNow(false);
                } else {
                    // Không có schedule info, load lại từ API
                    const todaySchedules = await loadTodaySchedules();
                    processSchedules(todaySchedules);
                }
            } else {
                // Không có ca đang mở
                setIsShiftActive(false);
                setShiftId(null);
                setCashSalesTotal(0);
                setBankTransferTotal(0);
                setTotalSales(0);
                setOpeningCash('');
                setCanCheckInNow(false);

                // Load schedules để kiểm tra có ca nào chưa check-in không
                const todaySchedules = await loadTodaySchedules();
                processSchedules(todaySchedules);
            }
        };
        fetchOpenShift();
    }, [user, processSchedules]);

    const refreshOpenShift = useCallback(async () => {
        const storedStoreId = (() => {
            if (user && user.store_id) return user.store_id;
            try { const persisted = localStorage.getItem('store_id'); if (persisted) return Number(persisted); } catch { }
            return 1;
        })();

        const resp = await getMyOpenShift(storedStoreId);

        if (resp && resp.err === 0 && resp.data) {
            // Có ca đang mở
            setIsShiftActive(true);
            setShiftId(resp.data.shift_id);
            setOpeningCash(String(resp.data.opening_cash || 0));
            setCashSalesTotal(Number(resp.data.cash_sales_total || 0));
            setBankTransferTotal(Number(resp.data.bank_transfer_total || 0));
            setTotalSales(Number(resp.data.total_sales || 0));

            // Nếu có schedule info từ shift, dùng luôn
            if (resp.data.schedule && resp.data.schedule.attendance_status) {
                setScheduleAttendanceStatus(resp.data.schedule.attendance_status);
                setHasTodaySchedule(true);
                setHasUncheckedSchedule(false); // Đang trong ca, không có ca chưa check-in
                setCanCheckInNow(false);
                setHasCheckedOutToday(false);
                setHasCheckedOutToday(false);
            } else {
                // Không có schedule info, load lại từ API
                const todaySchedules = await loadTodaySchedules();
                processSchedules(todaySchedules);
            }
        } else {
            // Không có ca đang mở
            setIsShiftActive(false);
            setShiftId(null);
            setCashSalesTotal(0);
            setBankTransferTotal(0);
            setTotalSales(0);
            setOpeningCash('');
            setCanCheckInNow(false);
            setHasCheckedOutToday(false);
            setHasCheckedOutToday(false);

            // Load schedules để kiểm tra có ca nào chưa check-in không
            const todaySchedules = await loadTodaySchedules();
            processSchedules(todaySchedules);
        }
    }, [user, processSchedules]);

    // Auto-refresh shift data mỗi 10 giây để cập nhật realtime
    useEffect(() => {
        if (!isShiftActive) return; // Chỉ refresh khi đang trong ca

        const interval = setInterval(() => {
            refreshOpenShift();
        }, 10000); // Refresh mỗi 10 giây

        return () => clearInterval(interval);
    }, [isShiftActive, refreshOpenShift]);

    // Tự động quét barcode: khi máy quét nhập xong chuỗi số (không cần Enter),
    // nếu dừng gõ trong 300ms và độ dài >= 6 ký tự số, tự gọi API và thêm vào giỏ
    useEffect(() => {
        const code = searchTerm.trim();
        if (!code) {
            lastScannedCodeRef.current = ''; // Reset khi xóa hết
            completedScanCodeRef.current = ''; // Reset mã đã scan khi xóa hết
            return;
        }

        // Chỉ auto-scan với chuỗi toàn số, dài từ 6 ký tự trở lên (giống barcode)
        // Nếu không phải mã barcode hợp lệ, reset ref để tránh ghép với giá trị cũ
        if (!/^[0-9]{6,}$/.test(code)) {
            lastScannedCodeRef.current = ''; // Reset khi không phải mã barcode hợp lệ
            return;
        }

        // Tránh scan lại cùng một mã
        if (lastScannedCodeRef.current === code) return;

        const timer = setTimeout(async () => {
            // Kiểm tra lại để tránh race condition
            if (lastScannedCodeRef.current === code) return;

            try {
                setIsScanning(true);
                lastScannedCodeRef.current = code; // Đánh dấu đã scan mã này

                const storedStoreId = (() => {
                    if (user && user.store_id) return user.store_id;
                    try {
                        const persisted = localStorage.getItem('store_id');
                        if (persisted) return Number(persisted);
                    } catch { }
                    return 1;
                })();

                const res = await findProductByBarcode(code, storedStoreId);

                if (!res || res.err !== 0 || !res.data) {
                    lastScannedCodeRef.current = ''; // Reset nếu không tìm thấy để có thể thử lại
                    ToastNotification.warning(res?.msg || 'Không tìm thấy sản phẩm với mã vừa quét');
                    return;
                }

                const p = res.data;
                const price = Number(p.current_price || p.hq_price || 0);
                const hqPrice = Number(p.hq_price || 0);

                const productForCart = {
                    id: p.product_id,
                    name: p.name || 'Sản phẩm',
                    price,
                    category: p.category?.name || 'Tất cả',
                    code: p.sku || '',
                    stock: p.available_quantity
                };

                // Clear searchTerm ngay lập tức để tránh useEffect chạy lại
                setSearchTerm('');
                // Lưu mã đã scan thành công để block input tiếp theo từ máy quét
                completedScanCodeRef.current = code;
                // Đánh dấu thời điểm scan thành công để block input tiếp theo từ máy quét
                scanCompleteTimeRef.current = Date.now();
                // Reset lastScannedCodeRef ngay sau khi thêm thành công để cho phép scan mã mới
                lastScannedCodeRef.current = '';

                // Thêm vào giỏ hàng sau khi đã clear searchTerm (skip clear vì đã clear rồi)
                handleAddToCart(productForCart, true);
            } catch (error) {
                console.error('Error when scanning barcode:', error);
                lastScannedCodeRef.current = ''; // Reset nếu có lỗi
                ToastNotification.error('Lỗi khi quét mã vạch');
            } finally {
                setIsScanning(false);
            }
        }, 300); // debounce 300ms

        return () => clearTimeout(timer);
    }, [searchTerm, user]);

    // Chặn đăng xuất khi chưa kết ca
    useEffect(() => {
        const handleLogoutBlock = (e) => {
            const target = e.target;
            const clickable = target?.closest && target.closest('button, a');
            if (!clickable) return;
            const text = (clickable.textContent || '').trim();
            if (isShiftActive && text === 'Đăng xuất') {
                e.preventDefault();
                e.stopPropagation();
                ToastNotification.error('Vui lòng kết ca trước khi đăng xuất');
            }
        };
        document.addEventListener('click', handleLogoutBlock, true);
        return () => document.removeEventListener('click', handleLogoutBlock, true);
    }, [isShiftActive]);

    // Tải sản phẩm theo store_id của cashier
    useEffect(() => {
        const load = async () => {
            // Ưu tiên lấy store_id từ user (nếu backend cung cấp), fallback từ localStorage hoặc 1 để test
            const storedStoreId = (() => {
                if (user && user.store_id) return user.store_id;
                try {
                    const persisted = localStorage.getItem('store_id');
                    if (persisted) return Number(persisted);
                } catch { }
                return 1; // fallback test
            })();

            const res = await getProductsByStore(storedStoreId);
            if (res && res.err === 0 && Array.isArray(res.data)) {
                const mapped = res.data.map(item => {
                    const p = item.product || {};
                    const currentPrice = Number(p.current_price || p.hq_price || 0);
                    const hqPrice = Number(p.hq_price || 0);
                    return {
                        id: p.product_id,
                        name: p.name || 'Sản phẩm',
                        price: currentPrice,
                        category: p.category?.name || p.category?.category_name || 'Tất cả',
                        code: p.sku || ''
                    };
                });
                setProducts(mapped);
            } else {
                setProducts([]);
            }
        };
        load();
    }, [user]);

    // Lọc sản phẩm dựa trên filter và search term
    const filteredProducts = useMemo(() => {
        if (!products || products.length === 0) return [];

        // Chỉ hiển thị danh sách khi có tìm kiếm
        if (!searchTerm || !searchTerm.trim()) {
            return [];
        }

        let filtered = products;

        // Lọc theo search term
        const searchLower = searchTerm.toLowerCase().trim();
        filtered = filtered.filter(p => {
            const nameMatch = p.name && p.name.toLowerCase().includes(searchLower);
            const codeMatch = p.code && p.code.toLowerCase().includes(searchLower);
            return nameMatch || codeMatch;
        });

        // Giới hạn chỉ hiển thị 8 sản phẩm đầu tiên
        return filtered.slice(0, 8);
    }, [products, searchTerm]);

    // Lưu cart vào localStorage mỗi khi cart thay đổi
    useEffect(() => {
        try {
            localStorage.setItem('pos_cart', JSON.stringify(cart));
        } catch (error) {
            console.error('Error saving cart to localStorage:', error);
        }
    }, [cart]);

    // Xử lý onChange cho search input: block input trong 500ms sau khi scan thành công
    const handleSearchChange = (e) => {
        const newValue = e.target.value;
        const now = Date.now();
        const timeSinceScan = now - scanCompleteTimeRef.current;
        const completedCode = completedScanCodeRef.current;

        // Nếu vừa scan xong trong vòng 500ms và giá trị mới bắt đầu bằng mã đã scan thành công
        // thì block input này (có thể là ký tự tiếp theo từ máy quét)
        if (timeSinceScan < 500 && completedCode && newValue.startsWith(completedCode)) {
            // Nếu giá trị mới chỉ là phần mở rộng của mã đã scan, không cho phép
            if (newValue.length > completedCode.length) {
                return; // Block input này
            }
        }

        // Nếu đã qua 500ms, reset completedScanCodeRef
        if (timeSinceScan >= 500) {
            completedScanCodeRef.current = '';
        }

        setSearchTerm(newValue);
    };

    // Thêm sản phẩm vào giỏ
    const handleAddToCart = (product, skipClearSearch = false) => {
        setCart(currentCart => {
            const itemInCart = currentCart.find(item => item.id === product.id);
            if (itemInCart) {
                // Tăng số lượng
                ToastNotification.info(`Đã thêm ${product.name} (số lượng: ${itemInCart.qty + 1})`);
                return currentCart.map(item =>
                    item.id === product.id ? { ...item, qty: item.qty + 1 } : item
                );
            } else {
                // Thêm mới
                ToastNotification.success(`Đã thêm ${product.name} vào giỏ hàng`);
                return [...currentCart, { ...product, qty: 1 }];
            }
        });
        // Xóa ô tìm kiếm và reset ref sau khi thêm vào giỏ hàng thành công (trừ khi đã clear rồi)
        if (!skipClearSearch) {
            setSearchTerm('');
        }
        lastScannedCodeRef.current = ''; // Reset để cho phép scan mã mới
    };

    // Cập nhật số lượng
    const handleUpdateQty = (productId, newQty) => {
        if (newQty <= 0) {
            // Xóa nếu số lượng là 0
            handleRemoveFromCart(productId);
        } else {
            setCart(currentCart =>
                currentCart.map(item =>
                    item.id === productId ? { ...item, qty: newQty } : item
                )
            );
        }
    };

    // Xóa khỏi giỏ
    const handleRemoveFromCart = (productId) => {
        setCart(currentCart => currentCart.filter(item => item.id !== productId));
    };

    // Xóa toàn bộ giỏ hàng
    const handleClearCart = () => {
        setCart([]);
        setSelectedVoucher(null);
        // Xóa cart khỏi localStorage
        try {
            localStorage.removeItem('pos_cart');
        } catch (error) {
            console.error('Error clearing cart from localStorage:', error);
        }
        ToastNotification.success('Đã xóa toàn bộ giỏ hàng');
        setShowClearCartModal(false);
    };

    // Tính toán tiền
    const subtotal = useMemo(() => {
        return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    }, [cart]);

    // Tính giảm giá từ voucher
    const voucherDiscount = useMemo(() => {
        if (!selectedVoucher || cart.length === 0) return 0;

        let discount = 0;
        if (selectedVoucher.discount_type === 'percentage') {
            discount = (subtotal * selectedVoucher.discount_value) / 100;
            if (selectedVoucher.max_discount_amount && discount > selectedVoucher.max_discount_amount) {
                discount = selectedVoucher.max_discount_amount;
            }
        } else {
            discount = selectedVoucher.discount_value;
        }
        return discount;
    }, [selectedVoucher, subtotal, cart.length]);

    const vat = useMemo(() => subtotal * 0.1, [subtotal]);
    const total = useMemo(() => {
        const calculatedTotal = subtotal + vat - voucherDiscount;
        // Ensure total is never negative
        return Math.max(0, calculatedTotal);
    }, [subtotal, vat, voucherDiscount]);

    // Tính tiền mặt dự kiến khi kết ca
    const expectedCashAtClose = useMemo(() => {
        const open = Number(openingCash || 0);
        const sales = Number(cashSalesTotal || 0);
        return open + sales; // có thể cộng thêm/ trừ chi khác nếu sau này có
    }, [openingCash, cashSalesTotal]);
    // Tìm kiếm khách hàng khi nhập số điện thoại
    // Xử lý tìm kiếm khách hàng
    const handleSearchCustomer = useCallback(async (phone) => {
        setIsSearching(true);
        try {
            const res = await searchCustomerByPhone(phone);
            if (res && res.err === 0) {
                setSearchResults(res.data || []);
                setShowCreateForm(false);
            } else {
                setSearchResults([]);
                // Nếu không tìm thấy và đủ 10 số, hiển thị form tạo mới
                if (phone.trim().length === 10) {
                    setShowCreateForm(true);
                    setNewCustomer(prev => ({ ...prev, phone: phone }));
                } else {
                    // Nếu không đủ 10 số thì ẩn form
                    setShowCreateForm(false);
                }
            }
        } catch (error) {
            console.error('Error searching customer:', error);
            ToastNotification.error('Lỗi khi tìm kiếm khách hàng');
        } finally {
            setIsSearching(false);
        }
    }, []);

    // Tìm kiếm khách hàng khi nhập số điện thoại
    useEffect(() => {
        // Nếu số điện thoại dưới 10 số, ẩn form tạo mới ngay lập tức
        if (customerPhone.trim().length < 10) {
            setShowCreateForm(false);
        }

        const delaySearch = setTimeout(() => {
            if (customerPhone.trim().length >= 3) {
                handleSearchCustomer(customerPhone);
            } else {
                setSearchResults([]);
                setShowCreateForm(false);
            }
        }, 500); // Debounce 500ms

        return () => clearTimeout(delaySearch);
    }, [customerPhone, handleSearchCustomer]);

    // Đồng bộ số điện thoại tạo mới với ô tìm kiếm (khóa sửa ở form dưới)
    useEffect(() => {
        if (showCreateForm) {
            setNewCustomer(prev => ({
                ...prev,
                phone: customerPhone
            }));
        }
    }, [customerPhone, showCreateForm]);

    // Xử lý chọn khách hàng
    const handleSelectCustomer = async (customer) => {
        setSelectedCustomer(customer);
        setCustomerPhone('');
        setSearchResults([]);
        setShowCreateForm(false);
        ToastNotification.success(`Đã chọn khách hàng: ${customer.name}`);

        // Load vouchers for selected customer
        await loadCustomerVouchers(customer.customer_id);
    };

    // Load vouchers cho khách hàng, chỉ theo store mà cashier đang làm
    const loadCustomerVouchers = async (customerId) => {
        setLoadingVouchers(true);
        try {
            console.log('Loading vouchers for customer:', customerId);

            // Lấy store_id hiện tại của cashier (ưu tiên từ user, fallback localStorage)
            const storedStoreId = (() => {
                if (user && user.store_id) return user.store_id;
                try {
                    const persisted = localStorage.getItem('store_id');
                    if (persisted) return Number(persisted);
                } catch { }
                return null;
            })();

            const res = await getAvailableVouchers(customerId, storedStoreId);
            console.log('Vouchers response:', res);

            if (res && res.err === 0) {
                setVouchers(res.data || []);
                console.log('Vouchers loaded:', res.data?.length || 0);

                // Nếu không có voucher nào, tự động tạo voucher cho khách hàng
                if (res.data.length === 0) {
                    console.log('No vouchers found, generating...');
                    ToastNotification.info('Đang tạo voucher cho khách hàng...');
                    const generateRes = await generateVouchersForCustomer(customerId, storedStoreId);
                    console.log('Generate vouchers response:', generateRes);

                    if (generateRes && generateRes.err === 0) {
                        ToastNotification.success(generateRes.msg);
                        // Reload vouchers với store_id
                        const reloadRes = await getAvailableVouchers(customerId, storedStoreId);
                        console.log('Reloaded vouchers:', reloadRes);
                        if (reloadRes && reloadRes.err === 0) {
                            setVouchers(reloadRes.data || []);
                        }
                    } else {
                        console.error('Failed to generate vouchers:', generateRes);
                    }
                }
            } else {
                console.error('Failed to load vouchers:', res);
                setVouchers([]);
            }
        } catch (error) {
            console.error('Error loading vouchers:', error);
            setVouchers([]);
        } finally {
            setLoadingVouchers(false);
        }
    };

    // Xử lý chọn voucher
    const handleSelectVoucher = async (voucher) => {
        if (cart.length === 0) {
            ToastNotification.warning('Vui lòng thêm sản phẩm vào giỏ hàng trước khi áp dụng voucher');
            return;
        }

        // Check minimum purchase amount
        if (subtotal < voucher.min_purchase_amount) {
            ToastNotification.error(`Đơn hàng tối thiểu ${formatCurrency(voucher.min_purchase_amount)} để sử dụng voucher này`);
            return;
        }

        try {
            // Lấy store_id hiện tại của cashier (ưu tiên từ user, fallback localStorage)
            const storedStoreId = (() => {
                if (user && user.store_id) return user.store_id;
                try {
                    const persisted = localStorage.getItem('store_id');
                    if (persisted) return Number(persisted);
                } catch { }
                return null;
            })();

            const res = await validateVoucher(
                voucher.voucher_code,
                selectedCustomer.customer_id,
                subtotal,
                storedStoreId
            );
            if (res && res.err === 0) {
                setSelectedVoucher(voucher);
                ToastNotification.success(`Đã áp dụng voucher: ${voucher.voucher_name}`);
            } else {
                ToastNotification.error(res.msg || 'Không thể áp dụng voucher');
            }
        } catch (error) {
            console.error('Error validating voucher:', error);
            ToastNotification.error('Lỗi khi áp dụng voucher');
        }
    };

    // Xử lý hủy voucher
    const handleRemoveVoucher = () => {
        setSelectedVoucher(null);
        ToastNotification.info('Đã hủy áp dụng voucher');
    };

    // Xử lý chọn phương thức thanh toán
    const handleSelectPaymentMethod = (method) => {
        setSelectedPaymentMethod(method);
    };

    const handleCheckout = async () => {
        // Kiểm tra ca làm việc
        if (!isShiftActive) {
            ToastNotification.error('Vui lòng bắt đầu ca làm việc trước khi thanh toán');
            return;
        }

        if (cart.length === 0) {
            ToastNotification.warning('Giỏ hàng trống');
            return;
        }

        if (!selectedPaymentMethod) {
            ToastNotification.warning('Vui lòng chọn phương thức thanh toán');
            return;
        }

        setIsProcessingPayment(true);

        try {
            // Prepare cart items for payment
            const cartItems = cart.map(item => ({
                product_id: item.id,
                product_name: item.name,
                quantity: item.qty,
                unit_price: item.price
            }));

            const paymentData = {
                store_id: user?.store_id || null,
                cashier_id: user?.user_id || user?.id || null,
                customer_id: selectedCustomer?.customer_id || null,
                cart_items: cartItems,
                subtotal: subtotal,
                tax_amount: vat,
                discount_amount: voucherDiscount,
                voucher_code: selectedVoucher?.voucher_code || null,
                total_amount: total,
                customer_name: selectedCustomer?.name || 'Customer',
                customer_phone: selectedCustomer?.phone || ''
            };

            if (selectedPaymentMethod === 'cash') {
                // Cash payment - show cash payment modal first
                setCashPaymentData({
                    transaction_id: null,
                    payment_id: null,
                    total_amount: total,
                    payment_method: 'cash',
                    customer_name: selectedCustomer?.name || 'Khách vãng lai',
                    customer_phone: selectedCustomer?.phone || '',
                    paymentData: paymentData
                });
                setShowCashPaymentModal(true);
            } else if (selectedPaymentMethod === 'qr') {
                // QR payment
                const res = await createQRPayment(paymentData);

                console.log('QR Payment Response:', res);
                console.log('QR Code from response:', res?.data?.qr_code);

                if (res && res.err === 0) {
                    // Show QR modal
                    const qrData = {
                        ...res.data,
                        customer_name: selectedCustomer?.name || 'Customer',
                        customer_phone: selectedCustomer?.phone || '',
                        total_amount: total
                    };
                    console.log('Setting QR Payment Data:', qrData);
                    setQrPaymentData(qrData);
                    setShowPaymentModal(true);
                } else {
                    ToastNotification.error(res.msg || 'Không thể tạo mã QR thanh toán');
                }
            }

        } catch (error) {
            console.error('Error during checkout:', error);
            ToastNotification.error('Lỗi khi thanh toán');
        } finally {
            setIsProcessingPayment(false);
        }
    };

    // Xử lý khi thanh toán QR thành công
    const handleQRPaymentSuccess = async (transactionId) => {
        ToastNotification.success('Thanh toán QR thành công!');

        // Save customer info before clearing (for background refresh)
        const customerToRefresh = selectedCustomer;

        // Clear cart, voucher, phương thức thanh toán và bỏ chọn khách immediately
        setCart([]);
        setSelectedVoucher(null);
        setSelectedPaymentMethod(null);
        setSelectedCustomer(null);
        setCustomerPhone('');
        setSearchResults([]);
        setShowCreateForm(false);
        // Xóa cart khỏi localStorage khi thanh toán thành công
        try {
            localStorage.removeItem('pos_cart');
        } catch (error) {
            console.error('Error clearing cart from localStorage:', error);
        }

        // Refresh data in background (don't block UI)
        setTimeout(async () => {
            try {
                // Refresh shift data to update sales totals
                await refreshOpenShift();

                // Reload customer data if needed (optional, run in background)
                if (customerToRefresh) {
                    try {
                        const customerRes = await searchCustomerByPhone(customerToRefresh.phone);
                        if (customerRes && customerRes.err === 0 && customerRes.data) {
                            ToastNotification.info(`Điểm tích lũy mới: ${customerRes.data.loyalty_point || 0} điểm`);
                        }
                    } catch (e) {
                        console.error('Error reloading customer after QR payment:', e);
                    }
                }
            } catch (error) {
                console.error('Error refreshing data after payment:', error);
            }
        }, 500);
    };

    // Xử lý in hóa đơn
    const handlePrintInvoice = async (transactionId) => {
        try {
            const { generateAndPrintInvoice } = await import('../../utils/invoicePDF');
            await generateAndPrintInvoice(transactionId);
            ToastNotification.success('Đang mở cửa sổ in...');
        } catch (error) {
            console.error('Error printing invoice:', error);
            ToastNotification.error('Lỗi khi in hóa đơn');
        }
    };

    // Xử lý tạo khách hàng mới
    const handleCreateCustomer = async () => {
        if (!newCustomer.name || !newCustomer.phone) {
            ToastNotification.error('Vui lòng nhập tên và số điện thoại');
            return;
        }
        if (newCustomer.phone.length !== 10 || newCustomer.phone[0] !== '0') {
            ToastNotification.error('Số điện thoại phải bắt đầu bằng 0 và đủ 10 số');
            return;
        }
        if (customerPhone !== newCustomer.phone) {
            ToastNotification.error('Số điện thoại phải khớp với ô tìm kiếm');
            return;
        }

        try {
            const res = await createCustomer(newCustomer);
            if (res && res.err === 0) {
                ToastNotification.success('Tạo khách hàng thành công');
                handleSelectCustomer(res.data);
            } else {
                ToastNotification.error(res.msg || 'Tạo khách hàng thất bại');
            }
        } catch (error) {
            console.error('Error creating customer:', error);
            ToastNotification.error('Lỗi khi tạo khách hàng');
        }
    };

    // Xử lý hoàn thành thanh toán tiền mặt
    const handleCashPaymentComplete = async (cashPaymentInfo) => {
        try {
            // Extract only the necessary fields from cashPaymentData.paymentData
            const {
                store_id,
                cashier_id,
                customer_id,
                cart_items,
                subtotal,
                tax_amount,
                discount_amount,
                voucher_code,
                total_amount
            } = cashPaymentData.paymentData;

            const paymentDataWithCash = {
                store_id,
                cashier_id,
                customer_id,
                cart_items,
                subtotal,
                tax_amount,
                discount_amount,
                voucher_code,
                total_amount,
                cash_received: cashPaymentInfo.cash_received,
                change_amount: cashPaymentInfo.change_amount
            };

            console.log('Sending cash payment data:', paymentDataWithCash);

            const res = await createCashPayment(paymentDataWithCash);

            console.log('Cash payment response:', res);

            if (res && res.err === 0) {
                ToastNotification.success('Thanh toán thành công!');

                // Update cash payment data with transaction info
                setCashPaymentData(prev => ({
                    ...prev,
                    transaction_id: res.data?.transaction_id,
                    payment_id: res.data?.payment_id
                }));

                // Save customer info before clearing (for background refresh)
                const customerToRefresh = selectedCustomer;

                // Clear cart, voucher, phương thức thanh toán và bỏ chọn khách immediately
                setCart([]);
                setSelectedVoucher(null);
                setSelectedPaymentMethod(null);
                setSelectedCustomer(null);
                setCustomerPhone('');
                setSearchResults([]);

                // Refresh data in background (don't block UI)
                setTimeout(async () => {
                    try {
                        // Refresh shift data to update sales totals
                        await refreshOpenShift();

                        // Reload customer data if needed (optional, run in background)
                        if (customerToRefresh) {
                            try {
                                const customerRes = await searchCustomerByPhone(customerToRefresh.phone);
                                if (customerRes && customerRes.err === 0 && customerRes.data) {
                                    console.log('Updated customer loyalty:', customerRes.data.loyalty_point);
                                }
                            } catch (e) {
                                console.error('Error reloading customer after cash payment:', e);
                            }
                        }
                    } catch (error) {
                        console.error('Error refreshing data after payment:', error);
                    }
                }, 500);
            } else {
                ToastNotification.error(res?.msg || 'Thanh toán thất bại');
            }
        } catch (error) {
            console.error('Error completing cash payment:', error);
            ToastNotification.error('Lỗi khi hoàn thành thanh toán: ' + error.message);
        }
    };

    // Helper function để lấy màu badge theo tier (MUI colors)
    const getTierBadgeColor = (tier) => {
        switch (tier?.toLowerCase()) {
            case 'gold': return 'warning';
            case 'silver': return 'default';
            case 'bronze': return 'error';
            default: return 'primary';
        }
    };


    return (
        <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
            {/* ------------------- BÊN TRÁI: SẢN PHẨM ------------------- */}
            <Box
                sx={{
                    flex: '0 0 40%',
                    maxWidth: '40%',
                    minWidth: '320px',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRight: '1px solid',
                    borderColor: 'divider'
                }}
            >
                {/* Header */}
                <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                        {isShiftActive ? (
                            <>
                                <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                                    Đang trong ca • Tiền đầu ca: <strong>{formatCurrency(Number(openingCash || 0))}</strong> • Số tiền đã bán được: <strong>{formatCurrency(totalSales)}</strong> (Tiền mặt: {formatCurrency(cashSalesTotal)}, Chuyển khoản: {formatCurrency(bankTransferTotal)})
                                </Typography>
                                <Button
                                    variant="contained"
                                    color="warning"
                                    size="small"
                                    startIcon={<LogoutIcon />}
                                    onClick={() => { setClosingCashInput(''); setShowCheckoutModal(true); }}
                                >
                                    Kết ca
                                </Button>
                            </>
                        ) : canCheckInNow ? (
                            <Button
                                variant="contained"
                                color="success"
                                size="small"
                                startIcon={<LoginIcon />}
                                onClick={async () => {
                                    setOpeningCashInput('');
                                    setCheckinNote('');
                                    setIsLateCheckin(false);
                                    
                                    // Kiểm tra check-in muộn
                                    // Thời gian hợp lệ check-in là ±5 phút từ thời gian bắt đầu ca
                                    // Chỉ coi là muộn nếu check-in sau thời gian bắt đầu ca hơn 5 phút
                                    if (selectedScheduleId) {
                                        try {
                                            const today = new Date().toISOString().split('T')[0];
                                            const scheduleResp = await getMySchedules(today, today);
                                            if (scheduleResp && scheduleResp.err === 0 && scheduleResp.data) {
                                                const selectedSchedule = scheduleResp.data.find(s => s.schedule_id === selectedScheduleId);
                                                if (selectedSchedule) {
                                                    const shiftTemplate = selectedSchedule.shiftTemplate || selectedSchedule.shift_template;
                                                    if (shiftTemplate && shiftTemplate.start_time) {
                                                        const now = new Date();
                                                        const workDate = new Date(selectedSchedule.work_date);
                                                        const [startHour, startMinute] = shiftTemplate.start_time.split(':').map(Number);
                                                        const shiftStart = new Date(workDate);
                                                        shiftStart.setHours(startHour, startMinute, 0, 0);
                                                        
                                                        // Cho phép check-in sớm 5 phút hoặc muộn 5 phút (tổng cộng 10 phút window)
                                                        const validEndTime = new Date(shiftStart);
                                                        validEndTime.setMinutes(validEndTime.getMinutes() + 5); // Cho phép muộn 5 phút
                                                        
                                                        // Chỉ tính là muộn nếu check-in sau thời gian hợp lệ (sau shiftStart + 5 phút)
                                                        if (now > validEndTime) {
                                                            setIsLateCheckin(true);
                                                        }
                                                    }
                                                }
                                            }
                                        } catch (e) {
                                            console.error('Error checking late check-in:', e);
                                        }
                                    }
                                    
                                    setShowCheckinModal(true);
                                }}
                            >
                                Bắt đầu ca (Check-in)
                            </Button>
                        ) : scheduleAttendanceStatus === 'checked_out' || hasCheckedOutToday ? (
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                                Đã kết ca hôm nay
                            </Typography>
                        ) : scheduleAttendanceStatus === 'absent' || !hasTodaySchedule ? (
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                                Không có lịch làm việc
                            </Typography>
                        ) : (
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                                Chưa đến giờ ca làm việc tiếp theo
                            </Typography>
                        )}
                    </Box>
                </Box>

                {/* Search */}
                <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <TextField
                        fullWidth
                        placeholder="Tìm kiếm sản phẩm hoặc mã vạch..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon />
                                </InputAdornment>
                            ),
                            endAdornment: isScanning ? (
                                <InputAdornment position="end">
                                    <CircularProgress size={16} />
                                </InputAdornment>
                            ) : null,
                        }}
                        size="small"
                    />
                </Box>

                {/* Product List */}
                <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
                    {filteredProducts.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                            {!searchTerm ? (
                                <>
                                    <Typography variant="body1" gutterBottom>Nhập tên sản phẩm hoặc mã vạch để tìm kiếm</Typography>
                                    <Typography variant="body2">Danh sách sản phẩm sẽ hiển thị khi bạn tìm kiếm</Typography>
                                </>
                            ) : (
                                <>
                                    <Typography variant="body1" gutterBottom>Không tìm thấy sản phẩm</Typography>
                                    <Typography variant="body2">Không tìm thấy sản phẩm phù hợp với "{searchTerm}"</Typography>
                                </>
                            )}
                        </Box>
                    ) : (
                        <List sx={{ p: 0 }}>
                            {filteredProducts.map(product => (
                                <ListItem
                                    key={product.id}
                                    sx={{
                                        borderBottom: '1px solid',
                                        borderColor: 'divider',
                                        cursor: 'pointer',
                                        '&:hover': { bgcolor: 'action.hover' },
                                        transition: 'background-color 0.2s',
                                        py: 1.5
                                    }}
                                    onClick={() => handleAddToCart(product)}
                                >
                                    <ListItemText
                                        primary={
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Box sx={{ flex: 1 }}>
                                                    <Typography variant="body1" fontWeight="bold">{product.name}</Typography>
                                                    {product.code && (
                                                        <Typography
                                                            variant="body2"
                                                            sx={{ color: 'text.secondary' }}
                                                        >
                                                            Mã SKU: {product.code}
                                                        </Typography>
                                                    )}
                                                </Box>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, ml: 2 }}>
                                                    <Typography variant="h6" color="primary" fontWeight="bold">
                                                        {formatCurrency(product.price)}
                                                    </Typography>
                                                    <Button
                                                        variant="outlined"
                                                        size="small"
                                                        color="primary"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleAddToCart(product);
                                                        }}
                                                    >
                                                        + Thêm
                                                    </Button>
                                                </Box>
                                            </Box>
                                        }
                                    />
                                </ListItem>
                            ))}
                        </List>
                    )}
                </Box>
            </Box>

            <Box
                sx={{
                    flex: '0 0 60%',
                    maxWidth: '60%',
                    minWidth: '360px',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100vh',
                    overflow: 'hidden'
                }}
            >
                {/* Cart Header - Compact */}
                {/* <div className="cart-header py-2 px-3 border-bottom">
                    <div className="d-flex justify-content-between align-items-center">
                        <h5 className="mb-0">
                            <FaShoppingCart className="me-2" />
                            Giỏ hàng
                        </h5>
                        <Button variant="link" className="p-0 small text-decoration-none">
                            Giỏ hàng hiện lại
                        </Button>
                    </div>
                </div> */}

                {/* Customer Info - Compact */}
                <Box sx={{ p: 1.5, bgcolor: 'grey.100', borderBottom: '1px solid', borderColor: 'divider', position: 'relative' }}>
                    {selectedCustomer ? (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                    <PersonIcon fontSize="small" color="action" />
                                    <Typography variant="body2" fontWeight="bold" noWrap>{selectedCustomer.name}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                    <Typography variant="caption" color="text.secondary">{selectedCustomer.phone}</Typography>
                                    <Chip label={selectedCustomer.tier} size="small" color="primary" sx={{ height: '20px', fontSize: '0.65rem' }} />
                                    <Typography variant="caption" color="text.secondary">
                                        {selectedCustomer.loyalty_point || 0} điểm
                                    </Typography>
                                </Box>
                            </Box>
                            <IconButton
                                color="error"
                                size="small"
                                sx={{ flexShrink: 0 }}
                                onClick={() => {
                                    setSelectedCustomer(null);
                                    setCustomerPhone('');
                                    setSearchResults([]);
                                    setShowCreateForm(false);
                                    setVouchers([]);
                                    setSelectedVoucher(null);
                                }}
                            >
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        </Box>
                    ) : (
                        <>
                            <TextField
                                fullWidth
                                type="tel"
                                placeholder="Nhập số điện thoại..."
                                value={customerPhone}
                                onChange={(e) => {
                                    // Chỉ cho phép nhập số, bắt buộc bắt đầu bằng 0 và tối đa 10 ký tự
                                    let value = e.target.value.replace(/\D/g, '');
                                    if (value && value[0] !== '0') {
                                        value = '0' + value.slice(0, 9);
                                    } else {
                                        value = value.slice(0, 10);
                                    }
                                    setCustomerPhone(value);
                                }}
                                autoComplete="off"
                                size="small"
                                inputProps={{
                                    maxLength: 10,
                                    pattern: '[0-9]*',
                                    inputMode: 'numeric'
                                }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon fontSize="small" />
                                        </InputAdornment>
                                    ),
                                    endAdornment: customerPhone && (
                                        <InputAdornment position="end">
                                            <IconButton
                                                size="small"
                                                onClick={() => {
                                                    setCustomerPhone('');
                                                    setSearchResults([]);
                                                    setShowCreateForm(false);
                                                }}
                                            >
                                                <CloseIcon fontSize="small" />
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />

                            {/* Customer Search Results & Create Form - Floating Overlay */}
                            {(searchResults.length > 0 || showCreateForm) && (
                                <Paper
                                    sx={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0,
                                        right: 0,
                                        mt: 1,
                                        zIndex: 1000,
                                        maxHeight: '400px',
                                        overflowY: 'auto',
                                        boxShadow: 3,
                                        border: '1px solid',
                                        borderColor: 'divider'
                                    }}
                                >
                                    {/* Customer Search Results */}
                                    {searchResults.length > 0 && (
                                        <Box sx={{ p: 2, borderBottom: showCreateForm ? '1px solid' : 'none', borderColor: 'divider' }}>
                                            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>Kết quả tìm kiếm:</Typography>
                                            <List>
                                                {searchResults.map((customer) => (
                                                    <ListItem
                                                        key={customer.customer_id}
                                                        component={ListItemButton}
                                                        onClick={() => handleSelectCustomer(customer)}
                                                        sx={{ cursor: 'pointer', py: 1 }}
                                                    >
                                                        <ListItemText
                                                            primary={
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                    <PersonIcon fontSize="small" color="action" />
                                                                    <Typography variant="body2" fontWeight="bold">{customer.name}</Typography>
                                                                </Box>
                                                            }
                                                            secondary={customer.phone}
                                                        />
                                                        <Box sx={{ textAlign: 'right' }}>
                                                            <Chip label={customer.tier} size="small" color={getTierBadgeColor(customer.tier)} />
                                                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                                                                {customer.loyalty_point || 0} điểm
                                                            </Typography>
                                                        </Box>
                                                    </ListItem>
                                                ))}
                                            </List>
                                        </Box>
                                    )}

                                    {/* Create New Customer Form */}
                                    {showCreateForm && (
                                        <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
                                            <Typography variant="body2" fontWeight="bold" sx={{ mb: 2, display: 'block' }}>Tạo khách hàng mới</Typography>
                                            <Stack spacing={2}>
                                                <TextField
                                                    size="small"
                                                    type="text"
                                                    placeholder="Tên khách hàng *"
                                                    value={newCustomer.name}
                                                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                                                    fullWidth
                                                />
                                                <TextField
                                                    size="small"
                                                    type="tel"
                                                    placeholder="Số điện thoại *"
                                                    value={newCustomer.phone}
                                                    disabled
                                                    inputProps={{
                                                        maxLength: 10,
                                                        pattern: '[0-9]*',
                                                        inputMode: 'numeric',
                                                        readOnly: true
                                                    }}
                                                    helperText="Số điện thoại lấy từ ô tìm kiếm (bắt đầu bằng 0, đủ 10 số)"
                                                    fullWidth
                                                />
                                                <Stack direction="row" spacing={1}>
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        onClick={handleCreateCustomer}
                                                        sx={{ flexGrow: 1 }}
                                                    >
                                                        Tạo
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        onClick={() => setShowCreateForm(false)}
                                                    >
                                                        Hủy
                                                    </Button>
                                                </Stack>
                                            </Stack>
                                        </Box>
                                    )}
                                </Paper>
                            )}
                        </>
                    )}
                </Box>

                {/* Voucher Section - Only show when customer is selected */}
                {selectedCustomer && (
                    <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="caption" fontWeight="semibold" color="text.secondary" sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <LocalOfferIcon fontSize="small" /> Áp mã giảm giá
                        </Typography>

                        {loadingVouchers ? (
                            <Box sx={{ textAlign: 'center', py: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                <CircularProgress size={20} />
                                <Typography variant="caption" color="text.secondary">Đang tải voucher...</Typography>
                            </Box>
                        ) : vouchers.length > 0 ? (
                            <>
                                {selectedVoucher ? (
                                    <Paper sx={{ p: 1, bgcolor: 'rgba(76, 175, 80, 0.1)' }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                                            <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                <LocalOfferIcon fontSize="small" color="success" />
                                                <strong>{selectedVoucher.voucher_name}</strong>
                                                {' • '}
                                                {selectedVoucher.discount_type === 'percentage'
                                                    ? `${selectedVoucher.discount_value}%`
                                                    : formatCurrency(selectedVoucher.discount_value)}
                                            </Typography>
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={handleRemoveVoucher}
                                                sx={{ p: 0.5 }}
                                            >
                                                <CloseIcon fontSize="small" />
                                            </IconButton>
                                        </Box>
                                    </Paper>
                                ) : (
                                    <Paper sx={{ maxHeight: '90px', overflowY: 'auto' }}>
                                        <List dense>
                                            {vouchers.map((voucher) => {
                                                const isDisabled = cart.length === 0 || subtotal < voucher.min_purchase_amount;
                                                const label = `${voucher.voucher_name} • ${voucher.discount_type === 'percentage'
                                                    ? `${voucher.discount_value}%`
                                                    : formatCurrency(voucher.discount_value)
                                                    }`;
                                                return (
                                                    <ListItem
                                                        key={voucher.customer_voucher_id}
                                                        component={ListItemButton}
                                                        onClick={() => !isDisabled && handleSelectVoucher(voucher)}
                                                        disabled={isDisabled}
                                                        sx={{
                                                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                            py: 0.5,
                                                            px: 1,
                                                            opacity: isDisabled ? 0.5 : 1,
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis'
                                                        }}
                                                    >
                                                        <ListItemText primary={label} primaryTypographyProps={{ variant: 'caption' }} />
                                                    </ListItem>
                                                );
                                            })}
                                        </List>
                                    </Paper>
                                )}
                            </>
                        ) : (
                            <Box sx={{ textAlign: 'center', py: 2 }}>
                                <Typography variant="caption" color="text.secondary">Khách hàng chưa có voucher nào</Typography>
                            </Box>
                        )}
                    </Box>
                )}

                {/* Cart Header with Clear Button */}
                {cart.length > 0 && (
                    <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <ShoppingCartIcon fontSize="small" /> Giỏ hàng ({cart.length})
                        </Typography>
                        <IconButton
                            color="error"
                            size="small"
                            onClick={() => setShowClearCartModal(true)}
                            sx={{ p: 0.5 }}
                        >
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Box>
                )}

                {/* Cart Items - Scrollable */}
                <Box
                    sx={{
                        flex: 1,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        p: 1.5,
                        minHeight: 0,
                        '&::-webkit-scrollbar': {
                            display: 'none'
                        },
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none'
                    }}
                >
                    {cart.length > 0 && (
                        <Box
                            sx={{
                                display: 'flex',
                                px: 0.5,
                                pb: 1,
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: 'text.secondary',
                            }}
                        >
                            <Box sx={{ flex: 4 }}>Sản phẩm</Box>
                            <Box sx={{ flex: 2, textAlign: 'center' }}>Số lượng</Box>
                            <Box sx={{ flex: 2, textAlign: 'right' }}>Đơn giá</Box>
                            <Box sx={{ flex: 2, textAlign: 'right' }}>Thành tiền</Box>
                            <Box sx={{ width: 32 }} />
                        </Box>
                    )}

                    {cart.map((item) => (
                        <Box
                            key={item.id}
                            sx={{
                                borderBottom: '1px solid',
                                borderColor: 'divider',
                                py: 0.75,
                                pl: 0.5,
                                pr: 3.5,
                                position: 'relative',
                            }}
                        >
                            <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleRemoveFromCart(item.id)}
                                sx={{
                                    position: 'absolute',
                                    top: 4,
                                    right: 4,
                                    p: 0.25,
                                }}
                            >
                                <CloseIcon fontSize="small" />
                            </IconButton>

                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                }}
                            >
                                {/* Tên sản phẩm */}
                                <Box sx={{ flex: 4, pr: 1 }}>
                                    <Typography variant="body2" fontWeight="bold" noWrap title={item.name}>
                                        {item.name}
                                    </Typography>
                                    {item.code && (
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            noWrap
                                            title={item.code}
                                            sx={{ display: 'block' }}
                                        >
                                            Mã SKU: {item.code}
                                        </Typography>
                                    )}
                                </Box>

                                {/* Số lượng + nút +/- */}
                                <Box sx={{ flex: 2, display: 'flex', justifyContent: 'center' }}>
                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            onClick={() => handleUpdateQty(item.id, item.qty - 1)}
                                            disabled={item.qty <= 1}
                                            sx={{ minWidth: '28px', height: '28px', p: 0 }}
                                        >
                                            -
                                        </Button>
                                        <TextField
                                            type="number"
                                            value={item.qty}
                                            onChange={(e) => {
                                                const newValue = parseInt(e.target.value) || 0;
                                                if (newValue >= 0) {
                                                    handleUpdateQty(item.id, newValue);
                                                }
                                            }}
                                            onBlur={(e) => {
                                                const newValue = parseInt(e.target.value) || 0;
                                                if (newValue <= 0) {
                                                    handleUpdateQty(item.id, 1);
                                                } else if (item.stock !== undefined && newValue > item.stock) {
                                                    handleUpdateQty(item.id, item.stock);
                                                }
                                            }}
                                            inputProps={{
                                                min: 1,
                                                max: item.stock !== undefined ? item.stock : undefined,
                                                style: { textAlign: 'center', padding: '4px 8px' }
                                            }}
                                            sx={{
                                                width: '60px',
                                                '& .MuiOutlinedInput-root': {
                                                    height: '28px',
                                                    '& input': {
                                                        padding: '4px 8px',
                                                        fontSize: '0.875rem',
                                                        fontWeight: 'bold'
                                                    }
                                                }
                                            }}
                                            size="small"
                                        />
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            onClick={() => handleUpdateQty(item.id, item.qty + 1)}
                                            disabled={item.stock !== undefined && item.qty >= item.stock}
                                            sx={{ minWidth: '28px', height: '28px', p: 0 }}
                                        >
                                            +
                                        </Button>
                                    </Stack>
                                </Box>

                                {/* Đơn giá */}
                                <Box sx={{ flex: 2, textAlign: 'right' }}>
                                    <Typography variant="body2" color="text.secondary">
                                        {formatCurrency(item.price)}
                                    </Typography>
                                </Box>

                                {/* Thành tiền */}
                                <Box sx={{ flex: 2, textAlign: 'right' }}>
                                    <Typography
                                        variant="body1"
                                        fontWeight="bold"
                                        color="primary"
                                        sx={{ fontSize: '1rem' }}
                                    >
                                        {formatCurrency(item.price * item.qty)}
                                    </Typography>
                                </Box>
                            </Box>
                        </Box>
                    ))}
                    {cart.length === 0 && (
                        <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                            <ShoppingCartIcon sx={{ fontSize: 36, mb: 2, opacity: 0.25 }} />
                            <Typography variant="body2">Giỏ hàng trống</Typography>
                        </Box>
                    )}
                </Box>

                {/* Cart Summary - Fixed at bottom */}
                <Box sx={{
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    p: 1.5,
                    bgcolor: 'background.paper',
                    flex: '0 0 auto'
                }}>
                    <Box sx={{ mb: 1.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">Tạm tính</Typography>
                            <Typography variant="caption" fontWeight="semibold">{formatCurrency(subtotal)}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">VAT (10%)</Typography>
                            <Typography variant="caption" fontWeight="semibold">{formatCurrency(vat)}</Typography>
                        </Box>
                        {voucherDiscount > 0 && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography variant="caption" color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <LocalOfferIcon fontSize="small" />
                                    Giảm giá
                                </Typography>
                                <Typography variant="caption" fontWeight="bold" color="success.main">-{formatCurrency(voucherDiscount)}</Typography>
                            </Box>
                        )}
                        <Divider sx={{ my: 0.75 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body1" fontWeight="bold">Tổng cộng</Typography>
                            <Typography variant="h6" fontWeight="bold" color="primary">{formatCurrency(total)}</Typography>
                        </Box>
                    </Box>

                    {/* Payment Method Selection */}
                    {cart.length > 0 && (
                        <Box sx={{ mb: 1.5 }}>
                            <Typography variant="caption" fontWeight="semibold" sx={{ mb: 0.75, display: 'block' }}>Phương thức thanh toán</Typography>
                            <Stack direction="row" spacing={0.75}>
                                <Button
                                    variant={selectedPaymentMethod === 'cash' ? 'contained' : 'outlined'}
                                    fullWidth
                                    size="small"
                                    disabled={!isShiftActive}
                                    startIcon={<AttachMoneyIcon fontSize="small" />}
                                    onClick={() => handleSelectPaymentMethod('cash')}
                                    sx={{ py: 0.75 }}
                                >
                                    Tiền mặt
                                </Button>
                                <Button
                                    variant={selectedPaymentMethod === 'qr' ? 'contained' : 'outlined'}
                                    fullWidth
                                    size="small"
                                    disabled={!isShiftActive || total === 0}
                                    startIcon={<CreditCardIcon fontSize="small" />}
                                    onClick={() => handleSelectPaymentMethod('qr')}
                                    sx={{ py: 0.75 }}
                                >
                                    QR Banking
                                </Button>
                            </Stack>
                        </Box>
                    )}

                    <Button
                        variant="contained"
                        color="success"
                        size="large"
                        fullWidth
                        disabled={!isShiftActive || cart.length === 0 || !selectedPaymentMethod || isProcessingPayment}
                        onClick={handleCheckout}
                        sx={{ mb: 2 }}
                    >
                        {isProcessingPayment ? (
                            <>
                                <CircularProgress size={20} sx={{ mr: 1 }} />
                                Đang xử lý...
                            </>
                        ) : (
                            'Thanh toán'
                        )}
                    </Button>
                    {!isShiftActive && (
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="caption" color="error" fontWeight="bold" display="block">
                                ⚠️ Chưa bắt đầu ca làm việc.
                            </Typography>
                            <Typography variant="caption" color="error">
                                Vui lòng bắt đầu ca (Check-in) trước khi thanh toán.
                            </Typography>
                        </Box>
                    )}
                </Box>
            </Box>

            {/* Payment Modal for Cash */}
            <CashPaymentModal
                show={showCashPaymentModal}
                onHide={() => {
                    setShowCashPaymentModal(false);
                    setCashPaymentData(null);
                    setIsProcessingPayment(false);
                }}
                paymentData={cashPaymentData}
                onComplete={handleCashPaymentComplete}
                onPrintInvoice={handlePrintInvoice}
            />

            {/* Check-in Modal */}
            <Dialog open={showCheckinModal} onClose={() => {
                setShowCheckinModal(false);
                setOpeningCashInput('');
                setCheckinNote('');
                setIsLateCheckin(false);
            }}>
                <DialogTitle>Bắt đầu ca làm việc</DialogTitle>
                <DialogContent>
                    {isLateCheckin && (
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            <Typography variant="body2" fontWeight={600}>
                                Bạn đang check-in muộn. Vui lòng nhập lý do vào phần ghi chú bên dưới.
                            </Typography>
                        </Alert>
                    )}
                    <TextField
                        fullWidth
                        type="number"
                        inputProps={{ min: 0 }}
                        label="Tiền mặt đầu ca (VND)"
                        placeholder="Nhập số tiền trong két trước ca"
                        value={openingCashInput}
                        onChange={(e) => setOpeningCashInput(e.target.value)}
                        autoFocus
                        sx={{ mt: 1 }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                        Số tiền này sẽ dùng để đối soát khi kết ca.
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label={isLateCheckin ? "Ghi chú (bắt buộc khi check-in muộn) *" : "Ghi chú (tùy chọn)"}
                        placeholder={isLateCheckin ? "Vui lòng nhập lý do check-in muộn..." : "Nhập ghi chú nếu có..."}
                        value={checkinNote}
                        onChange={(e) => setCheckinNote(e.target.value)}
                        required={isLateCheckin}
                        error={isLateCheckin && !checkinNote.trim()}
                        helperText={isLateCheckin && !checkinNote.trim() ? "Vui lòng nhập lý do check-in muộn" : ""}
                        sx={{ mt: 2 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        setShowCheckinModal(false);
                        setOpeningCashInput('');
                        setCheckinNote('');
                        setIsLateCheckin(false);
                    }}>Hủy</Button>
                    <Button
                        variant="contained"
                        color="success"
                        onClick={async () => {
                            // Kiểm tra lại có lịch làm việc hôm nay không
                            if (!hasTodaySchedule) {
                                ToastNotification.error('Bạn không có lịch làm việc hôm nay. Vui lòng liên hệ quản lý để được phân công lịch.');
                                setShowCheckinModal(false);
                                return;
                            }

                            const open = Number(openingCashInput);
                            if (isNaN(open) || open < 0) {
                                ToastNotification.error('Vui lòng nhập số tiền hợp lệ');
                                return;
                            }

                            // Kiểm tra note bắt buộc khi check-in muộn
                            if (isLateCheckin && !checkinNote.trim()) {
                                ToastNotification.error('Vui lòng nhập lý do check-in muộn');
                                return;
                            }

                            const storedStoreId = (() => {
                                if (user && user.store_id) return user.store_id;
                                try { const persisted = localStorage.getItem('store_id'); if (persisted) return Number(persisted); } catch { }
                                return 1;
                            })();

                            // Gửi schedule_id nếu đã chọn (ưu tiên ca chưa check-in)
                            const checkinData = {
                                store_id: storedStoreId,
                                opening_cash: open,
                                note: checkinNote.trim() || null
                            };
                            if (selectedScheduleId) {
                                checkinData.schedule_id = selectedScheduleId;
                                console.log('Check-in với schedule_id:', selectedScheduleId);
                            } else {
                                console.warn('Không có selectedScheduleId, backend sẽ tự động chọn schedule');
                            }

                            console.log('Check-in data:', checkinData);
                            const resp = await checkinShift(checkinData);
                            if (resp && resp.err === 0 && resp.data) {
                                // Cập nhật ngay lập tức từ response để hiển thị trên header
                                setIsShiftActive(true);
                                setShiftId(resp.data.shift_id);
                                setOpeningCash(String(resp.data.opening_cash || open));
                                setCashSalesTotal(Number(resp.data.cash_sales_total || 0));
                                setBankTransferTotal(Number(resp.data.bank_transfer_total || 0));
                                setTotalSales(Number(resp.data.total_sales || 0));

                                // Refresh lại để đảm bảo có data mới nhất
                                await refreshOpenShift();

                                setShowCheckinModal(false);
                                setOpeningCashInput(''); // Reset input cho lần mở modal sau
                                setCheckinNote(''); // Reset note
                                setIsLateCheckin(false); // Reset late check-in flag
                                ToastNotification.success('Bắt đầu ca thành công!');
                            } else {
                                ToastNotification.error(resp?.msg || 'Không thể bắt đầu ca');
                            }
                        }}
                    >
                        Xác nhận bắt đầu ca
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Checkout (End shift) Modal */}
            <Dialog open={showCheckoutModal} onClose={() => setShowCheckoutModal(false)}>
                <DialogTitle>Kết ca làm việc</DialogTitle>
                <DialogContent>
                    <Box sx={{ mb: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2">Tiền đầu ca:</Typography>
                            <Typography variant="body2" fontWeight="bold">{formatCurrency(Number(openingCash || 0))}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2">Tổng số tiền đã bán trong ca (Tiền mặt + chuyển khoản):</Typography>
                            <Typography variant="body2" fontWeight="bold">{formatCurrency(totalSales)}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, ml: 3 }}>
                            <Typography variant="caption" color="text.secondary">• Tiền mặt:</Typography>
                            <Typography variant="caption" color="text.secondary">{formatCurrency(cashSalesTotal)}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, ml: 3 }}>
                            <Typography variant="caption" color="text.secondary">• Chuyển khoản:</Typography>
                            <Typography variant="caption" color="text.secondary">{formatCurrency(bankTransferTotal)}</Typography>
                        </Box>
                        <Divider sx={{ my: 2 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2">Tiền mặt dự kiến trong két:</Typography>
                            <Typography variant="body2" fontWeight="bold">{formatCurrency(expectedCashAtClose)}</Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 3, display: 'block' }}>
                            (Tiền đầu ca + Tổng bán tiền mặt)
                        </Typography>
                    </Box>
                    <TextField
                        fullWidth
                        type="number"
                        inputProps={{ min: 0 }}
                        label="Kiểm đếm thực tế (VND)"
                        placeholder="Nhập số tiền thực tế trong két"
                        value={closingCashInput}
                        onChange={(e) => setClosingCashInput(e.target.value)}
                        autoFocus
                        sx={{ mt: 1 }}
                    />
                    {closingCashInput !== '' && (
                        <Box sx={{ mt: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2">Chênh lệch:</Typography>
                                <Typography variant="body2" fontWeight="bold" color={Number(closingCashInput) === expectedCashAtClose ? 'success.main' : 'error.main'}>
                                    {formatCurrency(Number(closingCashInput || 0) - expectedCashAtClose)}
                                </Typography>
                            </Box>
                        </Box>
                    )}
                    <TextField
                        fullWidth
                        multiline
                        minRows={2}
                        label="Ghi chú kết ca"
                        placeholder="Nhập lý do nếu kết ca sớm hơn giờ quy định (±5 phút)"
                        value={checkoutNote}
                        onChange={(e) => setCheckoutNote(e.target.value)}
                        sx={{ mt: 2 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowCheckoutModal(false)}>Hủy</Button>
                    <Button
                        variant="contained"
                        color="warning"
                        onClick={async () => {
                            const actual = Number(closingCashInput);
                            if (isNaN(actual) || actual < 0) {
                                ToastNotification.error('Vui lòng nhập số tiền hợp lệ');
                                return;
                            }
                            if (!shiftId) {
                                ToastNotification.error('Không tìm thấy ca làm việc');
                                return;
                            }
                            const resp = await checkoutShift({ 
                                shift_id: shiftId, 
                                closing_cash: actual,
                                note: checkoutNote && checkoutNote.trim() ? checkoutNote.trim() : null
                            });
                            if (resp && resp.err === 0) {
                                setIsShiftActive(false);
                                setShiftId(null);
                                setCashSalesTotal(0);
                                setBankTransferTotal(0);
                                setTotalSales(0);
                                setOpeningCash('');
                                setClosingCashInput('');
                                setCheckoutNote('');

                                // Refresh schedules để kiểm tra có ca tiếp theo không
                                const todaySchedules = await loadTodaySchedules();
                                processSchedules(todaySchedules);

                                setShowCheckoutModal(false);
                                ToastNotification.success('Kết ca thành công!');
                            } else {
                                ToastNotification.error(resp?.msg || 'Không thể kết ca');
                            }
                        }}
                    >
                        Xác nhận kết ca
                    </Button>
                </DialogActions>
            </Dialog>
            {/* Payment Modal for QR */}
            <PaymentModal
                show={showPaymentModal}
                onHide={() => {
                    setShowPaymentModal(false);
                    setQrPaymentData(null);
                    setSelectedPaymentMethod(null);
                    setIsProcessingPayment(false);
                }}
                paymentData={qrPaymentData}
                onPaymentSuccess={handleQRPaymentSuccess}
                onPrintInvoice={handlePrintInvoice}
            />

            {/* Clear Cart Confirmation Modal */}
            <Dialog open={showClearCartModal} onClose={() => setShowClearCartModal(false)}>
                <DialogTitle>Xác nhận xóa giỏ hàng</DialogTitle>
                <DialogContent>
                    <Typography variant="body1" gutterBottom>Bạn có chắc chắn muốn xóa toàn bộ sản phẩm trong giỏ hàng?</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Tổng cộng: <strong>{cart.length}</strong> sản phẩm - <strong>{formatCurrency(subtotal)}</strong>
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowClearCartModal(false)}>
                        Hủy
                    </Button>
                    <Button variant="contained" color="error" startIcon={<DeleteIcon />} onClick={handleClearCart}>
                        Xóa giỏ hàng
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default POS;
