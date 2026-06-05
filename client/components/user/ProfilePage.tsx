'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Star, ShieldCheck, Edit2, Share2, TrendingUp,
  Bell, CreditCard, Shield, Globe, HelpCircle,
  LogOut, ChevronRight, Mail, Phone, FileText,
  Sparkles, Camera, X, Check, Car, Search,
  MessageCircle, AlertCircle, Calendar, MapPin,
  Award, Clock
} from 'lucide-react'

// Types
interface Trip {
  route: string
  note: string
  role: 'HOST' | 'GUEST'
  date: string
  amount: string
}

// Mock Data
const RECENT_TRIPS: Trip[] = [
  { route: 'Kozhikode → Bangalore', note: 'Long trip', role: 'HOST', date: '15 May 2026', amount: '₹1,950' },
  { route: 'Kozhikode → Kochi', note: 'Short trip', role: 'GUEST', date: '10 May 2026', amount: '₹420' },
  { route: 'Bangalore → Mysore', note: 'Weekend trip', role: 'HOST', date: '05 May 2026', amount: '₹850' },
]

const SETTINGS_ITEMS = [
  { icon: Bell, label: 'Notifications', sub: 'Push, email & SMS alerts' },
  { icon: CreditCard, label: 'Payment Methods', sub: 'UPI, cards, wallets' },
  { icon: Shield, label: 'Privacy & Security', sub: '2FA, login history' },
  { icon: Globe, label: 'Language', sub: 'English (IN)' },
  { icon: HelpCircle, label: 'Support Center', sub: 'Help, FAQs, contact us' },
]

const VERIFICATION = [
  { icon: Mail, label: 'Email Address', status: 'verified' as const },
  { icon: Phone, label: 'Phone Number', status: 'verified' as const },
  { icon: FileText, label: 'Government ID', status: 'pending' as const },
]

// Sub-components
function Chip({ children, variant = 'blue' }: { children: React.ReactNode; variant?: 'blue' | 'green' | 'amber' | 'purple' | 'red' }) {
  const cls = {
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    amber: 'bg-amber-100 text-amber-700',
    purple: 'bg-purple-100 text-purple-700',
    red: 'bg-red-100 text-red-700',
  }[variant]
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide ${cls}`}>{children}</span>
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1 mt-1">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={12} className={i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
      ))}
      <span className="text-xs text-gray-400 ml-1">4.8 (52 reviews)</span>
    </div>
  )
}

function VerifPill({ status }: { status: 'verified' | 'pending' | 'missing' }) {
  const cfg = {
    verified: 'bg-green-100 text-green-700',
    pending: 'bg-amber-100 text-amber-700',
    missing: 'bg-red-100 text-red-700',
  }
  const label = { verified: 'Verified', pending: 'Pending', missing: 'Missing' }
  return <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full tracking-wide ${cfg[status]}`}>{label[status]}</span>
}

// Edit Modal
function EditModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-[500px] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 text-base">Edit Profile</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex flex-col items-center gap-2 mb-2">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white font-bold text-2xl flex items-center justify-center">
                AI
              </div>
              <div className="absolute bottom-0 right-0 w-6 h-6 bg-blue-600 border-2 border-white rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition">
                <Camera size={12} className="text-white" />
              </div>
            </div>
            <button className="text-xs text-blue-600 font-semibold">Change photo</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">First Name</label>
              <input defaultValue="Ahmed" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Last Name</label>
              <input defaultValue="Irfad" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Email Address</label>
            <input defaultValue="ahmed@ridesharepro.com" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Phone Number</label>
              <input defaultValue="+91 98765 43210" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Gender</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white">
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Date of Birth</label>
              <input type="date" defaultValue="1998-01-15" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Location</label>
              <input defaultValue="Kozhikode, Kerala" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
            </div>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
            Cancel
          </button>
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-1.5">
            <Check size={14} /> Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

