// Test invoice API endpoint
const API_BASE = 'http://localhost:5001/api/v1';

async function testInvoiceAPI() {
    try {
        // Test with transaction ID 27 (from the screenshot)
        const transactionId = 27;
        
        console.log(`Testing invoice API for transaction ID: ${transactionId}`);
        
        const response = await fetch(`${API_BASE}/payment/invoice/pdf/${transactionId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);

        const data = await response.json();
        console.log('Response data:', JSON.stringify(data, null, 2));

        if (data.err === 0) {
            console.log('\n✅ Invoice API working!');
            console.log('Transaction ID:', data.data?.transaction_id);
            console.log('Total amount:', data.data?.total_amount);
            console.log('Items count:', data.data?.items?.length);
        } else {
            console.log('\n❌ Invoice API error:', data.msg);
        }
    } catch (error) {
        console.error('Error testing invoice API:', error);
    }
}

testInvoiceAPI();

