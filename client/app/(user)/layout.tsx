'use client'

import { ReactNode, useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Calendar, MessageSquare, Wallet, User,
  Settings, HelpCircle, Car, Search, Bell, LogOut,
  ChevronDown, Menu, X, Plus, Star, Shield, Clock,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard',   href: '/dashboard' },
  { icon: Car,             label: 'Host a Ride',  href: '/host' },
  { icon: Calendar,        label: 'My Trips',     href: '/trips' },
  { icon: Search,          label: 'Find a Ride',  href: '/search' },
  { icon: MessageSquare,   label: 'Messages',     href: '/messages', badge: 3 },
  { icon: Wallet,          label: 'Earnings',     href: '/earnings' },
]

const userMenuItems = [
  { icon: User,       label: 'Profile',   href: '/profile' },
  { icon: Settings,   label: 'Settings',  href: '/settings' },
  { icon: HelpCircle, label: 'Help',      href: '/help' },
]

const NOTIFICATIONS = [
  { icon: <Car size={12} />, text: 'Ravi Kumar accepted your ride request', time: '2m ago', unread: true },
  { icon: <MessageSquare size={12} />, text: 'New message from Sarah J.', time: '18m ago', unread: true },
  { icon: <Star size={12} />, text: 'You received a 5-star rating!', time: '1h ago', unread: false },
]

export default function UserLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { logout } = useAuthStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes fadeDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes badgePulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.2)} }
        .dropdown-anim { animation: fadeDown 0.18s ease; }
        .badge-pulse { animation: badgePulse 2s infinite; }
        .nav-pill {
          position: relative;
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 7px 13px;
          border-radius: 10px;
          font-size: 13.5px;
          font-weight: 500;
          color: #6b7280;
          transition: all 0.18s;
          white-space: nowrap;
        }
        .nav-pill:hover { background: #f3f4f6; color: #111827; }
        .nav-pill.active {
          background: #eff6ff;
          color: #2563eb;
          font-weight: 600;
        }
        .nav-pill.active::after {
          content: '';
          position: absolute;
          bottom: -14px;
          left: 50%;
          transform: translateX(-50%);
          width: 24px;
          height: 2.5px;
          background: #2563eb;
          border-radius: 2px;
        }
      `}</style>

      {/* TOP NAVBAR - ONLY NAVIGATION */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-[60px]">

            {/* Brand */}
            <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
              <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-200">
                <Car size={15} color="white" />
              </div>
              <span className="font-bold text-[17px] text-gray-900 tracking-tight hidden sm:block">
                RideShare<span className="text-blue-600">Pro</span>
              </span>
            </Link>

            {/* Desktop nav pills — centered */}
            <nav className="hidden lg:flex items-center gap-0.5 absolute left-1/2 -translate-x-1/2">
              {navItems.map(item => {
                const isActive = pathname === item.href
                return (
                  <Link key={item.href} href={item.href}
                    className={`nav-pill ${isActive ? 'active' : ''}`}>
                    <item.icon size={15} />
                    {item.label}
                    {item.badge && (
                      <span className="badge-pulse bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-2">

              {/* Search */}
              <div className="hidden md:flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 w-48 focus-within:w-64 focus-within:border-blue-300 focus-within:bg-white transition-all duration-300">
                <Search size={13} className="text-gray-400 shrink-0" />
                <input placeholder="Search..." className="bg-transparent border-none outline-none text-sm flex-1 text-gray-700 placeholder-gray-400 w-full" />
              </div>

              {/* Post Trip CTA */}
              <Link href="/host" className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white text-[13px] font-semibold rounded-xl hover:bg-blue-700 transition shadow-md shadow-blue-200/50">
                <Plus size={14} /> Post Trip
              </Link>

              {/* Notifications */}
              <div ref={notifRef} className="relative">
                <button onClick={() => { setNotifOpen(!notifOpen); setUserOpen(false) }}
                  className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition text-gray-500">
                  <Bell size={17} />
                  <span className="badge-pulse absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                </button>
                {notifOpen && (
                  <div className="dropdown-anim absolute right-0 top-[calc(100%+8px)] w-80 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                      <span className="font-semibold text-gray-900 text-sm">Notifications</span>
                      <span className="text-xs text-blue-600 font-medium cursor-pointer hover:underline">Mark all read</span>
                    </div>
                    {NOTIFICATIONS.map((n, i) => (
                      <div key={i} className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition ${n.unread ? 'bg-blue-50/40' : ''}`}>
                        <div className="text-gray-500 shrink-0 mt-0.5">{n.icon}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-700 leading-relaxed">{n.text}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{n.time}</p>
                        </div>
                        {n.unread && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />}
                      </div>
                    ))}
                    <div className="px-4 py-2.5 border-t border-gray-100 text-center">
                      <span className="text-xs text-blue-600 font-medium cursor-pointer hover:underline">View all</span>
                    </div>
                  </div>
                )}
              </div>

              {/* User menu */}
              <div ref={userRef} className="relative">
                <button onClick={() => { setUserOpen(!userOpen); setNotifOpen(false) }}
                  className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 hover:bg-gray-100 transition cursor-pointer">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                    AI
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-xs font-semibold text-gray-900 leading-none">Ahmed Irfad</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Passenger</p>
                  </div>
                  <ChevronDown size={12} className={`text-gray-400 transition-transform hidden md:block ${userOpen ? 'rotate-180' : ''}`} />
                </button>
                {userOpen && (
                  <div className="dropdown-anim absolute right-0 top-[calc(100%+8px)] w-52 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="font-semibold text-gray-900 text-sm">Ahmed Irfad</p>
                      <p className="text-xs text-gray-400">ahmed@example.com</p>
                    </div>
                    {userMenuItems.map(item => (
                      <Link key={item.href} href={item.href} onClick={() => setUserOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition">
                        <item.icon size={15} className="text-gray-400" />
                        {item.label}
                      </Link>
                    ))}
                    <div className="border-t border-gray-100">
                      <button onClick={logout}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition w-full">
                        <LogOut size={15} />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile menu toggle */}
              <button onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition text-gray-500">
                {mobileOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-0.5">
            {navItems.map(item => {
              const isActive = pathname === item.href
              return (
                <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${
                    isActive ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-600 hover:bg-gray-50'
                  }`}>
                  <item.icon size={16} />
                  {item.label}
                  {item.badge && (
                    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </header>

      {/* Page content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-7">
        {children}
      </main>
    </div>
  )
}