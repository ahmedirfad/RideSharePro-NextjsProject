const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { tokenGenerator } = require("../utils/tokenGenerator");
const { generateOTP, storeOTP, verifyOTP, resendOTP } = require("../services/otpService");
const { sendVerificationEmail, sendPasswordResetEmail } = require("../services/emailService");

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

// ==================== REGISTER ====================
const register = async (req, res) => {
  try {
    const { name, email, password, phone, gender } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      gender,
      role: "user",
      isEmailVerified: false,
    });

    await user.save();

    const otp = generateOTP();
    await storeOTP(email, otp);
    await sendVerificationEmail(email, otp, name);

    res.status(201).json({
      success: true,
      message: "Registration successful! Please verify your email with OTP.",
      email,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// ==================== VERIFY EMAIL ====================
const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: "Email already verified" });
    }

    const verification = await verifyOTP(email, otp);
    if (!verification.success) {
      return res.status(400).json({ message: verification.message });
    }

    user.isEmailVerified = true;
    await user.save();

    const { AccessToken, RefreshToken } = tokenGenerator(user._id.toString(), user.role);

    res
      .cookie("accessToken", AccessToken, accessTokenCookieOptions)
      .cookie("refreshToken", RefreshToken, refreshTokenCookieOptions)
      .json({
        success: true,
        accessToken: AccessToken,
        message: "Email verified successfully!",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// ==================== RESEND OTP ====================
const resendVerificationOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: "Email already verified" });
    }

    const newOTP = await resendOTP(email);
    await sendVerificationEmail(email, newOTP, user.name);

    res.json({
      success: true,
      message: "New OTP sent to your email",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// ==================== LOGIN ====================
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        message: "Please verify your email first. Check your inbox for OTP.",
        requiresVerification: true,
        email: user.email,
      });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const { AccessToken, RefreshToken } = tokenGenerator(user._id.toString(), user.role);

    res
      .cookie("accessToken", AccessToken, accessTokenCookieOptions)
      .cookie("refreshToken", RefreshToken, refreshTokenCookieOptions)
      .json({
        success: true,
        accessToken: AccessToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// ==================== FORGOT PASSWORD ====================
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const otp = generateOTP();
    await storeOTP(email, otp);
    await sendPasswordResetEmail(email, otp, user.name);

    res.status(200).json({
      success: true,
      message: "OTP sent to your email for password reset",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// ==================== VERIFY FORGOT OTP ====================
const verifyForgotOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const verification = await verifyOTP(email, otp);

    if (!verification.success) {
      if (verification.message === "OTP expired or not found") {
        return res.status(401).json({ message: "OTP expired" });
      }
      if (verification.message === "Invalid OTP") {
        return res.status(401).json({ message: "Invalid OTP" });
      }
      return res.status(400).json({ message: "Verification failed" });
    }

    const redis = require("../config/redis");
    const verifiedKey = `reset_verified:${email}`;
    await redis.setEx(verifiedKey, 600, "true");

    res.status(200).json({
      success: true,
      message: "OTP verified. You can now reset your password.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// ==================== RESET PASSWORD ====================
const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ message: "Email and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const redis = require("../config/redis");
    const verifiedKey = `reset_verified:${email}`;
    const isVerified = await redis.get(verifiedKey);

    if (!isVerified) {
      return res.status(401).json({
        message: "OTP not verified. Please request a new OTP.",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.updateOne({ email }, { $set: { password: hashedPassword } });

    await redis.del(verifiedKey);
    await redis.del(`otp:${email}`);

    res.status(200).json({
      success: true,
      message: "Password reset successfully. Please login with your new password.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// ==================== LOGOUT ====================
const logout = (req, res) => {
  res
    .clearCookie("accessToken", accessTokenCookieOptions)
    .clearCookie("refreshToken", refreshTokenCookieOptions)
    .json({ success: true, message: "Logged out successfully" });
};

// ==================== GET CURRENT USER ====================
const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// ==================== ADMIN — GET ALL USERS ====================
const getUsers = async (req, res) => {
  try {
    const users = await User.find({}).select("-password");
    res.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// ==================== ADMIN — GET USER BY ID ====================
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// ==================== UPDATE USER ====================
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, gender, emergencyContact, profilePhoto } = req.body;

    const user = await User.findByIdAndUpdate(
      id,
      { name, phone, gender, emergencyContact, profilePhoto },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// ==================== ADMIN — DELETE USER ====================
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  register,
  verifyEmail,
  resendVerificationOTP,
  login,
  logout,
  getCurrentUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  forgotPassword,
  verifyForgotOtp,
  resetPassword,
};