const Trip = require("../models/Trip");
const Booking = require("../models/Booking");
const User = require("../models/User");
const { notify } = require("../utils/notify");

// ✅ NEW: Import email functions
const {
  sendBookingConfirmationEmail,
  sendNewBookingAlertEmail,
  sendBookingCancelledEmail,
  sendTripReminderEmail
} = require("../controllers/emailController");

const createBooking = async (req, res) => {
  try {
    const { tripId, seatsBooked, pickupLocation } = req.body;
    const passengerId = req.user.userId;

    const trip = await Trip.findById(tripId);

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    if (trip.driverId.toString() === passengerId) {
      return res.status(400).json({ message: "You cannot book your own trip" });
    }

    if (trip.seatsAvailable < seatsBooked) {
      return res.status(400).json({ message: "Not enough seats available" });
    }

    if (trip.status !== "upcoming") {
      return res.status(400).json({ message: "This trip is no longer available for booking" });
    }

    const totalAmount = trip.pricePerSeat * seatsBooked;
    const platformFee = 0;
    const driverEarning = totalAmount - platformFee;

    const booking = new Booking({
      tripId,
      passengerId,
      seatsBooked,
      totalAmount,
      platformFee,
      driverEarning,
      pickupLocation,
      status: "confirmed",
      paymentStatus: "pending",
    });

    await booking.save();

    trip.seatsAvailable -= seatsBooked;
    await trip.save();

    const populatedBooking = await Booking.findById(booking._id)
      .populate("passengerId", "name email phone")
      .populate("tripId", "from to departureDate departureTime pricePerSeat");

    // ─── Get user details ──────────────────────────────────
    const passenger = await User.findById(passengerId).select("name email");
    const driver = await User.findById(trip.driverId).select("name email");

    // ─── SOCKET NOTIFICATIONS ──────────────────────────────
    await notify(req.io, {
      userId: trip.driverId,
      type: "booking_confirmed",
      title: "New Booking! 🚗",
      body: `${passenger?.name || "Someone"} booked ${seatsBooked} seat${seatsBooked > 1 ? 's' : ''} on your trip ${trip.from} → ${trip.to}`,
      link: `/trip/${trip._id}`,
      meta: { bookingId: booking._id, tripId: trip._id, seatsBooked }
    });

    await notify(req.io, {
      userId: passengerId,
      type: "booking_confirmed",
      title: "Booking Confirmed! ✅",
      body: `Your booking on ${trip.from} → ${trip.to} (${trip.departureDate}) is confirmed`,
      link: `/messages?bookingId=${booking._id}`,
      meta: { bookingId: booking._id, tripId: trip._id }
    });

    req.io.to(`chat:${booking._id}`).emit("booking_confirmed", {
      bookingId: booking._id,
      passengerId,
      driverId: trip.driverId,
      tripId: trip._id
    });

    // ─── EMAIL NOTIFICATIONS ────────────────────────────────
    // ✅ FIXED: Pass user objects directly
    await sendBookingConfirmationEmail(passenger, booking, trip);
    await sendNewBookingAlertEmail(driver, passenger, booking, trip);

    res.status(201).json({
      success: true,
      message: "Booking confirmed",
      data: populatedBooking,
    });
  } catch (error) {
    console.error("Create booking error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getMyBookings = async (req, res) => {
  try {
    const userId = req.user.userId;

    const bookings = await Booking.find({ passengerId: userId })
      .populate({
        path: "tripId",
        populate: { path: "driverId", select: "name rating profilePhoto isVerified" }
      })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    console.error("Get bookings error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const booking = await Booking.findById(id)
      .populate("passengerId", "name email phone")
      .populate({
        path: "tripId",
        populate: { path: "driverId", select: "name rating profilePhoto isVerified phone" }
      });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.passengerId._id.toString() !== userId && booking.tripId.driverId._id.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    res.json({
      success: true,
      data: booking,
    });
  } catch (error) {
    console.error("Get booking error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getTripBookings = async (req, res) => {
  try {
    const { tripId } = req.params;
    const userId = req.user.userId;

    const trip = await Trip.findById(tripId);
    
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    if (trip.driverId.toString() !== userId) {
      return res.status(403).json({ message: "Only the driver can view trip bookings" });
    }

    const bookings = await Booking.find({ tripId })
      .populate("passengerId", "name email phone rating")
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    console.error("Get trip bookings error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const booking = await Booking.findById(id).populate("tripId").populate("passengerId", "name email");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.passengerId._id.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (booking.status === "cancelled") {
      return res.status(400).json({ message: "Booking already cancelled" });
    }

    const trip = await Trip.findById(booking.tripId).populate("driverId", "name email");
    const tripDate = new Date(trip.departureDate);
    const now = new Date();
    const hoursUntilDeparture = (tripDate - now) / (1000 * 60 * 60);

    if (hoursUntilDeparture < 24) {
      return res.status(400).json({ message: "Cannot cancel within 24 hours of departure" });
    }

    const passenger = await User.findById(userId).select("name email");
    const refundAmount = booking.totalAmount || 0;

    booking.status = "cancelled";
    await booking.save();

    trip.seatsAvailable += booking.seatsBooked;
    await trip.save();

    // ─── SOCKET NOTIFICATIONS ──────────────────────────────
    await notify(req.io, {
      userId: trip.driverId,
      type: "booking_confirmed",
      title: "❌ Booking Cancelled",
      body: `${passenger?.name || "Someone"} cancelled their booking on ${trip.from} → ${trip.to}`,
      link: `/trip/${trip._id}`,
      meta: { bookingId: booking._id, tripId: trip._id }
    });

    await notify(req.io, {
      userId: userId,
      type: "booking_confirmed",
      title: "Booking Cancelled ✅",
      body: `You have cancelled your booking on ${trip.from} → ${trip.to}`,
      link: `/trips`,
      meta: { bookingId: booking._id, tripId: trip._id }
    });

    // ─── EMAIL NOTIFICATIONS ────────────────────────────────
    // ✅ FIXED: Pass user objects directly
    await sendBookingCancelledEmail(trip.driverId, booking, trip, passenger?.name || 'Passenger', refundAmount);
    await sendBookingCancelledEmail(passenger, booking, trip, 'You', refundAmount);

    res.json({
      success: true,
      message: "Booking cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel booking error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const confirmBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const booking = await Booking.findById(id).populate("tripId").populate("passengerId", "name email");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.tripId.driverId.toString() !== userId) {
      return res.status(403).json({ message: "Only the driver can confirm bookings" });
    }

    if (booking.status !== "pending") {
      return res.status(400).json({ message: `Booking is already ${booking.status}` });
    }

    booking.status = "confirmed";
    await booking.save();

    const driver = await User.findById(userId).select("name email");
    const trip = await Trip.findById(booking.tripId);

    // ─── SOCKET NOTIFICATIONS ──────────────────────────────
    await notify(req.io, {
      userId: booking.passengerId._id,
      type: "booking_confirmed",
      title: "Booking Confirmed! ✅",
      body: `${driver?.name || "Driver"} has confirmed your booking on ${booking.tripId.from} → ${booking.tripId.to}`,
      link: `/messages?bookingId=${booking._id}`,
      meta: { bookingId: booking._id, tripId: booking.tripId._id }
    });

    // ─── EMAIL NOTIFICATIONS ────────────────────────────────
    // ✅ FIXED: Pass user objects directly
    await sendBookingConfirmationEmail(booking.passengerId, booking, trip);

    res.json({
      success: true,
      message: "Booking confirmed",
      data: booking,
    });
  } catch (error) {
    console.error("Confirm booking error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ==================== UPDATE BOOKING STATUS ====================
const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.userId;

    const booking = await Booking.findById(id)
      .populate("tripId")
      .populate("passengerId", "name email");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const isDriver = booking.tripId.driverId.toString() === userId;
    const isPassenger = booking.passengerId._id.toString() === userId;

    if (!isDriver && !isPassenger) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const oldStatus = booking.status;
    booking.status = status;
    await booking.save();

    const actor = await User.findById(userId).select("name");
    const otherUserId = isDriver ? booking.passengerId._id : booking.tripId.driverId;

    if (oldStatus !== status) {
      await notify(req.io, {
        userId: otherUserId,
        type: "booking_confirmed",
        title: `Booking ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        body: `${actor?.name || "Someone"} changed booking status to ${status} on ${booking.tripId.from} → ${booking.tripId.to}`,
        link: `/trip/${booking.tripId._id}`,
        meta: { bookingId: booking._id, tripId: booking.tripId._id, status }
      });
    }

    res.json({
      success: true,
      message: `Booking ${status}`,
      data: booking,
    });
  } catch (error) {
    console.error("Update booking status error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createBooking,
  getMyBookings,
  getBookingById,
  getTripBookings,
  cancelBooking,
  confirmBooking,
  updateBookingStatus,
};