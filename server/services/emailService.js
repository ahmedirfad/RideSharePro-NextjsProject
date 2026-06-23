// server/services/emailService.js
const { getTransporter } = require('../config/email');
const { getTemplate } = require('./emailTemplates');
const EmailLog = require('../models/EmailLog');

const FROM_EMAIL = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@ridesharepro.com';
const FROM_NAME = process.env.EMAIL_FROM_NAME || 'RideSharePro';

// ─── Single send function ──────────────────────────────────────
const sendEmail = async (to, subject, html) => {
  const transporter = getTransporter();
  
  const mailOptions = {
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to,
    subject,
    html,
    headers: {
      'X-Entity-Ref-ID': `email_${Date.now()}`
    }
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error.message);
    throw error;
  }
};

// ─── Main email sender with queue ─────────────────────────────
const sendEmailWithQueue = async ({
  to,
  type,
  templateData = {},
  priority = 'normal',
  userId = null,
  delay = null
}) => {
  // ✅ Lazy load emailQueue to break circular dependency
  const { addEmailToQueue, scheduleEmail } = require('./emailQueue');
  
  // Get template
  const { subject, html } = getTemplate(type, templateData);

  if (delay && delay > 0) {
    // Schedule email
    return await scheduleEmail({
      to,
      subject,
      html,
      type,
      userId,
      templateData,
      priority
    }, delay);
  }

  // Queue email
  return await addEmailToQueue({
    to,
    subject,
    html,
    type,
    userId,
    templateData,
    priority
  });
};

// ─── Send immediate (bypass queue) ────────────────────────────
const sendEmailImmediate = async ({
  to,
  type,
  templateData = {},
  userId = null
}) => {
  // Get template
  const { subject, html } = getTemplate(type, templateData);
  
  // Generate email ID
  const emailId = `immediate_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  // Create log
  await EmailLog.create({
    emailId,
    type,
    to,
    userId,
    subject,
    templateData,
    status: 'queued'
  });

  try {
    await sendEmail(to, subject, html);
    
    await EmailLog.findOneAndUpdate(
      { emailId },
      { 
        status: 'sent',
        sentAt: new Date(),
        deliveredAt: new Date()
      }
    );
    
    return { success: true, emailId };
  } catch (error) {
    await EmailLog.findOneAndUpdate(
      { emailId },
      { 
        status: 'failed',
        error: error.message
      }
    );
    throw error;
  }
};

// ─── Legacy Support ─────────────────────────────────────────────
const sendVerificationEmailLegacy = async (email, otp, name) => {
  return await sendEmailWithQueue({
    to: email,
    type: 'verification',
    templateData: { name, otp }
  });
};

const sendPasswordResetEmailLegacy = async (email, otp, name) => {
  return await sendEmailWithQueue({
    to: email,
    type: 'password_reset',
    templateData: { name, otp }
  });
};

// ─── Exports ────────────────────────────────────────────────────
module.exports = {
  sendEmail,
  sendEmailWithQueue,
  sendEmailImmediate,
  sendVerificationEmail: sendVerificationEmailLegacy,
  sendPasswordResetEmail: sendPasswordResetEmailLegacy,
};