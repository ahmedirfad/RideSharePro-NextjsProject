const mongoose = require("mongoose");
const User    = require("../../models/User");
const Trip    = require("../../models/Trip");
const Booking = require("../../models/Booking");

const PLATFORM_FEE = 0.05;

// ── Date range helpers ──────────────────────────────────────────────────────
function getRangeStart(period) {
  const now = new Date();
  switch (period) {
    case "week":  { const d = new Date(now); d.setDate(d.getDate() - 6); d.setHours(0,0,0,0); return d; }
    case "month": { return new Date(now.getFullYear(), now.getMonth(), 1); }
    case "quarter": {
      const q = Math.floor(now.getMonth() / 3);
      return new Date(now.getFullYear(), q * 3, 1);
    }
    default:      return new Date(0); // "all" — no lower bound
  }
}

function getPrevRangeStart(period) {
  const now = new Date();
  switch (period) {
    case "week":  { const d = new Date(now); d.setDate(d.getDate() - 13); d.setHours(0,0,0,0); return d; }
    case "month": { return new Date(now.getFullYear(), now.getMonth() - 1, 1); }
    case "quarter": {
      const q = Math.floor(now.getMonth() / 3);
      return new Date(now.getFullYear(), (q - 1) * 3, 1);
    }
    default:      return new Date(0);
  }
}

function growthPct(curr, prev) {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return parseFloat(((curr - prev) / prev * 100).toFixed(1));
}

