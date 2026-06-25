const { Router } = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const Booking = require('../models/Booking');

const router = Router();

// ─── GET /api/refunds/my ───────────────────────────────────────
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const refunds = await Booking.find({
      passengerId: userId,
      status: 'cancelled',
      refundAmount: { $gt: 0 }
    })
      .populate('tripId', 'from to departureDate departureTime')
      .sort({ refundedAt: -1 });

    const formattedRefunds = refunds.map(booking => ({
      id: booking._id,
      tripId: booking.tripId?._id,
      from: booking.tripId?.from || booking.fromName || 'Unknown',
      to: booking.tripId?.to || booking.toName || 'Unknown',
      departureDate: booking.tripId?.departureDate || 'Unknown',
      departureTime: booking.tripId?.departureTime || 'Unknown',
      seatNumber: booking.seatNumber,
      fare: booking.fareCharged || booking.totalAmount || 0,
      refundAmount: booking.refundAmount,
      platformFee: booking.platformFeeDeducted || 0,
      refundedAt: booking.refundedAt,
      refundStatus: booking.refundStatus || 'processed'
    }));

    const totalRefunded = formattedRefunds.reduce((sum, r) => sum + r.refundAmount, 0);

    res.json({
      success: true,
      data: {
        refunds: formattedRefunds,
        totalRefunded,
        count: formattedRefunds.length
      }
    });
  } catch (error) {
    console.error('Get refunds error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;