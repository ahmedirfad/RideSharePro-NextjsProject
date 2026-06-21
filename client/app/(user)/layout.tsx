'use client'

import { ReactNode, useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Calendar, Wallet, User,
  Settings, HelpCircle, Car, Search, Bell, LogOut,
  ChevronDown, Menu, X, MessageSquare, Loader2,
  Gauge,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useNotifications } from '@/hooks/useNotifications'
import { useSocket } from '@/hooks/useSocket'
import api from '@/lib/api'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard',   href: '/dashboard' },
  { icon: Car,             label: 'Host a Ride',  href: '/host' },
  { icon: Calendar,        label: 'My Trips',     href: '/trips' },
  { icon: Search,          label: 'Find a Ride',  href: '/search' },
  { icon: Wallet,          label: 'Earnings',     href: '/earnings' },
]

const userMenuItems = [
  { icon: User,       label: 'Profile',   href: '/profile' },
  { icon: Settings,   label: 'Settings',  href: '/settings' },
  { icon: HelpCircle, label: 'Help',      href: '/help' },
]

function timeAgo(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

export default function UserLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { logout, user, isAuthenticated, _hasHydrated } = useAuthStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [isChecking, setIsChecking] = useState(true)
  const [msgUnread, setMsgUnread] = useState(0)

  const notifRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)

  // ─── Socket & Notifications ────────────────────────────────────────────────
  const socket = useSocket()
  const { notifications, unreadCount: notifUnread, markRead, markAllRead } = useNotifications()

  // ─── Fetch message unread count ─────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return

    const fetchUnreadCount = async () => {
      try {
        const res = await api.get('/messages/unread')
        if (res.data.success) {
          setMsgUnread(res.data.data.totalUnread || 0)
        }
      } catch (error) {
        console.error('Failed to fetch unread count:', error)
      }
    }

    fetchUnreadCount()
  }, [isAuthenticated])

  // ─── Listen for new messages and notifications ─────────────────────────────
  useEffect(() => {
    if (!socket) return

    const handleNewNotification = (n: any) => {
      if (n.type === 'new_message') {
        setMsgUnread((c) => c + 1)
      }
    }

    const handleMessagesRead = () => {
      api.get('/messages/unread')
        .then(res => {
          if (res.data.success) {
            setMsgUnread(res.data.data.totalUnread || 0)
          }
        })
        .catch(() => {})
    }

    socket.on('new_notification', handleNewNotification)
    socket.on('messages_read', handleMessagesRead)

    return () => {
      socket.off('new_notification', handleNewNotification)
      socket.off('messages_read', handleMessagesRead)
    }
  }, [socket])

  // ─── Total unread for badge ─────────────────────────────────────────────────
  const totalUnread = notifUnread + msgUnread

  // ─── Check authentication ──────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!_hasHydrated) return
    if (!token && !isAuthenticated) {
      router.replace('/login')
    } else {
      setIsChecking(false)
    }
  }, [_hasHydrated, isAuthenticated, router])

  // ─── Fetch user data ───────────────────────────────────────────────────────
  useEffect(() => {
    if (isChecking) return
    const fetchUserData = async () => {
      try {
        const response = await api.get('/auth/me')
        if (response.data.success) {
          setUserData(response.data.user)
        }
      } catch (error) {
        console.error('Failed to fetch user data', error)
      }
    }
    fetchUserData()
  }, [isChecking])

  // ─── Click outside handlers ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const isAdmin = userData?.role === 'admin' || user?.role === 'admin'

  const getUserInitials = () => {
    const name = userData?.name || user?.name || 'User'
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getUserName = () => userData?.name || user?.name || 'Guest'
  const getUserEmail = () => userData?.email || user?.email || 'guest@example.com'

  // ─── Loading state ──────────────────────────────────────────────────────────
  if (!_hasHydrated || isChecking) {
    return (
      <div className="min-h-screen bg-[#f5f7fa] flex items-center justify-center">
        <Loader2 size={40} className="text-blue-500 animate-spin" />
      </div>
    )
  }

  const hasToken = typeof window !== 'undefined' && localStorage.getItem('accessToken')
  if (!hasToken && !isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes fadeDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes badgePulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.2)} }
        .dropdown-anim { animation: fadeDown 0.18s ease; }
        .badge-pulse { animation: badgePulse 2s infinite; }
        .nav-pill {
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
        .badge-anim {
          animation: badgePulse 2s infinite;
        }
      `}</style>

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

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-0.5">
              {navItems.map(item => {
                const isActive = pathname === item.href
                return (
                  <Link key={item.href} href={item.href}
                    className={`nav-pill ${isActive ? 'active' : ''}`}>
                    <item.icon size={15} />
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            {/* Right Side */}
            <div className="flex items-center gap-2 shrink-0">

              {/* Search */}
              <div className="hidden md:flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 w-48 focus-within:w-64 focus-within:border-blue-300 focus-within:bg-white transition-all duration-300">
                <Search size={13} className="text-gray-400 shrink-0" />
                <input placeholder="Search..." className="bg-transparent border-none outline-none text-sm flex-1 text-gray-700 placeholder-gray-400" />
              </div>

              {/* ─── MESSAGES ICON — navigates straight to /messages, no dropdown ─── */}
              <Link
                href="/messages"
                className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition text-gray-500 shrink-0"
              >
                <MessageSquare size={17} />
                {msgUnread > 0 && (
                  <span className="badge-anim absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                )}
              </Link>

              {/* ─── NOTIFICATIONS DROPDOWN ─── */}
              <div ref={notifRef} className="relative shrink-0">
                <button
                  onClick={() => { setNotifOpen(!notifOpen); setUserOpen(false) }}
                  className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition text-gray-500"
                >
                  <Bell size={17} />
                  {totalUnread > 0 && (
                    <span className="badge-anim absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                  )}
                </button>
                {notifOpen && (
                  <div className="dropdown-anim absolute right-0 top-[calc(100%+8px)] w-80 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                      <span className="font-semibold text-gray-900 text-sm">Notifications</span>
                      {notifUnread > 0 && (
                        <button
                          onClick={() => { markAllRead(); setNotifOpen(false) }}
                          className="text-xs text-blue-600 hover:underline font-medium"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-gray-400 text-sm">
                        <Bell size={24} className="mx-auto mb-2 text-gray-300" />
                        <p>No notifications yet</p>
                      </div>
                    ) : (
                      notifications.slice(0, 6).map((n: any) => (
                        <Link
                          key={n.id}
                          href={n.link || '#'}
                          onClick={() => { if (!n.read) markRead(n.id); setNotifOpen(false) }}
                          className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition ${!n.read ? 'bg-blue-50/40' : ''}`}
                        >
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs ${
                            n.type === 'booking_confirmed' ? 'bg-green-100 text-green-600' :
                            n.type === 'new_message'       ? 'bg-blue-100 text-blue-600' :
                            n.type === 'dispute_filed'     ? 'bg-red-100 text-red-600' :
                            n.type === 'trip_update'       ? 'bg-amber-100 text-amber-600' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {n.type === 'booking_confirmed' ? '✓' :
                             n.type === 'new_message'       ? '💬' :
                             n.type === 'dispute_filed'     ? '⚠' : '🔔'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-800">{n.title}</p>
                            <p className="text-xs text-gray-500 leading-relaxed">{n.body}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{timeAgo(n.createdAt)}</p>
                          </div>
                          {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />}
                        </Link>
                      ))
                    )}

                    {notifications.length > 6 && (
                      <div className="px-4 py-2.5 border-t border-gray-100 text-center">
                        <Link href="/notifications" className="text-xs text-blue-600 hover:underline">
                          View all notifications →
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ─── USER MENU ─── */}
              <div ref={userRef} className="relative shrink-0">
                <button
                  onClick={() => { setUserOpen(!userOpen); setNotifOpen(false) }}
                  className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 hover:bg-gray-100 transition cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0">
                    {getUserInitials()}
                  </div>
                  <span className="text-xs font-semibold text-gray-900 hidden sm:inline">{getUserName()}</span>
                  <ChevronDown size={12} className={`text-gray-400 transition-transform hidden sm:block ${userOpen ? 'rotate-180' : ''}`} />
                </button>
                {userOpen && (
                  <div className="dropdown-anim absolute right-0 top-[calc(100%+8px)] w-56 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="font-semibold text-gray-900 text-sm">{getUserName()}</p>
                      <p className="text-xs text-gray-400 truncate">{getUserEmail()}</p>
                      {isAdmin && (
                        <span className="inline-block mt-1 text-[9px] font-bold bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">
                          Admin
                        </span>
                      )}
                    </div>
                    {userMenuItems.map(item => (
                      <Link key={item.href} href={item.href} onClick={() => setUserOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition">
                        <item.icon size={15} className="text-gray-400" />
                        {item.label}
                      </Link>
                    ))}
                    <div className="border-t border-gray-100">
                      {isAdmin && (
                        <Link href="/admin" onClick={() => setUserOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-purple-700 hover:bg-purple-50 transition">
                          <Gauge size={15} className="text-purple-400" />
                          Admin Panel
                          <span className="ml-auto text-[8px] font-bold bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full">
                            ADMIN
                          </span>
                        </Link>
                      )}
                      <button
                        onClick={async () => {
                          try { await api.post('/auth/logout') } catch (error) { console.error('Logout error:', error) }
                          logout()
                          localStorage.removeItem('accessToken')
                          router.replace('/login')
                        }}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition w-full"
                      >
                        <LogOut size={15} />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile menu toggle */}
              <button onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition text-gray-500 shrink-0">
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
                </Link>
              )
            })}
            {isAdmin && (
              <Link href="/admin" onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-purple-600 hover:bg-purple-50 transition font-semibold">
                <Gauge size={16} />
                Admin Panel
                <span className="ml-auto text-[8px] font-bold bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full">
                  ADMIN
                </span>
              </Link>
            )}
            <Link href="/messages" onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition">
              <MessageSquare size={16} />
              Messages
              {msgUnread > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {msgUnread}
                </span>
              )}
            </Link>
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