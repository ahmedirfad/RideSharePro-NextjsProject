// server/utils/segmentUtils.js
// Pure functions — no DB calls, easy to unit test.

/**
 * Check if two segments [fromA, toA) and [fromB, toB) overlap.
 * Uses half-open interval so that back-to-back passengers on the same seat
 * are NOT considered overlapping:
 *   A boards at Kannur (1), exits at Kochi (4)
 *   B boards at Kochi  (4), exits at TVM   (5)
 *   → toA (4) === fromB (4)  → NO overlap ✓
 *
 * Overlap condition: fromA < toB  AND  toA > fromB
 */
function segmentsOverlap(fromA, toA, fromB, toB) {
  return fromA < toB && toA > fromB;
}

/**
 * Given a trip document and a requested segment [requestedFrom, requestedTo],
 * return the first seat that has NO confirmed booking overlapping the segment.
 *
 * Returns: { seatNumber: Number } or null if no seat is free.
 *
 * @param {Object} trip          - Mongoose Trip document (must have .seats populated)
 * @param {number} requestedFrom - waypoint index for passenger's boarding stop
 * @param {number} requestedTo   - waypoint index for passenger's alighting stop
 */
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
  return null; // no free seat on this segment
}

/**
 * Count how many seats are free on a given segment.
 * Useful for displaying "X seats available" on search results.
 *
 * @param {Object} trip
 * @param {number} requestedFrom
 * @param {number} requestedTo
 * @returns {number}
 */
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

/**
 * Calculate the prorated fare for a segment.
 *
 * Formula: farePerKm × segmentDistance, rounded to nearest ₹10.
 *
 * @param {Object} trip          - must have .farePerKm and .waypoints
 * @param {number} fromOrder     - boarding waypoint index
 * @param {number} toOrder       - alighting waypoint index
 * @returns {{ fare: number, distanceKm: number }}
 */
function calculateSegmentFare(trip, fromOrder, toOrder) {
  const fromWp = trip.waypoints.find((w) => w.order === fromOrder);
  const toWp   = trip.waypoints.find((w) => w.order === toOrder);

  if (!fromWp || !toWp) {
    throw new Error(`Invalid waypoint orders: ${fromOrder} → ${toOrder}`);
  }

  const distanceKm = toWp.distanceFromStart - fromWp.distanceFromStart;

  if (distanceKm <= 0) {
    throw new Error("toOrder must come after fromOrder on the route");
  }

  const rawFare = (trip.farePerKm || 0) * distanceKm;
  // Round to nearest ₹10 for clean UX
  const fare = Math.round(rawFare / 10) * 10;

  return { fare, distanceKm: parseFloat(distanceKm.toFixed(2)) };
}

/**
 * Validate that fromOrder and toOrder are valid waypoint indexes for a trip.
 *
 * @param {Object} trip
 * @param {number} fromOrder
 * @param {number} toOrder
 * @returns {{ valid: boolean, message?: string }}
 */
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

/**
 * Build the $elemMatch query fragment used in the atomic MongoDB update
 * to find a seat with no overlapping confirmed booking.
 *
 * Used in tripController.bookSegment for the atomic findOneAndUpdate.
 *
 * @param {number} fromOrder
 * @param {number} toOrder
 */
function buildFreeSeatsQuery(fromOrder, toOrder) {
  // A seat is "free" for [fromOrder, toOrder) if it has NO confirmed booking
  // where fromA < toOrder AND toA > fromOrder.
  return {
    $not: {
      $elemMatch: {
        status:    "confirmed",
        fromOrder: { $lt: toOrder },
        toOrder:   { $gt: fromOrder },
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
