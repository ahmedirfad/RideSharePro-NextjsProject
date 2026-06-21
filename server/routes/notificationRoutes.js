// server/routes/notificationRoutes.js
const { Router }         = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const Notification       = require("../models/Notification");

const router = Router();
router.use(authMiddleware);

// ── Helper: convert Mongo _id → id before sending to client ──────────────────
// .lean() returns plain objects but keeps _id (ObjectId), never id (string).
// Without this mapping, every <Link key={n.id}> on the frontend gets
// undefined, since the field is actually called _id — causing React's
// "each child should have a unique key" warning.
function serializeNotification(n) {
  return {
    id:        n._id.toString(),
    type:      n.type,
    title:     n.title,
    body:      n.body,
    link:      n.link,
    read:      n.read,
    createdAt: n.createdAt,
  };
}

// GET /api/notifications — last 30 for logged-in user
router.get("/", async (req, res) => {
  try {
    const userId = req.user.userId;
    const notifs = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    const unreadCount = await Notification.countDocuments({ userId, read: false });

    return res.json({
      success: true,
      data: notifs.map(serializeNotification),
      unreadCount,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/notifications/:id/read
router.put("/:id/read", async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { read: true }
    );
    return res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/notifications/read-all
router.put("/read-all", async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user.userId, read: false }, { read: true });
    return res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTANT: also fix the socket emit side.
// Wherever you create a Notification and emit it in real-time
// (e.g. inside bookingController, disputeController, messageController),
// make sure you emit the SERIALIZED version, not the raw Mongoose doc:
//
//   const notif = await Notification.create({ userId, type, title, body, link });
//   io.to(userId.toString()).emit("new_notification", serializeNotification(notif));
//
// If you currently emit `notif` directly (a Mongoose document), it will
// also carry `_id` instead of `id` and reproduce this exact bug on the
// real-time path even after this REST fix.
// ─────────────────────────────────────────────────────────────────────────────