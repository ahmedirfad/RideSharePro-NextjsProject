// server/controllers/emailController.js
const { sendEmailWithQueue, sendEmailImmediate } = require('../services/emailService');
const { getEmailStatus, getQueuedCount, getJobCounts, addEmailToQueue } = require('../services/emailQueue');
const EmailLog = require('../models/EmailLog'); // ✅ ADDED

// ─── Trigger Functions ──────────────────────────────────────────

// AUTH
const sendVerificationEmail = async (user) => {
  return await sendEmailWithQueue({
    to: user.email,
    type: 'verification',
    templateData: {
      name: user.name,
      otp: user.verificationOTP || '123456'
    },
    userId: user._id,
    priority: 'high'
  });
};

const sendPasswordResetEmail = async (user, otp) => {
  return await sendEmailWithQueue({
    to: user.email,
    type: 'password_reset',
    templateData: {
      name: user.name,
      otp
    },
    userId: user._id,
    priority: 'high'
  });
};

const sendPasswordChangedEmail = async (user) => {
  return await sendEmailWithQueue({
    to: user.email,
    type: 'password_changed',
    templateData: {
      name: user.name
    },
    userId: user._id,
    priority: 'normal'
  });
};

const sendNewDeviceLoginEmail = async (user, deviceInfo) => {
  return await sendEmailWithQueue({
    to: user.email,
    type: 'new_device_login',
    templateData: {
      name: user.name,
      device: deviceInfo.device,
      location: deviceInfo.location
    },
    userId: user._id,
    priority: 'high'
  });
};

// TRIPS
// server/controllers/emailController.js - sendTripPostedEmail
const sendTripPostedEmail = async (driver, trip) => {
  // ✅ Add null checks
  if (!driver || !trip) {
    console.error('❌ sendTripPostedEmail: Missing driver or trip data');
    return;
  }
  
  return await sendEmailWithQueue({
    to: driver.email,
    type: 'trip_posted',
    templateData: {
      from: trip.from || 'Unknown',
      to: trip.to || 'Unknown',
      departureDate: trip.departureDate || 'Unknown',
      departureTime: trip.departureTime || 'Unknown',
      seatsAvailable: trip.seatsAvailable || 0,
      pricePerSeat: trip.pricePerSeat || 0,
      tripId: trip._id || 'Unknown'
    },
    userId: driver._id,
    priority: 'normal'
  });
};

// BOOKINGS
const sendBookingConfirmationEmail = async (passenger, booking, trip) => {
  return await sendEmailWithQueue({
    to: passenger.email,
    type: 'booking_confirmation',
    templateData: {
      name: passenger.name,
      from: booking.fromName,
      to: booking.toName,
      seatNumber: booking.seatNumber,
      departureDate: trip.departureDate,
      departureTime: trip.departureTime,
      fare: booking.fareCharged,
      tripId: trip._id,
      bookingId: booking._id
    },
    userId: passenger._id,
    priority: 'high'
  });
};

const sendNewBookingAlertEmail = async (driver, passenger, booking, trip) => {
  return await sendEmailWithQueue({
    to: driver.email,
    type: 'new_booking_alert',
    templateData: {
      passengerName: passenger.name,
      seatNumber: booking.seatNumber,
      from: booking.fromName,
      to: booking.toName,
      fare: booking.fareCharged,
      departureDate: trip.departureDate,
      departureTime: trip.departureTime,
      tripId: trip._id,
      bookingId: booking._id
    },
    userId: driver._id,
    priority: 'high'
  });
};

const sendBookingCancelledEmail = async (user, booking, trip, cancelledBy, refundAmount = 0) => {
  const isDriver = user._id.toString() === trip.driverId.toString();
  return await sendEmailWithQueue({
    to: user.email,
    type: 'booking_cancelled',
    templateData: {
      from: booking.fromName,
      to: booking.toName,
      seatNumber: booking.seatNumber,
      cancelledBy,
      refundAmount
    },
    userId: user._id,
    priority: 'normal'
  });
};

// TRIP STATUS
const sendTripReminderEmail = async (user, trip, booking = null) => {
  return await sendEmailWithQueue({
    to: user.email,
    type: 'trip_reminder',
    templateData: {
      from: trip.from,
      to: trip.to,
      departureDate: trip.departureDate,
      departureTime: trip.departureTime,
      seatNumber: booking?.seatNumber,
      driverName: trip.driverId?.name,
      tripId: trip._id
    },
    userId: user._id,
    priority: 'high',
    delay: 24 * 60 * 60 * 1000 // 24 hours before departure
  });
};

const sendTripStartedEmail = async (user, trip) => {
  return await sendEmailWithQueue({
    to: user.email,
    type: 'trip_started',
    templateData: {
      from: trip.from,
      to: trip.to,
      tripId: trip._id
    },
    userId: user._id,
    priority: 'high'
  });
};

