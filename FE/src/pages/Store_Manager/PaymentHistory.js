import React, { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Grid,
    Card,
    CardContent,
    TextField,
    Button,
    Chip,
    Typography,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    InputAdornment
} from '@mui/material';
import { MaterialReactTable } from 'material-react-table';
import { MRT_Localization_VI } from 'material-react-table/locales/vi';
import {
    CalendarToday as CalendarTodayIcon,
    AttachMoney as AttachMoneyIcon,
    QrCode as QrCodeIcon,
    Print as PrintIcon,
    FileDownload as FileDownloadIcon,
    Search as SearchIcon
} from '@mui/icons-material';
import { ToastNotification } from '../../components/common';
import { getTransactionHistory } from '../../api/paymentApi';
import { getEmployees } from '../../api/employeeApi';
import { getShiftsByDate } from '../../api/shiftApi';
import { useAuth } from '../../contexts/AuthContext';
import { generateAndPrintInvoice } from '../../utils/invoicePDF';
import { exportPaymentHistoryToExcel } from '../../utils/exportExcel';

const PaymentHistory = () => {
    const { user } = useAuth();
    const [transactions, setTransactions] = useState([]);
    const [allTransactions, setAllTransactions] = useState([]); // Store all transactions for filtering
    const [cashiers, setCashiers] = useState([]);
    const [shifts, setShifts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(() => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    });
    const [paymentMethod, setPaymentMethod] = useState('all');
    const [selectedCashier, setSelectedCashier] = useState('all');
    const [selectedShift, setSelectedShift] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchCashiers();
    }, []);

    // Fetch shifts when date or cashier changes
    useEffect(() => {
        const fetchShifts = async () => {
            try {
                const params = {
                    store_id: user?.store_id,
                    date: selectedDate
                };
                if (selectedCashier !== 'all') {
                    params.cashier_id = selectedCashier;
                }
                const response = await getShiftsByDate(params);
                if (response.err === 0) {
                    setShifts(response.data || []);
                } else {
                    setShifts([]);
                }
            } catch (error) {
                console.error('Error fetching shifts:', error);
                setShifts([]);
            }
        };
        fetchShifts();
        setSelectedShift('all'); // Reset shift filter when date/cashier changes
    }, [selectedDate, selectedCashier, user?.store_id]);

    useEffect(() => {
        fetchTransactions();
    }, [selectedDate, paymentMethod, selectedCashier, selectedShift]);

    const fetchCashiers = async () => {
        try {
            const response = await getEmployees({
                store_id: user?.store_id,
                status: 'active'
            });
            
            if (response.err === 0) {
                const allEmployees = response.data?.rows || response.data || [];
                // Filter out store managers - only show cashiers and other non-manager roles
                const cashiersOnly = allEmployees.filter(employee => {
                    const role = employee.role || employee.user?.role;
                    // Exclude Store_Manager and Manager roles
                    return role !== 'Store_Manager' && role !== 'Manager';
                });
                setCashiers(cashiersOnly);
            }
        } catch (error) {
            console.error('Error fetching employees:', error);
        }
    };

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const filters = {
                date: selectedDate,
                store_id: user?.store_id
            };

            if (paymentMethod !== 'all') {
                filters.payment_method = paymentMethod;
            }

            if (selectedCashier !== 'all') {
                filters.cashier_id = selectedCashier;
            }

            if (selectedShift !== 'all') {
                filters.shift_id = selectedShift;
            }

            const response = await getTransactionHistory(filters);
            
            if (response.err === 0) {
                const data = response.data || [];
                setAllTransactions(data);
                setTransactions(data);
            } else {
                ToastNotification.error(response.msg || 'Không thể tải lịch sử thanh toán');
                setAllTransactions([]);
                setTransactions([]);
            }
        } catch (error) {
            console.error('Error fetching transactions:', error);
            ToastNotification.error('Lỗi khi tải dữ liệu');
            setAllTransactions([]);
            setTransactions([]);
        } finally {
            setLoading(false);
        }
    };

    // Filter transactions by search term (transaction ID) - client-side only
    // Note: cashier and shift filters are handled by API
    useEffect(() => {
        let filtered = allTransactions;

        if (searchTerm.trim()) {
            const term = searchTerm.trim();
            filtered = filtered.filter((transaction) => {
                const transactionId = String(transaction.transaction_id || '');
                return transactionId.includes(term);
            });
        }

        setTransactions(filtered);
    }, [searchTerm, allTransactions]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return '—';
        const date = new Date(dateString);
        return date.toLocaleString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const formatShiftTime = (shift) => {
        if (!shift) return '';
        
        const formatTime = (dateString) => {
            if (!dateString) return null;
            try {
                const date = new Date(dateString);
                if (isNaN(date.getTime())) return null;
                return date.toLocaleTimeString('vi-VN', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
            } catch (error) {
                return null;
            }
        };

        const checkInTime = formatTime(shift.check_in_time);
        const checkOutTime = formatTime(shift.check_out_time);

        if (checkInTime && checkOutTime) {
            return `${checkInTime} - ${checkOutTime}`;
        } else if (checkInTime) {
            return checkInTime;
        } else if (checkOutTime) {
            return checkOutTime;
        }
        return '';
    };

    const getPaymentMethodBadge = (method) => {
        if (method === 'cash') {
            return <Chip icon={<AttachMoneyIcon />} label="Tiền mặt" color="success" size="small" />;
        } else if (method === 'bank_transfer' || method === 'qr') {
            return <Chip icon={<QrCodeIcon />} label="QR Banking" color="info" size="small" />;
        }
        return <Chip label={method} color="default" size="small" />;
    };

    const handlePrintInvoice = async (transactionId) => {
        try {
            await generateAndPrintInvoice(transactionId);
        } catch (error) {
            console.error('Error printing invoice:', error);
            ToastNotification.error('Lỗi khi in hóa đơn');
        }
    };

    const handleExportExcel = () => {
        try {
            exportPaymentHistoryToExcel(transactions, { date: selectedDate, paymentMethod, cashier: selectedCashier });
            ToastNotification.success('Xuất file Excel thành công');
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            ToastNotification.error('Lỗi khi xuất file Excel');
        }
    };

    const columns = useMemo(() => [
        {
            accessorKey: 'transaction_id',
            header: 'Mã GD',
            size: 100,
            Cell: ({ cell }) => `#${cell.getValue()}`,
        },
        {
            accessorKey: 'created_at',
            header: 'Thời gian',
            size: 180,
            Cell: ({ cell }) => formatDateTime(cell.getValue()),
        },
        {
            accessorKey: 'cashier.username',
            header: 'Thu ngân',
            size: 150,
            Cell: ({ row }) => row.original.cashier?.username || 'Không xác định',
        },
        {
            accessorKey: 'customer.name',
            header: 'Khách hàng',
            size: 200,
            Cell: ({ row }) => {
                const customer = row.original.customer;
                if (customer) {
                    return (
                        <Box>
                            <Typography variant="body2">{customer.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                                {customer.phone}
                            </Typography>
                        </Box>
                    );
                }
                return <Typography variant="body2" color="text.secondary">Khách vãng lai</Typography>;
            },
        },
        {
            accessorKey: 'items',
            header: 'Số lượng SP',
            size: 120,
            Cell: ({ row }) => row.original.items?.length || 0,
        },
        {
            accessorKey: 'total_amount',
            header: 'Tổng tiền',
            size: 150,
            Cell: ({ cell }) => (
                <Typography variant="body2" fontWeight={600}>
                    {formatCurrency(cell.getValue() || 0)}
                </Typography>
            ),
        },
        {
            accessorKey: 'payment.method',
            header: 'Phương thức',
            size: 150,
            Cell: ({ row }) => getPaymentMethodBadge(row.original.payment?.method),
        },
        {
            accessorKey: 'status',
            header: 'Trạng thái',
            size: 120,
            Cell: () => <Chip label="Hoàn thành" color="success" size="small" />,
        },
        {
            id: 'actions',
            header: 'Hành động',
            size: 130,
            Cell: ({ row }) => (
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<PrintIcon />}
                    onClick={() => handlePrintInvoice(row.original.transaction_id)}
                    title="In hóa đơn"
                >
                    In
                </Button>
            ),
        },
    ], []);

    return (
        <Box sx={{ py: 3, px: 2 }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                    <CalendarTodayIcon /> Lịch sử thanh toán
                </Typography>
            </Box>

            {/* Filters */}
            <Grid container spacing={2} sx={{ mb: 4 }} alignItems="center">
                <Grid item xs={12} md={2}>
                    <TextField
                        fullWidth
                        label="Tìm kiếm mã GD"
                        placeholder="Nhập mã giao dịch..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        size="small"
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon />
                                </InputAdornment>
                            ),
                        }}
                    />
                </Grid>
                <Grid item xs={12} md={2}>
                    <TextField
                        fullWidth
                        type="date"
                        label="Chọn ngày"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        size="small"
                    />
                </Grid>
                <Grid item xs={12} md={3}>
                    <FormControl fullWidth sx={{ minWidth: '200px' }} size="small">
                        <InputLabel id="payment-method-label" sx={{ whiteSpace: 'nowrap' }}>
                            Phương thức thanh toán
                        </InputLabel>
                        <Select
                            labelId="payment-method-label"
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            label="Phương thức thanh toán"
                            sx={{ 
                                minWidth: '200px',
                                '& .MuiSelect-select': { 
                                    whiteSpace: 'normal',
                                    wordBreak: 'break-word'
                                }
                            }}
                        >
                            <MenuItem value="all">Tất cả</MenuItem>
                            <MenuItem value="cash">Tiền mặt</MenuItem>
                            <MenuItem value="qr">QR Banking</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} md={2}>
                    <FormControl fullWidth size="small">
                        <InputLabel id="cashier-label">Nhân viên</InputLabel>
                        <Select
                            labelId="cashier-label"
                            value={selectedCashier}
                            onChange={(e) => setSelectedCashier(e.target.value)}
                            label="Nhân viên"
                        >
                            <MenuItem value="all">Tất cả</MenuItem>
                            {cashiers.map(cashier => (
                                <MenuItem key={cashier.user_id} value={cashier.user_id}>
                                    {cashier.username || cashier.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} md={2}>
                    <FormControl fullWidth size="small">
                        <InputLabel id="shift-label">Ca làm việc</InputLabel>
                        <Select
                            labelId="shift-label"
                            value={selectedShift}
                            onChange={(e) => setSelectedShift(e.target.value)}
                            label="Ca làm việc"
                        >
                            <MenuItem value="all">Tất cả</MenuItem>
                            {shifts.map(shift => {
                                const timeDisplay = formatShiftTime(shift);
                                return (
                                    <MenuItem key={shift.shift_id} value={shift.shift_id}>
                                        Ca #{shift.shift_id}{timeDisplay ? ` (${timeDisplay})` : ''}
                                    </MenuItem>
                                );
                            })}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} md={1}>
                    <Button
                        variant="contained"
                        color="success"
                        fullWidth
                        startIcon={<FileDownloadIcon />}
                        onClick={handleExportExcel}
                        disabled={transactions.length === 0}
                        size="small"
                    >
                        Xuất Excel
                    </Button>
                </Grid>
            </Grid>

            {/* Transactions Table */}
            <Card>
                <CardContent>
                    <MaterialReactTable
                        columns={columns}
                        data={transactions}
                        enableStickyHeader
                        initialState={{ 
                            density: 'compact',
                            pagination: { pageSize: 10, pageIndex: 0 }
                        }}
                        state={{ isLoading: loading }}
                        localization={MRT_Localization_VI}
                        layoutMode="grid"
                        muiTableContainerProps={{
                            sx: { maxHeight: '70vh' }
                        }}
                        muiTablePaperProps={{
                            elevation: 0,
                            sx: { boxShadow: 'none' }
                        }}
                        muiTableBodyCellProps={{
                            sx: { whiteSpace: 'normal', wordBreak: 'break-word' }
                        }}
                        renderEmptyRowsFallback={() => (
                            <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                                Không có giao dịch nào
                            </Typography>
                        )}
                    />
                </CardContent>
            </Card>
        </Box>
    );
};

export default PaymentHistory;
