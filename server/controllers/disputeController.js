const mongoose = require("mongoose");
const Dispute = require("../models/Dispute");
const Booking = require("../models/Booking");
const Trip = require("../models/Trip");

// ─────────────────────────────────────────────────────────────
// POST /api/disputes
// Body: { bookingId, reason, description, evidence: [urls] }
//
// Determines tripId + "against" user automatically from the booking:
//  - If raisedBy is the passenger → against = trip driver
//  - If raisedBy is the driver    → against = booking passenger
// ─────────────────────────────────────────────────────────────
const createDispute = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { bookingId, reason, description, evidence } = req.body;

    if (!bookingId || !reason || !description) {
      return res.status(400).json({
        success: false,
        message: "bookingId, reason, and description are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ success: false, message: "Invalid booking ID" });
    }

    const booking = await Booking.findById(bookingId).populate("tripId");
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const trip = booking.tripId;
    if (!trip) {
      return res.status(404).json({ success: false, message: "Associated trip not found" });
    }

    const isPassenger = booking.passengerId.toString() === userId.toString();
    const isDriver = trip.driverId.toString() === userId.toString();

    if (!isPassenger && !isDriver) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to raise a dispute for this trip",
      });
    }

    const against = isPassenger ? trip.driverId : booking.passengerId;

    const dispute = new Dispute({
      tripId: trip._id,
      bookingId: booking._id,
      raisedBy: userId,
      against,
      reason,
      description,
      evidence: Array.isArray(evidence) ? evidence : [],
      status: "open",
    });

    await dispute.save();

    return res.status(201).json({
      success: true,
      message: "Dispute filed successfully. Our team will review it shortly.",
      data: dispute,
    });
  } catch (error) {
    console.error("Create dispute error:", error);
    res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/disputes/my
// Returns all disputes raised by OR against the logged-in user.
// ─────────────────────────────────────────────────────────────
const getMyDisputes = async (req, res) => {
  try {
    const userId = req.user.userId;

    const disputes = await Dispute.find({
      $or: [{ raisedBy: userId }, { against: userId }],
    })
      .populate("tripId", "from to departureDate departureTime")
      .populate("raisedBy", "name")
      .populate("against", "name")
      .sort({ createdAt: -1 });

    const formatted = disputes.map((d) => ({
      id: d._id,
      tripId: d.tripId?._id,
      route: d.tripId ? `${d.tripId.from} → ${d.tripId.to}` : "Trip removed",
      date: d.tripId?.departureDate
        ? new Date(d.tripId.departureDate).toLocaleDateString("en-IN", {
            day: "numeric", month: "short", year: "numeric",
          })
        : "—",
      reason: d.reason,
      description: d.description,
      status: d.status,
      resolution: d.resolution,
      adminNotes: d.adminNotes,
      evidence: d.evidence,
      raisedByMe: d.raisedBy?._id?.toString() === userId.toString(),
      otherParty: d.raisedBy?._id?.toString() === userId.toString()
        ? d.against?.name
        : d.raisedBy?.name,
      createdAt: d.createdAt,
      resolvedAt: d.resolvedAt,
    }));

    return res.json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    console.error("Get my disputes error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/disputes/:id
// ─────────────────────────────────────────────────────────────
const getDisputeById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid dispute ID" });
    }

    const dispute = await Dispute.findById(id)
      .populate("tripId", "from to departureDate departureTime")
      .populate("raisedBy", "name")
      .populate("against", "name");

    if (!dispute) {
      return res.status(404).json({ success: false, message: "Dispute not found" });
    }

    const isParty =
      dispute.raisedBy._id.toString() === userId.toString() ||
      dispute.against._id.toString() === userId.toString();

    if (!isParty) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    return res.json({ success: true, data: dispute });
  } catch (error) {
    console.error("Get dispute error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /api/disputes/:id/cancel
// Raiser can cancel/withdraw their own dispute while still "open".
// ─────────────────────────────────────────────────────────────
const cancelDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const dispute = await Dispute.findById(id);
    if (!dispute) {
      return res.status(404).json({ success: false, message: "Dispute not found" });
    }
    if (dispute.raisedBy.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }
    if (dispute.status !== "open") {
      return res.status(400).json({
        success: false,
        message: "Only open disputes can be withdrawn",
      });
    }

    dispute.status = "dismissed";
    dispute.adminNotes = "Withdrawn by user";
    await dispute.save();

    return res.json({ success: true, message: "Dispute withdrawn", data: dispute });
  } catch (error) {
    console.error("Cancel dispute error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createDispute,
  getMyDisputes,
  getDisputeById,
  cancelDispute,
};