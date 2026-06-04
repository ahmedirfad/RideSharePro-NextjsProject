'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Calendar, MessageSquare, Wallet, User, Settings, HelpCircle, Car, Search, Bell, LogOut } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Car, label: 'Host a Ride', href: '/host' },
  { icon: Calendar, label: 'My Trips', href: '/trips' },
  { icon: Search, label: 'Find a Ride', href: '/search' },
  { icon: MessageSquare, label: 'Messages', href: '/messages', badge: 3 },
  { icon: Wallet, label: 'Earnings', href: '/earnings' },
  { icon: User, label: 'Profile', href: '/profile' },
  { icon: Settings, label: 'Settings', href: '/settings' },
  { icon: HelpCircle, label: 'Help', href: '/help' },
]

export default function UserLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { logout } = useAuthStore()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* TOP NAVBAR */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Car size={16} color="white" />
            </div>
            <span className="font-bold text-xl text-gray-900">RideSharePro</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 w-64">
              <Search size={16} className="text-gray-400" />
              <input placeholder="Search..." className="bg-transparent border-none outline-none text-sm flex-1" />
            </div>
            <button className="relative p-2 rounded-lg hover:bg-gray-100">
              <Bell size={18} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">AI</div>
              <span className="hidden md:inline text-sm font-medium">Ahmed Irfad</span>
            </div>
          </div>
        </div>
      </header>

      {/* SIDEBAR + CONTENT */}
      <div className="flex">
        <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-65px)] sticky top-[65px]">
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                    isActive ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <item.icon size={18} />
                  {item.label}
                  {item.badge && (
                    <span className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
          <div className="absolute bottom-0 w-64 p-4 border-t border-gray-200">
            <button
              onClick={logout}
              className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-red-600 hover:bg-red-50 transition"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </aside>

        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}