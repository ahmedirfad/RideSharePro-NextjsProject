const mongoose = require("mongoose");
const Trip = require("../models/Trip");
const Booking = require("../models/Booking");
const User = require("../models/User"); // ✅ ADD THIS
const { notify } = require("../utils/notify"); // ✅ ADD THIS
const {
    findFreeSeat,
    countFreeSeats,
    calculateSegmentFare,
    validateSegment,
    buildFreeSeatsQuery,
} = require("../utils/segmentUtils");

function getStatus(tripStatus, departureDate) {
    if (tripStatus === "cancelled") return "CANCELLED";
    if (tripStatus === "completed") return "COMPLETED";
    const today = new Date();
    const tripDate = new Date(departureDate);
    if (tripDate < today) return "COMPLETED";
    if (tripDate.toDateString() === today.toDateString()) return "ONGOING";
    return "UPCOMING";
}

const toRad = (deg) => (deg * Math.PI) / 180;

function haversineKm(coordsA, coordsB) {
    const [lonA, latA] = coordsA;
    const [lonB, latB] = coordsB;
    const R = 6371;
    const dLat = toRad(latB - latA);
    const dLon = toRad(lonB - lonA);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(latA)) * Math.cos(toRad(latB)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function closestWaypoint(waypoints, coords, maxDetourKm) {
    let best = null;
    let bestDist = Infinity;
    for (const wp of waypoints) {
        const d = haversineKm(wp.coordinates, coords);
        if (d < bestDist && d <= maxDetourKm) {
            best = wp;
            bestDist = d;
        }
    }
    return best;
}

const createTrip = async (req, res) => {
    try {
        const {
            from, to,
            fromLat, fromLon,
            toLat, toLon,
            departureDate, departureTime,
            totalSeats, pricePerSeat,
            maxDetourKm, womenOnly,
            waypoints: rawWaypoints,
            vehicleInfo,
        } = req.body;

        if (!from || !to || !departureDate || !departureTime || !totalSeats || !pricePerSeat) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: from, to, departureDate, departureTime, totalSeats, pricePerSeat",
            });
        }

        let waypoints;

        if (Array.isArray(rawWaypoints) && rawWaypoints.length >= 2) {
            waypoints = rawWaypoints.map((wp, i) => ({
                name: wp.name,
                coordinates: [parseFloat(wp.lon), parseFloat(wp.lat)],
                distanceFromStart: parseFloat(wp.distanceFromStart),
                order: wp.order !== undefined ? wp.order : i,
            }));
        } else {
            const fromLonF = parseFloat(fromLon);
            const fromLatF = parseFloat(fromLat);
            const toLonF = parseFloat(toLon);
            const toLatF = parseFloat(toLat);

            if (!fromLat || !fromLon || !toLat || !toLon) {
                return res.status(400).json({
                    success: false,
                    message: "Provide either a waypoints[] array or fromLat/fromLon/toLat/toLon",
                });
            }

            const directDistance = haversineKm([fromLonF, fromLatF], [toLonF, toLatF]);

            waypoints = [
                {
                    name: from,
                    coordinates: [fromLonF, fromLatF],
                    distanceFromStart: 0,
                    order: 0,
                },
                {
                    name: to,
                    coordinates: [toLonF, toLatF],
                    distanceFromStart: parseFloat(directDistance.toFixed(2)),
                    order: 1,
                },
            ];
        }

        waypoints.sort((a, b) => a.order - b.order);

        const trip = new Trip({
            driverId: req.user.userId,
            from,
            to,
            fromLocation: {
                type: "Point",
                coordinates: waypoints[0].coordinates,
            },
            toLocation: {
                type: "Point",
                coordinates: waypoints[waypoints.length - 1].coordinates,
            },
            waypoints,
            departureDate,
            departureTime,
            totalSeats: parseInt(totalSeats),
            pricePerSeat: parseFloat(pricePerSeat),
            maxDetourKm: maxDetourKm ? parseFloat(maxDetourKm) : 10,
            womenOnly: womenOnly || false,
            vehicleInfo: vehicleInfo || "",
            status: "upcoming",
        });

        await trip.save();

        // ─────────────────────────────────────────────────────
        // 🔔 OPTIONAL: Notify driver that trip was created
        // ─────────────────────────────────────────────────────
        await notify(req.io, {
            userId: req.user.userId,
            type: "general",
            title: "Trip Posted! 🚗",
            body: `Your trip ${from} → ${to} on ${departureDate} is now live`,
            link: `/trip/${trip._id}`,
            meta: { tripId: trip._id }
        });

        return res.status(201).json({
            success: true,
            message: "Trip created successfully",
            data: trip,
        });
    } catch (error) {
        console.error("Create trip error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Server error",
        });
    }
};

