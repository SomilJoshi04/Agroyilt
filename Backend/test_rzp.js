require('dotenv').config();
const { createOrder } = require('./services/razorpayService');

async function test() {
  const result = await createOrder(100, 'INR', 'receipt_test_1', { type: 'test' });
  console.log(result);
}

test();