const sendTripCompletedEmail = async (user, trip, amount = 0) => {
  return await sendEmailWithQueue({
    to: user.email,
    type: 'trip_completed',
    templateData: {
      from: trip.from,
      to: trip.to,
      driverName: trip.driverId?.name,
      amount
    },
    userId: user._id,
    priority: 'normal'
  });
};

// PAYMENTS
const sendPaymentSuccessEmail = async (user, payment) => {
  return await sendEmailWithQueue({
    to: user.email,
    type: 'payment_success',
    templateData: {
      amount: payment.amount,
      transactionId: payment.transactionId
    },
    userId: user._id,
    priority: 'normal'
  });
};

const sendPaymentFailedEmail = async (user, payment) => {
  return await sendEmailWithQueue({
    to: user.email,
    type: 'payment_failed',
    templateData: {
      amount: payment.amount,
      error: payment.error,
      paymentId: payment._id
    },
    userId: user._id,
    priority: 'high'
  });
};

const sendRefundProcessedEmail = async (user, refund) => {
  return await sendEmailWithQueue({
    to: user.email,
    type: 'refund_processed',
    templateData: {
      amount: refund.amount,
      reason: refund.reason
    },
    userId: user._id,
    priority: 'normal'
  });
};

// REVIEWS
const sendReviewRequestEmail = async (user, trip) => {
  return await sendEmailWithQueue({
    to: user.email,
    type: 'review_request',
    templateData: {
      from: trip.from,
      to: trip.to,
      tripId: trip._id
    },
    userId: user._id,
    priority: 'normal',
    delay: 2 * 60 * 60 * 1000 // 2 hours after completion
  });
};

// DISPUTES
const sendDisputeCreatedEmail = async (user, dispute, trip) => {
  return await sendEmailWithQueue({
    to: user.email,
    type: 'dispute_created',
    templateData: {
      from: trip.from,
      to: trip.to,
      reason: dispute.reason,
      status: dispute.status,
      disputeId: dispute._id
    },
    userId: user._id,
    priority: 'high'
  });
};

const sendDisputeStatusUpdatedEmail = async (user, dispute, comment = '') => {
  return await sendEmailWithQueue({
    to: user.email,
    type: 'dispute_status_updated',
    templateData: {
      status: dispute.status,
      comment,
      disputeId: dispute._id
    },
    userId: user._id,
    priority: 'high'
  });
};

// ADMIN
const sendAdminAlertEmail = async (adminEmail, alert) => {
  return await sendEmailWithQueue({
    to: adminEmail,
    type: 'admin_alert',
    templateData: {
      title: alert.title,
      message: alert.message,
      details: alert.details,
      link: alert.link
    },
    priority: 'high'
  });
};

// WELCOME
const sendWelcomeEmail = async (user) => {
  return await sendEmailWithQueue({
    to: user.email,
    type: 'welcome',
    templateData: {
      name: user.name
    },
    userId: user._id,
    priority: 'normal'
  });
};

// ─── Admin Functions ────────────────────────────────────────────
const getEmailLogs = async (filter = {}, limit = 100, skip = 0) => {
  return await EmailLog.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('userId', 'name email');
};

const getEmailStats = async () => {
  const stats = await EmailLog.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const queueStats = await getJobCounts();

  return {
    statusDistribution: stats,
    queue: queueStats
  };
};

const retryFailedEmail = async (emailId) => {
  const email = await EmailLog.findOne({ emailId });
  if (!email) throw new Error('Email not found');
  if (email.status !== 'failed') throw new Error('Email is not in failed state');

  const { getTemplate } = require('../services/emailTemplates');
  const { subject, html } = getTemplate(email.type, email.templateData);

  return await addEmailToQueue({
    to: email.to,
    subject,
    html,
    type: email.type,
    userId: email.userId,
    templateData: email.templateData,
    priority: 'high'
  });
};

module.exports = {
  // Auth
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendNewDeviceLoginEmail,

  // Trips
  sendTripPostedEmail,

  // Bookings
  sendBookingConfirmationEmail,
  sendNewBookingAlertEmail,
  sendBookingCancelledEmail,

  // Trip Status
  sendTripReminderEmail,
  sendTripStartedEmail,
  sendTripCompletedEmail,

  // Payments
  sendPaymentSuccessEmail,
  sendPaymentFailedEmail,
  sendRefundProcessedEmail,

  // Reviews
  sendReviewRequestEmail,

  // Disputes
  sendDisputeCreatedEmail,
  sendDisputeStatusUpdatedEmail,

  // Admin
  sendAdminAlertEmail,

  // Welcome
  sendWelcomeEmail,

  // Admin Functions
  getEmailLogs,
  getEmailStats,
  retryFailedEmail
};