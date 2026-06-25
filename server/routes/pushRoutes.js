const express = require('express')
const router = express.Router()
const { subscribe, unsubscribe } = require('../controllers/pushController')
const { authMiddleware } = require('../middleware/authMiddleware')

router.post('/subscribe', authMiddleware, subscribe)
router.post('/unsubscribe', authMiddleware, unsubscribe)

module.exports = router