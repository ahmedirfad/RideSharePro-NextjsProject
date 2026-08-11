'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { z } from 'zod'
import api from '@/lib/api'
import { ArrowRight, Eye, EyeOff, Loader2, Mail, CheckCircle2, Lock, ShieldAlert } from 'lucide-react'

// Step 1 Schema: Email
const emailSchema = z.object({
  email: z.string().email('Enter a valid email address'),
})
type EmailFormData = z.infer<typeof emailSchema>

// Step 3 Schema: Reset Password
const resetSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password confirmation must be at least 6 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})
type ResetFormData = z.infer<typeof resetSchema>

export default function ForgotPasswordForm() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [email, setEmail] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showConfirmPass, setShowConfirmPass] = useState(false)
  const router = useRouter()

  // OTP Verification state (Step 2)
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [otpError, setOtpError] = useState('')
  const [otpSuccess, setOtpSuccess] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const [timer, setTimer] = useState(60)
  const [canResend, setCanResend] = useState(false)

  // Step 1 (Email) Form hook
  const {
    register: registerEmail,
    handleSubmit: handleSubmitEmail,
    formState: { errors: emailErrors, isSubmitting: isSubmittingEmail },
    setError: setEmailError,
  } = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  })

  // Step 3 (Reset Password) Form hook
  const {
    register: registerReset,
    handleSubmit: handleSubmitReset,
    formState: { errors: resetErrors, isSubmitting: isSubmittingReset },
    setError: setResetError,
  } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  // Timer logic for OTP Resend (Step 2)
  useEffect(() => {
    if (step === 2) {
      if (timer > 0 && !canResend) {
        const interval = setInterval(() => {
          setTimer((prev) => prev - 1)
        }, 1000)
        return () => clearInterval(interval)
      } else if (timer === 0) {
        setCanResend(true)
      }
    }
  }, [timer, canResend, step])

  // Handle email submit (Step 1)
  const onEmailSubmit = async (data: EmailFormData) => {
    try {
      const res = await api.post('/auth/forgot-password', { email: data.email })
      if (res.data.success) {
        setEmail(data.email)
        setStep(2)
        setTimer(60)
        setCanResend(false)
        setOtp(['', '', '', '', '', ''])
        setOtpError('')
        setOtpSuccess('')
      } else {
        setEmailError('root', { message: res.data.message || 'Something went wrong.' })
      }
    } catch (err: any) {
      setEmailError('root', {
        message: err?.response?.data?.message || 'Failed to initiate password reset. Try again.',
      })
    }
  }

  // Handle OTP digit changes (Step 2)
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return
    if (!/^\d*$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    setOtpError('')

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`)
      nextInput?.focus()
    }
  }

  // Handle OTP digit backspaces (Step 2)
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`)
      prevInput?.focus()
    }
  }

  // Handle OTP verification submit (Step 2)
  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setOtpLoading(true)
    setOtpError('')

    const otpCode = otp.join('')
    if (otpCode.length !== 6) {
      setOtpError('Please enter the 6-digit OTP')
      setOtpLoading(false)
      return
    }

    try {
      const res = await api.post('/auth/verify-forgot-otp', {
        email,
        otp: otpCode,
      })

      if (res.data.success) {
        setStep(3)
      } else {
        setOtpError(res.data.message || 'Verification failed')
      }
    } catch (err: any) {
      setOtpError(err?.response?.data?.message || 'Invalid or expired OTP. Please try again.')
    } finally {
      setOtpLoading(false)
    }
  }

  // Handle OTP Resend (Step 2)
  const handleResendOtp = async () => {
    if (!canResend) return
    setOtpError('')
    setOtpSuccess('')

    try {
      await api.post('/auth/forgot-password', { email })
      setOtpSuccess('A new OTP has been sent to your email!')
      setCanResend(false)
      setTimer(60)
      setOtp(['', '', '', '', '', ''])
    } catch (err: any) {
      setOtpError(err?.response?.data?.message || 'Failed to resend OTP.')
    }
  }

  // Handle password reset (Step 3)
  const onResetSubmit = async (data: ResetFormData) => {
    try {
      const res = await api.post('/auth/reset-password', {
        email,
        newPassword: data.password,
      })

      if (res.data.success) {
        setStep(4)
      } else {
        setResetError('root', { message: res.data.message || 'Password reset failed.' })
      }
    } catch (err: any) {
      setResetError('root', {
        message: err?.response?.data?.message || 'Failed to reset password. Please try again.',
      })
    }
  }

  const inputClass = (hasError: boolean) =>
    `w-full h-11 px-4 rounded-xl border text-sm outline-none transition-all bg-white/90
     placeholder:text-gray-400 text-gray-900 focus:ring-2 focus:ring-blue-500/20 ${
      hasError
        ? 'border-red-400 focus:border-red-500'
        : 'border-gray-200 focus:border-blue-500'
    }`

  // ──────────────── STEP 1: Email Request ────────────────
  if (step === 1) {
    return (
      <form onSubmit={handleSubmitEmail(onEmailSubmit)} className="flex flex-col gap-4">
        {emailErrors.root && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm flex gap-2 items-start">
            <ShieldAlert size={18} className="shrink-0 mt-0.5" />
            <span>{emailErrors.root.message}</span>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Email Address</label>
          <div className="relative">
            <input
              type="email"
              placeholder="ahmed@example.com"
              autoComplete="email"
              className={inputClass(!!emailErrors.email)}
              {...registerEmail('email')}
            />
          </div>
          {emailErrors.email && <p className="text-xs text-red-500">{emailErrors.email.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmittingEmail}
          className="h-11 w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold hover:from-blue-700 hover:to-blue-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-2 shadow-lg shadow-blue-200"
        >
          {isSubmittingEmail ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Sending OTP...
            </>
          ) : (
            <>
              Send Verification OTP
              <ArrowRight size={16} />
            </>
          )}
        </button>

        <p className="text-center text-sm text-gray-500 pt-2">
          Remember your password?{' '}
          <Link href="/login" className="text-blue-600 font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    )
  }

  // ──────────────── STEP 2: OTP Verification ────────────────
  if (step === 2) {
    return (
      <form onSubmit={handleOtpVerify} className="flex flex-col gap-4">
        <div className="text-center mb-2">
          <p className="text-sm text-gray-600">
            We sent a verification code to <span className="font-semibold text-gray-900">{email}</span>
          </p>
        </div>

        {otpError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm flex gap-2 items-start">
            <ShieldAlert size={18} className="shrink-0 mt-0.5" />
            <span>{otpError}</span>
          </div>
        )}

        {otpSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-700 text-sm flex gap-2 items-start animate-fade-in">
            <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-green-600" />
            <span>{otpSuccess}</span>
          </div>
        )}

        <div className="flex justify-center gap-2.5 my-2">
          {otp.map((digit, index) => (
            <input
              key={index}
              id={`otp-${index}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(index, e.target.value)}
              onKeyDown={(e) => handleOtpKeyDown(index, e)}
              className="w-12 h-12 text-center text-xl font-bold border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition bg-gray-50/50 focus:bg-white"
              autoFocus={index === 0}
            />
          ))}
        </div>

        <button
          type="submit"
          disabled={otpLoading}
          className="h-11 w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold hover:from-blue-700 hover:to-blue-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-2 shadow-lg shadow-blue-200"
        >
          {otpLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              Verify Code
              <ArrowRight size={16} />
            </>
          )}
        </button>

        <div className="text-center mt-2 flex flex-col gap-2">
          <p className="text-xs text-gray-500">
            {canResend ? (
              <button
                type="button"
                onClick={handleResendOtp}
                className="text-blue-600 font-semibold hover:underline"
              >
                Resend OTP code
              </button>
            ) : (
              <span>Resend code in <span className="font-semibold text-gray-700">{timer}s</span></span>
            )}
          </p>

          <button
            type="button"
            onClick={() => setStep(1)}
            className="text-xs text-gray-400 hover:text-gray-600 font-medium transition"
          >
            Change email address
          </button>
        </div>
      </form>
    )
  }

  // ──────────────── STEP 3: Reset Password ────────────────
  if (step === 3) {
    return (
      <form onSubmit={handleSubmitReset(onResetSubmit)} className="flex flex-col gap-4">
        {resetErrors.root && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm flex gap-2 items-start">
            <ShieldAlert size={18} className="shrink-0 mt-0.5" />
            <span>{resetErrors.root.message}</span>
          </div>
        )}

        {/* New Password */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">New Password</label>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="new-password"
              className={inputClass(!!resetErrors.password)}
              {...registerReset('password')}
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
            >
              {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          {resetErrors.password && (
            <p className="text-xs text-red-500">{resetErrors.password.message}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Confirm Password</label>
          <div className="relative">
            <input
              type={showConfirmPass ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="new-password"
              className={inputClass(!!resetErrors.confirmPassword)}
              {...registerReset('confirmPassword')}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPass(!showConfirmPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
            >
              {showConfirmPass ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          {resetErrors.confirmPassword && (
            <p className="text-xs text-red-500">{resetErrors.confirmPassword.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmittingReset}
          className="h-11 w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold hover:from-blue-700 hover:to-blue-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-2 shadow-lg shadow-blue-200"
        >
          {isSubmittingReset ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Resetting password...
            </>
          ) : (
            <>
              Update Password
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>
    )
  }

  // ──────────────── STEP 4: Success View ────────────────
  return (
    <div className="flex flex-col items-center justify-center text-center gap-5 py-4 animate-fade-in">
      <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center text-green-500 shadow-md">
        <CheckCircle2 size={36} />
      </div>

      <div className="space-y-2">
        <h3 className="text-xl font-bold text-gray-900">Password Reset Complete</h3>
        <p className="text-sm text-gray-500 max-w-sm">
          Your password has been successfully updated. You can now use it to sign in to your RideSharePro account.
        </p>
      </div>

      <button
        onClick={() => router.push('/login')}
        className="h-11 w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold hover:from-blue-700 hover:to-blue-800 transition-all flex items-center justify-center gap-2 mt-2 shadow-lg shadow-blue-200"
      >
        Sign in to your account
        <ArrowRight size={16} />
      </button>
    </div>
  )
}
