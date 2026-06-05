'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { z } from 'zod'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().default(false),
})

type FormData = z.infer<typeof schema>

export default function LoginForm() {
  const [showPass, setShowPass] = useState(false)
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    try {
      const res = await api.post('/auth/login', data)
      
      if (res.data.success) {
        setAuth(res.data.user, res.data.accessToken)
        
        const role = res.data.user.role
        if (role === 'admin') router.replace('/admin/dashboard')
        else router.replace('/dashboard')
      } else {
        setError('root', { message: res.data.message || 'Login failed' })
      }

    } catch (err: any) {
      setError('root', {
        message: err?.response?.data?.message || 'Login failed. Try again.',
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

      {/* Email */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">Email address</label>
        <input
          type="email"
          placeholder="ahmed@example.com"
          autoComplete="email"
          className={inputClass(!!errors.email)}
          {...register('email')}
        />
        {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
      </div>

      {/* Password */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">Password</label>
        <div className="relative">
          <input
            type={showPass ? 'text' : 'password'}
            placeholder="••••••••"
            autoComplete="current-password"
            className={`w-full ${inputClass(!!errors.password)} pr-11`}
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
      </div>

      {/* Remember Me & Forgot Password */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 rounded accent-blue-600"
            {...register('rememberMe')}
          />
          <span className="text-sm text-gray-600">Remember me</span>
        </label>
        <Link href="/forgot-password" className="text-sm text-blue-600 font-medium hover:underline">
          Forgot password?
        </Link>
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
            Signing in...
          </>
        ) : (
          <>Sign in <ArrowRight size={16} /></>
        )}
      </button>

      {/* Divider */}
      <div className="relative flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 uppercase tracking-wide">OR</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Social Login */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          className="h-11 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
        >
          <span className="text-base">G</span> Google
        </button>
        <button
          type="button"
          className="h-11 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
        >
          <span className="text-base">🍎</span> Apple
        </button>
      </div>

      {/* Register Link */}
      <p className="text-center text-sm text-gray-500 pt-2">
        Don't have an account?{' '}
        <Link href="/register" className="text-blue-600 font-semibold hover:underline">
          Create account →
        </Link>
      </p>
    </form>
  )
}