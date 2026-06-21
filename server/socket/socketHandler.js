const jwt = require("jsonwebtoken");
const Message = require("../models/Message");
const Notification = require("../models/Notification");
const Booking = require("../models/Booking");

// ── Helpers ────────────────────────────────────────────────────────────────

// Room name for a 1-on-1 booking chat
const chatRoom = (bookingId) => `chat:${bookingId}`;

// Room name for a user's personal notification channel
const userRoom = (userId) => `user:${userId}`;

// Verify JWT from socket handshake (cookie or auth header)
function verifySocket(socket) {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization?.split(" ")[1];

  if (!token) throw new Error("No token");

  const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_KEY);
  return { userId: decoded.userId, role: decoded.role };
}

// Check if a user is a party to a booking (passenger or driver)
async function assertBookingParty(bookingId, userId) {
  const booking = await Booking.findById(bookingId)
    .populate("tripId", "driverId")
    .lean();

  if (!booking) throw new Error("Booking not found");

  const isPassenger = booking.passengerId.toString() === userId.toString();
  const isDriver = booking.tripId?.driverId?.toString() === userId.toString();

  if (!isPassenger && !isDriver) throw new Error("Not a party to this booking");

  return { booking, isPassenger, isDriver };
}

// ── Push notification helper (call from anywhere in your app) ──────────────
// ✅ FIX: Proper serialization - convert ObjectId to string
async function pushNotification(io, { userId, type, title, body, link = "", meta = {} }) {
  const notif = await Notification.create({ userId, type, title, body, link, meta });
  
  // ✅ FIX: Serialize properly - convert _id to string and format date
  io.to(userRoom(userId)).emit("new_notification", {
    id: notif._id.toString(),
    type: notif.type,
    title: notif.title,
    body: notif.body,
    link: notif.link,
    read: false,
    createdAt: notif.createdAt.toISOString(),
  });
  return notif;
}

// ── Main socket setup ──────────────────────────────────────────────────────
function setupSocket(io) {

  // ── Auth middleware — runs before any event ──────────────
  io.use((socket, next) => {
    try {
      const user = verifySocket(socket);
      socket.user = user;
      next();
    } catch (err) {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const { userId } = socket.user;

    // Join personal notification room immediately on connect
    socket.join(userRoom(userId));

    // ── join_chat ─────────────────────────────────────────
    // Client emits: { bookingId }
    // Server: validates party, loads history, joins room
    socket.on("join_chat", async ({ bookingId }, callback) => {
      try {
        await assertBookingParty(bookingId, userId);
        socket.join(chatRoom(bookingId));

        // Load last 50 messages
        const messages = await Message.find({ bookingId })
          .sort({ createdAt: 1 })
          .limit(50)
          .populate("senderId", "name profilePhoto")
          .lean();

        // ✅ FIX: Serialize all fields properly
        const formatted = messages.map((m) => ({
          id: m._id.toString(),
          bookingId: m.bookingId.toString(),
          sender: {
            id: m.senderId?._id?.toString(),
            name: m.senderId?.name || "Unknown",
            photo: m.senderId?.profilePhoto || "",
          },
          text: m.text,
          readBy: m.readBy.map(id => id.toString()),
          createdAt: m.createdAt.toISOString(),
        }));

        // Mark unread messages as read
        await Message.updateMany(
          { bookingId, readBy: { $ne: userId } },
          { $addToSet: { readBy: userId } }
        );

        callback?.({ success: true, messages: formatted });
      } catch (err) {
        callback?.({ success: false, error: err.message });
      }
    });

    // ── send_message ──────────────────────────────────────
    // Client emits: { bookingId, text }
    socket.on("send_message", async ({ bookingId, text }, callback) => {
      try {
        if (!text?.trim()) throw new Error("Empty message");
        if (text.length > 2000) throw new Error("Message too long");

        const { booking, isPassenger, isDriver } = await assertBookingParty(bookingId, userId);

        const message = await Message.create({
          bookingId,
          tripId: booking.tripId._id,
          senderId: userId,
          text: text.trim(),
          readBy: [userId],
        });

        const populated = await message.populate("senderId", "name profilePhoto");

        // ✅ FIX: Serialize properly
        const payload = {
          id: message._id.toString(),
          bookingId: message.bookingId.toString(),
          sender: {
            id: populated.senderId?._id?.toString(),
            name: populated.senderId?.name || "Unknown",
            photo: populated.senderId?.profilePhoto || "",
          },
          text: message.text,
          readBy: message.readBy.map(id => id.toString()),
          createdAt: message.createdAt.toISOString(),
        };

        // Broadcast to everyone in the room (including sender)
        io.to(chatRoom(bookingId)).emit("receive_message", payload);

        // Push notification to the OTHER party
        const otherUserId = isPassenger
          ? booking.tripId.driverId
          : booking.passengerId;

        await pushNotification(io, {
          userId: otherUserId,
          type: "new_message",
          title: "New message",
          body: `${populated.senderId?.name || "Someone"}: ${text.trim().slice(0, 80)}`,
          link: `/messages?bookingId=${bookingId}`,
          meta: { bookingId, senderId: userId },
        });

        callback?.({ success: true, messageId: message._id });
      } catch (err) {
        callback?.({ success: false, error: err.message });
      }
    });

    // ── typing / stop_typing ──────────────────────────────
    socket.on("typing", ({ bookingId }) => {
      socket.to(chatRoom(bookingId)).emit("user_typing", { userId, bookingId });
    });

    socket.on("stop_typing", ({ bookingId }) => {
      socket.to(chatRoom(bookingId)).emit("user_stop_typing", { userId, bookingId });
    });

    // ── mark_messages_read ────────────────────────────────
    socket.on("mark_messages_read", async ({ bookingId }) => {
      try {
        await Message.updateMany(
          { bookingId, readBy: { $ne: userId } },
          { $addToSet: { readBy: userId } }
        );
        socket.to(chatRoom(bookingId)).emit("messages_read", { bookingId, readBy: userId });
        
        // ✅ NEW: Send updated unread count back to client
        const unreadCount = await Message.countDocuments({
          bookingId,
          readBy: { $ne: userId },
          senderId: { $ne: userId }
        });
        socket.emit("unread_count_updated", { bookingId, unreadCount });
        
      } catch (_) {}
    });

    // ── mark_notification_read ────────────────────────────
    socket.on("mark_notification_read", async ({ notificationId }) => {
      try {
        await Notification.findOneAndUpdate(
          { _id: notificationId, userId },
          { read: true }
        );
      } catch (_) {}
    });

    // ── mark_all_notifications_read ───────────────────────
    socket.on("mark_all_notifications_read", async () => {
      try {
        await Notification.updateMany({ userId, read: false }, { read: true });
        socket.emit("all_notifications_read");
      } catch (_) {}
    });

    // ── disconnect ─────────────────────────────────────────
    // ✅ FIX: Use 'disconnecting' instead of 'disconnect' for room cleanup
    socket.on("disconnecting", () => {
      // Rooms are automatically cleaned, but we can leave manually
      socket.leave(userRoom(userId));
    });
  });
}

module.exports = { setupSocket, pushNotification };