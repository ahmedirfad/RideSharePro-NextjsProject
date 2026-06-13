const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const { tokenGenerator } = require("../utils/tokenGenerator");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const accessTokenCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 15 * 60 * 1000,
};

const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// ─────────────────────────────────────────────────────────────
// POST /api/auth/google
// Body: { idToken: "..." }  ← the token from Google Sign-In
// ─────────────────────────────────────────────────────────────
const googleAuth = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: "Google ID token is required" });
    }

    // 1. Verify the token with Google
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({ message: "Could not get email from Google" });
    }

    // 2. Find or create user
    let user = await User.findOne({ email });

    if (user) {
      // Existing user — link Google if not already linked
      if (user.authProvider === "local" && !user.googleId) {
        user.googleId     = googleId;
        user.authProvider = "google";
        if (!user.profilePhoto && picture) user.profilePhoto = picture;
        await user.save();
      }
    } else {
      // New user — create from Google data
      user = new User({
        name,
        email,
        googleId,
        authProvider:    "google",
        profilePhoto:    picture || "",
        isEmailVerified: true,  // Google already verified their email
        role:            "user",
      });
      await user.save();
    }

    // 3. Issue your own JWT tokens
    const { AccessToken, RefreshToken } = tokenGenerator(
      user._id.toString(),
      user.role
    );

    return res
      .cookie("accessToken",  AccessToken,  accessTokenCookieOptions)
      .cookie("refreshToken", RefreshToken, refreshTokenCookieOptions)
      .json({
        success:     true,
        accessToken: AccessToken,
        isNewUser:   !user.phone, // frontend can redirect to onboarding if true
        user: {
          id:    user._id,
          name:  user.name,
          email: user.email,
          role:  user.role,
          photo: user.profilePhoto,
        },
      });
  } catch (error) {
    console.error("Google auth error:", error);

    // Google token verification failed
    if (error.message?.includes("Token used too late")) {
      return res.status(401).json({ message: "Google token expired. Please try again." });
    }
    if (error.message?.includes("Invalid token")) {
      return res.status(401).json({ message: "Invalid Google token." });
    }

    res.status(500).json({ message: "Server error during Google authentication" });
  }
};

module.exports = { googleAuth };
