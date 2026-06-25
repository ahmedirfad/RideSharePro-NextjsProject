const Stripe = require('stripe')
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const Trip = require('../models/Trip')
const { calculateSegmentFare } = require('../utils/segmentUtils')

// POST /api/payments/create-intent
const createPaymentIntent = async (req, res) => {
  try {
    const { tripId, fromOrder, toOrder, seatNumbers } = req.body
    const userId = req.user.userId

    if (!tripId || fromOrder == null || toOrder == null || !seatNumbers?.length) {
      return res.status(400).json({ success: false, message: 'Missing required fields' })
    }

    const trip = await Trip.findById(tripId)
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' })
    if (trip.status !== 'upcoming') {
      return res.status(400).json({ success: false, message: 'Trip is no longer available' })
    }

    // Uses the same calculateSegmentFare util your bookSegment uses — no drift possible
    const { fare: segmentFare } = calculateSegmentFare(trip, parseInt(fromOrder), parseInt(toOrder))
    const subtotal = segmentFare * seatNumbers.length
    const platformFee = Math.round(subtotal * 0.05)
    const totalAmount = subtotal + platformFee

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount * 100, // paise
      currency: 'inr',
      metadata: {
        tripId: tripId.toString(),
        userId: userId.toString(),
        fromOrder: String(fromOrder),
        toOrder: String(toOrder),
        seatNumbers: JSON.stringify(seatNumbers),
      },
    })

    res.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        amount: totalAmount,
        segmentFare,
        platformFee,
      },
    })
  } catch (error) {
    console.error('Payment intent error:', error)
    res.status(500).json({ success: false, message: 'Payment setup failed' })
  }
}

// Called internally by bookSegment — not an HTTP endpoint
const verifyPayment = async (paymentIntentId, tripId, userId, seatNumbers) => {
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId)

  if (pi.status !== 'succeeded') throw new Error('Payment has not been completed')
  if (pi.metadata.tripId !== tripId.toString()) throw new Error('Payment trip mismatch')
  if (pi.metadata.userId !== userId.toString()) throw new Error('Payment user mismatch')

  const paidSeats = JSON.parse(pi.metadata.seatNumbers || '[]')
  const allMatch = seatNumbers.every(s => paidSeats.includes(s))
  if (!allMatch) throw new Error('Payment seat mismatch')

  return pi
}

module.exports = { createPaymentIntent, verifyPayment }