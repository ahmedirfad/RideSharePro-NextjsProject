const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, required: true },
    // ✅ Only 2 roles now — user and admin
    // admin is only set manually (DB/seed), never via registration
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    gender: { type: String, enum: ["male", "female", "other"], required: true },
    profilePhoto: { type: String, default: "" },
    isVerified: { type: Boolean, default: false },
    isEmailVerified: { type: Boolean, default: false },
    emergencyContact: { type: String, default: "" },
    rating: { type: Number, default: 0 },
    totalRatings: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
