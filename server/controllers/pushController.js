const webpush = require('web-push')
const User = require('../models/User')

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

// POST /api/push/subscribe
const subscribe = async (req, res) => {
  try {
    const { subscription } = req.body
    const userId = req.user.userId

    await User.findByIdAndUpdate(userId, { pushSubscription: subscription })

    res.json({ success: true, message: 'Push subscription saved' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// POST /api/push/unsubscribe
const unsubscribe = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.userId, { pushSubscription: null })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// Helper — call this from anywhere (bookSegment, cancelTrip etc)
const sendPushToUser = async (userId, { title, body, link = '/' }) => {
  try {
    const user = await User.findById(userId).select('pushSubscription')
    if (!user?.pushSubscription) return

    await webpush.sendNotification(
      user.pushSubscription,
      JSON.stringify({ title, body, link })
    )
  } catch (err) {
    // Subscription expired — clean it up
    if (err.statusCode === 410) {
      await User.findByIdAndUpdate(userId, { pushSubscription: null })
    }
    console.error('Push send error:', err.message)
  }
}

module.exports = { subscribe, unsubscribe, sendPushToUser }