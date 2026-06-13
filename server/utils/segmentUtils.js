// server/utils/segmentUtils.js

function segmentsOverlap(fromA, toA, fromB, toB) {
    return fromA < toB && toA > fromB;
}

function findFreeSeat(trip, requestedFrom, requestedTo) {
    for (const seat of trip.seats) {
        const hasConflict = seat.bookings.some(
            (b) =>
                b.status === "confirmed" &&
                segmentsOverlap(requestedFrom, requestedTo, b.fromOrder, b.toOrder)
        );
        if (!hasConflict) {
            return { seatNumber: seat.seatNumber };
        }
    }
    return null;
}

function countFreeSeats(trip, requestedFrom, requestedTo) {
    return trip.seats.filter(
        (seat) =>
            !seat.bookings.some(
                (b) =>
                    b.status === "confirmed" &&
                    segmentsOverlap(requestedFrom, requestedTo, b.fromOrder, b.toOrder)
            )
    ).length;
}

function calculateSegmentFare(trip, fromOrder, toOrder) {
    const fromWp = trip.waypoints.find((w) => w.order === fromOrder);
    const toWp = trip.waypoints.find((w) => w.order === toOrder);

    if (!fromWp || !toWp) {
        throw new Error(`Invalid waypoint orders: ${fromOrder} → ${toOrder}`);
    }

    const distanceKm = toWp.distanceFromStart - fromWp.distanceFromStart;

    if (distanceKm <= 0) {
        throw new Error("toOrder must come after fromOrder on the route");
    }

    // FIXED: Use farePerKm or calculate from pricePerSeat
    const ratePerKm = trip.farePerKm || (trip.pricePerSeat / trip.totalDistanceKm);
    const rawFare = ratePerKm * distanceKm;
    const fare = Math.round(rawFare / 10) * 10;

    return { fare, distanceKm: parseFloat(distanceKm.toFixed(2)) };
}

function validateSegment(trip, fromOrder, toOrder) {
    const orders = trip.waypoints.map((w) => w.order);
    const maxOrder = Math.max(...orders);

    if (fromOrder < 0 || fromOrder > maxOrder) {
        return { valid: false, message: `fromOrder ${fromOrder} out of range 0–${maxOrder}` };
    }
    if (toOrder < 0 || toOrder > maxOrder) {
        return { valid: false, message: `toOrder ${toOrder} out of range 0–${maxOrder}` };
    }
    if (fromOrder >= toOrder) {
        return { valid: false, message: "fromOrder must be less than toOrder" };
    }
    if (!orders.includes(fromOrder)) {
        return { valid: false, message: `No waypoint with order ${fromOrder}` };
    }
    if (!orders.includes(toOrder)) {
        return { valid: false, message: `No waypoint with order ${toOrder}` };
    }

    return { valid: true };
}

function buildFreeSeatsQuery(fromOrder, toOrder) {
    return {
        $not: {
            $elemMatch: {
                status: "confirmed",
                fromOrder: { $lt: toOrder },
                toOrder: { $gt: fromOrder },
            },
        },
    };
}

module.exports = {
    segmentsOverlap,
    findFreeSeat,
    countFreeSeats,
    calculateSegmentFare,
    validateSegment,
    buildFreeSeatsQuery,
};