// Main Component
export default function ProfilePage() {
  const [editOpen, setEditOpen] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    // Add logout logic here
    localStorage.removeItem('accessToken')
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <EditModal open={editOpen} onClose={() => setEditOpen(false)} />

      <div className="max-w-7xl mx-auto p-6">

        {/* Page Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
            <p className="text-gray-500 text-sm mt-1">Manage your profile and account settings</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button className="relative p-2 rounded-lg hover:bg-gray-100 transition">
              <Bell size={18} className="text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
          </div>
        </div>

        {/* Profile Header */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          <div className="flex flex-wrap items-start gap-6">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white font-bold text-3xl flex items-center justify-center shadow-lg">
                AI
              </div>
              <button
                onClick={() => setEditOpen(true)}
                className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 border-3 border-white rounded-full flex items-center justify-center hover:bg-blue-700 transition shadow-md"
              >
                <Camera size={14} className="text-white" />
              </button>
            </div>

            {/* User Info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-gray-900">Ahmed Irfad</h2>
                <Chip variant="blue">
                  <ShieldCheck size={10} className="inline mr-1" /> Verified
                </Chip>
                <Chip variant="green">⭐ 4.8 ★</Chip>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-3">
                <span className="flex items-center gap-1"><Mail size={14} /> ahmed@ridesharepro.com</span>
                <span className="flex items-center gap-1"><Phone size={14} /> +91 98765 43210</span>
                <span className="flex items-center gap-1"><MapPin size={14} /> Kozhikode, Kerala</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setEditOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
                >
                  <Edit2 size={14} /> Edit Profile
                </button>
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition">
                  <Share2 size={14} /> Share Profile
                </button>
              </div>
            </div>

            {/* Stats Quick View */}
            <div className="flex gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">12</div>
                <div className="text-xs text-gray-500">Trips Hosted</div>
              </div>
              <div className="w-px h-10 bg-gray-200" />
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">8</div>
                <div className="text-xs text-gray-500">Trips Taken</div>
              </div>
              <div className="w-px h-10 bg-gray-200" />
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">₹6,200</div>
                <div className="text-xs text-gray-500">Saved</div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Trips Hosted', value: '12', icon: Car, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Trips Taken', value: '8', icon: MapPin, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Total Saved', value: '₹6,200', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Rating', value: '4.8★', icon: Star, color: 'text-amber-600', bg: 'bg-amber-50' },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 shadow-sm">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                <stat.icon size={18} className={stat.color} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - 2 Columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-900">Personal Information</h3>
                <button onClick={() => setEditOpen(true)} className="text-sm text-blue-600 hover:underline">
                  Update
                </button>
              </div>
              <div className="grid grid-cols-2 gap-6">
                {[
                  { label: 'Full Name', value: 'Ahmed Irfad' },
                  { label: 'Email Address', value: 'ahmed@ridesharepro.com' },
                  { label: 'Phone Number', value: '+91 98765 43210' },
                  { label: 'Gender', value: 'Male' },
                  { label: 'Date of Birth', value: '15 January 1998' },
                  { label: 'Location', value: 'Kozhikode, Kerala' },
                ].map((field, i) => (
                  <div key={i}>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{field.label}</p>
                    <p className="text-sm font-medium text-gray-900">{field.value}</p>
                  </div>
                ))}
              </div>

              {/* Emergency Contact */}
              <div className="mt-6 pt-4 border-t border-gray-100">
                <p className="text-xs font-bold text-red-600 uppercase tracking-wide mb-3">Emergency Contact</p>
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-gray-900">Fatima Irfad</p>
                      <p className="text-sm text-gray-500">Mother · +91 98765 12345</p>
                    </div>
                    <button onClick={() => setEditOpen(true)} className="text-blue-600 hover:text-blue-700">
                      <Edit2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Trips */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-900">Recent Trips</h3>
                <Link href="/trips" className="text-sm text-blue-600 hover:underline">View All</Link>
              </div>
              <div className="space-y-3">
                {RECENT_TRIPS.map((trip, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900 text-sm">{trip.route}</span>
                        <Chip variant={trip.role === 'HOST' ? 'blue' : 'purple'}>{trip.role}</Chip>
                      </div>
                      <p className="text-xs text-gray-500">{trip.date} • {trip.note}</p>
                    </div>
                    <p className="font-bold text-gray-900">{trip.amount}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* AI Insights */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-5 text-white shadow-lg">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={18} className="text-yellow-300" />
                <h3 className="font-bold">AI Insights Summary</h3>
              </div>
              <p className="text-sm text-blue-100 leading-relaxed italic">
                "Ahmed is consistently praised for punctuality and friendly conversation. Passengers highlight his safe driving and clean vehicle."
              </p>
              <div className="flex gap-2 mt-4">
                <Chip variant="blue">Punctual</Chip>
                <Chip variant="green">Friendly</Chip>
                <Chip variant="amber">Clean</Chip>
              </div>
            </div>

            {/* Verification Status */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 text-sm">Verification Status</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {VERIFICATION.map((item, i) => {
                  const Icon = item.icon
                  return (
                    <div key={i} className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Icon size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-700">{item.label}</span>
                      </div>
                      <VerifPill status={item.status} />
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Account Settings */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 text-sm">Account Settings</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {SETTINGS_ITEMS.map((item, i) => {
                  const Icon = item.icon
                  return (
                    <div key={i} className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-gray-50 transition">
                      <div className="flex items-center gap-3">
                        <Icon size={16} className="text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{item.label}</p>
                          <p className="text-xs text-gray-400">{item.sub}</p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-gray-300" />
                    </div>
                  )
                })}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-5 py-3 text-red-600 hover:bg-red-50 transition text-left"
                >
                  <LogOut size={16} />
                  <span className="text-sm font-semibold">Log Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}