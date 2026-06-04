'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { z } from 'zod'
import api from '@/lib/api'

// ✅ No role field — backend assigns "user" automatically
// ✅ useAuthStore removed — register no longer returns a token (OTP flow)
const schema = z.object({
  name: z.string().min(3, 'Min 3 characters'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter valid 10-digit number'),
  email: z.string().email('Enter a valid email'),
  password: z.string()
    .min(8, 'Min 8 characters')
    .regex(/[A-Z]/, 'Need 1 uppercase')
    .regex(/[0-9]/, 'Need 1 number'),
  confirmPassword: z.string().min(1, 'Please confirm password'),
  gender: z.enum(['male', 'female', 'other'], {
    required_error: 'Select a gender',
  }),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type FormData = z.infer<typeof schema>

function getStrength(pass: string): { score: number; label: string; color: string } {
  let score = 0
  if (pass.length >= 8) score++
  if (/[A-Z]/.test(pass)) score++
  if (/[0-9]/.test(pass)) score++
  if (/[^A-Za-z0-9]/.test(pass)) score++

  if (score <= 1) return { score, label: 'Weak', color: '#EF4444' }
  if (score === 2) return { score, label: 'Fair', color: '#F59E0B' }
  if (score === 3) return { score, label: 'Medium strength', color: '#EAB308' }
  return { score, label: 'Strong', color: '#22C55E' }
}

// ✅ Shared eye icon for both password fields
function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {open ? (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
          <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </>
      ) : (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  )
}

export default function RegisterForm() {
  const [showPass, setShowPass] = useState(false)
  const [showConf, setShowConf] = useState(false)
  const [passVal, setPassVal] = useState('')
  const router = useRouter()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { gender: 'male' },
  })

  const selectedGender = watch('gender')
  const strength = getStrength(passVal)

  const onSubmit = async (data: FormData) => {
    // ✅ Strip confirmPassword — backend doesn't expect it
    const { confirmPassword, ...payload } = data

    try {
      const res = await api.post('/auth/register', payload)

      if (res.data.success) {
        // ✅ Register only sends OTP email — redirect to verify page
        // Backend returns { success, message, email } — NO token here
        router.replace(`/verify-email?email=${encodeURIComponent(payload.email)}`)
      }
    } catch (err: any) {
      setError('root', {
        message: err?.response?.data?.message || 'Registration failed.',
      })
    }
  }

  const inputCls = (hasErr: boolean) =>
    `w-full h-11 px-4 rounded-lg border text-sm outline-none transition-all bg-white
     placeholder:text-gray-400 text-gray-900 focus:ring-2 focus:ring-[#3B3FE4]/20 ${
      hasErr
        ? 'border-red-400 focus:border-red-500'
        : 'border-gray-200 focus:border-[#3B3FE4]'
    }`

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">

      {/* Root error banner */}
      {errors.root && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-600 text-sm">
          {errors.root.message}
        </div>
      )}

      {/* Row 1 — Name + Phone */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Full Name</label>
          <input
            type="text"
            placeholder="Ahmed Irfad"
            autoComplete="name"
            className={inputCls(!!errors.name)}
            {...register('name')}
          />
          {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Phone Number</label>
          <div className="flex gap-2">
            <div className="h-11 px-3 flex items-center rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium text-gray-600 shrink-0 select-none">
              +91
            </div>
            <input
              type="tel"
              placeholder="98765 43210"
              autoComplete="tel"
              className={`flex-1 h-11 px-3 rounded-lg border text-sm outline-none transition-all
                bg-white placeholder:text-gray-400 text-gray-900 focus:ring-2 focus:ring-[#3B3FE4]/20 ${
                errors.phone
                  ? 'border-red-400 focus:border-red-500'
                  : 'border-gray-200 focus:border-[#3B3FE4]'
              }`}
              {...register('phone')}
            />
          </div>
          {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
        </div>
      </div>

      {/* Email */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">Email address</label>
        <input
          type="email"
          placeholder="ahmed@example.com"
          autoComplete="email"
          className={inputCls(!!errors.email)}
          {...register('email')}
        />
        {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
      </div>

      {/* Password + strength bar + ✅ eye toggle now working */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">Password</label>
        <div className="relative">
          <input
            type={showPass ? 'text' : 'password'}
            placeholder="••••••••"
            autoComplete="new-password"
            className={`w-full h-11 pl-4 pr-11 rounded-lg border text-sm outline-none transition-all
              bg-white placeholder:text-gray-400 text-gray-900 focus:ring-2 focus:ring-[#3B3FE4]/20 ${
              errors.password
                ? 'border-red-400 focus:border-red-500'
                : 'border-gray-200 focus:border-[#3B3FE4]'
            }`}
            {...register('password', {
              onChange: (e) => setPassVal(e.target.value),
            })}
          />
          {/* ✅ This button was missing — showPass was wired but never rendered */}
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Toggle password visibility"
          >
            <EyeIcon open={showPass} />
          </button>
        </div>

        {passVal.length > 0 && (
          <div className="flex flex-col gap-1">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex-1 h-1 rounded-full transition-all duration-300"
                  style={{ backgroundColor: i <= strength.score ? strength.color : '#E5E7EB' }}
                />
              ))}
            </div>
            <p className="text-xs" style={{ color: strength.color }}>{strength.label}</p>
          </div>
        )}
        {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
      </div>

      {/* Confirm Password */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">Confirm Password</label>
        <div className="relative">
          <input
            type={showConf ? 'text' : 'password'}
            placeholder="••••••••"
            autoComplete="new-password"
            className={`w-full h-11 pl-4 pr-11 rounded-lg border text-sm outline-none transition-all
              bg-white placeholder:text-gray-400 text-gray-900 focus:ring-2 focus:ring-[#3B3FE4]/20 ${
              errors.confirmPassword
                ? 'border-red-400 focus:border-red-500'
                : 'border-gray-200 focus:border-[#3B3FE4]'
            }`}
            {...register('confirmPassword')}
          />
          <button
            type="button"
            onClick={() => setShowConf(!showConf)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Toggle confirm password visibility"
          >
            <EyeIcon open={showConf} />
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>
        )}
      </div>

      {/* Gender pills */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700">Gender</label>
        <div className="flex gap-2">
          {(['male', 'female', 'other'] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setValue('gender', g, { shouldValidate: true })}
              className={`flex-1 h-10 rounded-lg border text-sm font-medium capitalize transition-all duration-150 ${
                selectedGender === g
                  ? 'bg-[#3B3FE4] border-[#3B3FE4] text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {g.charAt(0).toUpperCase() + g.slice(1)}
            </button>
          ))}
        </div>
        {errors.gender && <p className="text-xs text-red-500">{errors.gender.message}</p>}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="h-11 w-full rounded-lg bg-[#3B3FE4] text-white text-sm font-semibold
          hover:bg-[#2d31c4] active:bg-[#2327a8] disabled:opacity-60 disabled:cursor-not-allowed
          transition-colors flex items-center justify-center gap-2 mt-1"
      >
        {isSubmitting ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Creating account...
          </>
        ) : (
          <>Create account <span className="text-base">→</span></>
        )}
      </button>

      {/* Login link */}
      <p className="text-center text-sm text-gray-500">
        Already registered?{' '}
        <Link href="/login" className="text-[#3B3FE4] font-semibold hover:underline">
          Login →
        </Link>
      </p>

    </form>
  )
}
