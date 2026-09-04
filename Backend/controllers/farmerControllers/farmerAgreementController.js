const crypto = require('crypto');
// Assuming agreements are tied to LandLease or RentalTransaction, we mock the fetch here
const LandLease = require('../../models/LandLease');
const RentalTransaction = require('../../models/RentalTransaction');

const farmerAgreementController = {
  // Get Agreements list
  getAgreements: async (req, res) => {
    try {
      const farmerId = req.user.id;
      
      // Fetch leases and rentals for this farmer where an agreement exists
      const leases = await LandLease.find({ currentTenantId: farmerId, status: 'leased' })
        .select('title leaseType createdAt')
        .lean();
        
      const rentals = await RentalTransaction.find({ farmerId, status: { $in: ['picked_up', 'returned', 'disputed'] } })
        .select('equipmentId startDate endDate')
        .populate('equipmentId', 'name')
        .lean();

      const agreements = [
        ...leases.map(l => ({ id: l._id, type: 'Land Lease', title: l.title, date: l.createdAt })),
        ...rentals.map(r => ({ id: r._id, type: 'Equipment Rental', title: r.equipmentId?.name || 'Equipment', date: r.startDate }))
      ];

      res.status(200).json({ success: true, data: agreements });
    } catch (error) {
      console.error('Error fetching agreements:', error);
      res.status(500).json({ success: false, message: 'Server Error' });
    }
  },

  // Download Agreement (Signed URL)
  downloadAgreement: async (req, res) => {
    try {
      const { id } = req.params;
      
      // In a real scenario, this would generate an AWS S3 pre-signed URL or Cloudinary signed URL
      // For this implementation, we will mock the signed URL generation
      
      // Verify ownership (mock check)
      const isLease = await LandLease.exists({ _id: id, currentTenantId: req.user.id });
      const isRental = await RentalTransaction.exists({ _id: id, farmerId: req.user.id });
      
      if (!isLease && !isRental) {
        return res.status(403).json({ success: false, message: 'Unauthorized to access this agreement' });
      }

      // Generate mock short-lived signed URL
      const token = crypto.randomBytes(16).toString('hex');
      const signedUrl = `https://api.agroyilt.com/downloads/agreements/${id}?token=${token}&expires=${Date.now() + 15 * 60 * 1000}`; // 15 mins expiry

      res.status(200).json({ success: true, data: { url: signedUrl } });
    } catch (error) {
      console.error('Error downloading agreement:', error);
      res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
};

module.exports = farmerAgreementController;
