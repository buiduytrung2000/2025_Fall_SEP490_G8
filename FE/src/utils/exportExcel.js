import * as XLSX from 'xlsx';

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

export const exportPaymentHistoryToExcel = (transactions, filters = {}) => {
    try {
        if (!transactions || transactions.length === 0) {
            alert('Không có dữ liệu để xuất');
            return;
        }

        // Check if any transaction has cashier info (for Store Manager view)
        const hasCashierInfo = transactions.some(tx => tx.cashier?.username || tx.cashier?.name);

        // Prepare data for Excel
        const data = transactions.map((transaction, index) => {
            const paymentMethod = transaction.payment?.method || '';
            
            // Build row data with correct column order
            const rowData = {
                'STT': index + 1,
                'Mã GD': `#${transaction.transaction_id}`,
                'Thời gian': formatDateTime(transaction.created_at)
            };

            // Add cashier column if cashier info exists (after "Thời gian")
            if (hasCashierInfo) {
                rowData['Thu ngân'] = transaction.cashier?.username || transaction.cashier?.name || 'Không xác định';
            }

            // Add remaining columns
            rowData['Khách hàng'] = transaction.customer?.name || 'Khách vãng lai';
            rowData['Số điện thoại'] = transaction.customer?.phone || '';
            rowData['Số lượng SP'] = transaction.items?.length || 0;
            rowData['Tổng tiền'] = formatCurrency(transaction.total_amount || 0);
            rowData['Phương thức'] = paymentMethod === 'cash' ? 'Tiền mặt' : (paymentMethod === 'qr' || paymentMethod === 'bank_transfer' ? 'QR Banking' : paymentMethod || '');
            rowData['Trạng thái'] = 'Hoàn thành';

            return rowData;
        });

        // Create workbook and worksheet
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Lịch sử thanh toán');

        // Set column widths
        const colWidths = [
            { wch: 5 },   // STT
            { wch: 10 },  // Mã GD
            { wch: 20 },  // Thời gian
        ];

        // Add cashier column width if needed (after "Thời gian")
        if (hasCashierInfo) {
            colWidths.push({ wch: 15 }); // Thu ngân
        }

        // Add remaining column widths
        colWidths.push(
            { wch: 20 },  // Khách hàng
            { wch: 15 },  // Số điện thoại
            { wch: 12 },  // Số lượng SP
            { wch: 15 },  // Tổng tiền
            { wch: 15 },  // Phương thức
            { wch: 12 }   // Trạng thái
        );

        ws['!cols'] = colWidths;

        // Generate filename with date
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        const filename = `Lich_su_thanh_toan_${dateStr}.xlsx`;

        // Write file
        XLSX.writeFile(wb, filename);

    } catch (error) {
        console.error('Error exporting to Excel:', error);
        alert('Lỗi khi xuất file Excel');
    }
};

