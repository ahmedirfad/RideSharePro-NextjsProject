const sendVerificationEmail = async (email, otp, name) => {
  console.log(`
   ========== EMAIL SENT ==========
  To: ${email}
  OTP: ${otp}
  Valid for: 5 minutes
  ==================================
  `);
};

module.exports = { sendVerificationEmail };