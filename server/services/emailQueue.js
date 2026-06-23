// server/services/emailQueue.js
const { Queue, Worker } = require('bullmq');
const redisClient = require('../config/redis');
const { sendEmail } = require('./emailService');
const EmailLog = require('../models/EmailLog');

// ─── Queue ──────────────────────────────────────────────────────
const emailQueue = new Queue('emailQueue', {
  connection: redisClient,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: {
      age: 24 * 3600,
      count: 1000
    },
    removeOnFail: {
      age: 7 * 24 * 3600
    }
  }
});

// ─── Worker ─────────────────────────────────────────────────────
const emailWorker = new Worker('emailQueue', async (job) => {
  const { emailId, to, subject, html, type, userId, templateData } = job.data;
  
  console.log(`📧 Processing email ${emailId} for ${to} (attempt ${job.attemptsMade + 1}/${job.opts.attempts})`);
  
  await EmailLog.findOneAndUpdate(
    { emailId },
    { 
      status: 'queued',
      retryCount: job.attemptsMade + 1
    }
  );

  try {
    const result = await sendEmail(to, subject, html);
    
    await EmailLog.findOneAndUpdate(
      { emailId },
      { 
        status: 'sent',
        sentAt: new Date(),
        deliveredAt: new Date()
      }
    );
    
    console.log(`✅ Email ${emailId} sent successfully to ${to}`);
    return result;
  } catch (error) {
    console.error(`❌ Email ${emailId} failed:`, error.message);
    
    await EmailLog.findOneAndUpdate(
      { emailId },
      { 
        status: 'failed',
        error: error.message,
        retryCount: job.attemptsMade + 1
      }
    );
    
    throw error;
  }
}, {
  connection: redisClient,
  concurrency: 5,
  limiter: {
    max: 100,
    duration: 60000
  }
});

// ─── Worker Events ────────────────────────────────────────────
emailWorker.on('completed', (job) => {
  console.log(`✅ Email ${job.data.emailId} completed successfully`);
});

emailWorker.on('failed', (job, err) => {
  console.error(`❌ Email ${job.data.emailId} failed permanently:`, err.message);
});

emailWorker.on('error', (err) => {
  console.error('❌ Email Worker error:', err);
});

// ─── Helper Functions ──────────────────────────────────────────
const addEmailToQueue = async (emailData) => {
  const {
    to,
    subject,
    html,
    type,
    userId,
    templateData,
    priority = 'normal'
  } = emailData;

  const emailId = `email_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  await EmailLog.create({
    emailId,
    type,
    to,
    userId,
    subject,
    templateData,
    status: 'queued',
    maxRetries: 3
  });

  const priorityMap = {
    high: 1,
    normal: 2,
    low: 3
  };

  const job = await emailQueue.add(
    'send-email',
    {
      emailId,
      to,
      subject,
      html,
      type,
      userId,
      templateData
    },
    {
      priority: priorityMap[priority] || 2,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      }
    }
  );

  console.log(`📧 Email ${emailId} queued for ${to}`);
  return { emailId, jobId: job.id };
};

const scheduleEmail = async (emailData, delayMs) => {
  const {
    to,
    subject,
    html,
    type,
    userId,
    templateData,
    priority = 'normal'
  } = emailData;

  const emailId = `scheduled_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  await EmailLog.create({
    emailId,
    type,
    to,
    userId,
    subject,
    templateData,
    status: 'queued',
    maxRetries: 3
  });

  const priorityMap = {
    high: 1,
    normal: 2,
    low: 3
  };

  const job = await emailQueue.add(
    'send-email',
    {
      emailId,
      to,
      subject,
      html,
      type,
      userId,
      templateData
    },
    {
      delay: delayMs,
      priority: priorityMap[priority] || 2,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      }
    }
  );

  console.log(`📧 Email ${emailId} scheduled for ${to} (in ${delayMs/1000}s)`);
  return { emailId, jobId: job.id };
};

const getEmailStatus = async (emailId) => {
  return await EmailLog.findOne({ emailId });
};

const getQueuedCount = async () => {
  return await emailQueue.getWaitingCount();
};

const getJobCounts = async () => {
  return await emailQueue.getJobCounts();
};

module.exports = {
  emailQueue,
  emailWorker,
  addEmailToQueue,
  scheduleEmail,
  getEmailStatus,
  getQueuedCount,
  getJobCounts
};