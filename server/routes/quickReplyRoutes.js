const express = require('express')
const router = express.Router()
const { getQuickReplies } = require('../controllers/quickReplyController')
const { authMiddleware } = require('../middleware/authMiddleware')

router.post('/', authMiddleware, getQuickReplies)

module.exports = router