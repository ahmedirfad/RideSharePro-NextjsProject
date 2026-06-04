const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");

dotenv.config();

const tokenGenerator = (userId, role) => {
  const refreshKey = process.env.REFRESH_TOKEN_KEY;
  const accessKey = process.env.ACCESS_TOKEN_KEY;

  if (!refreshKey || !accessKey) {
    throw new Error("JWT keys are not defined in environment variables");
  }

  const payload = { userId, role };

  const RefreshToken = jwt.sign(payload, refreshKey, { expiresIn: "7d" });
  const AccessToken = jwt.sign(payload, accessKey, { expiresIn: "15m" });

  return { RefreshToken, AccessToken };
};

module.exports = { tokenGenerator };