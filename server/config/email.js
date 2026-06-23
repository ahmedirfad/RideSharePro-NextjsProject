// server/config/email.js
const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  // For production
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100
    });

    console.log('✅ Email transporter configured (production)');
    return transporter;
  }

  // For development - use ethereal.email
  console.warn('⚠️ No email credentials found. Using ethereal.email for testing.');
  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: process.env.ETHEREAL_USER || 'test@ethereal.email',
      pass: process.env.ETHEREAL_PASS || 'testpass'
    }
  });

  return transporter;
};

// Verify transporter on startup
const verifyTransporter = async () => {
  try {
    const transporter = getTransporter();
    await transporter.verify();
    console.log('✅ Email transporter verified');
    return true;
  } catch (error) {
    console.error('❌ Email transporter verification failed:', error.message);
    return false;
  }
};

module.exports = { getTransporter, verifyTransporter };