const searchTrips = async (req, res) => {
    try {
        const { from, to, date, passengers, womenOnly, maxPrice } = req.query;

        const numPassengers = parseInt(passengers) || 1;
        const maxPriceValue = parseInt(maxPrice) || 100000;

        const query = {
            status: "upcoming",
            totalSeats: { $gte: numPassengers },
            pricePerSeat: { $lte: maxPriceValue },
        };

        if (womenOnly === "true") query.womenOnly = true;

        const trips = await Trip.find(query)
            .populate("driverId", "name rating profilePhoto isVerified")
            .sort({ departureDate: 1, departureTime: 1 });

        const results = [];

        for (const trip of trips) {
            let fromWp = null;
            let toWp = null;

            for (const wp of trip.waypoints) {
                if (wp.name.toLowerCase() === from.toLowerCase() ||
                    wp.name.toLowerCase().includes(from.toLowerCase())) {
                    fromWp = wp;
                }
                if (wp.name.toLowerCase() === to.toLowerCase() ||
                    wp.name.toLowerCase().includes(to.toLowerCase())) {
                    toWp = wp;
                }
            }

            if (fromWp && toWp && fromWp.order < toWp.order) {
                const segmentDist = toWp.distanceFromStart - fromWp.distanceFromStart;
                
                let fare = trip.pricePerSeat;
                if (segmentDist > 0) {
                    const ratePerKm = trip.farePerKm || (trip.pricePerSeat / trip.totalDistanceKm);
                    const rawFare = ratePerKm * segmentDist;
                    fare = Math.round(rawFare / 10) * 10;
                }

                let availableSeats = 0;
                for (const seat of trip.seats) {
                    const hasBooking = seat.bookings.some(b =>
                        b.status === "confirmed" &&
                        b.fromOrder < toWp.order &&
                        b.toOrder > fromWp.order
                    );
                    if (!hasBooking) availableSeats++;
                }

                if (availableSeats >= numPassengers) {
                    results.push({
                        id: trip._id,
                        driver: trip.driverId?.name || "Unknown",
                        avatar: (trip.driverId?.name?.charAt(0) || "U").toUpperCase(),
                        rating: trip.driverId?.rating || 0,
                        verified: trip.driverId?.isVerified || false,
                        from: fromWp.name,
                        to: toWp.name,
                        fullFrom: trip.from,
                        fullTo: trip.to,
                        departTime: trip.departureTime,
                        departureDate: trip.departureDate,
                        price: fare,
                        fullPrice: trip.pricePerSeat,
                        seatsLeft: availableSeats,
                        totalSeats: trip.totalSeats,
                        distanceKm: parseFloat(segmentDist.toFixed(2)),
                        totalDistanceKm: trip.totalDistanceKm,
                        womenOnly: trip.womenOnly,
                        badge: trip.womenOnly ? "WOMEN ONLY" : undefined,
                        fromOrder: fromWp.order,
                        toOrder: toWp.order,
                        vehicleInfo: trip.vehicleInfo || "",
                        waypoints: trip.waypoints.map(w => ({
                            name: w.name,
                            order: w.order,
                            distanceFromStart: w.distanceFromStart
                        })),
                    });
                }
            }
        }

        return res.json({
            success: true,
            count: results.length,
            data: results,
        });
    } catch (error) {
        console.error("Search error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ─── BOOK SEGMENT ─────────────────────────────────────────────────────────────
const bookSegment = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;
        const passengerId = req.user.userId;
        const { fromOrder: rawFrom, toOrder: rawTo } = req.body;

        const fromOrder = parseInt(rawFrom);
        const toOrder = parseInt(rawTo);

        if (!mongoose.Types.ObjectId.isValid(id)) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: "Invalid trip ID" });
        }

        if (isNaN(fromOrder) || isNaN(toOrder)) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: "fromOrder and toOrder must be integers",
            });
        }

        const trip = await Trip.findById(id).session(session);

        if (!trip) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: "Trip not found" });
        }

        if (trip.status !== "upcoming") {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: `Cannot book a trip with status "${trip.status}"`,
            });
        }

        if (trip.driverId.toString() === passengerId.toString()) {
            await session.abortTransaction();
            return res.status(403).json({
                success: false,
                message: "Drivers cannot book their own trip",
            });
        }

        const segmentCheck = validateSegment(trip, fromOrder, toOrder);
        if (!segmentCheck.valid) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: segmentCheck.message });
        }

        const freeSeat = findFreeSeat(trip, fromOrder, toOrder);

        if (!freeSeat) {
            await session.abortTransaction();
            return res.status(409).json({
                success: false,
                message: "No seats available on this segment",
            });
        }

        const { fare, distanceKm } = calculateSegmentFare(trip, fromOrder, toOrder);

        const fromWp = trip.waypoints.find((w) => w.order === fromOrder);
        const toWp = trip.waypoints.find((w) => w.order === toOrder);

        const bookingId = new mongoose.Types.ObjectId();

        const updatedTrip = await Trip.findOneAndUpdate(
            {
                _id: id,
                status: "upcoming",
                seats: {
                    $elemMatch: {
                        seatNumber: freeSeat.seatNumber,
                        bookings: {
                            $not: {
                                $elemMatch: {
                                    status: "confirmed",
                                    fromOrder: { $lt: toOrder },
                                    toOrder: { $gt: fromOrder },
                                },
                            },
                        },
                    },
                },
            },
            {
                $push: {
                    "seats.$[seat].bookings": {
                        bookingId,
                        passengerId,
                        fromOrder,
                        toOrder,
                        status: "confirmed",
                    },
                },
            },
            {
                arrayFilters: [{ "seat.seatNumber": freeSeat.seatNumber }],
                new: true,
                session,
            }
        );

        if (!updatedTrip) {
            await session.abortTransaction();
            return res.status(409).json({
                success: false,
                message: "Seat was just taken — please try again",
            });
        }

        const booking = new Booking({
            _id: bookingId,
            tripId: trip._id,
            passengerId,
            seatNumber: freeSeat.seatNumber,
            fromOrder,
            toOrder,
            fromName: fromWp.name,
            toName: toWp.name,
            distanceKm,
            fareCharged: fare,
            seatsBooked: 1,
            status: "confirmed",
        });

        await booking.save({ session });
        await session.commitTransaction();

        // ─────────────────────────────────────────────────────
        // 🔔 NEW: Send notifications
        // ─────────────────────────────────────────────────────
        const passenger = await User.findById(passengerId).select("name");
        const driver = await User.findById(trip.driverId).select("name");

        // 1. Notify driver
        await notify(req.io, {
            userId: trip.driverId,
            type: "booking_confirmed",
            title: "New Booking! 🚗",
            body: `${passenger?.name || "Someone"} booked seat ${freeSeat.seatNumber} from ${fromWp.name} → ${toWp.name}`,
            link: `/trip/${trip._id}`,
            meta: { bookingId: booking._id, seatNumber: freeSeat.seatNumber }
        });

        // 2. Notify passenger
        await notify(req.io, {
            userId: passengerId,
            type: "booking_confirmed",
            title: "Booking Confirmed! ✅",
            body: `Your seat ${freeSeat.seatNumber} from ${fromWp.name} → ${toWp.name} is confirmed`,
            link: `/messages?bookingId=${booking._id}`,
            meta: { bookingId: booking._id, seatNumber: freeSeat.seatNumber }
        });

        // 3. Emit to chat room
        req.io.to(`chat:${booking._id}`).emit("booking_confirmed", {
            bookingId: booking._id,
            passengerId,
            driverId: trip.driverId,
            seatNumber: freeSeat.seatNumber
        });

        return res.status(201).json({
            success: true,
            message: `Seat ${freeSeat.seatNumber} booked: ${fromWp.name} → ${toWp.name}`,
            data: {
                bookingId: booking._id,
                tripId: trip._id,
                seatNumber: freeSeat.seatNumber,
                from: fromWp.name,
                to: toWp.name,
                distanceKm,
                fareCharged: fare,
                status: "confirmed",
                vehicleInfo: trip.vehicleInfo || "",
            },
        });
    } catch (error) {
        await session.abortTransaction();
        console.error("Book segment error:", error);
        return res.status(500).json({ success: false, message: error.message });
    } finally {
        session.endSession();
    }
};

