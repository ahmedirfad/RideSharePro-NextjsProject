const { Router } = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const { Validate } = require("../middleware/validateMiddleware");
const {
  createReview,
  getTripReviews,
  getUserReviews,
  getReviewById,
  updateReview,
  deleteReview,
  getDriverRating,
} = require("../controllers/reviewController");
const {
  createReviewSchema,
  updateReviewSchema,
} = require("../validation/reviewValidation");

const router = Router();

// Public routes (no auth required)
router.get("/trip/:tripId", getTripReviews);
router.get("/user/:userId", getUserReviews);
router.get("/driver/:driverId/rating", getDriverRating);
router.get("/:id", getReviewById);

// Protected routes (auth required)
router.use(authMiddleware);

// Review CRUD
router.post("/", Validate(createReviewSchema), createReview);
router.put("/:id", Validate(updateReviewSchema), updateReview);
router.delete("/:id", deleteReview);

module.exports = router;