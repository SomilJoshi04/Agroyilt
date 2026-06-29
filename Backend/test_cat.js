const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Category = require('./models/Category');
  const Service = require('./models/Service');
  
  const services = await Service.find({ title: { $regex: 'tractor', $options: 'i' } }).populate('categoryId');
  services.forEach(s => {
    console.log('Service:', s.title);
    console.log('Category Title:', s.categoryId?.title);
  });
  mongoose.disconnect();
}
run();
