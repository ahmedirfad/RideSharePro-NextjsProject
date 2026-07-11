'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { z } from 'zod'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import { ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react'

const schema = z.object({
  email:      z.string().email('Enter a valid email'),
  password:   z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean(),
})

type FormData = z.infer<typeof schema>

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

export default function LoginForm() {
  const [showPass,       setShowPass]       = useState(false)
  const [googleLoading,  setGoogleLoading]  = useState(false)
  const router  = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)

  const {
    register, handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    }
  })

  // ── Email/password login ──────────────────────────────
  const onSubmit = async (data: FormData) => {
    try {
      const res = await api.post('/auth/login', data)
      if (res.data.success) {
        setAuth(res.data.user, res.data.accessToken)
        router.replace(res.data.user.role === 'admin' ? '/admin/dashboard' : '/dashboard')
      } else {
        setError('root', { message: res.data.message || 'Login failed' })
      }
    } catch (err: any) {
      setError('root', {
        message: err?.response?.data?.message || 'Login failed. Try again.',
      })
    }
  }

  // ── Google Sign-In ────────────────────────────────────
  const handleGoogleLogin = () => {
    setGoogleLoading(true)

    const initGoogle = () => {
      if (!(window as any).google) {
        setGoogleLoading(false)
        setError('root', { message: 'Google Sign-In failed to load. Refresh and try again.' })
        return
      }

      ;(window as any).google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        callback: async (response: any) => {
          try {
            const res = await api.post('/auth/google', {
              idToken: response.credential,
            })

            if (res.data.success) {
              setAuth(res.data.user, res.data.accessToken)

              // New Google user without phone/gender → onboarding
              router.replace(res.data.user.role === 'admin' ? '/admin/dashboard' : '/dashboard')
            }
          } catch (err: any) {
            setError('root', {
              message: err?.response?.data?.message || 'Google login failed.',
            })
          } finally {
            setGoogleLoading(false)
          }
        },
      })

      
      ;(window as any).google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // One Tap wasn't shown — fall back to popup
          ;(window as any).google.accounts.id.renderButton(
            document.getElementById('google-btn-hidden')!,
            { theme: 'outline', size: 'large' }
          )
          document.getElementById('google-btn-hidden')?.click()
          setGoogleLoading(false)
        }
      })
    }

    if ((window as any).google) {
      initGoogle()
    } else {
      
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = initGoogle
      script.onerror = () => {
        setGoogleLoading(false)
        setError('root', { message: 'Could not load Google Sign-In.' })
      }
      document.head.appendChild(script)
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

      {/* Root error */}
      {errors.root && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
          {errors.root.message}
        </div>
      )}

      {/* Email */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">Email address</label>
        <input
          type="email" placeholder="ahmed@example.com" autoComplete="email"
          className={inputClass(!!errors.email)} {...register('email')}
        />
        {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
      </div>

      {/* Password */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">Password</label>
        <div className="relative">
          <input
            type={showPass ? 'text' : 'password'}
            placeholder="••••••••" autoComplete="current-password"
            className={`w-full h-11 pl-4 pr-11 rounded-xl border text-sm outline-none transition-all bg-white/90
              placeholder:text-gray-400 text-gray-900 focus:ring-2 focus:ring-blue-500/20 ${
              errors.password ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
            }`}
            {...register('password')}
          />
          <button type="button" onClick={() => setShowPass(!showPass)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
            {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
        {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
      </div>

      {/* Remember + Forgot */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 rounded accent-blue-600" {...register('rememberMe')} />
          <span className="text-sm text-gray-600">Remember me</span>
        </label>
        <Link href="/forgot-password" className="text-sm text-blue-600 font-medium hover:underline">
          Forgot password?
        </Link>
      </div>

      {/* Submit */}
      <button type="submit" disabled={isSubmitting}
        className="h-11 w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold hover:from-blue-700 hover:to-blue-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-1 shadow-lg shadow-blue-200">
        {isSubmitting ? (
          <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in...</>
        ) : (
          <>Sign in <ArrowRight size={16} /></>
        )}
      </button>

      {/* Divider */}
      <div className="relative flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 uppercase tracking-wide">or continue with</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* ✅ Google Sign-In button */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={googleLoading}
        className="h-11 w-full rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold transition-all flex items-center justify-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm hover:shadow-md active:scale-[0.99]"
      >
        {googleLoading ? (
          <><Loader2 size={16} className="animate-spin text-gray-400" />Connecting to Google...</>
        ) : (
          <><GoogleIcon />Continue with Google</>
        )}
      </button>

      {/* Hidden div for Google button fallback */}
      <div id="google-btn-hidden" className="hidden" />

      {/* Register link */}
      <p className="text-center text-sm text-gray-500 pt-1">
        Don't have an account?{' '}
        <Link href="/register" className="text-blue-600 font-semibold hover:underline">
          Create account →
        </Link>
      </p>
    </form>
  )
}