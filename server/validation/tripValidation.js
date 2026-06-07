// server/validation/tripValidation.js
const { z } = require("zod");

const createTripSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  fromLat: z.number(),
  fromLon: z.number(),
  toLat: z.number(),
  toLon: z.number(),
  departureDate: z.string().min(1),
  departureTime: z.string().min(1),
  totalSeats: z.number().min(1).max(8),
  pricePerSeat: z.number().min(1),
  maxDetourKm: z.number().optional(),
  womenOnly: z.boolean().optional(),
  waypoints: z.array(z.object({
    name: z.string(),
    lat: z.number(),
    lon: z.number(),
    order: z.number(),
    distanceFromStart: z.number()
  })).optional(),
});

module.exports = { createTripSchema };