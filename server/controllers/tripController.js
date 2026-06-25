const mongoose = require("mongoose");
const Trip = require("../models/Trip");
const Booking = require("../models/Booking");
const User = require("../models/User");
const { notify } = require("../utils/notify");
const { verifyPayment } = require('../controllers/paymentController')

// ✅ NEW: Import email functions
const {
    sendTripPostedEmail,
    sendTripReminderEmail,
    sendTripStartedEmail,
    sendTripCompletedEmail,
    sendBookingConfirmationEmail,
    sendNewBookingAlertEmail
} = require("../controllers/emailController");

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

        const driver = await User.findById(req.user.userId).select("name email");

        // ─── SOCKET NOTIFICATION ──────────────────────────────
        await notify(req.io, {
            userId: req.user.userId,
            type: "general",
            title: "Trip Posted! 🚗",
            body: `Your trip ${from} → ${to} on ${departureDate} is now live`,
            link: `/trip/${trip._id}`,
            meta: { tripId: trip._id }
        });

        // ─── EMAIL NOTIFICATION ────────────────────────────────
        // ✅ FIXED: Pass driver and trip objects
        await sendTripPostedEmail(driver, trip);

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
// ─── BOOK SEGMENT (FIXED - Supports Multiple Seats) ──────────────────────────
// ─── BOOK SEGMENT (FIXED - Supports Multiple Seats) ──────────────────────────
// ─── BOOK SEGMENT (FIXED) ─────────────────────────────────────────────────────
const bookSegment = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    let committed = false;

    try {
        const { id } = req.params;
        const passengerId = req.user.userId;
        const { fromOrder: rawFrom, toOrder: rawTo, seatNumbers, paymentIntentId } = req.body;

        const fromOrder = parseInt(rawFrom);
        const toOrder = parseInt(rawTo);

        // ✅ Support multiple seats
        let seatsToBook = [];
        if (seatNumbers && Array.isArray(seatNumbers) && seatNumbers.length > 0) {
            seatsToBook = seatNumbers;
        } else if (req.body.seatNumber) {
            seatsToBook = [parseInt(req.body.seatNumber)];
        } else {
            seatsToBook = [1];
        }

        if (!paymentIntentId) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: 'Payment required to book seats' });
        }
        try {
            await verifyPayment(paymentIntentId, id, passengerId, seatsToBook);
        } catch (err) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: err.message });
        }

        if (seatsToBook.length > 6) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: "Maximum 6 seats allowed per booking"
            });
        }

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

        const fromWp = trip.waypoints.find((w) => w.order === fromOrder);
        const toWp = trip.waypoints.find((w) => w.order === toOrder);

        if (!fromWp || !toWp) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: "Could not resolve boarding/alighting waypoints",
            });
        }

        // ✅ Check availability for all seats
        const unavailableSeats = [];
        for (const seatNum of seatsToBook) {
            const seat = trip.seats.find(s => s.seatNumber === seatNum);
            if (!seat) {
                unavailableSeats.push(seatNum);
                continue;
            }

            const hasConflict = seat.bookings.some(
                (b) =>
                    b.status === "confirmed" &&
                    b.fromOrder < toOrder &&
                    b.toOrder > fromOrder
            );

            if (hasConflict) {
                unavailableSeats.push(seatNum);
            }
        }

        if (unavailableSeats.length > 0) {
            await session.abortTransaction();
            return res.status(409).json({
                success: false,
                message: `Seats ${unavailableSeats.join(', ')} are already booked`,
                unavailableSeats
            });
        }

        // ✅ Book all seats
        const bookingIds = [];
        let totalFare = 0;
        let totalDistance = 0;
        let lastBooking = null;

        for (const seatNum of seatsToBook) {
            const bookingId = new mongoose.Types.ObjectId();
            bookingIds.push(bookingId);

            const { fare, distanceKm } = calculateSegmentFare(trip, fromOrder, toOrder);
            totalFare += fare;
            totalDistance += distanceKm;

            // Update seat
            await Trip.findOneAndUpdate(
                {
                    _id: id,
                    status: "upcoming",
                    seats: {
                        $elemMatch: {
                            seatNumber: seatNum,
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
                    arrayFilters: [{ "seat.seatNumber": seatNum }],
                    returnDocument: "after",
                }
            );

            const booking = new Booking({
                _id: bookingId,
                tripId: trip._id,
                passengerId,
                seatNumber: seatNum,
                fromOrder,
                toOrder,
                fromName: fromWp.name,
                toName: toWp.name,
                distanceKm,
                fareCharged: fare,
                seatsBooked: 1,
                status: "confirmed",
                paymentStatus: "paid",           // ← already paid via Stripe
                stripePaymentIntentId: paymentIntentId,  // ← add this
                stripePlatformFee: Math.round(fare * 0.05),
            });

            await booking.save({ session });
            lastBooking = booking;
        }

        await session.commitTransaction();
        committed = true;
        console.log('io available:', !!req.io)


        // ── Get user details for emails ────────────────────
        const passenger = await User.findById(passengerId).select("name email");
        const driver = await User.findById(trip.driverId).select("name email");

        await notify(req.io, {
            userId: trip.driverId,
            type: 'booking_confirmed',
            title: `New Booking! 🚗`,
            body: `${passenger?.name || 'Someone'} booked ${seatsToBook.length} seat${seatsToBook.length > 1 ? 's' : ''} on your trip ${trip.from} → ${trip.to}`,
            link: `/trip/${trip._id}`,
            meta: { bookingIds, tripId: trip._id, seatNumbers: seatsToBook }
        })

        // ─── Notify passenger ─────────────────────────────────────
        await notify(req.io, {
            userId: passengerId,
            type: 'booking_confirmed',
            title: 'Booking Confirmed! ✅',
            body: `Your ${seatsToBook.length > 1 ? 'seats are' : 'seat is'} confirmed on trip ${trip.from} → ${trip.to}`,
            link: `/trips`,
            meta: { bookingIds, tripId: trip._id, seatNumbers: seatsToBook }
        })

        // ─── SEND EMAILS ────────────────────────────────────
        try {
            await sendBookingConfirmationEmail(passenger, lastBooking, trip);
            await sendNewBookingAlertEmail(driver, passenger, lastBooking, trip);
        } catch (emailError) {
            console.error('❌ Failed to send booking emails:', emailError);
        }

        return res.status(201).json({
            success: true,
            message: `${seatsToBook.length} seat${seatsToBook.length > 1 ? 's' : ''} booked`,
            data: {
                bookingIds,
                tripId: trip._id,
                seatNumbers: seatsToBook,
                totalFare,
                totalDistance,
                from: fromWp.name,
                to: toWp.name,
                status: "confirmed",
            },
        });

    } catch (error) {
        if (!committed) {
            try {
                await session.abortTransaction();
            } catch (abortError) {
                console.error("Book segment abort failed:", abortError.message);
            }
        }
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

        const formattedGuest = bookings
            .filter((booking) => booking.tripId !== null)
            .map((booking) => {
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
                    status: booking.status === 'cancelled'
                        ? 'CANCELLED'
                        : getStatus(booking.tripId?.status, booking.tripId?.departureDate),
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

        const trip = await Trip.findById(id).populate("driverId", "name email");
        if (!trip) {
            return res.status(404).json({ success: false, message: "Trip not found" });
        }
        if (trip.driverId._id.toString() !== req.user.userId) {
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
        }).populate("passengerId", "name email");

        trip.status = "cancelled";
        await trip.save();

        await Booking.updateMany(
            { tripId: id, status: { $in: ["pending", "confirmed"] } },
            { status: "cancelled" }
        );

        const driver = await User.findById(req.user.userId).select("name email");

        // ─── SOCKET NOTIFICATIONS ──────────────────────────────
        for (const booking of bookings) {
            await notify(req.io, {
                userId: booking.passengerId._id,
                type: "trip_completed",
                title: "❌ Trip Cancelled",
                body: `Your trip ${trip.from} → ${trip.to} on ${trip.departureDate} has been cancelled by the driver`,
                link: `/trips`,
                meta: { tripId: trip._id, bookingId: booking._id }
            });
        }

        await notify(req.io, {
            userId: req.user.userId,
            type: "trip_completed",
            title: "Trip Cancelled ✅",
            body: `You have cancelled your trip ${trip.from} → ${trip.to}`,
            link: `/trips`,
            meta: { tripId: trip._id }
        });

        // ─── EMAIL NOTIFICATIONS ────────────────────────────────
        // ✅ FIXED: Pass user and trip objects
        for (const booking of bookings) {
            await sendTripCompletedEmail(booking.passengerId, trip, 0);
        }

        await sendTripCompletedEmail(driver, trip, 0);

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

        const trip = await Trip.findById(id).populate("driverId", "name email");
        if (!trip) {
            return res.status(404).json({ success: false, message: "Trip not found" });
        }
        if (trip.driverId._id.toString() !== userId) {
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

        // ─── Notify all passengers if important changes ──────
        if (changedFields.length > 0) {
            const bookings = await Booking.find({
                tripId: id,
                status: { $in: ["confirmed"] }
            }).populate("passengerId", "name email");

            for (const booking of bookings) {
                // Socket notification
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