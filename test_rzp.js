require('dotenv').config({ path: 'Backend/.env' });
const { createOrder } = require('./Backend/services/razorpayService');

async function test() {
  const result = await createOrder(100, 'INR', 'receipt_test_1', { type: 'test' });
  console.log(result);
}

test();
