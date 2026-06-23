// server/models/EmailLog.js
const mongoose = require('mongoose');

const EmailLogSchema = new mongoose.Schema({
  // Email identifiers
  emailId: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'verification',
      'password_reset',
      'password_changed',
      'new_device_login',
      'trip_posted',
      'booking_confirmation',
      'new_booking_alert',
      'trip_reminder',
      'trip_started',
      'trip_completed',
      'review_request',
      'booking_cancelled',
      'trip_cancelled',
      'payment_success',
      'payment_failed',
      'refund_processed',
      'dispute_created',
      'dispute_status_updated',
      'admin_alert',
      'welcome',
      'account_deactivated'
    ]
  },

  // Recipient
  to: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Content
  subject: { type: String, required: true },
  templateData: { type: mongoose.Schema.Types.Mixed },

  // Status tracking
  status: {
    type: String,
    enum: ['queued', 'sent', 'failed', 'bounced', 'opened', 'clicked'],
    default: 'queued'
  },

  // Metadata
  sentAt: { type: Date },
  deliveredAt: { type: Date },
  openedAt: { type: Date },
  clickedAt: { type: Date },

  // Error handling
  error: { type: String },
  retryCount: { type: Number, default: 0 },
  maxRetries: { type: Number, default: 3 },

  // Tracking
  ipAddress: { type: String },
  userAgent: { type: String },
  campaignId: { type: String },

  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  // ✅ Use mongoose's built-in timestamps
  timestamps: true
});

// ─── Indexes ──────────────────────────────────────────────────
EmailLogSchema.index({ userId: 1, createdAt: -1 });
EmailLogSchema.index({ type: 1, createdAt: -1 });
EmailLogSchema.index({ status: 1, createdAt: 1 });
EmailLogSchema.index({ to: 1, createdAt: -1 });

// ✅ REMOVED the pre-save middleware with next()

module.exports = mongoose.model('EmailLog', EmailLogSchema);