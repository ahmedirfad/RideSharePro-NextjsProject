'use client'

import { ReactNode, useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, Car, BookOpen, Wallet,
  AlertTriangle, BarChart2, Settings,
  LogOut, Bell, Search, ChevronDown, Menu, X,
  Zap, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'

const NAV = [
  { icon: LayoutDashboard, label: 'Dashboard',    href: '/admin' },
  { icon: Users,           label: 'Users',         href: '/admin/users'     },
  { icon: Car,             label: 'Trips',         href: '/admin/trips'     },
  { icon: BookOpen,        label: 'Bookings',      href: '/admin/bookings'  },
  { icon: Wallet,          label: 'Earnings',      href: '/admin/earnings'  },
  { icon: AlertTriangle,   label: 'Disputes',      href: '/admin/disputes', badge: 7 },
  { icon: BarChart2,       label: 'Analytics',     href: '/admin/analytics' },
  { icon: Settings,        label: 'Settings',      href: '/admin/settings'  },
]

const NOTIFS = [
  { icon: '🚗', text: 'New booking in Kochi — Trip #8921', time: '12:45', unread: true  },
  { icon: '⚠️', text: 'Dispute filed #RS-902 — Refund requested', time: '12:36', unread: true  },
  { icon: '✅', text: 'User "Anjali R." verified — KYC approved', time: '12:15', unread: false },
  { icon: '👤', text: 'Driver "Rahul S." joined — docs pending', time: '11:58', unread: false },
]

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname    = usePathname()
  const router      = useRouter()
  const { user, logout } = useAuthStore()
  const [collapsed, setCollapsed]   = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notifOpen, setNotifOpen]   = useState(false)
  const [userOpen, setUserOpen]     = useState(false)
  const [userData, setUserData]     = useState<any>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const userRef  = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
      if (userRef.current  && !userRef.current.contains(e.target as Node))  setUserOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get('/auth/me')
        if (res.data.success) {
          setUserData(res.data.user)
        }
      } catch (error) {
        console.error('Failed to fetch user data', error)
      }
    }
    fetchUser()
  }, [])

  const isActivePath = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin' || pathname === '/admin/'
    }
    return pathname.startsWith(href)
  }

  const currentPage = NAV.find(n => isActivePath(n.href))?.label || 'Admin'

  // Get user initials
  const getUserInitials = () => {
    const name = userData?.name || user?.name || 'Admin'
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getUserName = () => {
    return userData?.name || user?.name || 'Admin'
  }

  const getUserEmail = () => {
    return userData?.email || user?.email || 'admin@rideshare.pro'
  }

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      console.error('Logout error:', error)
    }
    logout()
    localStorage.removeItem('accessToken')
    router.push('/login')
  }

  return (
    <div className="h-screen flex bg-[#0f1117] text-white overflow-hidden" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes fadeDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        .dd-anim { animation: fadeDown .18s ease; }
        @keyframes badgePulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.2)} }
        .badge-pulse { animation: badgePulse 2s infinite; }
        .nav-item { position:relative; transition: all .18s; }
        .nav-item::before {
          content:''; position:absolute; inset:0;
          background: linear-gradient(135deg, rgba(37,99,235,0.15), rgba(37,99,235,0.08));
          border-radius:10px; opacity:0; transition:opacity .18s;
        }
        .nav-item:hover::before { opacity:1; }
        .nav-item.active::before { opacity:1; }
        .nav-item span, .nav-item svg { position:relative; z-index:1; }
        .scrollbar-hide::-webkit-scrollbar { display:none; }
        .scrollbar-hide { -ms-overflow-style:none; scrollbar-width:none; }
        .sidebar-inner {
          display: flex;
          flex-direction: column;
          height: 100vh;
          overflow: hidden;
        }
        .sidebar-nav {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
          scrollbar-width: thin;
        }
        .sidebar-nav::-webkit-scrollbar {
          width: 3px;
        }
        .sidebar-nav::-webkit-scrollbar-track {
          background: transparent;
        }
        .sidebar-nav::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 4px;
        }
        .sidebar-nav::-webkit-scrollbar-thumb:hover {
          background: #334155;
        }
        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          height: 100vh;
          overflow: hidden;
        }
        .main-scroll {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem;
        }
        .main-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .main-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .main-scroll::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 4px;
        }
        .main-scroll::-webkit-scrollbar-thumb:hover {
          background: #334155;
        }
      `}</style>

      {/* ── SIDEBAR ── */}
      <aside className={`
        bg-[#0a0d14] border-r border-white/5 shrink-0 z-30
        transition-all duration-300
        ${mobileOpen ? 'fixed inset-y-0 left-0 translate-x-0' : 'fixed inset-y-0 left-0 -translate-x-full lg:relative lg:translate-x-0'}
        ${collapsed ? 'w-[64px]' : 'w-[220px]'}
      `}>
        <div className="sidebar-inner">
          {/* Collapse toggle */}
          <button onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#1e2333] border border-white/10 rounded-full items-center justify-center shadow-lg text-gray-400 hover:text-white transition z-10">
            {collapsed ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
          </button>

          {/* Brand */}
          <div className={`flex items-center gap-2.5 px-4 h-[60px] border-b border-white/5 shrink-0 ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/50 shrink-0">
              <Car size={15} className="text-white" />
            </div>
            {!collapsed && (
              <div>
                <p className="font-bold text-[15px] text-white leading-none" style={{ fontFamily: "'Outfit',sans-serif" }}>
                  RideShare<span className="text-blue-400">Pro</span>
                </p>
                <p className="text-[9px] text-gray-500 font-semibold uppercase tracking-widest mt-0.5">Admin Console</p>
              </div>
            )}
          </div>

          {/* Nav - scrollable */}
          <nav className="sidebar-nav">
            <div className="space-y-0.5">
              {NAV.map(item => {
                const isActive = isActivePath(item.href)
                return (
                  <Link key={item.href} href={item.href}
                    title={collapsed ? item.label : undefined}
                    onClick={() => setMobileOpen(false)}
                    className={`nav-item flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm cursor-pointer ${
                      isActive ? 'active text-blue-400' : 'text-gray-400 hover:text-gray-200'
                    } ${collapsed ? 'justify-center' : ''}`}>
                    <item.icon size={17} className={isActive ? 'text-blue-400' : 'text-gray-500'} />
                    {!collapsed && (
                      <>
                        <span className={`flex-1 font-medium ${isActive ? 'font-semibold' : ''}`}>{item.label}</span>
                        {item.badge && (
                          <span className="badge-pulse bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none">
                            {item.badge}
                          </span>
                        )}
                        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />}
                      </>
                    )}
                    {collapsed && item.badge && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full badge-pulse" />
                    )}
                  </Link>
                )
              })}
            </div>
          </nav>

          {/* Pro badge */}
          {!collapsed && (
            <div className="mx-3 mb-2 bg-gradient-to-br from-blue-600/20 to-blue-800/20 border border-blue-500/20 rounded-xl p-3 shrink-0">
              <div className="flex items-center gap-1.5 mb-1">
                <Zap size={12} className="text-yellow-400" />
                <span className="text-[10px] font-black uppercase tracking-wider text-yellow-400">Enterprise</span>
              </div>
              <p className="text-[10px] text-gray-400 leading-relaxed">Full platform access · All features unlocked</p>
            </div>
          )}

          {/* Admin user - dynamic */}
          <div className={`p-3 border-t border-white/5 flex items-center gap-3 shrink-0 ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-xs shrink-0">
              {getUserInitials()}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white leading-none truncate">{getUserName()}</p>
                <p className="text-[10px] text-gray-500 mt-0.5 truncate">{getUserEmail()}</p>
              </div>
            )}
            {!collapsed && (
              <button onClick={handleLogout}
                className="text-gray-500 hover:text-red-400 transition p-1">
                <LogOut size={14} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* ── MAIN CONTENT ── */}
      <div className="main-content">
        {/* Topbar */}
        <header className="h-[60px] bg-[#0a0d14] border-b border-white/5 flex items-center px-4 sm:px-6 gap-4 shrink-0 sticky top-0 z-20">
          {/* Mobile menu toggle */}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden text-gray-400 hover:text-white transition">
            <Menu size={20} />
          </button>

          {/* Page title */}
          <div className="hidden sm:block">
            <p className="text-sm font-bold text-white" style={{ fontFamily: "'Outfit',sans-serif" }}>{currentPage}</p>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-md mx-auto">
            <div className="flex items-center gap-2 bg-white/5 border border-white/8 rounded-xl px-3 py-2 focus-within:border-blue-500/50 focus-within:bg-white/8 transition">
              <Search size={14} className="text-gray-500 shrink-0" />
              <input placeholder="Search fleet, users, or trips (Cmd+K)"
                className="bg-transparent border-none outline-none text-sm text-gray-300 placeholder-gray-600 flex-1 min-w-0" />
              <span className="text-[10px] text-gray-600 bg-white/5 px-1.5 py-0.5 rounded font-mono shrink-0">⌘K</span>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Notifications - same as before */}
            <div ref={notifRef} className="relative">
              <button onClick={() => { setNotifOpen(!notifOpen); setUserOpen(false) }}
                className="relative w-9 h-9 flex items-center justify-center bg-white/5 border border-white/8 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition">
                <Bell size={16} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full badge-pulse border border-[#0a0d14]" />
              </button>
              {notifOpen && (
                <div className="dd-anim absolute right-0 top-[calc(100%+8px)] w-80 bg-[#13172a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-white/5 flex justify-between items-center">
                    <span className="font-semibold text-white text-sm">Notifications</span>
                    <span className="text-xs text-blue-400 cursor-pointer hover:underline">Mark all read</span>
                  </div>
                  {NOTIFS.map((n, i) => (
                    <div key={i} className={`flex items-start gap-3 px-4 py-3 hover:bg-white/5 cursor-pointer transition ${n.unread ? 'bg-blue-500/5' : ''}`}>
                      <span className="text-base shrink-0 mt-0.5">{n.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-300 leading-relaxed">{n.text}</p>
                        <p className="text-[10px] text-gray-600 mt-0.5">{n.time}</p>
                      </div>
                      {n.unread && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 mt-1.5" />}
                    </div>
                  ))}
                  <div className="px-4 py-2.5 border-t border-white/5 text-center">
                    <span className="text-xs text-blue-400 cursor-pointer hover:underline">View audit logs →</span>
                  </div>
                </div>
              )}
            </div>

            {/* Admin avatar dropdown */}
            <div ref={userRef} className="relative">
              <button onClick={() => { setUserOpen(!userOpen); setNotifOpen(false) }}
                className="flex items-center gap-2 bg-white/5 border border-white/8 rounded-xl px-2.5 py-1.5 hover:bg-white/10 transition">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-xs">
                  {getUserInitials()}
                </div>
                <span className="hidden sm:block text-xs font-semibold text-white">{getUserName()}</span>
                <ChevronDown size={12} className={`text-gray-400 transition-transform hidden sm:block ${userOpen ? 'rotate-180' : ''}`} />
              </button>
              {userOpen && (
                <div className="dd-anim absolute right-0 top-[calc(100%+8px)] w-48 bg-[#13172a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-white/5">
                    <p className="text-sm font-semibold text-white">{getUserName()}</p>
                    <p className="text-xs text-gray-500 truncate">{getUserEmail()}</p>
                  </div>
                  <Link href="/admin/settings">
                    <div className="px-4 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 transition cursor-pointer">Settings</div>
                  </Link>
                  <button onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition">
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content - scrolls */}
        <div className="main-scroll">
          {children}
        </div>
      </div>
    </div>
  )
}