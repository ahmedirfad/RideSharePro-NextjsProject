const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, default: null },

    phone: { type: String, default: "" },
    gender: {
      type: String,
      enum: ["male", "female", "other", ""],
      default: "",
    },

    // Google OAuth
    googleId: { type: String, default: null },
    authProvider: { type: String, enum: ["local", "google"], default: "local" },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    profilePhoto: { type: String, default: "" },
    isVerified: { type: Boolean, default: false },
    isEmailVerified: { type: Boolean, default: false },
    emergencyContact: { type: String, default: "" },
    location: { type: String, default: "" },

    // ✅ NEW — admin moderation
    isSuspended: { type: Boolean, default: false },
    suspendedAt: { type: Date, default: null },
    suspendedReason: { type: String, default: "" },

    rating: { type: Number, default: 0 },
    totalRatings: { type: Number, default: 0 },

    pushSubscription: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);