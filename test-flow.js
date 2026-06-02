async function testFlow() {
  const base = 'http://localhost:5000/api';
  console.log('1. User Login...');
  let res = await fetch(base + '/auth/verify-otp', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '6268455485', otp: '123456', role: 'user' })
  }).then(r => r.json());
  const userToken = res.data.accessToken;
  
  console.log('2. Vendor Login...');
  res = await fetch(base + '/auth/verify-otp', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '6268455485', otp: '123456', role: 'vendor' })
  }).then(r => r.json());
  const vendorToken = res.data.accessToken;

  console.log('3. Getting a service ID for testing...');
  const services = await fetch(base + '/services/public').then(r => r.json());
  const service = services.data.find(s => s.category === 'Agriculture') || services.data[0];
  
  console.log('4. Creating Booking as User...');
  const bookingData = {
    serviceId: service._id,
    address: { addressLine1: 'Test Farm', city: 'Test City', state: 'MP', pincode: '452001', lat: 22.7196, lng: 75.8577 },
    scheduledDate: new Date().toISOString(),
    scheduledTime: '10:00 AM',
    timeSlot: { start: '10:00 AM', end: '11:00 AM' },
    paymentMethod: 'cash',
    amount: 1500,
    rental_type: 'land_based',
    cropType: 'Wheat Demo',
    chemicalUsed: 'Urea Demo',
    landSize: '10 Acres',
    bookingType: 'scheduled',
    serviceCategory: 'Agriculture'
  };
  
  try {
    const bookingRes = await fetch(base + '/bookings/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + userToken },
      body: JSON.stringify(bookingData)
    }).then(r => r.json());
    console.log('Booking created:', bookingRes.success, bookingRes.message);
  } catch (e) {
    console.log('Booking Warning:', e.message);
  }
  
  console.log('5. Fetching Vendor Bookings...');
  const vendorBookings = await fetch(base + '/bookings/vendor', {
    headers: { 'Authorization': 'Bearer ' + vendorToken }
  }).then(r => r.json());
  
  if (vendorBookings.data && vendorBookings.data.length > 0) {
    const latest = vendorBookings.data[0];
    console.log('✅ Latest Vendor Booking Data found!');
    console.log('   - Crop:', latest.cropType);
    console.log('   - Land Size:', latest.landSize);
    console.log('   - Chemical:', latest.chemicalUsed);
  } else {
    console.log('❌ No vendor bookings found for this vendor.');
  }

  console.log('Test Complete!');
}
testFlow().catch(console.error);
