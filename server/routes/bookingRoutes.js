const { Router } = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const { Validate } = require("../middleware/validateMiddleware");
const {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  confirmBooking,
  getTripBookings,
  updateBookingStatus,
} = require("../controllers/bookingController");
const {
  bookingSchema,
  updateBookingSchema,
} = require("../validation/bookingValidation");

const router = Router();

// All booking routes require authentication
router.use(authMiddleware);

// Booking CRUD
router.post("/", Validate(bookingSchema), createBooking);
router.get("/my-bookings", getMyBookings);
router.get("/trip/:tripId", getTripBookings);
router.get("/:id", getBookingById);
router.put("/:id/cancel", cancelBooking);
router.put("/:id/confirm", confirmBooking);
router.put("/:id/status", Validate(updateBookingSchema), updateBookingStatus);

module.exports = router;