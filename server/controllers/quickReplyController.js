// controllers/aiController.js

const getQuickReplies = (req, res) => {
  const { message } = req.body

  if (!message) {
    return res.status(400).json({ success: false, message: 'Message required' })
  }

  const msg = message.toLowerCase()

  let replies = []

  if (msg.includes('pickup') || msg.includes('pick up') || msg.includes('reach')) {
    replies = ['I\'ll be there!', 'What time exactly?', 'Please share location']
  } else if (msg.includes('time') || msg.includes('when') || msg.includes('hour')) {
    replies = ['5 PM works', 'Let me check', 'Can we do 6 PM?']
  } else if (msg.includes('cancel') || msg.includes('cancelled')) {
    replies = ['Okay understood', 'Can we reschedule?', 'Please don\'t cancel']
  } else if (msg.includes('location') || msg.includes('where') || msg.includes('address')) {
    replies = ['I\'ll share my location', 'Meet at main junction?', 'I\'ll be at the bus stop']
  } else if (msg.includes('late') || msg.includes('delay') || msg.includes('wait')) {
    replies = ['No problem!', 'How long?', 'Please hurry']
  } else if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
    replies = ['Hi there!', 'Hello!', 'Hey, ready for the trip?']
  } else if (msg.includes('thank') || msg.includes('thanks')) {
    replies = ['You\'re welcome!', 'Happy to help!', 'Safe travels!']
  } else if (msg.includes('ok') || msg.includes('okay') || msg.includes('sure')) {
    replies = ['Great!', 'See you then!', 'Perfect']
  } else if (msg.includes('luggage') || msg.includes('bag') || msg.includes('baggage')) {
    replies = ['Just a small bag', 'I have 2 bags', 'No luggage']
  } else if (msg.includes('stop') || msg.includes('drop') || msg.includes('junction')) {
    replies = ['Sounds good!', 'I know the place', 'Can you drop closer?']
  } else {
    // Default replies
    replies = ['Okay, got it!', 'Thanks for letting me know', 'Sure, no problem']
  }

  res.json({ success: true, data: { replies } })
}

module.exports = { getQuickReplies }