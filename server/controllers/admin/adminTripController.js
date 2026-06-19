const mongoose = require("mongoose");
const Trip = require("../../models/Trip");
const Booking = require("../../models/Booking");

function resolveStatus(tripStatus, departureDate) {
  if (tripStatus === "cancelled") return "Cancelled";
  if (tripStatus === "completed") return "Completed";
  const today = new Date();
  const tripDate = new Date(departureDate);
  if (tripDate.toDateString() === today.toDateString()) return "Ongoing";
  if (tripDate < today) return "Completed";
  return "Upcoming";
}

function countBookedSeats(trip) {
  if (!trip.seats || !Array.isArray(trip.seats)) return 0;
  return trip.seats.reduce(
    (acc, seat) => acc + (seat.bookings?.filter(b => b.status === "confirmed").length || 0),
    0
  );
}

function formatTrip(trip) {
  const driver = trip.driverId || {};
  const bookedSeats = trip.seats && Array.isArray(trip.seats) ? countBookedSeats(trip) : 0;
  const status = resolveStatus(trip.status, trip.departureDate);

  return {
    id: trip._id,
    tripId: trip._id,
    route: {
      from: trip.from || "",
      to: trip.to || "",
      via: trip.waypoints && trip.waypoints.length > 2
        ? `Via ${trip.waypoints.slice(1, -1).map(w => w.name).join(", ")}`
        : undefined,
    },
    driver: {
      id: driver._id,
      name: driver.name || "Unknown",
      avatar: (driver.name || "U").slice(0, 2).toUpperCase(),
      rating: driver.rating || 0,
      online: false,
      isVerified: driver.isVerified || false,
      phone: driver.phone || "",
    },
    date: trip.departureDate,
    time: trip.departureTime,
    seats: {
      booked: bookedSeats,
      total: trip.totalSeats || 0,
    },
    distanceKm: trip.totalDistanceKm || 0,
    farePerSeat: trip.pricePerSeat || 0,
    farePerKm: trip.farePerKm || 0,
    status,
    rawStatus: trip.status,
    womenOnly: trip.womenOnly || false,
    waypoints: trip.waypoints || [],
    createdAt: trip.createdAt,
    updatedAt: trip.updatedAt,
  };
}

