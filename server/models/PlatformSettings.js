
const mongoose = require("mongoose");

const PlatformSettingsSchema = new mongoose.Schema(
  {
    // ── General ──────────────────────────────────────────────
    general: {
      platformName:   { type: String, default: "RideSharePro" },
      supportEmail:   { type: String, default: "support@ridesharepro.com" },
      contactPhone:   { type: String, default: "+91 98765 43210" },
      timezone:       { type: String, default: "Asia/Kolkata" },
      currency:       { type: String, default: "INR" },
      language:       { type: String, default: "en-IN" },

      // Ride & Dispatch logistics
      maxDetourKm:        { type: Number, default: 10 },
      minTripDistanceKm:  { type: Number, default: 1.5 },
      maxPassengersPerVehicle: { type: Number, default: 8 },
      womenOnlyMode:      { type: Boolean, default: true },
      autoCompleteMinutes:{ type: Number, default: 5 },
    },

    // ── Platform Fees ─────────────────────────────────────────
    fees: {
      platformFeePercent:   { type: Number, default: 5 },    // % of fare
      driverPayoutPercent:  { type: Number, default: 95 },   // % of fare to driver
      minFareINR:           { type: Number, default: 50 },
      cancellationFeeINR:   { type: Number, default: 0 },
      escrowReleaseHours:   { type: Number, default: 24 },   // hours after trip end
      refundWindowHours:    { type: Number, default: 48 },
      gstPercent:           { type: Number, default: 0 },    // if applicable
    },

    // ── Notifications ─────────────────────────────────────────
    notifications: {
      emailEnabled:         { type: Boolean, default: true },
      smsEnabled:           { type: Boolean, default: false },
      pushEnabled:          { type: Boolean, default: true },
      bookingConfirmation:  { type: Boolean, default: true },
      tripReminder:         { type: Boolean, default: true },
      tripReminderMinutes:  { type: Number,  default: 30 },
      disputeAlerts:        { type: Boolean, default: true },
      payoutAlerts:         { type: Boolean, default: true },
      adminDigestEnabled:   { type: Boolean, default: true },
      adminDigestFrequency: { type: String,  default: "daily",
        enum: ["hourly", "daily", "weekly"] },
    },

    // ── Security ──────────────────────────────────────────────
    security: {
      requireEmailVerification: { type: Boolean, default: true },
      otpExpiryMinutes:         { type: Number,  default: 10 },
      maxOtpAttempts:           { type: Number,  default: 5 },
      accessTokenExpiryMins:    { type: Number,  default: 15 },
      refreshTokenExpiryDays:   { type: Number,  default: 7 },
      maxLoginAttempts:         { type: Number,  default: 5 },
      loginLockoutMinutes:      { type: Number,  default: 30 },
      requireKycForHosting:     { type: Boolean, default: false },
      allowGoogleAuth:          { type: Boolean, default: true },
      maintenanceMode:          { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

// ── Singleton helpers ─────────────────────────────────────────
PlatformSettingsSchema.statics.getSingleton = async function () {
  let doc = await this.findOne({});
  if (!doc) {
    doc = await this.create({});   // creates with all defaults
  }
  return doc;
};

PlatformSettingsSchema.statics.updateSingleton = async function (patch) {
  let doc = await this.findOne({});
  if (!doc) doc = new this({});

  // Deep merge — patch is { general: {...}, fees: {...}, ... }
  for (const section of Object.keys(patch)) {
    if (doc[section] !== undefined && typeof patch[section] === "object") {
      Object.assign(doc[section], patch[section]);
      doc.markModified(section);
    }
  }
  await doc.save();
  return doc;
};

module.exports = mongoose.model("PlatformSettings", PlatformSettingsSchema);