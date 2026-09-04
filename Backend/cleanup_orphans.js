const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://agroyilt_db_user:agroyilt_db_user@cluster0.zbhhozr.mongodb.net/groo')
  .then(async () => {
    const Category = require('./models/Category');
    const Service = require('./models/Service');
    
    const allCategories = await Category.find({}, '_id').lean();
    const categoryIds = allCategories.map(c => c._id.toString());
    
    const allServices = await Service.find({}, '_id categoryId title').lean();
    
    let deletedCount = 0;
    for (const service of allServices) {
      if (!service.categoryId || !categoryIds.includes(service.categoryId.toString())) {
        console.log(`Deleting orphaned service: ${service.title} (${service._id})`);
        await Service.findByIdAndDelete(service._id);
        deletedCount++;
      }
    }
    
    console.log(`Finished. Deleted ${deletedCount} orphaned services.`);
    process.exit(0);
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
