// server/routes/emailRoutes.js
const { Router } = require('express');
const { authMiddleware, adminOnly } = require('../middleware/authMiddleware');
const {
  getEmailLogs,
  getEmailStats,
  retryFailedEmail,
  getEmailStatus
} = require('../controllers/emailController');

const router = Router();

// ─── Admin Routes ──────────────────────────────────────────────
router.get('/logs', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { limit = 100, skip = 0, type, status, userId } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (userId) filter.userId = userId;

    const logs = await getEmailLogs(filter, parseInt(limit), parseInt(skip));
    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/stats', authMiddleware, adminOnly, async (req, res) => {
  try {
    const stats = await getEmailStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/retry/:emailId', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { emailId } = req.params;
    const result = await retryFailedEmail(emailId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/status/:emailId', authMiddleware, async (req, res) => {
  try {
    const { emailId } = req.params;
    const status = await getEmailStatus(emailId);
    if (!status) {
      return res.status(404).json({ success: false, message: 'Email not found' });
    }
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;