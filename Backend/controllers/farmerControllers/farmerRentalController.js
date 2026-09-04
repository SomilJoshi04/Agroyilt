const RentalTransaction = require('../../models/RentalTransaction');
const VendorEquipment = require('../../models/VendorEquipment');

const farmerRentalController = {
  // Rent Equipment
  rentEquipment: async (req, res) => {
    try {
      const { equipmentId, startDate, endDate } = req.body;
      const farmerId = req.user.id;

      const equipment = await VendorEquipment.findById(equipmentId);
      if (!equipment) return res.status(404).json({ success: false, message: 'Equipment not found' });

      if (equipment.pricing?.rental_type !== 'daily' && equipment.pricing?.rental_type !== 'hourly') {
        return res.status(400).json({ success: false, message: 'Equipment is not available for rental' });
      }

      // Calculate days
      const days = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) || 1;
      const rentalAmount = (equipment.pricing?.daily?.price || 100) * days;
      const securityDeposit = equipment.pricing?.security_deposit || 0;

      const rental = new RentalTransaction({
        farmerId,
        equipmentId,
        vendorId: equipment.vendorId,
        startDate,
        endDate,
        rentalAmount,
        securityDeposit,
        status: 'reserved'
      });

      await rental.save();
      res.status(201).json({ success: true, message: 'Rental reserved successfully', data: rental });
    } catch (error) {
      console.error('Error renting equipment:', error);
      res.status(500).json({ success: false, message: 'Server Error' });
    }
  },

  // Confirm Return
  confirmReturn: async (req, res) => {
    try {
      const { id } = req.params;
      
      const rental = await RentalTransaction.findOne({ _id: id, farmerId: req.user.id });
      if (!rental) return res.status(404).json({ success: false, message: 'Rental not found' });

      if (rental.status !== 'picked_up') {
        return res.status(400).json({ success: false, message: 'Equipment is not currently picked up' });
      }

      rental.farmerConfirmedReturn = true;

      if (rental.vendorConfirmedReturn) {
        rental.status = 'returned';
        rental.depositRefundStatus = 'released'; // Auto-release if both confirm without dispute
      }

      await rental.save();
      res.status(200).json({ success: true, message: 'Return confirmed', data: rental });
    } catch (error) {
      console.error('Error confirming return:', error);
      res.status(500).json({ success: false, message: 'Server Error' });
    }
  },

  // Report Damage
  reportDamage: async (req, res) => {
    try {
      const { id } = req.params;
      const { description, photos } = req.body;

      const rental = await RentalTransaction.findOne({ _id: id, farmerId: req.user.id });
      if (!rental) return res.status(404).json({ success: false, message: 'Rental not found' });

      if (rental.damageReport?.reportedBy) {
        return res.status(400).json({ success: false, message: 'A damage report already exists' });
      }

      rental.status = 'disputed';
      rental.depositRefundStatus = 'pending'; // Freezes the deposit
      rental.damageReport = {
        reportedBy: req.user.id,
        reporterRole: 'User',
        description,
        photos: photos || [],
        reportedAt: new Date()
      };

      await rental.save();
      res.status(200).json({ success: true, message: 'Damage reported successfully. Admin will review.', data: rental });
    } catch (error) {
      console.error('Error reporting damage:', error);
      res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
};

module.exports = farmerRentalController;
