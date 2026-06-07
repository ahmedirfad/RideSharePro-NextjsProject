const { z } = require("zod");

const bookingSchema = z.object({
  tripId: z.string().min(1, "Trip ID required"),
  seatsBooked: z.number().min(1, "At least 1 seat").max(8, "Maximum 8 seats"),
  pickupLocation: z.string().min(1, "Pickup location required"),
});

const updateBookingSchema = z.object({
  status: z.enum(["pending", "confirmed", "cancelled", "completed"]),
});

module.exports = { bookingSchema, updateBookingSchema };