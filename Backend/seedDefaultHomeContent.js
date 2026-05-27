const mongoose = require('mongoose');
const dotenv = require('dotenv');
const HomeContent = require('./models/HomeContent');

// Load environment variables from .env file
dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/grooagri', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const seedDefaultData = async () => {
  await connectDB();

  try {
    let defaultContent = await HomeContent.findOne({ cityId: null });

    if (!defaultContent) {
      console.log('No default HomeContent found. Creating one...');
      defaultContent = new HomeContent({ cityId: null });
    } else {
      console.log('Default HomeContent found. Overwriting it with rich data...');
    }

    // 1. Rich Home Banners
    defaultContent.banners = [
      {
        imageUrl: 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1778237602/categories/nblp3wdyjiatepfhpnmc.jpg',
        text: 'Rent Modern Tractors Instantly',
        order: 1
      },
      {
        imageUrl: 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1775211866/categories/ieepa6x7hkbtuxsyi4q7.jpg',
        text: 'Top Quality Harvesters Available',
        order: 2
      },
      {
        imageUrl: 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1779096342/categories/rwiby1x4nq8y4nc1whsk.jpg',
        text: 'Heavy Duty Equipment',
        order: 3
      }
    ];

    // 2. Rich Promo Carousel
    defaultContent.promos = [
      {
        title: 'Special 10% Off',
        subtitle: 'On all John Deere Tractors this week!',
        buttonText: 'Book Now',
        gradientClass: 'from-blue-600 to-blue-800',
        imageUrl: 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1778237602/categories/nblp3wdyjiatepfhpnmc.jpg',
        order: 1
      },
      {
        title: 'Monsoon Offer',
        subtitle: 'Flat ₹500 discount on Seed Drills',
        buttonText: 'Explore',
        gradientClass: 'from-green-600 to-green-800',
        imageUrl: 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1775285448/categories/z9ynsuhhk3e8te8pb3er.jpg',
        order: 2
      },
      {
        title: 'Combo Deals',
        subtitle: 'Tractor + Rotavator starting @ ₹1200/hr',
        buttonText: 'View Deals',
        gradientClass: 'from-orange-500 to-red-600',
        imageUrl: 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1775211866/categories/ieepa6x7hkbtuxsyi4q7.jpg',
        order: 3
      }
    ];

    // 3. Equipment Curations
    defaultContent.curated = [
      { title: 'Tractors for Ploughing', gifUrl: 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1778237602/categories/nblp3wdyjiatepfhpnmc.jpg', order: 1 },
      { title: 'Harvesting Essentials', gifUrl: 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1775211866/categories/ieepa6x7hkbtuxsyi4q7.jpg', order: 2 },
      { title: 'Pesticide Sprayers', gifUrl: 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1775285448/categories/z9ynsuhhk3e8te8pb3er.jpg', order: 3 },
      { title: 'Irrigation Pumps', gifUrl: 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1779096342/categories/rwiby1x4nq8y4nc1whsk.jpg', order: 4 },
      { title: 'Post Harvest Tools', gifUrl: 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1778237602/categories/nblp3wdyjiatepfhpnmc.jpg', order: 5 }
    ];

    // 4. New & Noteworthy
    defaultContent.noteworthy = [
      {
        title: 'Mahindra Novo 605',
        imageUrl: 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1778237602/categories/nblp3wdyjiatepfhpnmc.jpg',
        order: 1
      },
      {
        title: 'JCB Backhoe Loader',
        imageUrl: 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1779096342/categories/rwiby1x4nq8y4nc1whsk.jpg',
        order: 2
      },
      {
        title: 'Kubota Harvester',
        imageUrl: 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1775211866/categories/ieepa6x7hkbtuxsyi4q7.jpg',
        order: 3
      },
      {
        title: 'Agriculture Drones',
        imageUrl: 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1775285448/categories/z9ynsuhhk3e8te8pb3er.jpg',
        order: 4
      }
    ];

    // 5. Most Booked Services
    defaultContent.booked = [
      {
        title: 'Mahindra 475 DI',
        rating: '4.8',
        reviews: '2k+',
        price: '₹700',
        originalPrice: '₹800',
        discount: '12% OFF',
        imageUrl: 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1778237602/categories/nblp3wdyjiatepfhpnmc.jpg',
        order: 1
      },
      {
        title: 'Swaraj 744 FE',
        rating: '4.9',
        reviews: '1.5k+',
        price: '₹750',
        originalPrice: '₹900',
        discount: '16% OFF',
        imageUrl: 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1775285448/categories/z9ynsuhhk3e8te8pb3er.jpg',
        order: 2
      },
      {
        title: 'Cultivator 9 Tine',
        rating: '4.7',
        reviews: '500+',
        price: '₹300',
        originalPrice: '₹400',
        discount: '25% OFF',
        imageUrl: 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1775211866/categories/ieepa6x7hkbtuxsyi4q7.jpg',
        order: 3
      }
    ];

    // 6. Category Sections
    defaultContent.categorySections = [
      {
        title: 'Popular Tractors',
        order: 1,
        cards: [
          {
            title: 'John Deere 5310',
            imageUrl: 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1778237602/categories/nblp3wdyjiatepfhpnmc.jpg',
            price: '₹800',
            originalPrice: '₹1000',
            discount: '20% OFF',
            rating: '4.9',
            reviews: '800+'
          },
          {
            title: 'Eicher 380',
            imageUrl: 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1777991851/categories/te3ejqisjtg1p7rfkrtv.jpg',
            price: '₹600',
            originalPrice: '₹700',
            discount: '14% OFF',
            rating: '4.6',
            reviews: '300+'
          }
        ]
      },
      {
        title: 'Harvesters & Thrashers',
        order: 2,
        cards: [
          {
            title: 'Kartar 4000',
            imageUrl: 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1775211866/categories/ieepa6x7hkbtuxsyi4q7.jpg',
            price: '₹2000',
            originalPrice: '₹2500',
            discount: '20% OFF',
            rating: '4.8',
            reviews: '1k+'
          }
        ]
      }
    ];

    // Ensure everything is set to visible
    defaultContent.isBannersVisible = true;
    defaultContent.isPromosVisible = true;
    defaultContent.isCuratedVisible = true;
    defaultContent.isNoteworthyVisible = true;
    defaultContent.isBookedVisible = true;
    defaultContent.isCategorySectionsVisible = true;
    defaultContent.isCategoriesVisible = true;

    await defaultContent.save();

    console.log('Successfully seeded Rich Default Fallback Data!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedDefaultData();
