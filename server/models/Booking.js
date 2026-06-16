// server/models/Booking.js
const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema(
  {
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
    },
    passengerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ── Segment fields ────────────────────────────────────────────────────
    seatNumber: { type: Number, required: true },  // physical seat claimed

    // Waypoint indexes into trip.waypoints[]
    fromOrder: { type: Number, required: true },   // boarding stop index
    toOrder: { type: Number, required: true },     // alighting stop index

    // Denormalised for display — so we don't need to re-fetch the trip
    fromName: { type: String, required: true },    // e.g. "Kannur"
    toName: { type: String, required: true },      // e.g. "Kochi"

    // ── Fare (locked at booking time) ─────────────────────────────────────
    distanceKm: { type: Number, required: true },  // segment distance
    fareCharged: { type: Number, required: true }, // ₹ locked at booking

    // ── Legacy (kept for getMyTrips backward compat) ──────────────────────
    seatsBooked: { type: Number, default: 1 },
    totalAmount: { type: Number },                 // alias for fareCharged

    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed"],
      default: "confirmed",
    },

    // ✅ NEW — Payment & Escrow tracking
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded", "partially_refunded"],
      default: "paid",
    },
    escrowStatus: {
      type: String,
      enum: ["held", "released", "disputed", "refunded"],
      default: "held",
    },
    escrowReleasedAt: { type: Date, default: null },

    // ✅ NEW — Refund tracking
    refundAmount: { type: Number, default: 0 },
    refundReason: { type: String, default: "" },
    refundedAt: { type: Date, default: null },
    refundedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

// FIXED: Sync totalAmount with fareCharged on save - NO next()
BookingSchema.pre("save", function () {
  if (this.fareCharged != null) {
    this.totalAmount = this.fareCharged;
  }
});

BookingSchema.index({ tripId: 1, passengerId: 1 });
BookingSchema.index({ passengerId: 1, status: 1 });
BookingSchema.index({ escrowStatus: 1 });
BookingSchema.index({ paymentStatus: 1 });

module.exports = mongoose.model("Booking", BookingSchema);