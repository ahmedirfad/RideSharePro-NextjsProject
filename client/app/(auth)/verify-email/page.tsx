'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'

function VerifyOtpPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''

  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendMessage, setResendMessage] = useState('')
  const [timer, setTimer] = useState(60)
  const [canResend, setCanResend] = useState(false)

  useEffect(() => {
    if (timer > 0 && !canResend) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1)
      }, 1000)
      return () => clearInterval(interval)
    } else if (timer === 0) {
      setCanResend(true)
    }
  }, [timer, canResend])

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return
    if (!/^\d*$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`)
      nextInput?.focus()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const otpCode = otp.join('')

    if (otpCode.length !== 6) {
      setError('Please enter the 6-digit OTP')
      setLoading(false)
      return
    }

    try {
      const response = await api.post('/auth/verify-email', {
        email,
        otp: otpCode,
      })

      if (response.data.success) {
        // Store tokens if returned
        if (response.data.accessToken) {
          localStorage.setItem('accessToken', response.data.accessToken)
        }
        router.push('/dashboard')
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (!canResend) return

    setResendMessage('')
    try {
      await api.post('/auth/resend-otp', { email })
      setResendMessage('New OTP sent to your email!')
      setCanResend(false)
      setTimer(60)
      setOtp(['', '', '', '', '', ''])
      setError('')
    } catch (err: any) {
      setResendMessage(err?.response?.data?.message || 'Failed to resend OTP')
    }
  }

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">No email provided. Please go back and register.</p>
          <Link href="/register" className="text-blue-600 hover:underline mt-4 inline-block">
            Back to Register
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✉️</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Verify Your Email</h1>
          <p className="text-gray-500 text-sm mt-2">
            We've sent a 6-digit verification code to
          </p>
          <p className="text-blue-600 font-medium text-sm">{email}</p>
        </div>

        {/* OTP Input */}
        <form onSubmit={handleSubmit}>
          <div className="flex justify-center gap-2 mb-6">
            {otp.map((digit, index) => (
              <input
                key={index}
                id={`otp-${index}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                className="w-12 h-12 text-center text-xl font-semibold border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none transition"
                autoFocus={index === 0}
              />
            ))}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-red-600 text-sm text-center">{error}</p>
            </div>
          )}

          {resendMessage && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <p className="text-green-600 text-sm text-center">{resendMessage}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>

        {/* Resend Section */}
        <div className="text-center mt-6">
          <p className="text-gray-500 text-sm">
            Didn't receive the code?{' '}
            {canResend ? (
              <button
                onClick={handleResendOtp}
                className="text-blue-600 font-medium hover:underline"
              >
                Resend
              </button>
            ) : (
              <span className="text-gray-400">Resend in {timer}s</span>
            )}
          </p>
        </div>

        {/* Back to Login */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Already verified?{' '}
          <Link href="/login" className="text-blue-600 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-450 text-sm">Loading verification page...</div>
      </div>
    }>
      <VerifyOtpPageContent />
    </Suspense>
  )
}