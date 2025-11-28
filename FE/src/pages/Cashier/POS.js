
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Form, Button, InputGroup, Modal, ListGroup, Spinner } from 'react-bootstrap';
import {
    FaSearch, FaQrcode, FaCartPlus,
    FaShoppingCart, FaUserCircle, FaTimes, FaSignInAlt, FaSignOutAlt,
    FaMoneyBillWave, FaCreditCard, FaTicketAlt
} from 'react-icons/fa';
import '../../assets/POS.css';
import { getProductsByStore, getProduct } from '../../api/productApi';
import { checkoutCart } from '../../api/transactionApi';
import { getMyOpenShift, checkinShift, checkoutShift } from '../../api/shiftApi';
import { getMySchedules } from '../../api/scheduleApi';
import { useAuth } from '../../contexts/AuthContext';
import { searchCustomerByPhone, createCustomer } from '../../api/customerApi';
import { getAvailableVouchers, validateVoucher, updateCustomerLoyaltyPoints, generateVouchersForCustomer } from '../../api/voucherApi';
import { createCashPayment, createQRPayment } from '../../api/paymentApi';
import PaymentModal from '../../components/PaymentModal';
import CashPaymentModal from '../../components/CashPaymentModal';
import { toast } from 'react-toastify';

// Hàm helper để format tiền tệ
const formatCurrency = (number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(number);
}


