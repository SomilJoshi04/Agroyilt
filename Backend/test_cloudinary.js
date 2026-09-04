require('dotenv').config({ path: 'd:\\companyfolder\\Agroyilt\\Backend\\.env' });
const cloudinaryService = require('d:\\companyfolder\\Agroyilt\\Backend\\services\\cloudinaryService');

async function test() {
  const dummyBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  console.log('Testing Cloudinary upload...');
  const res = await cloudinaryService.uploadFile(dummyBase64, { folder: 'vendors/documents' });
  console.log('Result:', res);
}

test();
