const Trip = require("../models/Trip");
const Booking = require("../models/Booking");
const User = require("../models/User");

// ==================== CREATE BOOKING ====================
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

// ==================== GET MY BOOKINGS ====================
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

// ==================== GET BOOKING BY ID ====================
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

// ==================== GET TRIP BOOKINGS (for driver) ====================
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

// ==================== CANCEL BOOKING ====================
const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.passengerId.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (booking.status === "cancelled") {
      return res.status(400).json({ message: "Booking already cancelled" });
    }

    const trip = await Trip.findById(booking.tripId);
    const tripDate = new Date(trip.departureDate);
    const now = new Date();
    const hoursUntilDeparture = (tripDate - now) / (1000 * 60 * 60);

    if (hoursUntilDeparture < 24) {
      return res.status(400).json({ message: "Cannot cancel within 24 hours of departure" });
    }

    booking.status = "cancelled";
    await booking.save();

    trip.seatsAvailable += booking.seatsBooked;
    await trip.save();

    res.json({
      success: true,
      message: "Booking cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel booking error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ==================== CONFIRM BOOKING (by driver) ====================
const confirmBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const booking = await Booking.findById(id).populate("tripId");

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

    const booking = await Booking.findById(id).populate("tripId");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const isDriver = booking.tripId.driverId.toString() === userId;
    const isPassenger = booking.passengerId.toString() === userId;

    if (!isDriver && !isPassenger) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    booking.status = status;
    await booking.save();

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