const getAllTrips = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 8,
      search = "",
      fromCity = "",
      toCity = "",
      date = "",
      status = "All Statuses",
      driverName = "",
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};

    if (fromCity) query.from = { $regex: new RegExp(fromCity, "i") };
    if (toCity) query.to = { $regex: new RegExp(toCity, "i") };
    if (date) query.departureDate = date;

    if (status && status !== "All Statuses") {
      const statusMap = {
        Ongoing: "upcoming",
        Upcoming: "upcoming",
        Completed: "completed",
        Cancelled: "cancelled",
      };
      if (statusMap[status]) query.status = statusMap[status];
    }

    let tripsQuery = Trip.find(query)
      .populate("driverId", "name email phone rating profilePhoto isVerified")
      .sort({ departureDate: -1, createdAt: -1 });

    let trips = await tripsQuery.lean({ virtuals: false });

    if (driverName) {
      const dn = driverName.toLowerCase();
      trips = trips.filter(t => t.driverId?.name?.toLowerCase().includes(dn));
    }

    if (search) {
      const s = search.toLowerCase();
      trips = trips.filter(t =>
        t._id.toString().toLowerCase().includes(s) ||
        (t.from && t.from.toLowerCase().includes(s)) ||
        (t.to && t.to.toLowerCase().includes(s)) ||
        t.driverId?.name?.toLowerCase().includes(s)
      );
    }

    if (status === "Ongoing") {
      const today = new Date().toISOString().split("T")[0];
      trips = trips.filter(t => t.departureDate === today && t.status === "upcoming");
    } else if (status === "Upcoming") {
      const today = new Date().toISOString().split("T")[0];
      trips = trips.filter(t => t.departureDate > today && t.status === "upcoming");
    }

    const total = trips.length;
    const paginated = trips.slice(skip, skip + parseInt(limit));
    const formatted = paginated.map(formatTrip);

    return res.json({
      success: true,
      data: formatted,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Admin getAllTrips error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getTripStats = async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    const [todayTrips, completedToday, cancelledToday, totalTrips] = await Promise.all([
      Trip.countDocuments({ departureDate: today }),
      Trip.countDocuments({ departureDate: today, status: "completed" }),
      Trip.countDocuments({ departureDate: today, status: "cancelled" }),
      Trip.countDocuments({}),
    ]);

    const activeTrips = await Trip.countDocuments({
      departureDate: today,
      status: "upcoming",
    });

    return res.json({
      success: true,
      data: {
        todayTrips,
        activeTrips,
        completedToday,
        cancelledToday,
        totalTrips,
      },
    });
  } catch (error) {
    console.error("Admin getTripStats error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getAdminTripById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid trip ID" });
    }

    const trip = await Trip.findById(id)
      .populate("driverId", "name email phone rating profilePhoto isVerified createdAt");

    if (!trip) {
      return res.status(404).json({ success: false, message: "Trip not found" });
    }

    const bookings = await Booking.find({ tripId: id })
      .populate("passengerId", "name email phone profilePhoto rating")
      .sort({ createdAt: -1 });

    const formattedBookings = bookings.map(b => ({
      bookingId: b._id,
      passenger: {
        id: b.passengerId?._id,
        name: b.passengerId?.name || "Unknown",
        email: b.passengerId?.email || "",
        phone: b.passengerId?.phone || "",
        avatar: (b.passengerId?.name || "U").slice(0, 2).toUpperCase(),
        rating: b.passengerId?.rating || 0,
      },
      seatNumber: b.seatNumber,
      fromName: b.fromName,
      toName: b.toName,
      fromOrder: b.fromOrder,
      toOrder: b.toOrder,
      distanceKm: b.distanceKm || 0,
      fareCharged: b.fareCharged || 0,
      status: b.status,
      createdAt: b.createdAt,
    }));

    const confirmedBookings = formattedBookings.filter(b => b.status === "confirmed");
    const totalRevenue = confirmedBookings.reduce((sum, b) => sum + (b.fareCharged || 0), 0);

    return res.json({
      success: true,
      data: {
        ...formatTrip(trip.toObject({ virtuals: false })),
        bookings: formattedBookings,
        totalRevenue: totalRevenue,
      },
    });
  } catch (error) {
    console.error("Admin getAdminTripById error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const adminUpdateTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid trip ID" });
    }

    const allowedStatuses = ["upcoming", "ongoing", "completed", "cancelled"];
    if (updates.status && !allowedStatuses.includes(updates.status)) {
      return res.status(400).json({ success: false, message: `Invalid status: ${updates.status}` });
    }

    const trip = await Trip.findById(id);
    if (!trip) {
      return res.status(404).json({ success: false, message: "Trip not found" });
    }

    const allowedFields = [
      "from", "to", "departureDate", "departureTime",
      "pricePerSeat", "maxDetourKm", "womenOnly", "status",
    ];
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) trip[field] = updates[field];
    });

    await trip.save();

    return res.json({
      success: true,
      message: "Trip updated successfully",
      data: formatTrip(trip.toObject()),
    });
  } catch (error) {
    console.error("Admin adminUpdateTrip error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const adminCancelTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.userId;
    const { reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid trip ID" });
    }

    const trip = await Trip.findById(id);
    if (!trip) {
      return res.status(404).json({ success: false, message: "Trip not found" });
    }

    if (trip.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel a completed trip",
      });
    }
    if (trip.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Trip is already cancelled",
      });
    }

    trip.status = "cancelled";
    await trip.save();

    const cancelledBookings = await Booking.updateMany(
      { tripId: id, status: { $in: ["pending", "confirmed"] } },
      { status: "cancelled" }
    );

    console.log(`Admin ${adminId} cancelled trip ${id}. Reason: ${reason || "none"}. Bookings cancelled: ${cancelledBookings.modifiedCount}`);

    return res.json({
      success: true,
      message: "Trip cancelled successfully",
      data: {
        tripId: id,
        bookingsCancelled: cancelledBookings.modifiedCount,
      },
    });
  } catch (error) {
    console.error("Admin adminCancelTrip error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const adminBulkCancelTrips = async (req, res) => {
  try {
    const { tripIds, reason } = req.body;
    const adminId = req.user.userId;

    if (!Array.isArray(tripIds) || tripIds.length === 0) {
      return res.status(400).json({ success: false, message: "Provide a non-empty tripIds array" });
    }

    const invalidIds = tripIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid trip IDs: ${invalidIds.join(", ")}`,
      });
    }

    const tripResult = await Trip.updateMany(
      {
        _id: { $in: tripIds },
        status: { $nin: ["completed", "cancelled"] },
      },
      { status: "cancelled" }
    );

    const bookingResult = await Booking.updateMany(
      {
        tripId: { $in: tripIds },
        status: { $in: ["pending", "confirmed"] },
      },
      { status: "cancelled" }
    );

    console.log(`Admin ${adminId} bulk cancelled ${tripResult.modifiedCount} trips. Reason: ${reason || "none"}`);

    return res.json({
      success: true,
      message: `${tripResult.modifiedCount} trip(s) cancelled`,
      data: {
        tripsCancelled: tripResult.modifiedCount,
        bookingsCancelled: bookingResult.modifiedCount,
      },
    });
  } catch (error) {
    console.error("Admin adminBulkCancelTrips error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getOngoingTrips = async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    const trips = await Trip.find({
      departureDate: today,
      status: { $in: ["upcoming", "ongoing"] },
    })
      .populate("driverId", "name")
      .lean();

    const data = trips.map((trip) => ({
      id: trip._id,
      coords: [
        trip.fromLocation?.coordinates?.[1] || 11.2588,
        trip.fromLocation?.coordinates?.[0] || 75.7804,
      ],
      driverName: trip.driverId?.name || "Unknown Driver",
      from: trip.from,
      to: trip.to,
      status: trip.status,
      departureTime: trip.departureTime,
    }));

    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("getOngoingTrips:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getAllTrips,
  getTripStats,
  getAdminTripById,
  adminUpdateTrip,
  adminCancelTrip,
  adminBulkCancelTrips,
  getOngoingTrips,
};