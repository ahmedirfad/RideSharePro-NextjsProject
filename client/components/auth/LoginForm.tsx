'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { z } from 'zod'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'

const schema = z.object({
  email:      z.string().email('Enter a valid email'),
  password:   z.string().min(6, 'Min 6 characters'),
  rememberMe: z.boolean().default(false),
})

type FormData = z.infer<typeof schema>

export default function LoginForm() {
  const [showPass, setShowPass] = useState(false)
  const router    = useRouter()
  const setAuth   = useAuthStore((s) => s.setAuth)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    try {
      const res = await api.post('/auth/login', data)
      setAuth(res.data.data.user, res.data.data.accessToken)

      const role = res.data.data.user.role
      if (role === 'admin') router.replace('/admin/dashboard')
      else                  router.replace('/dashboard')

    } catch (err: any) {
      setError('root', {
        message: err?.response?.data?.message
          || 'Login failed. Try again.',
      })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-5">

      {/* Root error */}
      {errors.root && (
        <div className="bg-red-50 border border-red-200
                        rounded-lg px-4 py-3
                        text-red-600 text-sm">
          {errors.root.message}
        </div>
      )}

      {/* Email */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">
          Email address
        </label>
        <input
          type="email"
          placeholder="name@example.com"
          autoComplete="email"
          className={`h-11 px-4 rounded-lg border text-sm
                      outline-none transition-all bg-white
                      placeholder:text-gray-400 text-gray-900
                      focus:ring-2 focus:ring-primary-500/20
                      ${errors.email
                        ? 'border-red-400 focus:border-red-500'
                        : 'border-gray-200 focus:border-primary-500'
                      }`}
          {...register('email')}
        />
        {errors.email && (
          <p className="text-xs text-red-500">
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Password */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">
          Password
        </label>
        <div className="relative">
          <input
            type={showPass ? 'text' : 'password'}
            placeholder="••••••••"
            autoComplete="current-password"
            className={`w-full h-11 pl-4 pr-11 rounded-lg
                        border text-sm outline-none
                        transition-all bg-white
                        placeholder:text-gray-400 text-gray-900
                        focus:ring-2 focus:ring-primary-500/20
                        ${errors.password
                          ? 'border-red-400 focus:border-red-500'
                          : 'border-gray-200 focus:border-primary-500'
                        }`}
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute right-3 top-1/2 -translate-y-1/2
                       text-gray-400 hover:text-gray-600
                       text-xs transition-colors"
          >
            {showPass ? 'Hide' : 'Show'}
          </button>
        </div>
        {errors.password && (
          <p className="text-xs text-red-500">
            {errors.password.message}
          </p>
        )}
      </div>

      {/* Remember me + forgot */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 rounded accent-primary-500"
            {...register('rememberMe')}
          />
          <span className="text-sm text-gray-600">
            Remember me
          </span>
        </label>
        <Link href="/forgot-password"
          className="text-sm text-primary-500 font-medium
                     hover:underline transition-colors">
          Forgot password?
        </Link>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="h-11 w-full rounded-lg bg-primary-500
                   text-white text-sm font-semibold
                   hover:bg-primary-600 active:bg-primary-700
                   disabled:opacity-60 disabled:cursor-not-allowed
                   transition-colors flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30
                            border-t-white rounded-full animate-spin" />
            Signing in...
          </>
        ) : 'Login'}
      </button>

      {/* Divider */}
      <div className="relative flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 uppercase tracking-wide">
          OR
        </span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Social */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          className="h-11 rounded-lg border border-gray-200
                     bg-white text-gray-700 text-sm font-medium
                     hover:bg-gray-50 transition-colors
                     flex items-center justify-center gap-2"
        >
          <span className="text-base">G</span>
          Google
        </button>
        <button
          type="button"
          className="h-11 rounded-lg border border-gray-200
                     bg-white text-gray-700 text-sm font-medium
                     hover:bg-gray-50 transition-colors
                     flex items-center justify-center gap-2"
        >
          <span className="text-base">🍎</span>
          Apple
        </button>
      </div>

      {/* Register link */}
      <p className="text-center text-sm text-gray-500">
        Don't have an account?{' '}
        <Link href="/register"
          className="text-primary-500 font-semibold hover:underline">
          Create account
        </Link>
      </p>

    </form>
  )
}