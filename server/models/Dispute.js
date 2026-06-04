const mongoose = require("mongoose");

const DisputeSchema = new mongoose.Schema(
  {
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", required: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    against: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reason: {
      type: String,
      enum: [
        "driver_no_show",
        "passenger_no_show",
        "payment_issue",
        "misconduct",
        "wrong_route",
        "vehicle_mismatch",
        "other",
      ],
      required: true,
    },
    description: { type: String, required: true },
    evidence: [{ type: String, default: [] }], // Cloudinary URLs
    status: {
      type: String,
      enum: ["open", "under_review", "resolved", "dismissed"],
      default: "open",
    },
    resolution: {
      type: String,
      enum: ["refund_passenger", "release_to_driver", "partial_refund", "none"],
      default: "none",
    },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    resolvedAt: { type: Date },
    adminNotes: { type: String, default: "" },
  },
  { timestamps: true }
);

// Indexes for faster queries
DisputeSchema.index({ tripId: 1 });
DisputeSchema.index({ raisedBy: 1, createdAt: -1 });
DisputeSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Dispute", DisputeSchema);