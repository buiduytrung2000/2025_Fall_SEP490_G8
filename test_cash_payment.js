// Test script for cash payment API
const API_BASE = 'http://localhost:5001/api/v1';

async function testCashPayment() {
    try {
        console.log('Testing cash payment API...\n');

        const paymentData = {
            store_id: 1,
            cashier_id: 1,
            customer_id: null,
            cart_items: [
                {
                    product_id: 1,
                    product_name: 'Test Product',
                    quantity: 2,
                    unit_price: 50000
                }
            ],
            subtotal: 100000,
            tax_amount: 10000,
            discount_amount: 0,
            voucher_code: null,
            total_amount: 110000,
            cash_received: 120000,
            change_amount: 10000
        };

        console.log('Sending payment data:', JSON.stringify(paymentData, null, 2));

        const response = await fetch(`${API_BASE}/payment/cash`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(paymentData)
        });

        console.log('\nResponse status:', response.status);
        const data = await response.json();
        console.log('Response data:', JSON.stringify(data, null, 2));

        if (data.err === 0) {
            console.log('\n✅ Cash payment test PASSED');
        } else {
            console.log('\n❌ Cash payment test FAILED');
        }
    } catch (error) {
        console.error('❌ Error testing cash payment:', error.message);
    }
}

testCashPayment();

