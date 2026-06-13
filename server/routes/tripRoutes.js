// server/routes/tripRoutes.js
const { Router } = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const { Validate }       = require("../middleware/validateMiddleware");
const {
  createTrip,
  searchTrips,
  bookSegment,
  getTripById,
  getMyTrips,
  cancelTrip,
  updateTrip,
  getDriverTrips,
  getSeatMap,
} = require("../controllers/tripController");
const { createTripSchema } = require("../validation/tripValidation");

const router = Router();

// ── CRITICAL: specific routes MUST come before /:id wildcard ─────────────────
// If /my-trips/all is placed after /:id, Express matches it as id="my-trips"
// and getTripById runs instead of getMyTrips — causing a silent 404/error.

// ── Public routes ─────────────────────────────────────────────────────────────
router.get("/search",       searchTrips);   // GET /trips/search
router.get("/:id/seat-map", getSeatMap);    // GET /trips/:id/seat-map?fromOrder=1&toOrder=4

// ── Protected routes (specific paths before wildcard) ─────────────────────────
router.use(authMiddleware);

// FIX: /my-trips/all MUST be before /:id
router.get("/my-trips/all",         getMyTrips);      // GET  /trips/my-trips/all
router.get("/driver/:driverId",     getDriverTrips);  // GET  /trips/driver/:driverId

// Wildcard last
router.get("/:id",                  getTripById);     // GET  /trips/:id

router.post("/",                    Validate(createTripSchema), createTrip);
router.post("/:id/book",            bookSegment);
router.put("/:id",                  updateTrip);
router.put("/:id/cancel",           cancelTrip);

module.exports = router;