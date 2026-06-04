const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema(
  {
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", required: true },
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    revieweeId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: "" },
  },
  { timestamps: true }
);

ReviewSchema.index({ tripId: 1, reviewerId: 1, revieweeId: 1 }, { unique: true });
ReviewSchema.index({ revieweeId: 1, createdAt: -1 });

module.exports = mongoose.model("Review", ReviewSchema);