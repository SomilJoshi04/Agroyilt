const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://agroyilt_db_user:agroyilt_db_user@cluster0.zbhhozr.mongodb.net/groo')
  .then(async () => {
    const Category = require('./models/Category');
    const categories = await Category.find({ title: /jcb/i });
    console.log(categories);
    process.exit(0);
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
