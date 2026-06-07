const Review = require("../models/Review");
const Trip = require("../models/Trip");
const Booking = require("../models/Booking");
const User = require("../models/User");

// ==================== CREATE REVIEW ====================
const createReview = async (req, res) => {
  try {
    const { tripId, rating, comment } = req.body;
    const reviewerId = req.user.userId;

    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // Check if user has already reviewed this trip
    const existingReview = await Review.findOne({ tripId, reviewerId });
    if (existingReview) {
      return res.status(400).json({ message: "You have already reviewed this trip" });
    }

    // Determine who is being reviewed (driver or passenger)
    const isPassenger = await Booking.findOne({ tripId, passengerId: reviewerId });
    const revieweeId = isPassenger ? trip.driverId : reviewerId === trip.driverId.toString() ? reviewerId : null;

    if (!revieweeId) {
      return res.status(400).json({ message: "You are not authorized to review this trip" });
    }

    const review = new Review({
      tripId,
      reviewerId,
      revieweeId,
      rating,
      comment: comment || "",
    });

    await review.save();

    // Update user's average rating
    const allReviews = await Review.find({ revieweeId });
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    await User.findByIdAndUpdate(revieweeId, { 
      rating: parseFloat(avgRating.toFixed(1)),
      totalRatings: allReviews.length 
    });

    res.status(201).json({ 
      success: true, 
      message: "Review submitted successfully",
      data: review 
    });
  } catch (error) {
    console.error("Create review error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ==================== GET TRIP REVIEWS ====================
const getTripReviews = async (req, res) => {
  try {
    const { tripId } = req.params;

    const reviews = await Review.find({ tripId })
      .populate("reviewerId", "name profilePhoto")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: reviews,
    });
  } catch (error) {
    console.error("Get trip reviews error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ==================== GET USER REVIEWS ====================
const getUserReviews = async (req, res) => {
  try {
    const { userId } = req.params;

    const reviews = await Review.find({ revieweeId: userId })
      .populate("reviewerId", "name profilePhoto")
      .populate("tripId", "from to departureDate")
      .sort({ createdAt: -1 });

    const user = await User.findById(userId).select("name rating totalRatings");

    res.json({
      success: true,
      data: {
        user,
        reviews,
      },
    });
  } catch (error) {
    console.error("Get user reviews error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ==================== GET REVIEW BY ID ====================
const getReviewById = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findById(id)
      .populate("reviewerId", "name profilePhoto")
      .populate("revieweeId", "name profilePhoto")
      .populate("tripId", "from to departureDate");

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    res.json({
      success: true,
      data: review,
    });
  } catch (error) {
    console.error("Get review error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ==================== GET DRIVER RATING ====================
const getDriverRating = async (req, res) => {
  try {
    const { driverId } = req.params;

    const reviews = await Review.find({ revieweeId: driverId });
    const avgRating = reviews.length > 0 
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
      : 0;

    res.json({
      success: true,
      data: {
        driverId,
        rating: parseFloat(avgRating.toFixed(1)),
        totalReviews: reviews.length,
      },
    });
  } catch (error) {
    console.error("Get driver rating error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ==================== UPDATE REVIEW ====================
const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.userId;

    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    if (review.reviewerId.toString() !== userId) {
      return res.status(403).json({ message: "Only the reviewer can update this review" });
    }

    review.rating = rating || review.rating;
    review.comment = comment || review.comment;
    await review.save();

    // Recalculate user rating
    const allReviews = await Review.find({ revieweeId: review.revieweeId });
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    await User.findByIdAndUpdate(review.revieweeId, { 
      rating: parseFloat(avgRating.toFixed(1))
    });

    res.json({
      success: true,
      message: "Review updated successfully",
      data: review,
    });
  } catch (error) {
    console.error("Update review error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ==================== DELETE REVIEW ====================
const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    if (review.reviewerId.toString() !== userId && req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await review.deleteOne();

    // Recalculate user rating
    const allReviews = await Review.find({ revieweeId: review.revieweeId });
    const avgRating = allReviews.length > 0
      ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
      : 0;
    await User.findByIdAndUpdate(review.revieweeId, { 
      rating: parseFloat(avgRating.toFixed(1)),
      totalRatings: allReviews.length 
    });

    res.json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error("Delete review error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createReview,
  getTripReviews,
  getUserReviews,
  getReviewById,
  getDriverRating,
  updateReview,
  deleteReview,
};