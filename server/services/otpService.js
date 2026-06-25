// server/services/otpService.js
const redis = require("../config/redis");

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const storeOTP = async (email, otp) => {
  const key = `otp:${email}`;
  // ✅ Works with ioredis
  await redis.setex(key, 300, otp);
  // OR use: await redis.set(key, otp, 'EX', 300);
  return true;
};

const verifyOTP = async (email, otp) => {
  const key = `otp:${email}`;
  const storedOTP = await redis.get(key);
  
  if (!storedOTP) {
    return { success: false, message: "OTP expired or not found" };
  }
  
  if (storedOTP !== otp) {
    return { success: false, message: "Invalid OTP" };
  }
  
  await redis.del(key);
  return { success: true, message: "OTP verified" };
};

const resendOTP = async (email) => {
  const key = `otp:${email}`;
  await redis.del(key);
  const newOTP = generateOTP();
  await storeOTP(email, newOTP);
  return newOTP;
};

module.exports = {
  generateOTP,
  storeOTP,
  verifyOTP,
  resendOTP,
};