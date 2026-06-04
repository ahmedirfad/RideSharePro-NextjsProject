const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema(
  {
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", required: true },
    passengerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    seatsBooked: { type: Number, required: true, min: 1 },
    totalAmount: { type: Number, required: true, min: 0 },
    platformFee: { type: Number, required: true, min: 0 },
    driverEarning: { type: Number, required: true, min: 0 },
    pickupLocation: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed"],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "refunded"],
      default: "pending",
    },
    stripePaymentId: { type: String, default: "" },
  },
  { timestamps: true }
);

// Indexes for faster queries
BookingSchema.index({ passengerId: 1, createdAt: -1 });
BookingSchema.index({ tripId: 1, status: 1 });

module.exports = mongoose.model("Booking", BookingSchema);