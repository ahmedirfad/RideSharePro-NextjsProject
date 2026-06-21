// server/routes/messageRoutes.js
const { Router }      = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const Message         = require("../models/Message");
const Booking         = require("../models/Booking");
const Trip             = require("../models/Trip");
const mongoose        = require("mongoose");

const router = Router();
router.use(authMiddleware);

// ── CRITICAL: specific routes MUST come before /:bookingId wildcard ──────────
// Without this, GET /messages/unread is matched as bookingId="unread",
// fails ObjectId validation, and returns 400 — exactly the bug we hit.

// GET /api/messages/unread — total unread count across all conversations
router.get("/unread", async (req, res) => {
  try {
    const userId = req.user.userId;

    // Bookings where the user is the passenger
    const passengerBookings = await Booking.find({ passengerId: userId })
      .select("_id")
      .lean();

    // Bookings on trips where the user is the driver
    const drivenTrips = await Trip.find({ driverId: userId }).select("_id").lean();
    const drivenTripIds = drivenTrips.map((t) => t._id);

    const driverBookings = await Booking.find({ tripId: { $in: drivenTripIds } })
      .select("_id")
      .lean();

    const bookingIds = [
      ...passengerBookings.map((b) => b._id),
      ...driverBookings.map((b) => b._id),
    ];

    if (bookingIds.length === 0) {
      return res.json({ success: true, data: { unreadCount: 0 } });
    }

    const unreadCount = await Message.countDocuments({
      bookingId: { $in: bookingIds },
      readBy:    { $ne: userId },
      senderId:  { $ne: userId }, // don't count your own messages as unread
    });

    return res.json({ success: true, data: { unreadCount } });
  } catch (err) {
    console.error("Get unread count error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/messages — list all conversations (bookings with last message)
router.get("/", async (req, res) => {
  try {
    const userId = req.user.userId;

    const bookings = await Booking.find({
      $or: [{ passengerId: userId }],
    })
      .populate("tripId", "from to driverId departureDate")
      .populate("passengerId", "name profilePhoto")
      .lean();

    const drivenTrips = await Trip.find({ driverId: userId }).select("_id").lean();
    const drivenTripIds = drivenTrips.map((t) => t._id);

    const driverBookings = await Booking.find({ tripId: { $in: drivenTripIds } })
      .populate("tripId", "from to driverId departureDate")
      .populate("passengerId", "name profilePhoto")
      .lean();

    const allBookings = [...bookings, ...driverBookings];
    const seen = new Set();
    const unique = allBookings.filter((b) => {
      const key = b._id.toString();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const conversations = await Promise.all(
      unique.map(async (b) => {
        const lastMsg = await Message.findOne({ bookingId: b._id })
          .sort({ createdAt: -1 })
          .populate("senderId", "name")
          .lean();

        const unreadCount = await Message.countDocuments({
          bookingId: b._id,
          readBy:    { $ne: userId },
        });

        const isDriver = drivenTripIds.some(
          (id) => id.toString() === b.tripId?._id?.toString()
        );

        const otherParty = isDriver
          ? { name: b.passengerId?.name || "Passenger", photo: b.passengerId?.profilePhoto || "" }
          : { name: b.tripId?.driverId?.name || "Driver", photo: "" };

        return {
          bookingId:  b._id,
          tripId:     b.tripId?._id,
          route:      b.tripId ? `${b.tripId.from} → ${b.tripId.to}` : `${b.fromName} → ${b.toName}`,
          date:       b.tripId?.departureDate,
          otherParty,
          lastMessage: lastMsg
            ? { text: lastMsg.text, time: lastMsg.createdAt, senderName: lastMsg.senderId?.name }
            : null,
          unreadCount,
        };
      })
    );

    conversations.sort((a, b) => {
      const ta = a.lastMessage?.time ? new Date(a.lastMessage.time).getTime() : 0;
      const tb = b.lastMessage?.time ? new Date(b.lastMessage.time).getTime() : 0;
      return tb - ta;
    });

    return res.json({ success: true, data: conversations });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/messages/:bookingId — load message history for one conversation
// Wildcard route — MUST stay last
router.get("/:bookingId", async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ success: false, message: "Invalid booking ID" });
    }

    const booking = await Booking.findById(bookingId).populate("tripId", "driverId");
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    const isPassenger = booking.passengerId.toString() === userId;
    const isDriver    = booking.tripId?.driverId?.toString() === userId;
    if (!isPassenger && !isDriver) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const messages = await Message.find({ bookingId })
      .sort({ createdAt: 1 })
      .limit(100)
      .populate("senderId", "name profilePhoto")
      .lean();

    await Message.updateMany(
      { bookingId, readBy: { $ne: userId } },
      { $addToSet: { readBy: userId } }
    );

    return res.json({ success: true, data: messages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;