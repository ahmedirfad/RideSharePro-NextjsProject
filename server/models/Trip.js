const mongoose = require("mongoose");

const WaypointSchema = new mongoose.Schema({
  name: { type: String, required: true },
  coordinates: { type: [Number], required: true },
  distanceFromStart: { type: Number, required: true, min: 0 },
  order: { type: Number, required: true, min: 0 },
}, { _id: false });

const SeatBookingSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
  passengerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  fromOrder: { type: Number, required: true },
  toOrder: { type: Number, required: true },
  status: { type: String, enum: ["confirmed", "cancelled"], default: "confirmed" },
}, { _id: false });

const SeatSchema = new mongoose.Schema({
  seatNumber: { type: Number, required: true },
  bookings: { type: [SeatBookingSchema], default: [] },
}, { _id: false });

const TripSchema = new mongoose.Schema(
  {
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
    fromLocation: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true },
    },
    toLocation: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true },
    },
    waypoints: { type: [WaypointSchema], required: true },
    departureDate: { type: String, required: true },
    departureTime: { type: String, required: true },
    seats: { type: [SeatSchema], default: [] },
    totalSeats: { type: Number, required: true, min: 1 },
    pricePerSeat: { type: Number, required: true, min: 0 },
    maxDetourKm: { type: Number, default: 10, min: 0 },
    womenOnly: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["upcoming", "ongoing", "completed", "cancelled"],
      default: "upcoming",
    },
    totalDistanceKm: { type: Number, default: 0 },
    farePerKm: { type: Number, default: 0 },
    seatsAvailable: { type: Number, default: 0 },
  },
  { timestamps: true }
);

TripSchema.pre("save", function () {
  
  if (this.isNew && this.seats.length === 0 && this.totalSeats > 0) {
    this.seats = Array.from({ length: this.totalSeats }, (_, i) => ({
      seatNumber: i + 1,
      bookings: [],
    }));
  }

  
  if (this.waypoints && this.waypoints.length >= 2) {
    const totalDist = this.waypoints[this.waypoints.length - 1].distanceFromStart;
    this.totalDistanceKm = totalDist;
    if (totalDist > 0 && this.pricePerSeat > 0) {
      this.farePerKm = parseFloat((this.pricePerSeat / totalDist).toFixed(4));
    }
  }


  if (this.seats && this.seats.length > 0) {
    const fullyFreeSeats = this.seats.filter(
      (s) => !s.bookings.some((b) => b.status === "confirmed")
    ).length;
    this.seatsAvailable = fullyFreeSeats;
  } else {
    this.seatsAvailable = this.totalSeats;
  }
});

// Indexes
TripSchema.index({ fromLocation: "2dsphere" });
TripSchema.index({ "waypoints.coordinates": "2dsphere" });
TripSchema.index({ departureDate: 1, status: 1 });
TripSchema.index({ driverId: 1, status: 1 });

module.exports = mongoose.model("Trip", TripSchema);