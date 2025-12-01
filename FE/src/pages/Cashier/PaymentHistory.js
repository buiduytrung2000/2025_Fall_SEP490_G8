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
import { generateAndPrintInvoice } from '../../utils/invoicePDF';
import { exportPaymentHistoryToExcel } from '../../utils/exportExcel';

const PaymentHistory = () => {
    const [transactions, setTransactions] = useState([]);
    const [allTransactions, setAllTransactions] = useState([]); // Store all transactions for filtering
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(() => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    });
    const [paymentMethod, setPaymentMethod] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchTransactions();
    }, [selectedDate, paymentMethod]);

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const filters = {
                date: selectedDate
            };

            if (paymentMethod !== 'all') {
                filters.payment_method = paymentMethod;
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

    // Filter transactions by search term (transaction ID)
    useEffect(() => {
        if (!searchTerm.trim()) {
            setTransactions(allTransactions);
            return;
        }

        const filtered = allTransactions.filter(transaction => {
            const transactionId = String(transaction.transaction_id || '');
            return transactionId.includes(searchTerm.trim());
        });
        setTransactions(filtered);
    }, [searchTerm, allTransactions]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    };

    const formatDateTime = (dateString) => {
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

    const getPaymentMethodBadge = (method) => {
        if (method === 'cash') {
            return <Chip icon={<AttachMoneyIcon />} label="Tiền mặt" color="success" size="small" />;
        } else if (method === 'bank_transfer' || method === 'qr') {
            return <Chip icon={<QrCodeIcon />} label="QR Banking" color="info" size="small" />;
        }
        return <Chip label={method} color="default" size="small" />;
    };

    const getTotalAmount = () => {
        return transactions.reduce((sum, transaction) => sum + parseFloat(transaction.total_amount || 0), 0);
    };

    const getTotalTransactions = () => {
        return transactions.length;
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
            exportPaymentHistoryToExcel(transactions, { date: selectedDate, paymentMethod });
            ToastNotification.success('Xuất file Excel thành công');
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            ToastNotification.error('Lỗi khi xuất file Excel');
        }
    };

    // Define columns for Material React Table
    const columns = useMemo(
        () => [
            {
                accessorKey: 'transaction_id',
                header: 'Mã GD',
                size: 120,
                Cell: ({ cell }) => (
                    <Typography variant="body2" noWrap={false}>
                        #{cell.getValue()}
                    </Typography>
                ),
            },
            {
                accessorKey: 'created_at',
                header: 'Thời gian',
                size: 180,
                Cell: ({ cell }) => (
                    <Typography variant="body2" noWrap={false}>
                        {formatDateTime(cell.getValue())}
                    </Typography>
                ),
            },
            {
                accessorKey: 'customer',
                header: 'Khách hàng',
                size: 220,
                Cell: ({ cell }) => {
                    const customer = cell.getValue();
                    if (customer) {
                        return (
                            <Box>
                                <Typography variant="body2" noWrap={false}>{customer.name}</Typography>
                                <Typography variant="caption" color="text.secondary" noWrap={false}>
                                    {customer.phone}
                                </Typography>
                            </Box>
                        );
                    }
                    return (
                        <Typography variant="body2" color="text.secondary" noWrap={false}>
                            Khách vãng lai
                        </Typography>
                    );
                },
            },
            {
                accessorKey: 'items',
                header: 'Số lượng SP',
                size: 120,
                Cell: ({ cell }) => (
                    <Typography variant="body2" noWrap={false}>
                        {cell.getValue()?.length || 0}
                    </Typography>
                ),
            },
            {
                accessorKey: 'total_amount',
                header: 'Tổng tiền',
                size: 150,
                Cell: ({ cell }) => (
                    <Typography variant="body2" fontWeight="bold" noWrap={false}>
                        {formatCurrency(cell.getValue())}
                    </Typography>
                ),
            },
            {
                accessorKey: 'payment.method',
                header: 'Phương thức',
                size: 150,
                Cell: ({ cell }) => getPaymentMethodBadge(cell.getValue()),
            },
            {
                id: 'status',
                header: 'Trạng thái',
                size: 130,
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
        ],
        []
    );

    return (
        <Box sx={{ py: 3, px: 2 }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                    <CalendarTodayIcon /> Lịch sử thanh toán
                </Typography>
            </Box>

            {/* Filters */}
            <Grid container spacing={2} sx={{ mb: 4 }} alignItems="center">
                <Grid item xs={12} md={3}>
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
                <Grid item xs={12} md={5}>
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
                        enableDensityToggle={false}
                        layoutMode="grid"
                        initialState={{ density: 'compact' }}
                        state={{ isLoading: loading }}
                        localization={MRT_Localization_VI}
                        muiTableContainerProps={{ sx: { maxHeight: '600px' } }}
                        muiTablePaperProps={{
                            elevation: 0,
                            sx: {
                                borderRadius: '4px',
                            },
                        }}
                        muiTableBodyCellProps={{
                            sx: {
                                whiteSpace: 'normal',
                                wordBreak: 'break-word',
                            },
                        }}
                        renderEmptyRowsFallback={() => (
                            <Box sx={{ textAlign: 'center', py: 5 }}>
                                <Typography variant="body1" color="text.secondary">
                                    Không có giao dịch nào trong ngày này
                                </Typography>
                            </Box>
                        )}
                    />
                </CardContent>
            </Card>
        </Box>
    );
};

export default PaymentHistory;

    