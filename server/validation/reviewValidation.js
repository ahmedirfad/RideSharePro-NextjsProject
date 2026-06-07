const { z } = require("zod");

const createReviewSchema = z.object({
  tripId: z.string().min(1, "Trip ID required"),
  rating: z.number().min(1, "Rating must be at least 1").max(5, "Rating cannot exceed 5"),
  comment: z.string().max(500, "Comment too long").optional(),
});

const updateReviewSchema = z.object({
  rating: z.number().min(1).max(5).optional(),
  comment: z.string().max(500).optional(),
});

module.exports = { createReviewSchema, updateReviewSchema };