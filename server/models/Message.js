const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    tripId:    { type: mongoose.Schema.Types.ObjectId, ref: "Trip",    required: true },
    senderId:  { type: mongoose.Schema.Types.ObjectId, ref: "User",    required: true },
    text:      { type: String, required: true, maxlength: 2000 },
    readBy:    [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

MessageSchema.index({ bookingId: 1, createdAt: 1 });

module.exports = mongoose.model("Message", MessageSchema);