const Product = require('../../models/Product');

/**
 * Get all products with filters
 */
const getProducts = async (req, res) => {
    try {
        const { categoryId, isFeatured, query, cityId } = req.query;
        let filter = { 
            status: 'active',
            approvalStatus: 'approved' // Only show admin-approved or auto-approved products
        };

        if (categoryId) filter.categoryId = categoryId;
        if (isFeatured === 'true') filter.isFeatured = true;
        if (query) {
            filter.title = { $regex: query, $options: 'i' };
        }

        if (cityId) {
            const Vendor = require('../../models/Vendor');
            const vendorsInCity = await Vendor.find({ cityId }).select('_id');
            const vendorIds = vendorsInCity.map(v => v._id);
            filter.vendorId = { $in: vendorIds };
        }

        const products = await Product.find(filter).populate('categoryId', 'title');

        res.status(200).json({
            success: true,
            data: products
        });
    } catch (error) {
        console.error('[ProductController] Error fetching products:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch products', error: error.message });
    }
};

/**
 * Get single product details
 */
const getProductDetails = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('categoryId', 'title');
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        res.status(200).json({
            success: true,
            data: product
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch product details' });
    }
};

module.exports = {
    getProducts,
    getProductDetails
};
