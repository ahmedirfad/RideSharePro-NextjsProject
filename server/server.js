const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");

dotenv.config();

const app = express();

connectDB();

// ✅ Fixed: was "http://localhost:5173" (Vite) — Next.js runs on 3000
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true, // required for cookies + withCredentials in axios
  })
);

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);

app.get("/health", (req, res) => {
  res.json({ message: "Server is running" });
});

app.get("/testttt", (req, res) => {
  res.json({ backend: "REAL BACKEND RUNNING" });
});

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
