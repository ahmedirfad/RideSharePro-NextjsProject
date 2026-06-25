'use client'

import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useState } from 'react'
import { Lock, Loader2, ShieldCheck } from 'lucide-react'

interface Props {
  total: number
  onSuccess: (paymentIntentId: string) => void
  onError: (msg: string) => void
}

export default function StripePaymentSection({ total, onSuccess, onError }: Props) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)

  const handlePay = async () => {
    if (!stripe || !elements) return
    setProcessing(true)

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    })

    if (error) {
      onError(error.message || 'Payment failed. Please try again.')
      setProcessing(false)
    } else if (paymentIntent?.status === 'succeeded') {
      onSuccess(paymentIntent.id)
    } else {
      onError('Unexpected payment state. Please contact support.')
      setProcessing(false)
    }
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3
          className="font-bold text-gray-900 text-[15px]"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          Payment Method
        </h3>
        <p className="text-xs text-gray-400 mt-0.5">
          All transactions are secured and encrypted
        </p>
      </div>

      <div className="p-6 space-y-5">
        <PaymentElement options={{ layout: 'tabs', paymentMethodOrder: ['card', 'upi'] }} />

        <button
          onClick={handlePay}
          disabled={processing || !stripe || !elements}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-bold rounded-2xl transition shadow-lg shadow-blue-200 flex items-center justify-center gap-2.5 text-[15px]"
        >
          {processing
            ? <><Loader2 size={17} className="animate-spin" /> Processing...</>
            : <><Lock size={15} /> Pay ₹{total} Securely</>
          }
        </button>

        <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1">
          <ShieldCheck size={11} className="text-green-500" />
          Protected by Stripe · 256-bit SSL encryption
        </p>
      </div>
    </div>
  )
}