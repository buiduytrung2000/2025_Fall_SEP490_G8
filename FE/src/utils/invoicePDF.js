// Invoice PDF generation utility
import { getInvoiceData } from '../api/paymentApi';

const formatCurrency = (number) => {
    return new Intl.NumberFormat('vi-VN', { 
        style: 'currency', 
        currency: 'VND' 
    }).format(number);
};

const formatDate = (date) => {
    return new Date(date).toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
};

export const generateAndPrintInvoice = async (transactionId) => {
    try {
        // Fetch invoice data
        const response = await getInvoiceData(transactionId);
        
        if (response.err !== 0) {
            alert('Không thể lấy dữ liệu hóa đơn');
            return;
        }

        const transaction = response.data;
        
        // Create HTML content for invoice
        const htmlContent = generateInvoiceHTML(transaction);
        
        // Open print dialog
        const printWindow = window.open('', '', 'height=600,width=800');
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        // Wait for content to load then print
        printWindow.onload = () => {
            printWindow.print();
        };
        
    } catch (error) {
        console.error('Error generating invoice:', error);
        alert('Lỗi khi tạo hóa đơn');
    }
};

const generateInvoiceHTML = (transaction) => {
    const store = transaction.store || {};
    const customer = transaction.customer;
    const payment = transaction.payment || {};
    const items = transaction.items || [];
    
    const itemsHTML = items.map((item, index) => `
        <tr>
            <td style="text-align: center; padding: 8px;">${index + 1}</td>
            <td style="padding: 8px;">${item.product?.name || 'N/A'}</td>
            <td style="text-align: center; padding: 8px;">${item.quantity}</td>
            <td style="text-align: right; padding: 8px;">${formatCurrency(item.unit_price)}</td>
            <td style="text-align: right; padding: 8px;">${formatCurrency(item.subtotal)}</td>
        </tr>
    `).join('');

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Hóa đơn #${transaction.transaction_id}</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 20px;
                    background-color: #f5f5f5;
                }
                .invoice-container {
                    max-width: 800px;
                    margin: 0 auto;
                    background-color: white;
                    padding: 30px;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .invoice-header {
                    text-align: center;
                    margin-bottom: 30px;
                    border-bottom: 2px solid #333;
                    padding-bottom: 15px;
                }
                .invoice-header h1 {
                    margin: 0;
                    font-size: 24px;
                    color: #333;
                }
                .store-info {
                    text-align: center;
                    font-size: 14px;
                    color: #666;
                    margin-bottom: 20px;
                }
                .invoice-details {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 20px;
                    font-size: 13px;
                }
                .invoice-details div {
                    flex: 1;
                }
                .invoice-details strong {
                    display: block;
                    margin-bottom: 5px;
                    color: #333;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 20px;
                }
                table thead {
                    background-color: #f0f0f0;
                    border-top: 1px solid #ddd;
                    border-bottom: 2px solid #333;
                }
                table th {
                    padding: 10px;
                    text-align: left;
                    font-weight: bold;
                    color: #333;
                    font-size: 13px;
                }
                table td {
                    padding: 8px;
                    border-bottom: 1px solid #eee;
                    font-size: 13px;
                }
                .summary {
                    margin-top: 20px;
                    border-top: 2px solid #333;
                    padding-top: 15px;
                }
                .summary-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 8px;
                    font-size: 13px;
                }
                .summary-row.total {
                    font-size: 16px;
                    font-weight: bold;
                    color: #333;
                    margin-top: 10px;
                    padding-top: 10px;
                    border-top: 1px solid #ddd;
                }
                .payment-info {
                    margin-top: 20px;
                    padding: 15px;
                    background-color: #f9f9f9;
                    border-radius: 4px;
                    font-size: 13px;
                }
                .footer {
                    text-align: center;
                    margin-top: 30px;
                    padding-top: 15px;
                    border-top: 1px solid #ddd;
                    color: #666;
                    font-size: 12px;
                }
                @media print {
                    body {
                        background-color: white;
                    }
                    .invoice-container {
                        box-shadow: none;
                        max-width: 100%;
                    }
                }
            </style>
        </head>
        <body>
            <div class="invoice-container">
                <div class="invoice-header">
                    <h1>HÓA ĐƠN BÁN HÀNG</h1>
                </div>
                
                <div class="store-info">
                    <strong>${store.name || 'CCMS Store'}</strong><br>
                    Mã giao dịch: #${transaction.transaction_id}
                </div>

                <div class="invoice-details">
                    <div>
                        <strong>Khách hàng:</strong>
                        ${customer ? customer.name : 'Khách vãng lai'}<br>
                        ${customer ? `SĐT: ${customer.phone}` : ''}
                    </div>
                    <div>
                        <strong>Ngày giờ:</strong>
                        ${formatDate(transaction.created_at)}<br>
                        <strong>Nhân viên:</strong>
                        ${transaction.cashier?.username || 'N/A'}
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 5%;">STT</th>
                            <th style="width: 50%;">Sản phẩm</th>
                            <th style="width: 15%; text-align: center;">Số lượng</th>
                            <th style="width: 15%; text-align: right;">Đơn giá</th>
                            <th style="width: 15%; text-align: right;">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHTML}
                    </tbody>
                </table>

                <div class="summary">
                    <div class="summary-row">
                        <span>Tổng tiền hàng:</span>
                        <span>${formatCurrency(transaction.subtotal)}</span>
                    </div>
                    ${transaction.tax_amount > 0 ? `
                    <div class="summary-row">
                        <span>Thuế VAT:</span>
                        <span>${formatCurrency(transaction.tax_amount)}</span>
                    </div>
                    ` : ''}
                    ${transaction.discount_amount > 0 ? `
                    <div class="summary-row">
                        <span>Giảm giá:</span>
                        <span>-${formatCurrency(transaction.discount_amount)}</span>
                    </div>
                    ` : ''}
                    <div class="summary-row total">
                        <span>Tổng cộng:</span>
                        <span>${formatCurrency(transaction.total_amount)}</span>
                    </div>
                </div>

                <div class="payment-info">
                    <strong>Thông tin thanh toán:</strong><br>
                    Phương thức: ${payment.method === 'cash' ? 'Tiền mặt' : payment.method === 'bank_transfer' ? 'Chuyển khoản' : payment.method}<br>
                    ${payment.cash_received ? `Tiền khách đưa: ${formatCurrency(payment.cash_received)}<br>` : ''}
                    ${payment.change_amount ? `Tiền trả lại: ${formatCurrency(payment.change_amount)}<br>` : ''}
                    Trạng thái: ${payment.status === 'completed' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                </div>

                <div class="footer">
                    <p>Cảm ơn quý khách đã mua hàng!</p>
                    <p>Vui lòng giữ hóa đơn này để đổi trả hoặc bảo hành</p>
                </div>
            </div>
        </body>
        </html>
    `;
};

