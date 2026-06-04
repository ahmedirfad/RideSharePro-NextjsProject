const jwt = require("jsonwebtoken");

// ✅ Core auth middleware — verifies token, attaches user to req
const authMiddleware = (req, res, next) => {
  try {
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
    return res.status(403).json({ message: "Invalid or expired access token" });
  }
};

// ✅ Admin-only guard — use after authMiddleware on protected routes
// e.g. router.get('/admin/users', authMiddleware, adminOnly, getUsers)
const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

module.exports = { authMiddleware, adminOnly };