const POS = () => {
    const { user } = useAuth();
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newCustomer, setNewCustomer] = useState({
        name: '',
        phone: '',
        email: ''
    });
    const [vouchers, setVouchers] = useState([]);
    const [selectedVoucher, setSelectedVoucher] = useState(null);
    const [loadingVouchers, setLoadingVouchers] = useState(false);

    // Payment states
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null); // 'cash' or 'qr'
    const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' or 'bank_transfer'
    const [paymentReference, setPaymentReference] = useState(''); // For bank transfer
    const [paymentGiven, setPaymentGiven] = useState(''); // Cash amount given by customer
    const [checkoutMessage, setCheckoutMessage] = useState(''); // Checkout status message
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
    const [cashSalesTotal, setCashSalesTotal] = useState(0); // tổng bán bằng tiền mặt trong ca
    const [bankTransferTotal, setBankTransferTotal] = useState(0); // tổng bán bằng chuyển khoản trong ca
    const [totalSales, setTotalSales] = useState(0); // tổng doanh thu (tiền mặt + chuyển khoản)
    const [showCheckinModal, setShowCheckinModal] = useState(false);
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    const [closingCashInput, setClosingCashInput] = useState('');
    const [scheduleAttendanceStatus, setScheduleAttendanceStatus] = useState(null); // Lưu trạng thái điểm danh từ schedule
    const [hasTodaySchedule, setHasTodaySchedule] = useState(false); // Kiểm tra có lịch làm việc hôm nay không

    // Load trạng thái ca từ API (open shift) và check schedule attendance_status
    useEffect(() => {
        const fetchOpenShift = async () => {
            const storedStoreId = (() => {
                if (user && user.store_id) return user.store_id;
                try { const persisted = localStorage.getItem('store_id'); if (persisted) return Number(persisted); } catch {}
                return 1;
            })();
            const resp = await getMyOpenShift(storedStoreId);
            if (resp && resp.err === 0 && resp.data) {
                setIsShiftActive(true);
                setShiftId(resp.data.shift_id);
                setOpeningCash(String(resp.data.opening_cash || 0));
                setCashSalesTotal(Number(resp.data.cash_sales_total || 0));
                setBankTransferTotal(Number(resp.data.bank_transfer_total || 0));
                setTotalSales(Number(resp.data.total_sales || 0));
                // Lưu attendance_status từ schedule nếu có
                if (resp.data.schedule && resp.data.schedule.attendance_status) {
                    setScheduleAttendanceStatus(resp.data.schedule.attendance_status);
                    setHasTodaySchedule(true); // Có schedule vì đã check-in thành công
                } else {
                    // Có shift nhưng không có schedule info, vẫn cần check schedule
                    const today = new Date().toISOString().split('T')[0];
                    try {
                        const scheduleResp = await getMySchedules(today, today);
                        if (scheduleResp && scheduleResp.err === 0 && scheduleResp.data && scheduleResp.data.length > 0) {
                            const todaySchedule = scheduleResp.data.find(s => s.work_date === today);
                            if (todaySchedule) {
                                setHasTodaySchedule(true);
                                setScheduleAttendanceStatus(todaySchedule.attendance_status || null);
                            } else {
                                setHasTodaySchedule(false);
                                setScheduleAttendanceStatus(null);
                            }
                        } else {
                            setHasTodaySchedule(false);
                            setScheduleAttendanceStatus(null);
                        }
                    } catch (e) {
                        setHasTodaySchedule(false);
                        setScheduleAttendanceStatus(null);
                    }
                }
            } else {
                setIsShiftActive(false);
                setShiftId(null);
                setCashSalesTotal(0);
                setBankTransferTotal(0);
                setTotalSales(0);
                // Check schedule của ngày hôm nay để xem đã checkout chưa
                const today = new Date().toISOString().split('T')[0];
                try {
                    const scheduleResp = await getMySchedules(today, today);
                    console.log('Schedule response:', scheduleResp);
                    if (scheduleResp && scheduleResp.err === 0 && scheduleResp.data && scheduleResp.data.length > 0) {
                        // Lấy tất cả các ca của ngày hôm nay
                        const todaySchedules = scheduleResp.data.filter(s => s.work_date === today);
                        console.log('Today schedules:', todaySchedules);
                        
                    if (todaySchedules.length > 0) {
                        // Ưu tiên: checked_in > null/chưa check-in > checked_out > absent
                        // Tìm ca đang active (checked_in) trước
                        let selectedSchedule = todaySchedules.find(s => s.attendance_status === 'checked_in');
                        
                        // Nếu không có ca đang active, tìm ca chưa check-in (null hoặc không có status) - ưu tiên cao hơn checked_out
                        if (!selectedSchedule) {
                            selectedSchedule = todaySchedules.find(s => 
                                !s.attendance_status || 
                                s.attendance_status === null || 
                                s.attendance_status === ''
                            );
                        }
                        
                        // Nếu không có ca chưa check-in, tìm ca đã checkout
                        if (!selectedSchedule) {
                            selectedSchedule = todaySchedules.find(s => s.attendance_status === 'checked_out');
                        }
                        
                        // Nếu tất cả các ca đều absent, mới coi là absent
                        if (!selectedSchedule) {
                            const allAbsent = todaySchedules.every(s => s.attendance_status === 'absent');
                            if (allAbsent) {
                                console.log('All schedules are absent');
                                setHasTodaySchedule(false);
                                setScheduleAttendanceStatus('absent');
                            } else {
                                // Có ít nhất 1 ca không phải absent, tìm ca không phải absent đầu tiên
                                selectedSchedule = todaySchedules.find(s => s.attendance_status !== 'absent');
                                if (selectedSchedule) {
                                    console.log('Using first non-absent schedule:', selectedSchedule);
                                    setHasTodaySchedule(true);
                                    setScheduleAttendanceStatus(selectedSchedule.attendance_status || null);
                                } else {
                                    // Fallback: lấy ca đầu tiên
                                    selectedSchedule = todaySchedules[0];
                                    console.log('Using first schedule (fallback):', selectedSchedule);
                                    setHasTodaySchedule(true);
                                    setScheduleAttendanceStatus(selectedSchedule.attendance_status || null);
                                }
                            }
                        } else {
                            console.log('Selected schedule:', selectedSchedule);
                            setHasTodaySchedule(true);
                            if (selectedSchedule.attendance_status === 'checked_out') {
                                setScheduleAttendanceStatus('checked_out');
                            } else {
                                setScheduleAttendanceStatus(selectedSchedule.attendance_status || null);
                            }
                        }
                    } else {
                            console.log('No schedule found for today');
                            setHasTodaySchedule(false);
                            setScheduleAttendanceStatus(null);
                        }
                    } else {
                        console.log('No schedule data in response');
                        setHasTodaySchedule(false);
                        setScheduleAttendanceStatus(null);
                    }
                } catch (e) {
                    console.error('Error fetching schedule:', e);
                    setHasTodaySchedule(false);
                    setScheduleAttendanceStatus(null);
                }
            }
        };
        fetchOpenShift();
    }, [user]);

    const refreshOpenShift = useCallback(async () => {
        const storedStoreId = (() => {
            if (user && user.store_id) return user.store_id;
            try { const persisted = localStorage.getItem('store_id'); if (persisted) return Number(persisted); } catch {}
            return 1;
        })();
        const resp = await getMyOpenShift(storedStoreId);
        if (resp && resp.err === 0 && resp.data) {
            console.log('Refresh shift data:', {
                cash_sales_total: resp.data.cash_sales_total,
                bank_transfer_total: resp.data.bank_transfer_total,
                total_sales: resp.data.total_sales
            });
            setIsShiftActive(true);
            setShiftId(resp.data.shift_id);
            setOpeningCash(String(resp.data.opening_cash || 0));
            setCashSalesTotal(Number(resp.data.cash_sales_total || 0));
            setBankTransferTotal(Number(resp.data.bank_transfer_total || 0));
            setTotalSales(Number(resp.data.total_sales || 0));
            // Lưu attendance_status từ schedule nếu có
            if (resp.data.schedule && resp.data.schedule.attendance_status) {
                setScheduleAttendanceStatus(resp.data.schedule.attendance_status);
                setHasTodaySchedule(true);
            } else {
                // Có shift nhưng không có schedule info, vẫn cần check schedule
                const today = new Date().toISOString().split('T')[0];
                try {
                    const scheduleResp = await getMySchedules(today, today);
                    if (scheduleResp && scheduleResp.err === 0 && scheduleResp.data && scheduleResp.data.length > 0) {
                        const todaySchedule = scheduleResp.data.find(s => s.work_date === today);
                        if (todaySchedule) {
                            setHasTodaySchedule(true);
                            setScheduleAttendanceStatus(todaySchedule.attendance_status || null);
                        } else {
                            setHasTodaySchedule(false);
                            setScheduleAttendanceStatus(null);
                        }
                    } else {
                        setHasTodaySchedule(false);
                        setScheduleAttendanceStatus(null);
                    }
                } catch (e) {
                    setHasTodaySchedule(false);
                    setScheduleAttendanceStatus(null);
                }
            }
        } else {
            setIsShiftActive(false);
            setShiftId(null);
            setCashSalesTotal(0);
            setBankTransferTotal(0);
            setTotalSales(0);
            setOpeningCash('');
            // Check schedule của ngày hôm nay để xem đã checkout chưa
            const today = new Date().toISOString().split('T')[0];
            try {
                const scheduleResp = await getMySchedules(today, today);
                if (scheduleResp && scheduleResp.err === 0 && scheduleResp.data && scheduleResp.data.length > 0) {
                    // Lấy tất cả các ca của ngày hôm nay
                    const todaySchedules = scheduleResp.data.filter(s => s.work_date === today);
                    
                    if (todaySchedules.length > 0) {
                        // Ưu tiên: checked_in > null/chưa check-in > checked_out > absent
                        let selectedSchedule = todaySchedules.find(s => s.attendance_status === 'checked_in');
                        
                        // Nếu không có ca đang active, tìm ca chưa check-in (null hoặc không có status) - ưu tiên cao hơn checked_out
                        if (!selectedSchedule) {
                            selectedSchedule = todaySchedules.find(s => 
                                !s.attendance_status || 
                                s.attendance_status === null || 
                                s.attendance_status === ''
                            );
                        }
                        
                        // Nếu không có ca chưa check-in, tìm ca đã checkout
                        if (!selectedSchedule) {
                            selectedSchedule = todaySchedules.find(s => s.attendance_status === 'checked_out');
                        }
                        
                        if (!selectedSchedule) {
                            const allAbsent = todaySchedules.every(s => s.attendance_status === 'absent');
                            if (allAbsent) {
                                setHasTodaySchedule(false);
                                setScheduleAttendanceStatus('absent');
                            } else {
                                // Có ít nhất 1 ca không phải absent, tìm ca không phải absent đầu tiên
                                selectedSchedule = todaySchedules.find(s => s.attendance_status !== 'absent');
                                if (selectedSchedule) {
                                    setHasTodaySchedule(true);
                                    setScheduleAttendanceStatus(selectedSchedule.attendance_status || null);
                                } else {
                                    // Fallback: lấy ca đầu tiên
                                    selectedSchedule = todaySchedules[0];
                                    setHasTodaySchedule(true);
                                    setScheduleAttendanceStatus(selectedSchedule.attendance_status || null);
                                }
                            }
                        } else {
                            setHasTodaySchedule(true);
                            if (selectedSchedule.attendance_status === 'checked_out') {
                                setScheduleAttendanceStatus('checked_out');
                            } else {
                                setScheduleAttendanceStatus(selectedSchedule.attendance_status || null);
                            }
                        }
                    } else {
                        setHasTodaySchedule(false);
                        setScheduleAttendanceStatus(null);
                    }
                } else {
                    setHasTodaySchedule(false);
                    setScheduleAttendanceStatus(null);
                }
            } catch (e) {
                setHasTodaySchedule(false);
                setScheduleAttendanceStatus(null);
            }
        }
    }, [user]);

    // Auto-refresh shift data mỗi 10 giây để cập nhật realtime
    useEffect(() => {
        if (!isShiftActive) return; // Chỉ refresh khi đang trong ca
        
        const interval = setInterval(() => {
            refreshOpenShift();
        }, 10000); // Refresh mỗi 10 giây

        return () => clearInterval(interval);
    }, [isShiftActive, refreshOpenShift]);

    // Tải sản phẩm theo store_id của cashier
    useEffect(() => {
        const load = async () => {
            // Ưu tiên lấy store_id từ user (nếu backend cung cấp), fallback từ localStorage hoặc 1 để test
            const storedStoreId = (() => {
                if (user && user.store_id) return user.store_id;
                try {
                    const persisted = localStorage.getItem('store_id');
                    if (persisted) return Number(persisted);
                } catch {}
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
                        oldPrice: currentPrice !== hqPrice ? hqPrice : undefined,
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

        return filtered;
    }, [products, searchTerm]);

    // Thêm sản phẩm vào giỏ
    const handleAddToCart = (product) => {
        setCart(currentCart => {
            const itemInCart = currentCart.find(item => item.id === product.id);
            if (itemInCart) {
                // Tăng số lượng
                toast.info(`Đã thêm ${product.name} (số lượng: ${itemInCart.qty + 1})`);
                return currentCart.map(item =>
                    item.id === product.id ? { ...item, qty: item.qty + 1 } : item
                );
            } else {
                // Thêm mới
                toast.success(`Đã thêm ${product.name} vào giỏ hàng`);
                return [...currentCart, { ...product, qty: 1 }];
            }
        });
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
    useEffect(() => {
        const delaySearch = setTimeout(() => {
            if (customerPhone.trim().length >= 3) {
                handleSearchCustomer();
            } else {
                setSearchResults([]);
                setShowCreateForm(false);
            }
        }, 500); // Debounce 500ms

        return () => clearTimeout(delaySearch);
    }, [customerPhone]);

    // Xử lý tìm kiếm khách hàng
    const handleSearchCustomer = async () => {
        setIsSearching(true);
        try {
            const res = await searchCustomerByPhone(customerPhone);
            if (res && res.err === 0) {
                setSearchResults(res.data || []);
                setShowCreateForm(false);
            } else {
                setSearchResults([]);
                // Nếu không tìm thấy và đủ 10 số, hiển thị form tạo mới
                if (customerPhone.trim().length >= 10) {
                    setShowCreateForm(true);
                    setNewCustomer(prev => ({ ...prev, phone: customerPhone }));
                }
            }
        } catch (error) {
            console.error('Error searching customer:', error);
            toast.error('Lỗi khi tìm kiếm khách hàng');
        } finally {
            setIsSearching(false);
        }
    };

    // Xử lý chọn khách hàng
    const handleSelectCustomer = async (customer) => {
        setSelectedCustomer(customer);
        setCustomerPhone('');
        setSearchResults([]);
        setShowCreateForm(false);
        toast.success(`Đã chọn khách hàng: ${customer.name}`);

        // Load vouchers for selected customer
        await loadCustomerVouchers(customer.customer_id);
    };

    // Load vouchers for customer
    const loadCustomerVouchers = async (customerId) => {
        setLoadingVouchers(true);
        try {
            console.log('Loading vouchers for customer:', customerId);
            const res = await getAvailableVouchers(customerId);
            console.log('Vouchers response:', res);

            if (res && res.err === 0) {
                setVouchers(res.data || []);
                console.log('Vouchers loaded:', res.data?.length || 0);

                // Nếu không có voucher nào, tự động tạo voucher cho khách hàng
                if (res.data.length === 0) {
                    console.log('No vouchers found, generating...');
                    toast.info('Đang tạo voucher cho khách hàng...');
                    const generateRes = await generateVouchersForCustomer(customerId);
                    console.log('Generate vouchers response:', generateRes);

                    if (generateRes && generateRes.err === 0) {
                        toast.success(generateRes.msg);
                        // Reload vouchers
                        const reloadRes = await getAvailableVouchers(customerId);
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
            toast.warning('Vui lòng thêm sản phẩm vào giỏ hàng trước khi áp dụng voucher');
            return;
        }

        // Check minimum purchase amount
        if (subtotal < voucher.min_purchase_amount) {
            toast.error(`Đơn hàng tối thiểu ${formatCurrency(voucher.min_purchase_amount)} để sử dụng voucher này`);
            return;
        }

        try {
            const res = await validateVoucher(voucher.voucher_code, selectedCustomer.customer_id, subtotal);
            if (res && res.err === 0) {
                setSelectedVoucher(voucher);
                toast.success(`Đã áp dụng voucher: ${voucher.voucher_name}`);
            } else {
                toast.error(res.msg || 'Không thể áp dụng voucher');
            }
        } catch (error) {
            console.error('Error validating voucher:', error);
            toast.error('Lỗi khi áp dụng voucher');
        }
    };

    // Xử lý hủy voucher
    const handleRemoveVoucher = () => {
        setSelectedVoucher(null);
        toast.info('Đã hủy áp dụng voucher');
    };

    // Xử lý chọn phương thức thanh toán
    const handleSelectPaymentMethod = (method) => {
        setSelectedPaymentMethod(method);
    };

    // Xử lý thanh toán
    const handleCheckout = async () => {
        // Kiểm tra ca làm việc
        if (!isShiftActive) {
            toast.error('Vui lòng bắt đầu ca làm việc trước khi thanh toán');
            return;
        }

        if (cart.length === 0) {
            toast.warning('Giỏ hàng trống');
            return;
        }

        if (!selectedPaymentMethod) {
            toast.warning('Vui lòng chọn phương thức thanh toán');
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
                    toast.error(res.msg || 'Không thể tạo mã QR thanh toán');
                }
            }

        } catch (error) {
            console.error('Error during checkout:', error);
            toast.error('Lỗi khi thanh toán');
        } finally {
            setIsProcessingPayment(false);
        }
    };

    // Xử lý khi thanh toán QR thành công
    const handleQRPaymentSuccess = async (transactionId) => {
        toast.success('Thanh toán QR thành công!');

        // Refresh shift data to update sales totals (wait a bit for backend to commit)
        await new Promise(resolve => setTimeout(resolve, 300));
        await refreshOpenShift();

        // Reload customer data and vouchers (loyalty points already updated by webhook)
        if (selectedCustomer) {
            // Fetch updated customer info
            const customerRes = await searchCustomerByPhone(selectedCustomer.phone);
            if (customerRes && customerRes.err === 0 && customerRes.data) {
                setSelectedCustomer(customerRes.data);
                toast.info(`Điểm tích lũy mới: ${customerRes.data.loyalty_point || 0} điểm`);
            }

            // Reload vouchers
            await loadCustomerVouchers(selectedCustomer.customer_id);
        }

        // Clear cart and reset
        setCart([]);
        setSelectedVoucher(null);
        setSelectedPaymentMethod(null);
    };

    // Xử lý in hóa đơn
    const handlePrintInvoice = async (transactionId) => {
        try {
            const { generateAndPrintInvoice } = await import('../utils/invoicePDF');
            await generateAndPrintInvoice(transactionId);
            toast.success('Đang mở cửa sổ in...');
        } catch (error) {
            console.error('Error printing invoice:', error);
            toast.error('Lỗi khi in hóa đơn');
        }
    };

    // Xử lý tạo khách hàng mới
    const handleCreateCustomer = async () => {
        if (!newCustomer.name || !newCustomer.phone) {
            toast.error('Vui lòng nhập tên và số điện thoại');
            return;
        }

        try {
            const res = await createCustomer(newCustomer);
            if (res && res.err === 0) {
                toast.success('Tạo khách hàng thành công');
                handleSelectCustomer(res.data);
            } else {
                toast.error(res.msg || 'Tạo khách hàng thất bại');
            }
        } catch (error) {
            console.error('Error creating customer:', error);
            toast.error('Lỗi khi tạo khách hàng');
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
                toast.success('Thanh toán thành công!');

                // Update cash payment data with transaction info
                setCashPaymentData(prev => ({
                    ...prev,
                    transaction_id: res.data?.transaction_id,
                    payment_id: res.data?.payment_id
                }));

                // Refresh shift data to update sales totals (wait a bit for backend to commit)
                await new Promise(resolve => setTimeout(resolve, 300));
                await refreshOpenShift();

                // Reload customer data if customer is selected
                if (selectedCustomer) {
                    await loadCustomerVouchers(selectedCustomer.customer_id);
                    // Fetch updated customer info
                    const customerRes = await searchCustomerByPhone(selectedCustomer.phone);
                    if (customerRes && customerRes.err === 0 && customerRes.data) {
                        setSelectedCustomer(customerRes.data);
                    }
                }

                // Clear cart and reset
                setCart([]);
                setSelectedVoucher(null);
                setSelectedPaymentMethod(null);
            } else {
                toast.error(res?.msg || 'Thanh toán thất bại');
            }
        } catch (error) {
            console.error('Error completing cash payment:', error);
            toast.error('Lỗi khi hoàn thành thanh toán: ' + error.message);
        }
    };

    // Helper function để lấy màu badge theo tier
    const getTierBadgeColor = (tier) => {
        switch (tier?.toLowerCase()) {
            case 'gold': return 'warning';
            case 'silver': return 'secondary';
            case 'bronze': return 'danger';
            default: return 'primary';
        }
    };


    return (
        <div className="pos-container">
            {/* ------------------- BÊN TRÁI: SẢN PHẨM ------------------- */}
            <div
                className="pos-main"
                style={{
                    flex: '0 0 40%',
                    maxWidth: '40%',
                    minWidth: '320px'
                }}
            >
                {/* Header */}
                <header className="pos-header d-flex justify-content-between align-items-center">
                    
                    <div className="d-flex align-items-center gap-2">
                        {isShiftActive ? (
                            <>
                                <div className="me-2 small">
                                    Đang trong ca • Tiền đầu ca: <strong>{formatCurrency(Number(openingCash || 0))}</strong> • Số tiền đã bán được: <strong>{formatCurrency(totalSales)}</strong> (Tiền mặt: {formatCurrency(cashSalesTotal)}, Chuyển khoản: {formatCurrency(bankTransferTotal)})
                                </div>
                                <Button variant="warning" size="sm" onClick={() => { setClosingCashInput(''); setShowCheckoutModal(true); }}>
                                    <FaSignOutAlt className="me-1" /> Kết ca
                                </Button>
                            </>
                        ) : scheduleAttendanceStatus === 'checked_out' ? (
                            <div className="text-muted small">
                                Đã kết ca hôm nay
                            </div>
                        ) : scheduleAttendanceStatus === 'absent' || !hasTodaySchedule ? (
                            <div className="text-muted small">
                                Không có lịch làm việc
                                {/* Debug: hasTodaySchedule={String(hasTodaySchedule)}, status={String(scheduleAttendanceStatus)} */}
                            </div>
                        ) : (
                            <Button variant="success" size="sm" onClick={() => {
                                setOpeningCashInput('');
                                setShowCheckinModal(true);
                            }}>
                                <FaSignInAlt className="me-1" /> Bắt đầu ca (Check-in)
                            </Button>
                        )}
                    </div>
                </header>

                {/* Search */}
                <div className="pos-search">
                    <InputGroup>
                        <InputGroup.Text><FaSearch /></InputGroup.Text>
                        <Form.Control
                            type="text"
                            placeholder="Tìm kiếm sản phẩm hoặc mã vạch..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Button variant="light" className="btn-scan">
                            <FaQrcode className="me-2" /> Quét mã
                        </Button>
                    </InputGroup>
                </div>

                {/* Product List */}
                <div className="pos-product-list">
                    {filteredProducts.length === 0 ? (
                        <div className="text-center py-4 text-muted">
                            {!searchTerm ? (
                                <>
                                    <p>Nhập tên sản phẩm hoặc mã vạch để tìm kiếm</p>
                                    <small>Danh sách sản phẩm sẽ hiển thị khi bạn tìm kiếm</small>
                                </>
                            ) : (
                                <>
                                    <p>Không tìm thấy sản phẩm</p>
                                    <small>Không tìm thấy sản phẩm phù hợp với "{searchTerm}"</small>
                                </>
                            )}
                        </div>
                    ) : (
                        filteredProducts.map(product => (
                            <div
                                className="product-item"
                                key={product.id}
                                onClick={() => handleAddToCart(product)}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="d-flex justify-content-between align-items-start">
                                    <div>
                                        <span className="product-name d-block">{product.name}</span>
                                        {product.oldPrice && (
                                            <span className="product-price-old">{formatCurrency(product.oldPrice)}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="d-flex justify-content-between align-items-center mt-2">
                                    <span className="product-price mb-0">{formatCurrency(product.price)}</span>
                                    <Button
                                        variant="outline-primary"
                                        size="sm"
                                        className="btn-add-product"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleAddToCart(product);
                                        }}
                                    >
                                        + Thêm
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div
                className="pos-cart"
                style={{
                    flex: '0 0 60%',
                    maxWidth: '60%',
                    minWidth: '360px'
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
                <div className="cart-customer px-3 py-2 bg-light border-bottom">
                    <div className="small fw-semibold text-muted mb-2">
                        <FaUserCircle className="me-1" /> Thông tin khách hàng
                    </div>

                    {selectedCustomer ? (
                        <div className="d-flex justify-content-between align-items-center">
                            <div className="flex-grow-1">
                                <div className="fw-bold">{selectedCustomer.name}</div>
                                <div className="small text-muted">{selectedCustomer.phone}</div>
                                <div className="mt-1">
                                    <span className="badge bg-primary" style={{ fontSize: '10px' }}>
                                        {selectedCustomer.tier}
                                    </span>
                                    <span className="ms-2 small text-muted">
                                        {selectedCustomer.loyalty_point || 0} điểm
                                    </span>
                                </div>
                            </div>
                            <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => {
                                    setSelectedCustomer(null);
                                    setCustomerPhone('');
                                    setSearchResults([]);
                                    setShowCreateForm(false);
                                    setVouchers([]);
                                    setSelectedVoucher(null);
                                }}
                            >
                                <FaTimes />
                            </Button>
                        </div>
                    ) : (
                        <>
                            <InputGroup className="mb-2">
                                <InputGroup.Text>
                                    <FaSearch />
                                </InputGroup.Text>
                                <Form.Control
                                    type="tel"
                                    placeholder="Nhập số điện thoại khách hàng..."
                                    value={customerPhone}
                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                    autoComplete="off"
                                />
                                {customerPhone && (
                                    <Button
                                        variant="outline-secondary"
                                        onClick={() => {
                                            setCustomerPhone('');
                                            setSearchResults([]);
                                            setShowCreateForm(false);
                                        }}
                                    >
                                        <FaTimes />
                                    </Button>
                                )}
                            </InputGroup>

                            {/* Loading Spinner */}
                            {isSearching && (
                                <div className="text-center py-2">
                                    <Spinner animation="border" size="sm" />
                                    <small className="text-muted ms-2">Đang tìm kiếm...</small>
                                </div>
                            )}

                            {/* Customer Search Results */}
                            {!isSearching && searchResults.length > 0 && (
                                <div className="mb-2">
                                    <small className="text-muted">Kết quả tìm kiếm:</small>
                                    <ListGroup style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                        {searchResults.map((customer) => (
                                            <ListGroup.Item
                                                key={customer.customer_id}
                                                action
                                                onClick={() => handleSelectCustomer(customer)}
                                                style={{ cursor: 'pointer', padding: '8px 12px' }}
                                            >
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <div>
                                                        <div className="d-flex align-items-center gap-2">
                                                            <FaUserCircle size={20} className="text-secondary" />
                                                            <div>
                                                                <strong style={{ fontSize: '14px' }}>{customer.name}</strong>
                                                                <br />
                                                                <small className="text-muted">{customer.phone}</small>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-end">
                                                        <span className={`badge bg-${getTierBadgeColor(customer.tier)}`}>
                                                            {customer.tier}
                                                        </span>
                                                        <br />
                                                        <small className="text-muted">
                                                            {customer.loyalty_point || 0} điểm
                                                        </small>
                                                    </div>
                                                </div>
                                            </ListGroup.Item>
                                        ))}
                                    </ListGroup>
                                </div>
                            )}

                            {/* Create New Customer Form */}
                            {showCreateForm && (
                                <div className="p-2 border rounded bg-light mb-2">
                                    <small className="fw-bold mb-2 d-block">Tạo khách hàng mới</small>
                                    <Form>
                                        <Form.Group className="mb-2">
                                            <Form.Control
                                                size="sm"
                                                type="text"
                                                placeholder="Tên khách hàng *"
                                                value={newCustomer.name}
                                                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                                            />
                                        </Form.Group>
                                        <Form.Group className="mb-2">
                                            <Form.Control
                                                size="sm"
                                                type="tel"
                                                placeholder="Số điện thoại *"
                                                value={newCustomer.phone}
                                                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                                            />
                                        </Form.Group>
                                        <Form.Group className="mb-2">
                                            <Form.Control
                                                size="sm"
                                                type="email"
                                                placeholder="Email (tùy chọn)"
                                                value={newCustomer.email}
                                                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                                            />
                                        </Form.Group>
                                        <div className="d-flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="primary"
                                                onClick={handleCreateCustomer}
                                                className="flex-grow-1"
                                            >
                                                Tạo
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline-secondary"
                                                onClick={() => setShowCreateForm(false)}
                                            >
                                                Hủy
                                            </Button>
                                        </div>
                                    </Form>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Voucher Section - Only show when customer is selected */}
                {selectedCustomer && (
                    <div className="cart-voucher px-3 py-2 border-bottom">
                        <div className="small fw-semibold text-muted mb-2">
                            <FaTicketAlt className="me-1" /> Áp mã giảm giá
                        </div>

                        {loadingVouchers ? (
                            <div className="text-center py-2">
                                <Spinner animation="border" size="sm" />
                                <small className="text-muted ms-2">Đang tải voucher...</small>
                            </div>
                        ) : vouchers.length > 0 ? (
                            <>
                                {selectedVoucher ? (
                                    <div className="selected-voucher p-2 border rounded bg-success bg-opacity-10">
                                        <div className="d-flex justify-content-between align-items-center small">
                                            <span className="text-truncate">
                                                <FaTicketAlt className="text-success me-1" size={12} />
                                                <strong>{selectedVoucher.voucher_name}</strong>
                                                {' • '}
                                                {selectedVoucher.discount_type === 'percentage'
                                                    ? `${selectedVoucher.discount_value}%`
                                                    : formatCurrency(selectedVoucher.discount_value)}
                                            </span>
                                            <Button
                                                variant="outline-danger"
                                                size="sm"
                                                onClick={handleRemoveVoucher}
                                                style={{ padding: '1px 6px' }}
                                            >
                                                <FaTimes size={12} />
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ maxHeight: '110px', overflowY: 'auto' }} className="border rounded">
                                        <ListGroup variant="flush">
                                            {vouchers.map((voucher) => {
                                                const isDisabled = cart.length === 0 || subtotal < voucher.min_purchase_amount;
                                                const label = `${voucher.voucher_name} • ${
                                                    voucher.discount_type === 'percentage'
                                                        ? `${voucher.discount_value}%`
                                                        : formatCurrency(voucher.discount_value)
                                                }`;
                                                return (
                                                    <ListGroup.Item
                                                        key={voucher.customer_voucher_id}
                                                        action
                                                        onClick={() => !isDisabled && handleSelectVoucher(voucher)}
                                                        disabled={isDisabled}
                                                        className={`small ${isDisabled ? 'opacity-50' : ''}`}
                                                        style={{
                                                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                            padding: '6px 10px',
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis'
                                                        }}
                                                    >
                                                        {label}
                                                    </ListGroup.Item>
                                                );
                                            })}
                                        </ListGroup>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-2 text-muted">
                                <small>Khách hàng chưa có voucher nào</small>
                            </div>
                        )}
                    </div>
                )}

                {/* Cart Items - Scrollable */}
                <div className="cart-items-list px-3 py-2" style={{
                    flex: '1 1 auto',
                    overflowY: 'auto',
                    maxHeight: 'calc(100vh - 550px)',
                    minHeight: '150px'
                }}>
                    {cart.map(item => (
                        <div className="cart-item border-bottom pb-2 mb-2" key={item.id}>
                            <div className="d-flex justify-content-between align-items-start mb-1">
                                <div className="flex-grow-1">
                                    <div className="fw-bold small">{item.name}</div>
                                    <div className="text-muted" style={{ fontSize: '12px' }}>
                                        {formatCurrency(item.price)} × {item.qty}
                                        {item.stock !== undefined && (
                                            <span className="ms-2 text-info">
                                                (Còn: {item.stock})
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-end">
                                    <div className="fw-bold text-primary small">
                                        {formatCurrency(item.price * item.qty)}
                                    </div>
                                    <FaTimes
                                        className="btn-remove-item text-danger"
                                        onClick={() => handleRemoveFromCart(item.id)}
                                        style={{ cursor: 'pointer', fontSize: '12px' }}
                                    />
                                </div>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                                <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    onClick={() => handleUpdateQty(item.id, item.qty - 1)}
                                    disabled={item.qty <= 1}
                                    style={{ padding: '2px 8px', fontSize: '12px' }}
                                >-</Button>
                                <span className="px-2 fw-bold small">{item.qty}</span>
                                <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    onClick={() => handleUpdateQty(item.id, item.qty + 1)}
                                    disabled={item.stock !== undefined && item.qty >= item.stock}
                                    style={{ padding: '2px 8px', fontSize: '12px' }}
                                >+</Button>
                            </div>
                        </div>
                    ))}
                    {cart.length === 0 && (
                        <div className="text-center py-4 text-muted">
                            <FaShoppingCart size={36} className="mb-2 opacity-25" />
                            <p className="small mb-0">Giỏ hàng trống</p>
                        </div>
                    )}
                </div>

                {/* Cart Summary - Fixed at bottom */}
                <div className="cart-summary-wrapper border-top px-3 py-2 bg-white" style={{
                    flex: '0 0 auto'
                }}>
                    <div className="cart-summary">
                        <div className="d-flex justify-content-between mb-1 small">
                            <span className="text-muted">Tạm tính</span>
                            <span className="fw-semibold">{formatCurrency(subtotal)}</span>
                        </div>
                        <div className="d-flex justify-content-between mb-1 small">
                            <span className="text-muted">VAT (10%)</span>
                            <span className="fw-semibold">{formatCurrency(vat)}</span>
                        </div>
                        {voucherDiscount > 0 && (
                            <div className="d-flex justify-content-between mb-1 text-success small">
                                <span>
                                    <FaTicketAlt className="me-1" size={12} />
                                    Giảm giá
                                </span>
                                <span className="fw-bold">-{formatCurrency(voucherDiscount)}</span>
                            </div>
                        )}
                        <div className="d-flex justify-content-between pt-2 border-top">
                            <strong className="fs-6">Tổng cộng</strong>
                            <strong className="fs-5 text-primary">{formatCurrency(total)}</strong>
                        </div>
                    </div>

                    {/* Payment Method Selection */}
                    {cart.length > 0 && (
                        <div className="payment-method-section mt-2">
                            <label className="form-label fw-semibold small mb-2">Phương thức thanh toán</label>
                            <div className="d-flex gap-2">
                                <Button
                                    variant={selectedPaymentMethod === 'cash' ? 'primary' : 'outline-primary'}
                                    className="flex-fill"
                                    size="sm"
                                    disabled={!isShiftActive}
                                    onClick={() => handleSelectPaymentMethod('cash')}
                                >
                                    <FaMoneyBillWave className="me-1" size={14} />
                                    Tiền mặt
                                </Button>
                                <Button
                                    variant={selectedPaymentMethod === 'qr' ? 'primary' : 'outline-primary'}
                                    className="flex-fill"
                                    size="sm"
                                    disabled={!isShiftActive}
                                    onClick={() => handleSelectPaymentMethod('qr')}
                                >
                                    <FaCreditCard className="me-1" size={14} />
                                    QR Banking
                                </Button>
                            </div>
                        </div>
                    )}

                    <Button
                        variant="success"
                        size="lg"
                        className="w-100 mt-2"
                        disabled={!isShiftActive || cart.length === 0 || !selectedPaymentMethod || isProcessingPayment}
                        onClick={handleCheckout}
                    >
                        {isProcessingPayment ? (
                            <>
                                <Spinner animation="border" size="sm" className="me-2" />
                                Đang xử lý...
                            </>
                        ) : (
                            'Thanh toán'
                        )}
                    </Button>
                    {!isShiftActive && (
                        <div className="text-danger small mt-2 text-center">
                            <strong>⚠️ Chưa bắt đầu ca làm việc.</strong><br />
                            Vui lòng bắt đầu ca (Check-in) trước khi thanh toán.
                        </div>
                    )}
                    {checkoutMessage && <div className="text-success small mt-2">{checkoutMessage}</div>}
                </div>
            </div>

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
            <Modal show={showCheckinModal} onHide={() => {
                setShowCheckinModal(false);
                setOpeningCashInput('');
            }} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Bắt đầu ca làm việc</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group>
                        <Form.Label>Tiền mặt đầu ca (VND)</Form.Label>
                        <Form.Control
                            type="number"
                            min={0}
                            placeholder="Nhập số tiền trong két trước ca"
                            value={openingCashInput}
                            onChange={(e) => setOpeningCashInput(e.target.value)}
                            autoFocus
                        />
                    </Form.Group>
                    <div className="mt-3 text-muted small">
                        Số tiền này sẽ dùng để đối soát khi kết ca.
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => {
                        setShowCheckinModal(false);
                        setOpeningCashInput('');
                    }}>Hủy</Button>
                    <Button
                        variant="success"
                        onClick={async () => {
                            // Kiểm tra lại có lịch làm việc hôm nay không
                            if (!hasTodaySchedule) {
                                toast.error('Bạn không có lịch làm việc hôm nay. Vui lòng liên hệ quản lý để được phân công lịch.');
                                setShowCheckinModal(false);
                                return;
                            }
                            
                            const open = Number(openingCashInput);
                            if (isNaN(open) || open < 0) {
                                toast.error('Vui lòng nhập số tiền hợp lệ');
                                return;
                            }
                            const storedStoreId = (() => {
                                if (user && user.store_id) return user.store_id;
                                try { const persisted = localStorage.getItem('store_id'); if (persisted) return Number(persisted); } catch {}
                                return 1;
                            })();
                            const resp = await checkinShift({ store_id: storedStoreId, opening_cash: open });
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
                                toast.success('Bắt đầu ca thành công!');
                            } else {
                                toast.error(resp?.msg || 'Không thể bắt đầu ca');
                            }
                        }}
                    >
                        Xác nhận bắt đầu ca
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Checkout (End shift) Modal */}
            <Modal show={showCheckoutModal} onHide={() => setShowCheckoutModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Kết ca làm việc</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="mb-3">
                        <div className="d-flex justify-content-between">
                            <span>Tiền đầu ca:</span>
                            <strong>{formatCurrency(Number(openingCash || 0))}</strong>
                        </div>
                        <div className="d-flex justify-content-between">
                            <span>Tổng số tiền đã bán trong ca (Tiền mặt + chuyển khoản):</span>
                            <strong>{formatCurrency(totalSales)}</strong>
                        </div>
                        <div className="d-flex justify-content-between text-muted small ms-3">
                            <span>• Tiền mặt:</span>
                            <span>{formatCurrency(cashSalesTotal)}</span>
                        </div>
                        <div className="d-flex justify-content-between text-muted small ms-3">
                            <span>• Chuyển khoản:</span>
                            <span>{formatCurrency(bankTransferTotal)}</span>
                        </div>
                        <hr />
                        <div className="d-flex justify-content-between">
                            <span>Tiền mặt dự kiến trong két:</span>
                            <strong>{formatCurrency(expectedCashAtClose)}</strong>
                        </div>
                        <div className="text-muted small ms-3">
                            (Tiền đầu ca + Tổng bán tiền mặt)
                        </div>
                    </div>
                    <Form.Group>
                        <Form.Label>Kiểm đếm thực tế (VND)</Form.Label>
                        <Form.Control
                            type="number"
                            min={0}
                            placeholder="Nhập số tiền thực tế trong két"
                            value={closingCashInput}
                            onChange={(e) => setClosingCashInput(e.target.value)}
                            autoFocus
                        />
                    </Form.Group>
                    {closingCashInput !== '' && (
                        <div className="mt-3">
                            <div className="d-flex justify-content-between">
                                <span>Chênh lệch:</span>
                                <strong style={{ color: Number(closingCashInput) === expectedCashAtClose ? '#28a745' : '#dc3545' }}>
                                    {formatCurrency(Number(closingCashInput || 0) - expectedCashAtClose)}
                                </strong>
                            </div>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowCheckoutModal(false)}>Hủy</Button>
                    <Button
                        variant="warning"
                        onClick={async () => {
                            const actual = Number(closingCashInput);
                            if (isNaN(actual) || actual < 0) {
                                toast.error('Vui lòng nhập số tiền hợp lệ');
                                return;
                            }
                            if (!shiftId) {
                                toast.error('Không tìm thấy ca làm việc');
                                return;
                            }
                            const resp = await checkoutShift({ shift_id: shiftId, closing_cash: actual });
                            if (resp && resp.err === 0) {
                                setIsShiftActive(false);
                                setShiftId(null);
                                setCashSalesTotal(0);
                                setBankTransferTotal(0);
                                setTotalSales(0);
                                setOpeningCash('');
                                setClosingCashInput('');
                                setPaymentGiven('');
                                setPaymentReference('');
                                // Đánh dấu đã checkout để không hiển thị nút check-in nữa
                                setScheduleAttendanceStatus('checked_out');
                                setShowCheckoutModal(false);
                                toast.success('Kết ca thành công!');
                            } else {
                                toast.error(resp?.msg || 'Không thể kết ca');
                            }
                        }}
                    >
                        Xác nhận kết ca
                    </Button>
                </Modal.Footer>
            </Modal>
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
        </div>
    );
};

export default POS;
