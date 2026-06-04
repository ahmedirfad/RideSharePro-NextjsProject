const mongoose = require("mongoose");

const TripSchema = new mongoose.Schema(
  {
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
    fromLocation: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true },
    },
    toLocation: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true },
    },
    departureDate: { type: String, required: true },
    departureTime: { type: String, required: true },
    seatsAvailable: { type: Number, required: true, min: 0 },
    totalSeats: { type: Number, required: true, min: 1 },
    pricePerSeat: { type: Number, required: true, min: 0 },
    maxDetourKm: { type: Number, default: 10, min: 0 },
    womenOnly: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["upcoming", "ongoing", "completed", "cancelled"],
      default: "upcoming",
    },
  },
  { timestamps: true }
);

TripSchema.index({ fromLocation: "2dsphere" });

module.exports = mongoose.model("Trip", TripSchema);