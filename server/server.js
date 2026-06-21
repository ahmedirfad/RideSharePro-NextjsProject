const express      = require("express");
const http         = require("http");
const { Server }   = require("socket.io");
const mongoose     = require("mongoose");
const cors         = require("cors");
const cookieParser = require("cookie-parser");
const dotenv       = require("dotenv");
const connectDB    = require("./config/db");

const adminRoutes    = require("./routes/admin/adminRoutes");
const authRoutes     = require("./routes/authRoutes");
const tripRoutes     = require("./routes/tripRoutes");
const bookingRoutes  = require("./routes/bookingRoutes");
const reviewRoutes   = require("./routes/reviewRoutes");
const disputeRoutes  = require("./routes/disputeRoutes");
const messageRoutes  = require("./routes/messageRoutes");
const notifRoutes    = require("./routes/notificationRoutes");

const { setupSocket } = require("./socket/socketHandler");

dotenv.config();

const app    = express();
const server = http.createServer(app);

// ── Socket.io ─────────────────────────────────────────────────
// ✅ FIX: Remove allowRequest - authentication handled by io.use() middleware
const io = new Server(server, {
  cors: {
    origin:      process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  },
  // ✅ allowRequest REMOVED - security fix
});

setupSocket(io);

// ── Make io accessible in route handlers ──────────────────────
// Usage: req.io.to(room).emit(event, data)
app.use((req, _res, next) => { req.io = io; next(); });

// ── Standard middleware ───────────────────────────────────────
app.use(
  cors({
    origin:      process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

connectDB();

// ── Routes ────────────────────────────────────────────────────
app.use("/api/admin",         adminRoutes);
app.use("/api/auth",          authRoutes);
app.use("/api/trips",         tripRoutes);
app.use("/api/bookings",      bookingRoutes);
app.use("/api/reviews",       reviewRoutes);
app.use("/api/disputes",      disputeRoutes);
app.use("/api/messages",      messageRoutes);
app.use("/api/notifications", notifRoutes);

app.get("/health", (_req, res) => res.json({ message: "Server is running" }));

const PORT = process.env.PORT || 5002;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = { io };