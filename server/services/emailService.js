const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Send verification email (for registration)
const sendVerificationEmail = async (email, otp, name) => {
  const mailOptions = {
    from: `"RideSharePro" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Verify Your RideSharePro Account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 16px; border: 1px solid #e8eaed;">
        <div style="text-align: center;">
          <div style="font-size: 48px; margin-bottom: 16px;">🚗</div>
          <h1 style="color: #2563eb;">RideSharePro</h1>
          <h2>Welcome ${name}!</h2>
          <p>Thank you for registering. Please verify your email using the OTP below:</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 12px; margin: 20px 0;">
            <h1 style="color: #2563eb; font-size: 36px; letter-spacing: 8px;">${otp}</h1>
          </div>
          <p>This OTP is valid for 10 minutes.</p>
          <p>If you didn't create an account, please ignore this email.</p>
          <hr>
          <p style="font-size: 12px; color: #9ca3af;">&copy; 2026 RideSharePro</p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 Verification email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Email failed:', error);
    return false;
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, otp, name) => {
  const mailOptions = {
    from: `"RideSharePro" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Reset Your RideSharePro Password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 16px; border: 1px solid #e8eaed;">
        <div style="text-align: center;">
          <div style="font-size: 48px; margin-bottom: 16px;">🔐</div>
          <h1 style="color: #2563eb;">RideSharePro</h1>
          <h2>Password Reset Request</h2>
          <p>Hello ${name},</p>
          <p>You requested to reset your password. Use the OTP below:</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 12px; margin: 20px 0;">
            <h1 style="color: #2563eb; font-size: 36px; letter-spacing: 8px;">${otp}</h1>
          </div>
          <p>This OTP is valid for 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr>
          <p style="font-size: 12px; color: #9ca3af;">&copy; 2026 RideSharePro</p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 Password reset email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Email failed:', error);
    return false;
  }
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail };