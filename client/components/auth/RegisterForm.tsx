'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { z } from 'zod'
import api from '@/lib/api'
import { ArrowRight } from 'lucide-react'

// Simple frontend validation (for UX only — backend validates properly)
const schema = z.object({
  name: z.string().min(2, 'Name required'),
  phone: z.string().regex(/^[6-9]\d{9}$/, '10-digit number required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Confirm your password'),
  gender: z.enum(['male', 'female', 'other']),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

type FormData = z.infer<typeof schema>

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
  const [showConfirmPass, setShowConfirmPass] = useState(false)
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

  const onSubmit = async (data: FormData) => {
    const { confirmPassword, ...payload } = data

    try {
      const res = await api.post('/auth/register', payload)
      if (res.data.success) {
        router.replace(`/verify-email?email=${encodeURIComponent(payload.email)}`)
      }
    } catch (err: any) {
      setError('root', {
        message: err?.response?.data?.message || 'Registration failed. Try again.',
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      
      {/* Root Error */}
      {errors.root && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
          {errors.root.message}
        </div>
      )}

      {/* Name + Phone Row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Full Name</label>
          <input type="text" placeholder="Ahmed Irfad" className={inputClass(!!errors.name)} {...register('name')} />
          {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Phone</label>
          <div className="flex gap-2">
            <div className="h-11 px-3 flex items-center rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-600 shrink-0">+91</div>
            <input type="tel" placeholder="98765 43210" className={`flex-1 ${inputClass(!!errors.phone)}`} {...register('phone')} />
          </div>
          {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
        </div>
      </div>

      {/* Email */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">Email</label>
        <input type="email" placeholder="ahmed@example.com" className={inputClass(!!errors.email)} {...register('email')} />
        {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
      </div>

      {/* Password */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">Password</label>
        <div className="relative">
          <input type={showPass ? 'text' : 'password'} placeholder="••••••••" className={`w-full ${inputClass(!!errors.password)}`} {...register('password')} />
          <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <EyeIcon open={showPass} />
          </button>
        </div>
        {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
      </div>

      {/* Confirm Password */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">Confirm Password</label>
        <div className="relative">
          <input type={showConfirmPass ? 'text' : 'password'} placeholder="••••••••" className={`w-full ${inputClass(!!errors.confirmPassword)}`} {...register('confirmPassword')} />
          <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <EyeIcon open={showConfirmPass} />
          </button>
        </div>
        {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>}
      </div>

      {/* Gender */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700">Gender</label>
        <div className="flex gap-2">
          {(['male', 'female', 'other'] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setValue('gender', g, { shouldValidate: true })}
              className={`flex-1 h-10 rounded-xl border text-sm font-medium capitalize transition-all ${
                selectedGender === g
                  ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
        {errors.gender && <p className="text-xs text-red-500">{errors.gender.message}</p>}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="h-11 w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold hover:from-blue-700 hover:to-blue-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-2 shadow-lg shadow-blue-200"
      >
        {isSubmitting ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Creating account...
          </>
        ) : (
          <>Create account <ArrowRight size={16} /></>
        )}
      </button>

      {/* Login Link */}
      <p className="text-center text-sm text-gray-500 pt-2">
        Already have an account?{' '}
        <Link href="/login" className="text-blue-600 font-semibold hover:underline">
          Sign in →
        </Link>
      </p>
    </form>
  )
}