// ─── GET TRIP BY ID ───────────────────────────────────────────────────────────
const getTripById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || id === "undefined" || id === "null") {
            return res.status(400).json({ success: false, message: "Invalid trip ID" });
        }
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid trip ID format" });
        }

        const trip = await Trip.findById(id).populate(
            "driverId",
            "name email phone rating profilePhoto isVerified createdAt"
        );

        if (!trip) {
            return res.status(404).json({ success: false, message: "Trip not found" });
        }

        res.json({ success: true, data: trip });
    } catch (error) {
        console.error("Get trip error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── GET MY TRIPS ─────────────────────────────────────────────────────────────
const getMyTrips = async (req, res) => {
    try {
        const userId = req.user.userId;

        if (!userId) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }

        const hostedTrips = await Trip.find({ driverId: userId })
            .populate("driverId", "name rating")
            .sort({ createdAt: -1 });

        const bookings = await Booking.find({ passengerId: userId })
            .populate({ path: "tripId", populate: { path: "driverId", select: "name rating" } })
            .sort({ createdAt: -1 });

        const formattedHosted = hostedTrips.map((trip) => ({
            id: trip._id,
            tripId: trip._id,
            route: `${trip.from} → ${trip.to}`,
            role: "HOST",
            date: new Date(trip.departureDate).toLocaleDateString("en-IN", {
                day: "numeric", month: "short", year: "numeric",
            }),
            time: trip.departureTime,
            status: getStatus(trip.status, trip.departureDate),
            seats: {
                booked: trip.seats.reduce(
                    (acc, s) => acc + s.bookings.filter((b) => b.status === "confirmed").length,
                    0
                ),
                total: trip.totalSeats,
            },
            amount: `₹${(trip.farePerKm || 0) > 0
                ? trip.seats.reduce((acc, s) => {
                    return acc + s.bookings
                        .filter((b) => b.status === "confirmed")
                        .reduce((a, b) => {
                            const dist =
                                (trip.waypoints.find((w) => w.order === b.toOrder)?.distanceFromStart || 0) -
                                (trip.waypoints.find((w) => w.order === b.fromOrder)?.distanceFromStart || 0);
                            return a + Math.round(trip.farePerKm * dist / 10) * 10;
                        }, 0);
                }, 0)
                : (trip.totalSeats - trip.seatsAvailable) * trip.pricePerSeat}`,
            vehicleInfo: trip.vehicleInfo || "",
            waypoints: trip.waypoints,
        }));

        const formattedGuest = bookings.map((booking) => {
            const fromName = booking.fromName || "";
            const toName = booking.toName || "";

            return {
                id: booking.tripId?._id,
                tripId: booking.tripId?._id,
                bookingId: booking._id,
                route: `${fromName} → ${toName}`,
                fullRoute: `${booking.tripId?.from || ""} → ${booking.tripId?.to || ""}`,
                role: "GUEST",
                date: new Date(booking.tripId?.departureDate || Date.now()).toLocaleDateString("en-IN", {
                    day: "numeric", month: "short", year: "numeric",
                }),
                time: booking.tripId?.departureTime || "",
                status: getStatus(booking.tripId?.status, booking.tripId?.departureDate),
                fromName: fromName,
                toName: toName,
                fromOrder: booking.fromOrder,
                toOrder: booking.toOrder,
                seatNumber: booking.seatNumber,
                distanceKm: booking.distanceKm,
                seats: { booked: 1, total: booking.tripId?.totalSeats || 0 },
                amount: `₹${booking.fareCharged}`,
                vehicleInfo: booking.tripId?.vehicleInfo || "",
                driver: booking.tripId?.driverId
                    ? {
                        name: booking.tripId.driverId.name,
                        avatar: (booking.tripId.driverId.name || "D").charAt(0).toUpperCase(),
                        rating: booking.tripId.driverId.rating || 0,
                    }
                    : null,
            };
        });

        return res.json({
            success: true,
            data: {
                hosted: formattedHosted,
                guest: formattedGuest,
                all: [...formattedHosted, ...formattedGuest].sort(
                    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
                ),
            },
        });
    } catch (error) {
        console.error("Get my trips error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── CANCEL TRIP ──────────────────────────────────────────────────────────────
const cancelTrip = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || id === "undefined") {
            return res.status(400).json({ success: false, message: "Invalid trip ID" });
        }

        const trip = await Trip.findById(id);
        if (!trip) {
            return res.status(404).json({ success: false, message: "Trip not found" });
        }
        if (trip.driverId.toString() !== req.user.userId) {
            return res.status(403).json({ success: false, message: "Not authorized" });
        }
        if (trip.status !== "upcoming") {
            return res.status(400).json({
                success: false,
                message: "Cannot cancel a trip that has already started or completed",
            });
        }

        // ── Get all confirmed bookings before cancelling ──
        const bookings = await Booking.find({ 
            tripId: id, 
            status: { $in: ["pending", "confirmed"] } 
        }).populate("passengerId", "name");

        trip.status = "cancelled";
        await trip.save();

        await Booking.updateMany(
            { tripId: id, status: { $in: ["pending", "confirmed"] } },
            { status: "cancelled" }
        );

        // ─────────────────────────────────────────────────────
        // 🔔 NEW: Notify all passengers
        // ─────────────────────────────────────────────────────
        const driver = await User.findById(req.user.userId).select("name");

        for (const booking of bookings) {
            await notify(req.io, {
                userId: booking.passengerId._id,
                type: "trip_completed", // Use appropriate type or add "trip_cancelled"
                title: "❌ Trip Cancelled",
                body: `Your trip ${trip.from} → ${trip.to} on ${trip.departureDate} has been cancelled by the driver`,
                link: `/trips`,
                meta: { tripId: trip._id, bookingId: booking._id }
            });
        }

        // Notify driver (confirmation)
        await notify(req.io, {
            userId: req.user.userId,
            type: "trip_completed",
            title: "Trip Cancelled ✅",
            body: `You have cancelled your trip ${trip.from} → ${trip.to}`,
            link: `/trips`,
            meta: { tripId: trip._id }
        });

        return res.json({ success: true, message: "Trip cancelled successfully" });
    } catch (error) {
        console.error("Cancel trip error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── UPDATE TRIP ──────────────────────────────────────────────────────────────
const updateTrip = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        const updates = req.body;

        const trip = await Trip.findById(id);
        if (!trip) {
            return res.status(404).json({ success: false, message: "Trip not found" });
        }
        if (trip.driverId.toString() !== userId) {
            return res.status(403).json({ success: false, message: "Only the driver can update this trip" });
        }
        if (trip.status !== "upcoming") {
            return res.status(400).json({ success: false, message: "Cannot update a trip that has already started" });
        }

        // ── Check if important fields changed ──
        const changedFields = [];
        if (updates.departureDate && updates.departureDate !== trip.departureDate) {
            changedFields.push(`date to ${updates.departureDate}`);
        }
        if (updates.departureTime && updates.departureTime !== trip.departureTime) {
            changedFields.push(`time to ${updates.departureTime}`);
        }
        if (updates.from && updates.from !== trip.from) {
            changedFields.push(`pickup to ${updates.from}`);
        }
        if (updates.to && updates.to !== trip.to) {
            changedFields.push(`dropoff to ${updates.to}`);
        }

        const updatedTrip = await Trip.findByIdAndUpdate(id, updates, { new: true });

        // ─────────────────────────────────────────────────────
        // 🔔 NEW: Notify all passengers if important changes
        // ─────────────────────────────────────────────────────
        if (changedFields.length > 0) {
            const bookings = await Booking.find({ 
                tripId: id, 
                status: { $in: ["confirmed"] } 
            }).populate("passengerId", "name");

            for (const booking of bookings) {
                await notify(req.io, {
                    userId: booking.passengerId._id,
                    type: "trip_update",
                    title: "🔄 Trip Updated",
                    body: `Trip ${trip.from} → ${trip.to} updated: ${changedFields.join(', ')}`,
                    link: `/trip/${trip._id}`,
                    meta: { tripId: trip._id, bookingId: booking._id, changes: changedFields }
                });
            }
        }

        return res.json({ 
            success: true, 
            message: "Trip updated successfully", 
            data: updatedTrip 
        });
    } catch (error) {
        console.error("Update trip error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── GET DRIVER TRIPS ─────────────────────────────────────────────────────────
const getDriverTrips = async (req, res) => {
    try {
        const { driverId } = req.params;

        const trips = await Trip.find({
            driverId,
            status: "upcoming",
            departureDate: { $gte: new Date().toISOString().split("T")[0] },
        })
            .populate("driverId", "name rating")
            .sort({ departureDate: 1 });

        return res.json({ success: true, data: trips });
    } catch (error) {
        console.error("Get driver trips error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── GET SEAT MAP ─────────────────────────────────────────────────────────────
const getSeatMap = async (req, res) => {
    try {
        const { id } = req.params;
        const { fromOrder: f, toOrder: t } = req.query;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid trip ID" });
        }

        const fromOrder = parseInt(f);
        const toOrder = parseInt(t);

        if (isNaN(fromOrder) || isNaN(toOrder) || fromOrder >= toOrder) {
            return res.status(400).json({
                success: false,
                message: "Provide valid fromOrder and toOrder query params",
            });
        }

        const trip = await Trip.findById(id);
        if (!trip) {
            return res.status(404).json({ success: false, message: "Trip not found" });
        }

        const seatMap = trip.seats.map((seat) => {
            const conflict = seat.bookings.find(
                (b) =>
                    b.status === "confirmed" &&
                    b.fromOrder < toOrder &&
                    b.toOrder > fromOrder
            );
            return {
                seatNumber: seat.seatNumber,
                available: !conflict,
                occupiedBy: conflict ? { fromOrder: conflict.fromOrder, toOrder: conflict.toOrder } : null,
            };
        });

        let fare = trip.pricePerSeat;
        let distanceKm = trip.totalDistanceKm;
        try {
            const result = calculateSegmentFare(trip, fromOrder, toOrder);
            fare = result.fare;
            distanceKm = result.distanceKm;
        } catch (_) { }

        return res.json({
            success: true,
            data: {
                tripId: trip._id,
                seatMap,
                fare,
                distanceKm,
                vehicleInfo: trip.vehicleInfo || "",
                waypoints: trip.waypoints,
                freeCount: seatMap.filter((s) => s.available).length,
            },
        });
    } catch (error) {
        console.error("Get seat map error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    createTrip,
    searchTrips,
    bookSegment,
    getTripById,
    getMyTrips,
    cancelTrip,
    updateTrip,
    getDriverTrips,
    getSeatMap,
};