// ─────────────────────────────────────────────────────────────
// GET /api/admin/analytics/overview
// Query: period = week | month | quarter | all
//
// Returns:
//   kpis        — 6 headline cards
//   revenueChart — daily gross + platform fee series
//   topRoutes   — top 10 by booking count
//   userGrowth  — daily passenger + driver counts
//   tripStatus  — donut: completed / cancelled / upcoming / ongoing
// ─────────────────────────────────────────────────────────────
const getAnalyticsOverview = async (req, res) => {
  try {
    const period      = req.query.period || "week";
    const rangeStart  = getRangeStart(period);
    const prevStart   = getPrevRangeStart(period);
    const rangeEnd    = new Date(); // now

    // ── KPIs — current period ────────────────────────────────
    const [
      grossRevAgg, prevGrossAgg,
      totalTrips,  prevTrips,
      newUsers,    prevUsers,
      avgFareAgg,  avgRatingAgg,
      carbonAgg,
    ] = await Promise.all([
      Booking.aggregate([
        { $addFields: { ps: { $ifNull: ["$paymentStatus","paid"] } } },
        { $match: { ps: "paid", createdAt: { $gte: rangeStart } } },
        { $group: { _id: null, total: { $sum: "$fareCharged" } } },
      ]),
      Booking.aggregate([
        { $addFields: { ps: { $ifNull: ["$paymentStatus","paid"] } } },
        { $match: { ps: "paid", createdAt: { $gte: prevStart, $lt: rangeStart } } },
        { $group: { _id: null, total: { $sum: "$fareCharged" } } },
      ]),

      Booking.countDocuments({ createdAt: { $gte: rangeStart } }),
      Booking.countDocuments({ createdAt: { $gte: prevStart, $lt: rangeStart } }),

      User.countDocuments({ createdAt: { $gte: rangeStart } }),
      User.countDocuments({ createdAt: { $gte: prevStart, $lt: rangeStart } }),

      Booking.aggregate([
        { $match: { createdAt: { $gte: rangeStart } } },
        { $group: { _id: null, avg: { $avg: "$fareCharged" } } },
      ]),

      User.aggregate([
        { $match: { rating: { $gt: 0 } } },
        { $group: { _id: null, avg: { $avg: "$rating" } } },
      ]),

      // Carbon saved: assume 2.1 kg CO2/km saved vs solo car
      Booking.aggregate([
        { $match: { createdAt: { $gte: rangeStart } } },
        { $group: { _id: null, km: { $sum: "$distanceKm" } } },
      ]),
    ]);

    const grossRev  = grossRevAgg[0]?.total  || 0;
    const prevGross = prevGrossAgg[0]?.total  || 0;
    const avgFare   = avgFareAgg[0]?.avg      || 0;
    const avgRating = avgRatingAgg[0]?.avg     || 0;
    const carbonKm  = carbonAgg[0]?.km         || 0;
    const carbonSaved = Math.round(carbonKm * 2.1);

    const kpis = {
      totalRevenue:   Math.round(grossRev),
      revenueGrowth:  growthPct(grossRev, prevGross),
      totalTrips,
      tripsGrowth:    growthPct(totalTrips, prevTrips),
      newUsers,
      usersGrowth:    growthPct(newUsers, prevUsers),
      avgTripValue:   Math.round(avgFare),
      avgRating:      parseFloat(avgRating.toFixed(1)),
      carbonSaved,
      platformRevenue: Math.round(grossRev * PLATFORM_FEE),
    };

    // ── Revenue chart — daily series in range ────────────────
    // Build date list
    const days = [];
    const cursor = new Date(rangeStart);
    cursor.setHours(0, 0, 0, 0);
    while (cursor <= rangeEnd) {
      days.push(cursor.toISOString().split("T")[0]);
      cursor.setDate(cursor.getDate() + 1);
    }

    const revAgg = await Booking.aggregate([
      { $addFields: { ps: { $ifNull: ["$paymentStatus","paid"] } } },
      { $match: { ps: "paid", createdAt: { $gte: rangeStart } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          gross: { $sum: "$fareCharged" },
        },
      },
    ]);

    const revMap = new Map(revAgg.map((r) => [r._id, r.gross]));
    const revenueChart = days.map((d) => {
      const g = revMap.get(d) || 0;
      return {
        label: new Date(d).toLocaleDateString("en-IN", { weekday: "short" }),
        gross: Math.round(g),
        fee:   Math.round(g * PLATFORM_FEE),
      };
    });

    // ── Top 10 routes ────────────────────────────────────────
    const routeAgg = await Booking.aggregate([
      { $match: { createdAt: { $gte: rangeStart } } },
      {
        $group: {
          _id: { from: "$fromName", to: "$toName" },
          count: { $sum: 1 },
          revenue: { $sum: "$fareCharged" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    const maxRouteCount = routeAgg[0]?.count || 1;
    const topRoutes = routeAgg.map((r) => ({
      route:   `${r._id.from} → ${r._id.to}`,
      count:   r.count,
      revenue: Math.round(r.revenue),
      pct:     Math.round((r.count / maxRouteCount) * 100),
    }));

    // ── User growth — daily passengers + drivers in range ────
    const userGrowthAgg = await User.aggregate([
      { $match: { createdAt: { $gte: rangeStart } } },
      {
        $lookup: { from: "trips", localField: "_id", foreignField: "driverId", as: "hosted" },
      },
      {
        $addFields: {
          isDriver: { $gt: [{ $size: "$hosted" }, 0] },
          dateKey:  { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        },
      },
      {
        $group: {
          _id: "$dateKey",
          passengers: { $sum: { $cond: ["$isDriver", 0, 1] } },
          drivers:    { $sum: { $cond: ["$isDriver", 1, 0] } },
        },
      },
    ]);

    const ugMap = new Map(userGrowthAgg.map((r) => [r._id, { p: r.passengers, d: r.drivers }]));
    const userGrowth = days.map((d) => ({
      label:      new Date(d).toLocaleDateString("en-IN", { weekday: "short" }),
      passengers: ugMap.get(d)?.p || 0,
      drivers:    ugMap.get(d)?.d || 0,
    }));

    // ── Trip status donut ────────────────────────────────────
    const [tripStatusAgg, totalTripDocs] = await Promise.all([
      Trip.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Trip.countDocuments({}),
    ]);

    const statusMap = Object.fromEntries(tripStatusAgg.map((s) => [s._id, s.count]));
    const tripStatus = [
      { name: "Completed", value: statusMap["completed"] || 0, color: "#3b82f6" },
      { name: "Cancelled", value: statusMap["cancelled"]  || 0, color: "#ef4444" },
      { name: "Upcoming",  value: statusMap["upcoming"]   || 0, color: "#6b7280" },
      { name: "Ongoing",   value: statusMap["ongoing"]    || 0, color: "#22c55e" },
    ];

    return res.json({
      success: true,
      data: { kpis, revenueChart, topRoutes, userGrowth, tripStatus, totalTripDocs },
    });
  } catch (error) {
    console.error("Analytics overview error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getAnalyticsOverview };