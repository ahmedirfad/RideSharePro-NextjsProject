const Booking = require("../../models/Booking");
const Trip = require("../../models/Trip");
const User = require("../../models/User");

const PLATFORM_FEE = 0.05;

function getRangeStart(period) {
  const now = new Date();
  switch (period) {
    case "week": {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "month": {
      return new Date(now.getFullYear(), now.getMonth(), 1);
    }
    case "quarter": {
      return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    }
    default: {
      return new Date(0);
    }
  }
}

function getPrevStart(period) {
  const now = new Date();
  switch (period) {
    case "week": {
      const d = new Date(now);
      d.setDate(d.getDate() - 13);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "month": {
      return new Date(now.getFullYear(), now.getMonth() - 1, 1);
    }
    case "quarter": {
      return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 - 3, 1);
    }
    default: {
      return new Date(0);
    }
  }
}

const getEarningsOverview = async (req, res) => {
  try {
    const period = req.query.period || "week";
    const rangeStart = getRangeStart(period);
    const prevStart = getPrevStart(period);

    const [currAgg, prevAgg, escrowAgg, refundAgg] = await Promise.all([
      Booking.aggregate([
        { $addFields: { ps: { $ifNull: ["$paymentStatus", "paid"] } } },
        { $match: { ps: "paid", createdAt: { $gte: rangeStart } } },
        { $group: { _id: null, gross: { $sum: "$fareCharged" }, count: { $sum: 1 } } },
      ]),
      Booking.aggregate([
        { $addFields: { ps: { $ifNull: ["$paymentStatus", "paid"] } } },
        { $match: { ps: "paid", createdAt: { $gte: prevStart, $lt: rangeStart } } },
        { $group: { _id: null, gross: { $sum: "$fareCharged" } } },
      ]),
      Booking.aggregate([
        { $addFields: { es: { $ifNull: ["$escrowStatus", "held"] } } },
        { $match: { es: "held" } },
        { $group: { _id: null, total: { $sum: "$fareCharged" }, count: { $sum: 1 } } },
      ]),
      Booking.aggregate([
        { $addFields: { ps: { $ifNull: ["$paymentStatus", "paid"] } } },
        { $match: { ps: { $in: ["refunded", "partially_refunded"] }, createdAt: { $gte: rangeStart } } },
        { $group: { _id: null, total: { $sum: "$refundAmount" }, count: { $sum: 1 } } },
      ]),
    ]);

    const gross = currAgg[0]?.gross || 0;
    const prevGross = prevAgg[0]?.gross || 0;
    const platformRev = gross * PLATFORM_FEE;
    const driverPayout = gross * (1 - PLATFORM_FEE);
    const escrowHeld = escrowAgg[0]?.total || 0;
    const pendingRefunds = refundAgg[0]?.total || 0;
    const pendingRefundCount = refundAgg[0]?.count || 0;
    const growth = prevGross > 0 ? ((gross - prevGross) / prevGross * 100).toFixed(1) : 0;

    const days = [];
    const cursor = new Date(rangeStart);
    cursor.setHours(0, 0, 0, 0);
    while (cursor <= new Date()) {
      days.push(cursor.toISOString().split("T")[0]);
      cursor.setDate(cursor.getDate() + 1);
    }
    const cappedDays = days.slice(-90);

    const revPerDay = await Booking.aggregate([
      { $addFields: { ps: { $ifNull: ["$paymentStatus", "paid"] } } },
      { $match: { ps: "paid", createdAt: { $gte: rangeStart } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          gross: { $sum: "$fareCharged" },
        },
      },
    ]);
    const revMap = new Map(revPerDay.map(r => [r._id, r.gross]));
    const revenueOverTime = cappedDays.map(d => ({
      label: new Date(d).toLocaleDateString("en-IN", { weekday: "short" }),
      gross: Math.round(revMap.get(d) || 0),
      platform: Math.round((revMap.get(d) || 0) * PLATFORM_FEE),
    }));

    const topDriversAgg = await Booking.aggregate([
      { $addFields: { ps: { $ifNull: ["$paymentStatus", "paid"] } } },
      { $match: { ps: "paid", createdAt: { $gte: rangeStart } } },
      { $lookup: { from: "trips", localField: "tripId", foreignField: "_id", as: "trip" } },
      { $unwind: { path: "$trip", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$trip.driverId",
          earned: { $sum: { $multiply: ["$fareCharged", 1 - PLATFORM_FEE] } },
          trips: { $sum: 1 },
        },
      },
      { $sort: { earned: -1 } },
      { $limit: 5 },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "driver" } },
      { $unwind: { path: "$driver", preserveNullAndEmptyArrays: true } },
    ]);

    const topDrivers = topDriversAgg.map(d => ({
      id: d._id,
      name: d.driver?.name || "Unknown",
      photo: d.driver?.profilePhoto || "",
      earned: Math.round(d.earned),
      trips: d.trips,
    }));

    const routeAgg = await Booking.aggregate([
      { $addFields: { ps: { $ifNull: ["$paymentStatus", "paid"] } } },
      { $match: { ps: "paid", createdAt: { $gte: rangeStart } } },
      {
        $group: {
          _id: { from: "$fromName", to: "$toName" },
          revenue: { $sum: "$fareCharged" },
          count: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
    ]);
    const maxRouteRev = routeAgg[0]?.revenue || 1;
    const highRevenueRoutes = routeAgg.map(r => ({
      route: `${r._id.from} → ${r._id.to}`,
      revenue: Math.round(r.revenue),
      count: r.count,
      pct: Math.round(r.revenue / maxRouteRev * 100),
    }));

    const [avgFareAgg, completionAgg, activeDriversAgg] = await Promise.all([
      Booking.aggregate([
        { $match: { createdAt: { $gte: rangeStart } } },
        { $group: { _id: null, avg: { $avg: "$fareCharged" } } },
      ]),
      Booking.aggregate([
        { $match: { createdAt: { $gte: rangeStart } } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          },
        },
      ]),
      Trip.distinct("driverId", { createdAt: { $gte: rangeStart } }),
    ]);

    const avgFare = Math.round(avgFareAgg[0]?.avg || 0);
    const totalB = completionAgg[0]?.total || 0;
    const completedB = completionAgg[0]?.completed || 0;
    const completionRate = totalB > 0 ? ((completedB / totalB) * 100).toFixed(1) : 0;
    const activeDrivers = activeDriversAgg.length;

    const recentBookings = await Booking.find({})
      .sort({ createdAt: -1 })
      .limit(8)
      .populate("passengerId", "name")
      .populate({ path: "tripId", populate: { path: "driverId", select: "name" } })
      .lean();

    const recentTransactions = recentBookings.map(b => ({
      id: `TXN-${b._id.toString().slice(-5).toUpperCase()}`,
      type: b.paymentStatus === "refunded" ? "REFUND" : "BOOKING",
      passenger: b.passengerId?.name || "Unknown",
      driver: b.tripId?.driverId?.name || "Unknown",
      route: `${b.fromName} → ${b.toName}`,
      amount: b.paymentStatus === "refunded" ? -(b.refundAmount || 0) : b.fareCharged,
      date: b.createdAt,
      status: b.paymentStatus || "paid",
    }));

    const [releasedAgg, disputedAgg] = await Promise.all([
      Booking.aggregate([
        { $addFields: { es: { $ifNull: ["$escrowStatus", "held"] } } },
        { $match: { es: "released" } },
        { $group: { _id: null, total: { $sum: "$fareCharged" }, count: { $sum: 1 } } },
      ]),
      Booking.aggregate([
        { $addFields: { es: { $ifNull: ["$escrowStatus", "held"] } } },
        { $match: { es: "disputed" } },
        { $group: { _id: null, total: { $sum: "$fareCharged" }, count: { $sum: 1 } } },
      ]),
    ]);

    return res.json({
      success: true,
      data: {
        kpis: {
          gross: Math.round(gross),
          platformRevenue: Math.round(platformRev),
          driverPayout: Math.round(driverPayout),
          escrowHeld: Math.round(escrowHeld),
          pendingRefunds: Math.round(pendingRefunds),
          pendingRefundCount,
          growth: parseFloat(growth),
        },
        revenueOverTime,
        revenueSplit: {
          driverPct: Math.round((1 - PLATFORM_FEE) * 100),
          platformPct: Math.round(PLATFORM_FEE * 100),
          total: Math.round(gross),
        },
        topDrivers,
        highRevenueRoutes,
        insights: { avgFare, completionRate: parseFloat(completionRate), activeDrivers },
        escrowSummary: {
          held: { total: Math.round(escrowHeld), count: escrowAgg[0]?.count || 0 },
          released: { total: Math.round(releasedAgg[0]?.total || 0), count: releasedAgg[0]?.count || 0 },
          disputed: { total: Math.round(disputedAgg[0]?.total || 0), count: disputedAgg[0]?.count || 0 },
        },
        recentTransactions,
      },
    });
  } catch (error) {
    console.error("Earnings overview error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getEarningsOverview };