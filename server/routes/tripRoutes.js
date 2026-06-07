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

// ── Public routes ─────────────────────────────────────────────────────────────
router.get("/search",       searchTrips);   // GET /trips/search
router.get("/:id/seat-map", getSeatMap);    // GET /trips/:id/seat-map?fromOrder=1&toOrder=4
router.get("/:id",          getTripById);   // GET /trips/:id

// ── Protected routes ──────────────────────────────────────────────────────────
router.use(authMiddleware);

router.post("/",                    Validate(createTripSchema), createTrip);   // POST /trips
router.post("/:id/book",            bookSegment);                              // POST /trips/:id/book
router.get("/my-trips/all",         getMyTrips);                               // GET  /trips/my-trips/all
router.get("/driver/:driverId",     getDriverTrips);                           // GET  /trips/driver/:driverId
router.put("/:id",                  updateTrip);                               // PUT  /trips/:id
router.put("/:id/cancel",           cancelTrip);                               // PUT  /trips/:id/cancel

module.exports = router;
