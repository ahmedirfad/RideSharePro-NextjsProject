const jwt = require("jsonwebtoken");

const accessTokenCookieOptions = {
  httpOnly: true,
  secure: false,
  sameSite: "lax",
  maxAge: 15 * 60 * 1000,
};

const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: false,
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const TokenRegenerator = (req, res) => {
  try {
    const token = req.cookies?.refreshToken;

    if (!token) {
      return res.status(401).json({ message: "No refresh token found" });
    }

    const refreshKey = process.env.REFRESH_TOKEN_KEY;
    const accessKey = process.env.ACCESS_TOKEN_KEY;

    if (!refreshKey || !accessKey) {
      throw new Error("JWT keys not defined");
    }

    const decoded = jwt.verify(token, refreshKey);

    const payload = { userId: decoded.userId, role: decoded.role };

    const newRefreshToken = jwt.sign(payload, refreshKey, { expiresIn: "7d" });
    const newAccessToken = jwt.sign(payload, accessKey, { expiresIn: "15m" });

    return res
  .cookie("accessToken", newAccessToken, accessTokenCookieOptions)
  .cookie("refreshToken", newRefreshToken, refreshTokenCookieOptions)
  .json({ 
    success: true,
    accessToken: newAccessToken,  // ✅ add this line
    message: "Access token regenerated successfully" 
  })
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired refresh token" });
  }
};

module.exports = { TokenRegenerator };