const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  try {
    // Check cookies first, then Authorization header
    const token =
      req.cookies?.accessToken ||
      req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Access token required" });
    }

    const accessKey = process.env.ACCESS_TOKEN_KEY;
    if (!accessKey) {
      throw new Error("ACCESS_TOKEN_KEY not defined");
    }

    const decoded = jwt.verify(token, accessKey);

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ message: "Token expired" });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ message: "Invalid token" });
    }
    return res.status(403).json({ message: "Invalid or expired access token" });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

module.exports = { authMiddleware, adminOnly };