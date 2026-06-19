'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Car, Menu, X, LayoutDashboard, LogOut, ChevronDown, User, 
  Gauge, ShieldCheck, Settings, HelpCircle, Star, Calendar 
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

export function Navbar() {
  const [menuOpen,  setMenuOpen]  = useState(false)
  const [scrolled,  setScrolled]  = useState(false)
  const [dropOpen,  setDropOpen]  = useState(false)

  const router = useRouter()
  const { isAuthenticated, _hasHydrated, user, logout } = useAuthStore()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('#user-menu')) setDropOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleLogout = () => {
    logout()
    setDropOpen(false)
    setMenuOpen(false)
    router.replace('/')
  }

  // Check if user is admin - directly from store
  const isAdmin = user?.role === 'admin'

  // Avatar initials
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  // ── What to show on the right side ──────────────────────────────────────
  // Don't render auth buttons until hydration is done to avoid flicker
  const renderAuthSection = () => {
    // Still hydrating — render empty placeholder same width to avoid layout shift
    if (!_hasHydrated) {
      return <div className="w-[180px] h-9" />
    }

    // ── Logged in ──────────────────────────────────────────────────────────
    if (isAuthenticated) {
      return (
        <div className="hidden md:flex items-center gap-3">
          {/* Go to Dashboard */}
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 px-4 py-2 rounded-full hover:bg-blue-50 transition"
          >
            <LayoutDashboard size={15} />
            Dashboard
          </Link>

          {/* 👇 Admin Panel link - only for admins */}
          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-2 text-sm font-semibold text-purple-600 hover:text-purple-700 px-4 py-2 rounded-full hover:bg-purple-50 transition"
            >
              <Gauge size={15} />
              Admin
              <span className="text-[9px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full font-bold">ADMIN</span>
            </Link>
          )}

          {/* User avatar dropdown */}
          <div className="relative" id="user-menu">
            <button
              onClick={() => setDropOpen(!dropOpen)}
              className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border border-gray-200 hover:border-blue-300 hover:bg-gray-50 transition group"
            >
              <div className={`w-8 h-8 rounded-full text-white text-xs font-bold flex items-center justify-center ${
                isAdmin ? 'bg-gradient-to-br from-purple-600 to-purple-700' : 'bg-gradient-to-br from-blue-600 to-blue-700'
              }`}>
                {initials}
              </div>
              <span className="text-sm font-medium text-gray-700 max-w-[80px] truncate">
                {user?.name?.split(' ')[0] || 'Account'}
              </span>
              <ChevronDown
                size={14}
                className={`text-gray-400 transition-transform duration-200 ${dropOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Dropdown */}
            {dropOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-100 rounded-2xl shadow-xl shadow-gray-200/60 py-1.5 z-50 overflow-hidden">
                {/* User info */}
                <div className="px-4 py-3 border-b border-gray-50">
                  <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{user?.email}</p>
                  {isAdmin && (
                    <span className="inline-block mt-1.5 text-[9px] font-bold bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">
                      Admin
                    </span>
                  )}
                </div>

                <Link
                  href="/dashboard"
                  onClick={() => setDropOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition"
                >
                  <LayoutDashboard size={14} className="text-gray-400" />
                  Dashboard
                </Link>

                {/* 👇 Admin Panel link in dropdown */}
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setDropOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-purple-700 hover:bg-purple-50 hover:text-purple-800 transition"
                  >
                    <Gauge size={14} className="text-purple-400" />
                    Admin Panel
                    <span className="ml-auto text-[8px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full font-bold">ADMIN</span>
                  </Link>
                )}

                <Link
                  href="/profile"
                  onClick={() => setDropOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition"
                >
                  <User size={14} className="text-gray-400" />
                  My Profile
                </Link>

                <div className="border-t border-gray-50 mt-1 pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
                  >
                    <LogOut size={14} />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )
    }

    // ── Not logged in ──────────────────────────────────────────────────────
    return (
      <div className="hidden md:flex items-center gap-3">
        <Link
          href="/login"
          className="text-sm font-medium text-gray-600 hover:text-blue-600 transition px-4 py-2"
        >
          Sign in
        </Link>
        <Link
          href="/register"
          className="text-sm font-semibold bg-blue-600 text-white px-5 py-2.5 rounded-full hover:bg-blue-700 transition shadow-lg shadow-blue-200/60 hover:-translate-y-0.5"
        >
          Get Started
        </Link>
      </div>
    )
  }

  // ── Mobile menu auth section ───────────────────────────────────────────
  const renderMobileAuth = () => {
    if (!_hasHydrated) return null

    if (isAuthenticated) {
      return (
        <div className="space-y-2 pt-2 border-t border-gray-100">
          {/* User info strip */}
          <div className="flex items-center gap-3 py-2 px-1">
            <div className={`w-9 h-9 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0 ${
              isAdmin ? 'bg-gradient-to-br from-purple-600 to-purple-700' : 'bg-gradient-to-br from-blue-600 to-blue-700'
            }`}>
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
            {isAdmin && (
              <span className="text-[9px] font-bold bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full shrink-0">
                Admin
              </span>
            )}
          </div>

          <Link
            href="/dashboard"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2 w-full py-2.5 px-3 bg-blue-50 text-blue-700 rounded-xl text-sm font-semibold"
          >
            <LayoutDashboard size={15} /> Go to Dashboard
          </Link>

          {/* 👇 Admin Panel link in mobile menu */}
          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 w-full py-2.5 px-3 bg-purple-50 text-purple-700 rounded-xl text-sm font-semibold"
            >
              <Gauge size={15} /> Admin Panel
              <span className="ml-auto text-[8px] bg-purple-200 text-purple-700 px-1.5 py-0.5 rounded-full font-bold">ADMIN</span>
            </Link>
          )}

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full py-2.5 px-3 text-red-600 hover:bg-red-50 rounded-xl text-sm font-medium transition"
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      )
    }

    return (
      <div className="flex gap-3 pt-2 border-t border-gray-100">
        <Link
          href="/login"
          onClick={() => setMenuOpen(false)}
          className="flex-1 text-center py-2.5 border border-gray-200 rounded-full text-sm font-medium text-gray-700"
        >
          Sign in
        </Link>
        <Link
          href="/register"
          onClick={() => setMenuOpen(false)}
          className="flex-1 text-center py-2.5 bg-blue-600 text-white rounded-full text-sm font-semibold"
        >
          Get Started
        </Link>
      </div>
    )
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-white/90 backdrop-blur-xl shadow-sm border-b border-gray-100'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 group-hover:scale-105 transition">
            <Car className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-xl text-gray-900 tracking-tight">RideSharePro</span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-8">
          {['How it Works', 'Safety', 'Reviews'].map((label) => (
            <a
              key={label}
              href={`#${label.toLowerCase().replace(/\s/g, '-')}`}
              className="text-sm font-medium text-gray-500 hover:text-blue-600 transition relative group"
            >
              {label}
              <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300 rounded-full" />
            </a>
          ))}
        </nav>

        {/* Desktop auth section */}
        {renderAuthSection()}

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden p-2 rounded-xl text-gray-700"
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-5 py-6 space-y-4 shadow-xl">
          {['How it Works', 'Safety', 'Reviews'].map((label) => (
            <a
              key={label}
              href={`#${label.toLowerCase().replace(/\s/g, '-')}`}
              onClick={() => setMenuOpen(false)}
              className="block text-gray-700 font-medium py-2"
            >
              {label}
            </a>
          ))}
          {renderMobileAuth()}
        </div>
      )}
    </header>
  )
}