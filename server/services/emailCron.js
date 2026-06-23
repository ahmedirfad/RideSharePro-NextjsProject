// server/services/emailCron.js
const cron = require('node-cron');
const Trip = require('../models/Trip');
const Booking = require('../models/Booking');
const User = require('../models/User');
const {
  sendTripReminderEmail,
  sendReviewRequestEmail,
  sendAdminAlertEmail
} = require('../controllers/emailController');

// ─── Trip Reminders (24 hours before departure) ──────────────
const scheduleTripReminders = async () => {
  console.log('⏰ Running trip reminder cron...');
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  try {
    // Find trips departing tomorrow
    const trips = await Trip.find({
      departureDate: tomorrowStr,
      status: 'upcoming'
    }).populate('driverId');

    for (const trip of trips) {
      // Send to driver
      await sendTripReminderEmail(trip.driverId, trip);
      
      // Send to all passengers
      const bookings = await Booking.find({ tripId: trip._id, status: 'confirmed' })
        .populate('passengerId');
      
      for (const booking of bookings) {
        await sendTripReminderEmail(booking.passengerId, trip, booking);
      }
    }

    console.log(`✅ Sent ${trips.length} trip reminders`);
  } catch (error) {
    console.error('❌ Trip reminder cron failed:', error);
  }
};

// ─── Review Requests (2 hours after completion) ──────────────
const scheduleReviewRequests = async () => {
  console.log('⭐ Running review request cron...');
  
  const twoHoursAgo = new Date();
  twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

  try {
    // Find recently completed trips
    const trips = await Trip.find({
      status: 'completed',
      updatedAt: { $lte: twoHoursAgo }
    });

    for (const trip of trips) {
      const bookings = await Booking.find({ tripId: trip._id, status: 'confirmed' })
        .populate('passengerId');
      
      for (const booking of bookings) {
        await sendReviewRequestEmail(booking.passengerId, trip);
      }
    }

    console.log(`✅ Sent ${trips.length} review requests`);
  } catch (error) {
    console.error('❌ Review request cron failed:', error);
  }
};

// ─── Admin Reports ──────────────────────────────────────────────
const scheduleAdminReports = async () => {
  console.log('📊 Running admin report cron...');
  
  try {
    // Get stats
    const totalTrips = await Trip.countDocuments();
    const totalBookings = await Booking.countDocuments();
    const upcomingTrips = await Trip.countDocuments({ status: 'upcoming' });
    const completedTrips = await Trip.countDocuments({ status: 'completed' });
    const totalUsers = await User.countDocuments();

    const report = {
      title: 'Daily Report',
      message: `📊 RideSharePro Daily Summary`,
      details: `
        👥 Total Users: ${totalUsers}
        🚗 Total Trips: ${totalTrips}
        📅 Upcoming: ${upcomingTrips}
        ✅ Completed: ${completedTrips}
        🎫 Total Bookings: ${totalBookings}
      `
    };

    // Send to admin email
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@ridesharepro.com';
    await sendAdminAlertEmail(adminEmail, {
      ...report,
      link: '/admin/dashboard'
    });

    console.log('✅ Admin report sent');
  } catch (error) {
    console.error('❌ Admin report cron failed:', error);
  }
};

// ─── Start all cron jobs ──────────────────────────────────────
const startEmailCron = () => {
  // Run trip reminders at 8:00 AM daily
  cron.schedule('0 8 * * *', scheduleTripReminders);
  console.log('✅ Trip reminder cron scheduled (8:00 AM daily)');

  // Run review requests every 30 minutes
  cron.schedule('*/30 * * * *', scheduleReviewRequests);
  console.log('✅ Review request cron scheduled (every 30 minutes)');

  // Run admin reports at 11:00 PM daily
  cron.schedule('0 23 * * *', scheduleAdminReports);
  console.log('✅ Admin report cron scheduled (11:00 PM daily)');

  console.log('✅ All email cron jobs started');
};

module.exports = { startEmailCron };