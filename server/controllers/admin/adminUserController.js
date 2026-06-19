const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../../models/User");

const getUsers = async (req, res) => {
  try {
    const {
      search = "",
      role = "all",
      status = "all",
      dateFrom,
      dateTo,
      page = 1,
      limit = 10,
    } = req.query;

    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 100);

    const matchStage = {};

    if (search.trim()) {
      const re = { $regex: search.trim(), $options: "i" };
      matchStage.$or = [{ name: re }, { email: re }, { phone: re }];
    }

    if (dateFrom || dateTo) {
      matchStage.createdAt = {};
      if (dateFrom) matchStage.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        matchStage.createdAt.$lte = end;
      }
    }

    const pipeline = [{ $match: matchStage }];

    pipeline.push(
      {
        $lookup: {
          from: "trips",
          localField: "_id",
          foreignField: "driverId",
          as: "hostedTrips",
        },
      },
      {
        $lookup: {
          from: "bookings",
          localField: "_id",
          foreignField: "passengerId",
          as: "bookings",
        },
      },
      {
        $addFields: {
          hostedCount: { $size: "$hostedTrips" },
          tripsCount: {
            $add: [{ $size: "$hostedTrips" }, { $size: "$bookings" }],
          },
          derivedRole: {
            $cond: [
              { $eq: ["$role", "admin"] },
              "ADMIN",
              "USER",
            ],
          },
          computedStatus: {
            $cond: [
              { $eq: ["$isSuspended", true] },
              "SUSPENDED",
              {
                $cond: [
                  { $eq: ["$isEmailVerified", true] },
                  "ACTIVE",
                  "UNVERIFIED",
                ],
              },
            ],
          },
        },
      }
    );

    const postMatch = {};
    if (role !== "all") postMatch.derivedRole = role.toUpperCase();
    if (status !== "all") postMatch.computedStatus = status.toUpperCase();
    if (Object.keys(postMatch).length) pipeline.push({ $match: postMatch });

    pipeline.push({
      $facet: {
        data: [
          { $sort: { createdAt: -1 } },
          { $skip: (pageNum - 1) * limitNum },
          { $limit: limitNum },
          {
            $project: {
              password: 0,
              googleId: 0,
              hostedTrips: 0,
              bookings: 0,
              __v: 0,
            },
          },
        ],
        totalCount: [{ $count: "count" }],
      },
    });

    const result = await User.aggregate(pipeline);
    const data = result[0]?.data || [];
    const total = result[0]?.totalCount?.[0]?.count || 0;

    const ROLE_PREFIX = { USER: "USR", ADMIN: "ADM" };
    
    const formatted = data.map((u) => ({
      id: u._id,
      shortId: `${ROLE_PREFIX[u.derivedRole]}-${u._id.toString().slice(-5).toUpperCase()}`,
      name: u.name,
      email: u.email,
      phone: u.phone || "—",
      profilePhoto: u.profilePhoto || "",
      role: u.derivedRole,
      rating: u.rating || 0,
      totalRatings: u.totalRatings || 0,
      trips: u.tripsCount,
      joinedDate: u.createdAt,
      status: u.computedStatus,
      isSuspended: u.isSuspended || false,
    }));

    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      totalUsers,
      verifiedCount,
      pendingCount,
      suspendedCount,
      thisMonthCount,
      lastMonthCount,
      locations,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ isEmailVerified: true }),
      User.countDocuments({ isEmailVerified: false }),
      User.countDocuments({ isSuspended: true }),
      User.countDocuments({ createdAt: { $gte: startOfThisMonth } }),
      User.countDocuments({ createdAt: { $gte: startOfLastMonth, $lt: startOfThisMonth } }),
      User.distinct("location"),
    ]);

    let growth = 0;
    if (lastMonthCount > 0) {
      growth = ((thisMonthCount - lastMonthCount) / lastMonthCount) * 100;
    } else if (thisMonthCount > 0) {
      growth = 100;
    }

    const regionsCount = locations.filter((l) => l && l.trim() !== "").length;

    return res.json({
      success: true,
      data: {
        users: formatted,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.max(Math.ceil(total / limitNum), 1),
        },
        stats: {
          total: totalUsers,
          growth: parseFloat(growth.toFixed(1)),
          verified: verifiedCount,
          pending: pendingCount,
          suspended: suspendedCount,
          regions: regionsCount,
        },
      },
    });
  } catch (error) {
    console.error("Admin getUsers error:", error);
    res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

const toggleSuspendUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { suspend, reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid user ID" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.role === "admin") {
      return res.status(403).json({ success: false, message: "Cannot suspend an admin account" });
    }

    user.isSuspended = !!suspend;
    user.suspendedAt = suspend ? new Date() : null;
    user.suspendedReason = suspend ? (reason || "") : "";
    await user.save();

    return res.json({
      success: true,
      message: suspend ? "User suspended" : "User reactivated",
      data: { id: user._id, isSuspended: user.isSuspended },
    });
  } catch (error) {
    console.error("Toggle suspend error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const createUserByAdmin = async (req, res) => {
  try {
    const { name, email, password, phone, gender, role, location } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "name, email, and password are required",
      });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: "User with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      phone: phone || "",
      gender: gender || "",
      role: role === "admin" ? "admin" : "user",
      location: location || "",
      isEmailVerified: true,
    });

    await user.save();

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Admin create user error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const exportUsersCsv = async (req, res) => {
  try {
    const { search = "", role = "all", status = "all", dateFrom, dateTo } = req.query;

    const matchStage = {};
    if (search.trim()) {
      const re = { $regex: search.trim(), $options: "i" };
      matchStage.$or = [{ name: re }, { email: re }, { phone: re }];
    }
    if (dateFrom || dateTo) {
      matchStage.createdAt = {};
      if (dateFrom) matchStage.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        matchStage.createdAt.$lte = end;
      }
    }

    const pipeline = [
      { $match: matchStage },
      {
        $lookup: { from: "trips", localField: "_id", foreignField: "driverId", as: "hostedTrips" },
      },
      {
        $lookup: { from: "bookings", localField: "_id", foreignField: "passengerId", as: "bookings" },
      },
      {
        $addFields: {
          tripsCount: { $add: [{ $size: "$hostedTrips" }, { $size: "$bookings" }] },
          derivedRole: {
            $cond: [
              { $eq: ["$role", "admin"] }, "ADMIN",
              "USER",
            ],
          },
          computedStatus: {
            $cond: [
              { $eq: ["$isSuspended", true] }, "SUSPENDED",
              { $cond: [{ $eq: ["$isEmailVerified", true] }, "ACTIVE", "UNVERIFIED"] },
            ],
          },
        },
      },
    ];

    const postMatch = {};
    if (role !== "all") postMatch.derivedRole = role.toUpperCase();
    if (status !== "all") postMatch.computedStatus = status.toUpperCase();
    if (Object.keys(postMatch).length) pipeline.push({ $match: postMatch });

    pipeline.push({ $sort: { createdAt: -1 } }, { $limit: 5000 });

    const users = await User.aggregate(pipeline);

    const header = ["Name", "Email", "Phone", "Role", "Rating", "Trips", "Joined Date", "Status"];
    const rows = users.map((u) => [
      u.name,
      u.email,
      u.phone || "",
      u.derivedRole,
      u.rating || 0,
      u.tripsCount,
      new Date(u.createdAt).toLocaleDateString("en-IN"),
      u.computedStatus,
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="users-${Date.now()}.csv"`);
    return res.send(csv);
  } catch (error) {
    console.error("Export users error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getUsers,
  toggleSuspendUser,
  createUserByAdmin,
  exportUsersCsv,
};