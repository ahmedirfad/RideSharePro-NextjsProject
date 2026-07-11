'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Star, ShieldCheck, Edit2, Share2, TrendingUp,
  Bell, CreditCard, Shield, Globe, HelpCircle,
  LogOut, ChevronRight, Mail, Phone, FileText,
  Sparkles, Camera, X, Check, Car, Search,
  MessageCircle, AlertCircle, Calendar, MapPin,
  Award, Clock, Loader2
} from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

// Types
interface RecentTrip {
  id?: string
  route: string
  segment?: string
  note: string
  role: 'HOST' | 'GUEST'
  date: string
  amount: string
  fromName?: string
  toName?: string
  seatNumber?: number
}

interface UserData {
  _id: string
  name: string
  email: string
  phone: string
  gender: string
  profilePhoto?: string
  isEmailVerified: boolean
  isVerified: boolean
  rating: number
  totalRatings: number
  emergencyContact?: string
  location?: string
  dateOfBirth?: string
  createdAt: string
}

const SETTINGS_ITEMS = [
  { icon: Bell, label: 'Notifications', sub: 'Push, email & SMS alerts', href: '/settings' },
  { icon: CreditCard, label: 'Payment Methods', sub: 'UPI, cards, wallets', href: '/settings/payments' },
  { icon: Shield, label: 'Privacy & Security', sub: '2FA, login history', href: '/settings/security' },
  { icon: Globe, label: 'Language', sub: 'English (IN)', href: '/settings/language' },
  { icon: HelpCircle, label: 'Support Center', sub: 'Help, FAQs, contact us', href: '/support' },
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

function StarRating({ rating, totalReviews }: { rating: number; totalReviews: number }) {
  return (
    <div className="flex items-center gap-1 mt-1">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={12} className={i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
      ))}
      <span className="text-xs text-gray-400 ml-1">{rating.toFixed(1)} ({totalReviews} reviews)</span>
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
function EditModal({ open, onClose, user, onSave }: { 
  open: boolean; 
  onClose: () => void; 
  user: UserData | null;
  onSave: (data: any) => Promise<void>;
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [gender, setGender] = useState('')
  const [location, setLocation] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [emergencyContact, setEmergencyContact] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setEmail(user.email || '')
      setPhone(user.phone || '')
      setGender(user.gender || 'male')
      setLocation(user.location || '')
      setDateOfBirth(user.dateOfBirth || '')
      setEmergencyContact(user.emergencyContact || '')
    }
  }, [user])

  const handleSave = async () => {
    setSaving(true)
    await onSave({ name, email, phone, gender, location, dateOfBirth, emergencyContact })
    setSaving(false)
    onClose()
  }

  if (!open) return null

  const nameParts = name.split(' ')
  const firstName = nameParts[0] || ''
  const lastName = nameParts.slice(1).join(' ') || ''

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
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
                {name.slice(0, 2).toUpperCase()}
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
              <input 
                value={firstName}
                onChange={(e) => setName(e.target.value + ' ' + lastName)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition" 
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Last Name</label>
              <input 
                value={lastName}
                onChange={(e) => setName(firstName + ' ' + e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition" 
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Email Address</label>
            <input 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition" 
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Phone Number</label>
              <input 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition" 
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Gender</label>
              <select 
                value={gender} 
                onChange={(e) => setGender(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white">
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Date of Birth</label>
              <input 
                type="date" 
                value={dateOfBirth} 
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition" 
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Location</label>
              <input 
                value={location} 
                onChange={(e) => setLocation(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition" 
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Emergency Contact</label>
            <input 
              value={emergencyContact} 
              onChange={(e) => setEmergencyContact(e.target.value)}
              placeholder="Name · Relationship · Phone"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition" 
            />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-1.5 disabled:bg-blue-400"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} 
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

// Main Component
export default function ProfilePage() {
  const router = useRouter()
  const { user: authUser, isAuthenticated, logout } = useAuthStore()
  const [editOpen, setEditOpen] = useState(false)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [recentTrips, setRecentTrips] = useState<RecentTrip[]>([])
  const [stats, setStats] = useState({ hosted: 0, taken: 0, saved: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(false)

  const fetchUserData = async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      // Fetch user profile
      const userRes = await api.get('/auth/me')
      if (userRes.data.success) {
        setUserData(userRes.data.user)
      }

      // FIXED: Correct endpoint - /trips/my-trips/all (NOT /trips/trips/all)
      const tripsRes = await api.get('/trips/my-trips/all')
      if (tripsRes.data.success) {
        const allTrips = tripsRes.data.data.all || []
        const hostedTrips = allTrips.filter((t: any) => t.role === 'HOST')
        const guestTrips = allTrips.filter((t: any) => t.role === 'GUEST')
        const totalEarned = hostedTrips.reduce((sum: number, t: any) => {
          const amount = parseInt(t.amount.replace('₹', '')) || 0
          return sum + amount
        }, 0)

        setStats({
          hosted: hostedTrips.length,
          taken: guestTrips.length,
          saved: totalEarned,
        })

        // Get recent trips (last 3) with segment info
        const recent = allTrips.slice(0, 3).map((t: any) => ({
          id: t.id,
          route: t.route,
          segment: t.segment || (t.fromName && t.toName ? `${t.fromName} → ${t.toName}` : null),
          note: t.status === 'COMPLETED' ? 'Completed' : t.status === 'UPCOMING' ? 'Upcoming' : 'Confirmed',
          role: t.role,
          date: t.date,
          amount: t.amount,
          fromName: t.fromName,
          toName: t.toName,
          seatNumber: t.seatNumber,
        }))
        setRecentTrips(recent)
      }
    } catch (error: any) {
      console.error('Failed to fetch user data', error)
      if (error.response?.status === 401) {
        logout()
        router.push('/login')
      }
      setError(error.response?.data?.message || 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUserData()
  }, [isAuthenticated])

  const handleUpdateProfile = async (formData: any) => {
    if (!userData) return
    
    setUpdating(true)
    try {
      const response = await api.put(`/auth/users/${userData._id}`, formData)
      if (response.data.success) {
        setUserData(response.data.user)
      }
    } catch (error: any) {
      console.error('Failed to update profile', error)
      alert(error.response?.data?.message || 'Failed to update profile')
    } finally {
      setUpdating(false)
    }
  }

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      logout()
      localStorage.removeItem('accessToken')
      router.push('/login')
    }
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Not set'
    return new Date(dateStr).toLocaleDateString('en-US', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    })
  }

  if (!isAuthenticated && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Not Signed In</h2>
          <p className="text-gray-500 mb-4">Please login to view your profile</p>
          <Link href="/login">
            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition">
              Login
            </button>
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={40} className="text-blue-500 animate-spin" />
          <p className="text-gray-500 text-sm">Loading profile...</p>
        </div>
      </div>
    )
  }

  const displayUser = (userData || authUser) as any
  const userRating = displayUser?.rating || 0
  const totalRatings = displayUser?.totalRatings || 0

  return (
    <div className="min-h-screen bg-gray-50">
      <EditModal 
        open={editOpen} 
        onClose={() => setEditOpen(false)} 
        user={userData}
        onSave={handleUpdateProfile}
      />

      <div className="max-w-7xl mx-auto p-6">

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
            <p className="text-gray-500 text-sm mt-1">Manage your profile and account settings</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <Link href="/settings" className="shrink-0">
              <button className="relative p-2 rounded-lg hover:bg-gray-100 transition">
                <Bell size={18} className="text-gray-600" />
              </button>
            </Link>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-600 text-sm">{error}</p>
            <button onClick={fetchUserData} className="mt-2 text-red-600 text-xs hover:underline">
              Try again
            </button>
          </div>
        )}

        {/* Profile Header */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-6">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white font-bold text-3xl flex items-center justify-center shadow-lg">
                {displayUser?.name?.slice(0, 2).toUpperCase() || 'U'}
              </div>
              <button
                onClick={() => setEditOpen(true)}
                className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 border-3 border-white rounded-full flex items-center justify-center hover:bg-blue-700 transition shadow-md"
              >
                <Camera size={14} className="text-white" />
              </button>
            </div>

            {/* User Info */}
            <div className="flex-1 w-full">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mb-2">
                <h2 className="text-2xl font-bold text-gray-900">{displayUser?.name || 'User'}</h2>
                {displayUser?.isEmailVerified && (
                  <Chip variant="blue">
                    <ShieldCheck size={10} className="inline mr-1" /> Verified
                  </Chip>
                )}
                {userRating > 0 && (
                  <Chip variant="green">⭐ {userRating.toFixed(1)} ★</Chip>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-sm text-gray-500 mb-3">
                <span className="flex items-center gap-1"><Mail size={14} /> {displayUser?.email}</span>
                <span className="flex items-center gap-1"><Phone size={14} /> {displayUser?.phone}</span>
                <span className="flex items-center gap-1"><MapPin size={14} /> {displayUser?.location || 'Location not set'}</span>
              </div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
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
            <div className="flex justify-center sm:justify-start gap-4 w-full sm:w-auto border-t sm:border-t-0 border-gray-100 pt-4 sm:pt-0 shrink-0">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{stats.hosted}</div>
                <div className="text-xs text-gray-500">Trips Hosted</div>
              </div>
              <div className="w-px h-10 bg-gray-200" />
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{stats.taken}</div>
                <div className="text-xs text-gray-500">Trips Taken</div>
              </div>
              <div className="w-px h-10 bg-gray-200" />
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">₹{stats.saved.toLocaleString()}</div>
                <div className="text-xs text-gray-500">Earned</div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Trips Hosted', value: stats.hosted.toString(), icon: Car, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Trips Taken', value: stats.taken.toString(), icon: MapPin, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Total Earned', value: `₹${stats.saved.toLocaleString()}`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Rating', value: userRating > 0 ? `${userRating.toFixed(1)}★` : 'New', icon: Star, color: 'text-amber-600', bg: 'bg-amber-50' },
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
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-900">Personal Information</h3>
                <button onClick={() => setEditOpen(true)} className="text-sm text-blue-600 hover:underline">
                  Update
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                  { label: 'Full Name', value: displayUser?.name || 'Not set' },
                  { label: 'Email Address', value: displayUser?.email || 'Not set' },
                  { label: 'Phone Number', value: displayUser?.phone || 'Not set' },
                  { label: 'Gender', value: displayUser?.gender ? displayUser.gender.charAt(0).toUpperCase() + displayUser.gender.slice(1) : 'Not set' },
                  { label: 'Date of Birth', value: formatDate(displayUser?.dateOfBirth) },
                  { label: 'Location', value: displayUser?.location || 'Not set' },
                ].map((field, i) => (
                  <div key={i}>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{field.label}</p>
                    <p className="text-sm font-medium text-gray-900 break-all">{field.value}</p>
                  </div>
                ))}
              </div>

              {/* Emergency Contact */}
              <div className="mt-6 pt-4 border-t border-gray-100">
                <p className="text-xs font-bold text-red-600 uppercase tracking-wide mb-3">Emergency Contact</p>
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {displayUser?.emergencyContact?.split('·')[0]?.trim() || 'Not set'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {displayUser?.emergencyContact || 'Add emergency contact in settings'}
                      </p>
                    </div>
                    <button onClick={() => setEditOpen(true)} className="text-blue-600 hover:text-blue-700">
                      <Edit2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Trips with Segment Display */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-900">Recent Trips</h3>
                <Link href="/trips" className="text-sm text-blue-600 hover:underline">View All</Link>
              </div>
              {recentTrips.length > 0 ? (
                <div className="space-y-3">
                  {recentTrips.map((trip, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {/* Show segment for guest trips if available */}
                          {trip.role === 'GUEST' && trip.segment && trip.segment !== trip.route ? (
                            <>
                              <span className="font-semibold text-gray-900 text-sm">{trip.segment}</span>
                              <Chip variant="green">Your journey</Chip>
                              <Chip variant="purple">{trip.role}</Chip>
                            </>
                          ) : (
                            <>
                              <span className="font-semibold text-gray-900 text-sm">{trip.route}</span>
                              <Chip variant={trip.role === 'HOST' ? 'blue' : 'purple'}>{trip.role}</Chip>
                            </>
                          )}
                        </div>
                        {/* Show full route as subtext for guest segments */}
                        {trip.role === 'GUEST' && trip.segment && trip.segment !== trip.route && (
                          <p className="text-[10px] text-gray-400 mb-1">
                            Full route: {trip.route}
                          </p>
                        )}
                        {/* Show seat number for guest trips */}
                        {trip.role === 'GUEST' && trip.seatNumber && (
                          <p className="text-[10px] text-blue-500 mb-1">
                            Seat {trip.seatNumber}
                          </p>
                        )}
                        <p className="text-xs text-gray-500">{trip.date} • {trip.note}</p>
                      </div>
                      <p className="font-bold text-gray-900">{trip.amount}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Car size={32} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No trips yet</p>
                  <Link href="/search">
                    <button className="mt-2 text-blue-600 text-sm hover:underline">
                      Book your first ride →
                    </button>
                  </Link>
                </div>
              )}
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
                {stats.hosted > 0 
                  ? `You've completed ${stats.hosted} trips as a host. Keep up the great work! Passengers appreciate reliable drivers.`
                  : "You're new here! Start hosting or booking trips to build your profile and earn rewards."}
              </p>
              <div className="flex gap-2 mt-4">
                {stats.hosted > 0 ? (
                  <>
                    <Chip variant="blue">Reliable</Chip>
                    <Chip variant="green">Active</Chip>
                    <Chip variant="amber">Growing</Chip>
                  </>
                ) : (
                  <>
                    <Chip variant="blue">New Member</Chip>
                    <Chip variant="green">Ready to Ride</Chip>
                  </>
                )}
              </div>
            </div>

            {/* Verification Status */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 text-sm">Verification Status</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {([
                  { icon: Mail, label: 'Email Address', status: displayUser?.isEmailVerified ? 'verified' : 'pending' },
                  { icon: Phone, label: 'Phone Number', status: displayUser?.phone ? 'verified' : 'pending' },
                  { icon: FileText, label: 'Government ID', status: 'pending' },
                ] as const).map((item, i) => {
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
                    <Link key={i} href={item.href}>
                      <div className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-gray-50 transition">
                        <div className="flex items-center gap-3">
                          <Icon size={16} className="text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{item.label}</p>
                            <p className="text-xs text-gray-400">{item.sub}</p>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-gray-300" />
                      </div>
                    </Link>
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