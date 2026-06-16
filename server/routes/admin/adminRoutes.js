// server/routes/adminRoutes.js
const { Router } = require("express");
const { authMiddleware, adminOnly } = require("../../middleware/authMiddleware");

// ── Controllers ───────────────────────────────────────────────────────────────
const {
  getUsers,
  toggleSuspendUser,
  createUserByAdmin,
  exportUsersCsv,
} = require("../../controllers/admin/adminUserController");

const {
  getAllTrips,
  getTripStats,
  getAdminTripById,
  adminUpdateTrip,
  adminCancelTrip,
  adminBulkCancelTrips,
} = require("../../controllers/admin/adminTripController");

const {
  getAllDisputes,
  getDisputeById,
  resolveDispute,
  getDisputeStats,
  exportDisputesCsv,
} = require("../../controllers/admin/adminDisputeController");

// ── NEW: Bookings controllers ──────────────────────────────────────────────────
const {
  getBookings,
  getBookingStats,
  getBookingCharts,
  processRefund,
  releaseEscrow,
  exportBookingsCsv,
} = require("../../controllers/admin/adminBookingController");

const { getAnalyticsOverview } = require("../../controllers/admin/adminAnalyticsController");

const { getSettings, updateSettings, toggleMaintenance } = require("../../controllers/admin/adminSettingsController");

const router = Router();

// All admin routes require a valid token AND role === 'admin'
router.use(authMiddleware, adminOnly);

// ── Users ─────────────────────────────────────────────────────────────────────
router.get("/users",              getUsers);
router.get("/users/export",       exportUsersCsv);
router.post("/users",             createUserByAdmin);
router.put("/users/:id/suspend",  toggleSuspendUser);

// ── Trips ─────────────────────────────────────────────────────────────────────
router.get("/trips/stats",        getTripStats);
router.put("/trips/bulk-cancel",  adminBulkCancelTrips);
router.get("/trips",              getAllTrips);
router.get("/trips/:id",          getAdminTripById);
router.put("/trips/:id",          adminUpdateTrip);
router.put("/trips/:id/cancel",   adminCancelTrip);

// ── Disputes ──────────────────────────────────────────────────────────────────
router.get("/disputes/stats",     getDisputeStats);
router.get("/disputes/export",    exportDisputesCsv);
router.get("/disputes",           getAllDisputes);
router.get("/disputes/:id",       getDisputeById);
router.put("/disputes/:id/resolve", resolveDispute);

// ── Bookings ──────────────────────────────────────────────────────────────────
// IMPORTANT: /bookings/stats, /bookings/charts, /bookings/export must come before /bookings/:id
router.get("/bookings/stats",     getBookingStats);
router.get("/bookings/charts",    getBookingCharts);
router.get("/bookings/export",    exportBookingsCsv);
router.get("/bookings",           getBookings);
router.put("/bookings/:id/refund",        processRefund);
router.put("/bookings/:id/release-escrow", releaseEscrow);

router.get("/analytics/overview", getAnalyticsOverview);

router.get("/settings",                  getSettings);
router.put("/settings",                  updateSettings);
router.put("/settings/maintenance",      toggleMaintenance);

module.exports = router;