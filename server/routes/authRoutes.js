const { Router } = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const { TokenRegenerator } = require("../utils/tokenRegenerator");
const {
  register,
  login,
  logout,
  getCurrentUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  verifyEmail,
  resendVerificationOTP,
  forgotPassword,
  verifyForgotOtp,
  resetPassword,
} = require("../controllers/authController");

const router = Router();

// Public routes
router.post("/register", register);
router.post("/login", login);
router.post("/refresh-token", TokenRegenerator);
router.post("/verify-email", verifyEmail);
router.post("/resend-otp", resendVerificationOTP);
router.post("/forgot-password", forgotPassword);       
router.post("/verify-forgot-otp", verifyForgotOtp);     
router.post("/reset-password", resetPassword);     


router.use(authMiddleware);

router.post("/logout", logout);
router.get("/me", getCurrentUser);
router.get("/users", getUsers);
router.get("/users/:id", getUserById);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

module.exports = router;