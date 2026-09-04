const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://agroyilt_db_user:agroyilt_db_user@cluster0.zbhhozr.mongodb.net/groo')
  .then(async () => {
    const Service = require('./models/Service');
    const services = await Service.find({ title: /jc/i });
    console.log(services);
    process.exit(0);
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
