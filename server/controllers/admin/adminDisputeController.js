// controllers/admin/adminDisputeController.js

const mongoose = require("mongoose");
const Dispute = require("../../models/Dispute");

// ─────────────────────────────────────────────────────────────
// GET /api/admin/disputes
// Query: status, reason, search, page, limit
// ─────────────────────────────────────────────────────────────
const getAllDisputes = async (req, res) => {
  try {
    const { status, reason, search, page = 1, limit = 10 } = req.query;
    
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (reason && reason !== 'all') filter.reason = reason;
    
    if (search) {
      const searchId = search.length > 5 && /^[a-fA-F0-9]{24}$/.test(search) ? search : null;
      filter.$or = [
        { _id: searchId ? new mongoose.Types.ObjectId(searchId) : null },
        { description: { $regex: search, $options: 'i' } }
      ].filter(Boolean);
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [disputes, total] = await Promise.all([
      Dispute.find(filter)
        .populate("tripId", "from to departureDate departureTime")
        .populate("raisedBy", "name email")
        .populate("against", "name email")
        .populate("resolvedBy", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Dispute.countDocuments(filter)
    ]);
    
    const openCount = await Dispute.countDocuments({ status: "open" });
    const underReviewCount = await Dispute.countDocuments({ status: "under_review" });
    const resolvedCount = await Dispute.countDocuments({ status: "resolved" });
    const dismissedCount = await Dispute.countDocuments({ status: "dismissed" });
    
    res.json({
      success: true,
      data: {
        disputes: disputes.map(d => ({
          _id: d._id,
          tripId: d.tripId,
          bookingId: d.bookingId,
          raisedBy: d.raisedBy,
          against: d.against,
          reason: d.reason,
          description: d.description,
          evidence: d.evidence,
          status: d.status,
          resolution: d.resolution,
          adminNotes: d.adminNotes,
          resolvedBy: d.resolvedBy,
          resolvedAt: d.resolvedAt,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt
        })),
        stats: {
          total,
          open: openCount,
          under_review: underReviewCount,
          resolved: resolvedCount,
          dismissed: dismissedCount
        },
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error("Get all disputes error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/admin/disputes/:id
// ─────────────────────────────────────────────────────────────
const getDisputeById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid dispute ID" });
    }
    
    const dispute = await Dispute.findById(id)
      .populate("tripId", "from to departureDate departureTime")
      .populate("raisedBy", "name email phone")
      .populate("against", "name email phone")
      .populate("resolvedBy", "name");
    
    if (!dispute) {
      return res.status(404).json({ success: false, message: "Dispute not found" });
    }
    
    res.json({ success: true, data: dispute });
  } catch (error) {
    console.error("Get dispute by id error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /api/admin/disputes/:id/resolve
// Body: { status, resolution, adminNotes }
// ─────────────────────────────────────────────────────────────
const resolveDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolution, adminNotes } = req.body;
    const adminId = req.user.userId;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid dispute ID" });
    }
    
    const dispute = await Dispute.findById(id);
    if (!dispute) {
      return res.status(404).json({ success: false, message: "Dispute not found" });
    }
    
    dispute.status = status || dispute.status;
    if (status === "resolved") {
      dispute.resolution = resolution || "none";
      dispute.resolvedAt = new Date();
      dispute.resolvedBy = adminId;
    }
    if (adminNotes !== undefined) dispute.adminNotes = adminNotes;
    
    await dispute.save();
    
    res.json({ 
      success: true, 
      message: "Dispute resolved successfully", 
      data: dispute 
    });
  } catch (error) {
    console.error("Resolve dispute error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/admin/disputes/stats
// ─────────────────────────────────────────────────────────────
const getDisputeStats = async (req, res) => {
  try {
    const [total, open, underReview, resolved, dismissed, byReason] = await Promise.all([
      Dispute.countDocuments(),
      Dispute.countDocuments({ status: "open" }),
      Dispute.countDocuments({ status: "under_review" }),
      Dispute.countDocuments({ status: "resolved" }),
      Dispute.countDocuments({ status: "dismissed" }),
      Dispute.aggregate([
        { $group: { _id: "$reason", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);
    
    const avgResolveTime = await Dispute.aggregate([
      { $match: { status: "resolved", resolvedAt: { $exists: true } } },
      { $project: { timeDiff: { $subtract: ["$resolvedAt", "$createdAt"] } } },
      { $group: { _id: null, avgMs: { $avg: "$timeDiff" } } }
    ]);
    
    const avgHours = avgResolveTime[0] ? Math.round(avgResolveTime[0].avgMs / (1000 * 60 * 60)) : 0;
    
    res.json({
      success: true,
      data: {
        total,
        open,
        under_review: underReview,
        resolved,
        dismissed,
        byReason: byReason.map(r => ({ reason: r._id, count: r.count })),
        avgResolveTimeHours: avgHours
      }
    });
  } catch (error) {
    console.error("Get dispute stats error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/admin/disputes/export
// ─────────────────────────────────────────────────────────────
const exportDisputesCsv = async (req, res) => {
  try {
    const { status, reason } = req.query;
    
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (reason && reason !== 'all') filter.reason = reason;
    
    const disputes = await Dispute.find(filter)
      .populate("tripId", "from to")
      .populate("raisedBy", "name email")
      .populate("against", "name email")
      .sort({ createdAt: -1 });
    
    const rows = [
      ["ID", "Route", "Raised By", "Against", "Reason", "Description", "Status", "Resolution", "Created At", "Resolved At"]
    ];
    
    for (const d of disputes) {
      rows.push([
        d._id,
        d.tripId ? `${d.tripId.from} → ${d.tripId.to}` : "",
        d.raisedBy?.name || "",
        d.against?.name || "",
        d.reason,
        d.description.substring(0, 100),
        d.status,
        d.resolution,
        d.createdAt.toISOString().split("T")[0],
        d.resolvedAt ? d.resolvedAt.toISOString().split("T")[0] : ""
      ]);
    }
    
    const csv = rows.map(row => row.join(",")).join("\n");
    
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=disputes-${new Date().toISOString().split("T")[0]}.csv`);
    res.send(csv);
  } catch (error) {
    console.error("Export disputes error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllDisputes,
  getDisputeById,
  resolveDispute,
  getDisputeStats,
  exportDisputesCsv,
};