const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    userId:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: [
        "booking_confirmed",
        "trip_starting",
        "trip_completed",
        "dispute_filed",
        "escrow_released",
        "new_message",
        "refund_processed",
        "general",
      ],
      required: true,
    },
    title:   { type: String, required: true },
    body:    { type: String, required: true },
    link:    { type: String, default: "" },   // e.g. /trips, /trip/:id
    read:    { type: Boolean, default: false },
    meta:    { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, read: 1 });

module.exports = mongoose.model("Notification", NotificationSchema);