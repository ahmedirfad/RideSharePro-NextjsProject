const mongoose = require("mongoose");
const Booking = require("../../models/Booking");

const PLATFORM_FEE_RATE = 0.05;

function buildLookupStages() {
  return [
    {
      $lookup: {
        from: "trips",
        localField: "tripId",
        foreignField: "_id",
        as: "trip",
      },
    },
    { $unwind: { path: "$trip", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "users",
        localField: "passengerId",
        foreignField: "_id",
        as: "passenger",
      },
    },
    { $unwind: { path: "$passenger", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "users",
        localField: "trip.driverId",
        foreignField: "_id",
        as: "driver",
      },
    },
    { $unwind: { path: "$driver", preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        escrowStatusSafe: { $ifNull: ["$escrowStatus", "held"] },
        paymentStatusSafe: { $ifNull: ["$paymentStatus", "paid"] },
        platformFee: { $multiply: ["$fareCharged", PLATFORM_FEE_RATE] },
      },
    },
  ];
}

const getBookings = async (req, res) => {
  try {
    const {
      search = "",
      paymentStatus = "all",
      escrowStatus = "all",
      dateFrom,
      dateTo,
      minFare,
      maxFare,
      page = 1,
      limit = 10,
    } = req.query;

    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 100);

    const preMatch = {};

    if (dateFrom || dateTo) {
      preMatch.createdAt = {};
      if (dateFrom) preMatch.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        preMatch.createdAt.$lte = end;
      }
    }

    if (minFare || maxFare) {
      preMatch.fareCharged = {};
      if (minFare) preMatch.fareCharged.$gte = parseFloat(minFare);
      if (maxFare) preMatch.fareCharged.$lte = parseFloat(maxFare);
    }

    const pipeline = [{ $match: preMatch }, ...buildLookupStages()];

    const postMatchAnd = [];

    if (paymentStatus !== "all") {
      postMatchAnd.push({ paymentStatusSafe: paymentStatus });
    }

    if (escrowStatus !== "all") {
      const statuses = escrowStatus.split(",").map((s) => s.trim()).filter(Boolean);
      if (statuses.length) postMatchAnd.push({ escrowStatusSafe: { $in: statuses } });
    }

    if (search.trim()) {
      const term = search.trim();
      const re = { $regex: term, $options: "i" };
      postMatchAnd.push({
        $or: [
          { "passenger.name": re },
          { "driver.name": re },
          { fromName: re },
          { toName: re },
          {
            $expr: {
              $regexMatch: {
                input: { $toString: "$_id" },
                regex: term,
                options: "i",
              },
            },
          },
        ],
      });
    }

    if (postMatchAnd.length) pipeline.push({ $match: { $and: postMatchAnd } });

    pipeline.push({
      $facet: {
        data: [
          { $sort: { createdAt: -1 } },
          { $skip: (pageNum - 1) * limitNum },
          { $limit: limitNum },
          {
            $project: {
              tripId: 1,
              fromName: 1,
              toName: 1,
              fareCharged: 1,
              platformFee: 1,
              status: 1,
              paymentStatusSafe: 1,
              escrowStatusSafe: 1,
              refundAmount: 1,
              refundReason: 1,
              refundedAt: 1,
              escrowReleasedAt: 1,
              createdAt: 1,
              seatNumber: 1,
              distanceKm: 1,
              "passenger.name": 1,
              "passenger._id": 1,
              "driver.name": 1,
              "driver._id": 1,
              "trip.from": 1,
              "trip.to": 1,
            },
          },
        ],
        totalCount: [{ $count: "count" }],
      },
    });

    const result = await Booking.aggregate(pipeline);
    const data = result[0]?.data || [];
    const total = result[0]?.totalCount?.[0]?.count || 0;

    const formatted = data.map((b) => ({
      id: b._id,
      shortId: `BK-${b._id.toString().slice(-5).toUpperCase()}`,
      passenger: b.passenger?.name || "Unknown",
      passengerId: b.passenger?._id || null,
      driver: b.driver?.name || "Unknown",
      driverId: b.driver?._id || null,
      route: `${b.fromName} → ${b.toName}`,
      fullRoute: b.trip ? `${b.trip.from} → ${b.trip.to}` : `${b.fromName} → ${b.toName}`,
      date: b.createdAt,
      fare: b.fareCharged,
      platformFee: parseFloat(b.platformFee?.toFixed(2)) || 0,
      seatNumber: b.seatNumber,
      distanceKm: b.distanceKm,
      status: b.status,
      paymentStatus: b.paymentStatusSafe,
      escrowStatus: b.escrowStatusSafe,
      refundAmount: b.refundAmount || 0,
      refundReason: b.refundReason || "",
      refundedAt: b.refundedAt,
      escrowReleasedAt: b.escrowReleasedAt,
    }));

    return res.json({
      success: true,
      data: {
        bookings: formatted,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.max(Math.ceil(total / limitNum), 1),
        },
      },
    });
  } catch (error) {
    console.error("Admin getBookings error:", error);
    res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

const getBookingStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      totalBookings,
      thisMonthCount,
      lastMonthCount,
      confirmedCount,
      cancelledCount,
      escrowAgg,
      disputedCount,
      topCancelledRoute,
      revenueAgg,
    ] = await Promise.all([
      Booking.countDocuments({}),
      Booking.countDocuments({ createdAt: { $gte: startOfThisMonth } }),
      Booking.countDocuments({ createdAt: { $gte: startOfLastMonth, $lt: startOfThisMonth } }),
      Booking.countDocuments({ status: { $in: ["confirmed", "completed"] } }),
      Booking.countDocuments({ status: "cancelled" }),
      Booking.aggregate([
        {
          $addFields: { escrowStatusSafe: { $ifNull: ["$escrowStatus", "held"] } },
        },
        { $match: { escrowStatusSafe: "held" } },
        { $group: { _id: null, total: { $sum: "$fareCharged" } } },
      ]),
      Booking.aggregate([
        {
          $addFields: { escrowStatusSafe: { $ifNull: ["$escrowStatus", "held"] } },
        },
        { $match: { escrowStatusSafe: "disputed" } },
        { $count: "count" },
      ]),
      Booking.aggregate([
        { $match: { status: "cancelled" } },
        {
          $group: {
            _id: { from: "$fromName", to: "$toName" },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 1 },
      ]),
      Booking.aggregate([
        {
          $addFields: { paymentStatusSafe: { $ifNull: ["$paymentStatus", "paid"] } },
        },
        {
          $match: {
            paymentStatusSafe: "paid",
            createdAt: { $gte: startOfThisMonth },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $multiply: ["$fareCharged", PLATFORM_FEE_RATE] } },
          },
        },
      ]),
    ]);

    let bookingsGrowth = 0;
    if (lastMonthCount > 0) {
      bookingsGrowth = ((thisMonthCount - lastMonthCount) / lastMonthCount) * 100;
    } else if (thisMonthCount > 0) {
      bookingsGrowth = 100;
    }

    const successRate = totalBookings > 0 ? (confirmedCount / totalBookings) * 100 : 0;
    const escrowHeldTotal = escrowAgg[0]?.total || 0;
    const disputedTotal = disputedCount[0]?.count || 0;
    const platformRevenue = revenueAgg[0]?.total || 0;

    const topRoute = topCancelledRoute[0]
      ? `${topCancelledRoute[0]._id.from} → ${topCancelledRoute[0]._id.to}`
      : "—";

    return res.json({
      success: true,
      data: {
        totalBookings,
        bookingsGrowth: parseFloat(bookingsGrowth.toFixed(1)),
        confirmedCount,
        successRate: parseFloat(successRate.toFixed(1)),
        cancelledCount,
        topCancelledRoute: topRoute,
        escrowHeldTotal: Math.round(escrowHeldTotal),
        disputedCount: disputedTotal,
        platformRevenue: Math.round(platformRevenue),
        feeRatePct: PLATFORM_FEE_RATE * 100,
      },
    });
  } catch (error) {
    console.error("Admin getBookingStats error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getBookingCharts = async (req, res) => {
  try {
    const now = new Date();

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const perDayAgg = await Booking.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
    ]);

    const perDayMap = new Map(perDayAgg.map((d) => [d._id, d.count]));
    const bookingsPerDay = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyDaysAgo);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split("T")[0];
      bookingsPerDay.push({
        date: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        count: perDayMap.get(key) || 0,
      });
    }

    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const revenueAgg = await Booking.aggregate([
      {
        $addFields: { paymentStatusSafe: { $ifNull: ["$paymentStatus", "paid"] } },
      },
      {
        $match: {
          paymentStatusSafe: "paid",
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          revenue: { $sum: { $multiply: ["$fareCharged", PLATFORM_FEE_RATE] } },
        },
      },
    ]);

    const revenueMap = new Map(revenueAgg.map((r) => [r._id, r.revenue]));
    const revenueBreakdown = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      revenueBreakdown.push({
        month: d.toLocaleDateString("en-IN", { month: "short" }).toUpperCase(),
        revenue: Math.round(revenueMap.get(key) || 0),
      });
    }

    return res.json({
      success: true,
      data: { bookingsPerDay, revenueBreakdown },
    });
  } catch (error) {
    console.error("Admin getBookingCharts error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const processRefund = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body;
    const adminId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid booking ID" });
    }

    const refundAmount = parseFloat(amount);
    if (isNaN(refundAmount) || refundAmount <= 0) {
      return res.status(400).json({ success: false, message: "Enter a valid refund amount" });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: "Refund reason is required" });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (refundAmount > booking.fareCharged) {
      return res.status(400).json({
        success: false,
        message: `Refund amount cannot exceed fare charged (₹${booking.fareCharged})`,
      });
    }

    const currentEscrow = booking.escrowStatus || "held";
    if (currentEscrow === "released") {
      return res.status(400).json({
        success: false,
        message: "Cannot refund — escrow has already been released to the driver",
      });
    }

    const isFullRefund = refundAmount === booking.fareCharged;

    booking.refundAmount = refundAmount;
    booking.refundReason = reason.trim();
    booking.refundedAt = new Date();
    booking.refundedBy = adminId;
    booking.paymentStatus = isFullRefund ? "refunded" : "partially_refunded";
    booking.escrowStatus = "refunded";
    if (isFullRefund) booking.status = "cancelled";

    await booking.save();

    return res.json({
      success: true,
      message: `₹${refundAmount} refunded successfully`,
      data: {
        id: booking._id,
        paymentStatus: booking.paymentStatus,
        escrowStatus: booking.escrowStatus,
        status: booking.status,
        refundAmount: booking.refundAmount,
      },
    });
  } catch (error) {
    console.error("Process refund error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const releaseEscrow = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid booking ID" });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const currentEscrow = booking.escrowStatus || "held";
    if (currentEscrow !== "held") {
      return res.status(400).json({
        success: false,
        message: `Cannot release — escrow is currently "${currentEscrow}"`,
      });
    }

    booking.escrowStatus = "released";
    booking.escrowReleasedAt = new Date();
    await booking.save();

    return res.json({
      success: true,
      message: "Escrow released to driver",
      data: { id: booking._id, escrowStatus: booking.escrowStatus },
    });
  } catch (error) {
    console.error("Release escrow error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const exportBookingsCsv = async (req, res) => {
  try {
    const { search = "", paymentStatus = "all", escrowStatus = "all", dateFrom, dateTo, minFare, maxFare } = req.query;

    const preMatch = {};
    if (dateFrom || dateTo) {
      preMatch.createdAt = {};
      if (dateFrom) preMatch.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        preMatch.createdAt.$lte = end;
      }
    }
    if (minFare || maxFare) {
      preMatch.fareCharged = {};
      if (minFare) preMatch.fareCharged.$gte = parseFloat(minFare);
      if (maxFare) preMatch.fareCharged.$lte = parseFloat(maxFare);
    }

    const pipeline = [{ $match: preMatch }, ...buildLookupStages()];

    const postMatchAnd = [];
    if (paymentStatus !== "all") postMatchAnd.push({ paymentStatusSafe: paymentStatus });
    if (escrowStatus !== "all") {
      const statuses = escrowStatus.split(",").map((s) => s.trim()).filter(Boolean);
      if (statuses.length) postMatchAnd.push({ escrowStatusSafe: { $in: statuses } });
    }
    if (search.trim()) {
      const re = { $regex: search.trim(), $options: "i" };
      postMatchAnd.push({
        $or: [{ "passenger.name": re }, { "driver.name": re }, { fromName: re }, { toName: re }],
      });
    }
    if (postMatchAnd.length) pipeline.push({ $match: { $and: postMatchAnd } });

    pipeline.push({ $sort: { createdAt: -1 } }, { $limit: 5000 });

    const bookings = await Booking.aggregate(pipeline);

    const header = ["Booking ID", "Passenger", "Driver", "Route", "Date", "Fare", "Platform Fee", "Payment Status", "Escrow Status", "Booking Status"];
    const rows = bookings.map((b) => [
      `BK-${b._id.toString().slice(-5).toUpperCase()}`,
      b.passenger?.name || "Unknown",
      b.driver?.name || "Unknown",
      `${b.fromName} → ${b.toName}`,
      new Date(b.createdAt).toLocaleDateString("en-IN"),
      b.fareCharged,
      b.platformFee?.toFixed(2) || "0.00",
      b.paymentStatusSafe,
      b.escrowStatusSafe,
      b.status,
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="bookings-${Date.now()}.csv"`);
    return res.send(csv);
  } catch (error) {
    console.error("Export bookings error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getBookings,
  getBookingStats,
  getBookingCharts,
  processRefund,
  releaseEscrow,
  exportBookingsCsv,
};