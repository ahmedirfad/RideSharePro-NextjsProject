'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Car, Calendar, Users, ChevronRight, Eye, 
  Star, XCircle, CheckCircle, Clock, AlertCircle,
  Download, Search, Filter, MapPin, Phone, MessageCircle
} from 'lucide-react'
import api from '@/lib/api'

// Types
interface Passenger {
  name: string
  avatar: string
  seats: number
  phone?: string
  pickup?: string
}

interface Trip {
  id: string
  route: string
  role: 'HOST' | 'GUEST'
  date: string
  time: string
  status: 'UPCOMING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'ONGOING'
  seats: { booked: number; total: number }
  amount: string
  passengers?: Passenger[]
  driver?: { name: string; avatar: string; rating: number }
  canReview?: boolean
  canTrack?: boolean
}

const statusConfig = {
  UPCOMING: { label: 'Upcoming', color: 'bg-amber-100 text-amber-700', icon: Clock },
  CONFIRMED: { label: 'Confirmed', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  COMPLETED: { label: 'Completed', color: 'bg-gray-100 text-gray-600', icon: CheckCircle },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-600', icon: XCircle },
  ONGOING: { label: 'Ongoing', color: 'bg-blue-100 text-blue-700', icon: MapPin },
}

const roleConfig = {
  HOST: { label: 'Host', color: 'bg-blue-100 text-blue-700' },
  GUEST: { label: 'Guest', color: 'bg-purple-100 text-purple-700' },
}

// Mock data (replace with API call)
const mockTrips: Trip[] = [
  {
    id: 'TRP-1042',
    route: 'Kozhikode → Bangalore',
    role: 'HOST',
    date: 'May 18, 2026',
    time: '6:00 AM',
    status: 'UPCOMING',
    seats: { booked: 3, total: 4 },
    amount: '₹1,950',
    passengers: [
      { name: 'Priya Sharma', avatar: 'PS', seats: 2, phone: '+91 98765 00001', pickup: 'Calicut University Gate' },
      { name: 'Rahul Menon', avatar: 'RM', seats: 1, phone: '+91 98765 00002', pickup: 'Medical College' },
    ],
  },
  {
    id: 'TRP-1041',
    route: 'Kozhikode → Kochi',
    role: 'GUEST',
    date: 'May 18, 2026',
    time: '8:00 AM',
    status: 'CONFIRMED',
    seats: { booked: 1, total: 1 },
    amount: '₹420',
    driver: { name: 'Meera Nair', avatar: 'MN', rating: 4.7 },
  },
  {
    id: 'TRP-1045',
    route: 'Kozhikode → Bangalore',
    role: 'GUEST',
    date: 'Today',
    time: '6:00 AM',
    status: 'ONGOING',
    seats: { booked: 1, total: 1 },
    amount: '₹650',
    driver: { name: 'Arjun Kumar', avatar: 'AK', rating: 4.8 },
    canTrack: true,
  },
  {
    id: 'TRP-1040',
    route: 'Kozhikode → Bangalore',
    role: 'HOST',
    date: 'May 10, 2026',
    time: '6:00 AM',
    status: 'COMPLETED',
    seats: { booked: 4, total: 4 },
    amount: '₹2,600',
    canReview: true,
  },
  {
    id: 'TRP-1039',
    route: 'Kozhikode → Chennai',
    role: 'GUEST',
    date: 'May 5, 2026',
    time: '7:30 AM',
    status: 'COMPLETED',
    seats: { booked: 1, total: 1 },
    amount: '₹380',
    canReview: true,
  },
  {
    id: 'TRP-1038',
    route: 'Kozhikode → Mysore',
    role: 'GUEST',
    date: 'April 28, 2026',
    time: '9:00 AM',
    status: 'CANCELLED',
    seats: { booked: 1, total: 1 },
    amount: '₹0',
  },
  {
    id: 'TRP-1037',
    route: 'Kozhikode → Coimbatore',
    role: 'HOST',
    date: 'April 25, 2026',
    time: '7:00 AM',
    status: 'COMPLETED',
    seats: { booked: 3, total: 3 },
    amount: '₹1,440',
    canReview: false,
  },
]

export default function MyTrips() {
  const [activeTab, setActiveTab] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [trips, setTrips] = useState<Trip[]>(mockTrips)
  const [loading, setLoading] = useState(false)
  const [ratingTripId, setRatingTripId] = useState<string | null>(null)
  const [ratingValue, setRatingValue] = useState(5)
  const [ratingComment, setRatingComment] = useState('')

  // Fetch trips from API (uncomment when backend ready)
  // useEffect(() => {
  //   const fetchTrips = async () => {
  //     setLoading(true)
  //     try {
  //       const res = await api.get('/trips/my-trips')
  //       setTrips(res.data.data)
  //     } catch (error) {
  //       console.error('Failed to fetch trips', error)
  //     } finally {
  //       setLoading(false)
  //     }
  //   }
  //   fetchTrips()
  // }, [])

  const tabs = [
    { id: 'all', label: 'All Trips', count: trips.length },
    { id: 'host', label: 'Hosting', count: trips.filter(t => t.role === 'HOST').length },
    { id: 'guest', label: 'Travelling', count: trips.filter(t => t.role === 'GUEST').length },
    { id: 'past', label: 'Past', count: trips.filter(t => t.status === 'COMPLETED' || t.status === 'CANCELLED').length },
  ]

  const filteredTrips = trips.filter(trip => {
    if (activeTab === 'host' && trip.role !== 'HOST') return false
    if (activeTab === 'guest' && trip.role !== 'GUEST') return false
    if (activeTab === 'past' && trip.status !== 'COMPLETED' && trip.status !== 'CANCELLED') return false
    if (statusFilter !== 'all' && trip.status !== statusFilter) return false
    if (searchTerm && !trip.route.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const handleCancel = async (tripId: string) => {
    if (!confirm('Are you sure you want to cancel this trip?')) return
    // await api.put(`/trips/${tripId}/cancel`)
    alert(`Trip ${tripId} cancelled`)
    setTrips(prev => prev.map(t => 
      t.id === tripId ? { ...t, status: 'CANCELLED' as Trip['status'] } : t
    ))
  }

  const handleRate = async (tripId: string) => {
    // await api.post(`/trips/${tripId}/review`, { rating: ratingValue, comment: ratingComment })
    alert(`Rated trip ${tripId}: ${ratingValue} stars`)
    setRatingTripId(null)
    setRatingValue(5)
    setRatingComment('')
    setTrips(prev => prev.map(t => 
      t.id === tripId ? { ...t, canReview: false } : t
    ))
  }

  const handleExport = () => {
    // Export trips as CSV
    const headers = ['ID', 'Route', 'Role', 'Date', 'Time', 'Status', 'Amount']
    const csvData = filteredTrips.map(t => [t.id, t.route, t.role, t.date, t.time, t.status, t.amount])
    const csv = [headers, ...csvData].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `my-trips-${new Date().toISOString()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Trips</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your hosted and booked trips</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-gray-200 mb-5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${
              activeTab === tab.id
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-5">
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by route..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-64 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
          >
            <option value="all">All Status</option>
            <option value="UPCOMING">Upcoming</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="ONGOING">Ongoing</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
        <button 
          onClick={handleExport}
          className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
        >
          <Download size={14} />
          Export
        </button>
      </div>

      {/* Trips List */}
      <div className="space-y-3">
        {filteredTrips.map((trip) => {
          const StatusIcon = statusConfig[trip.status]?.icon || AlertCircle
          const status = statusConfig[trip.status] || { label: trip.status, color: 'bg-gray-100 text-gray-600' }
          const role = roleConfig[trip.role] || { label: trip.role, color: 'bg-gray-100 text-gray-600' }

          return (
            <div key={trip.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition overflow-hidden">
              <div className="p-4">
                {/* Header Row */}
                <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-400 font-mono">{trip.id}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${role.color}`}>
                      {role.label}
                    </span>
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                      <StatusIcon size={10} />
                      {status.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Track Live button for ongoing trips */}
                    {trip.canTrack && trip.status === 'ONGOING' && (
                      <Link href={`/active-trip/${trip.id}`}>
                        <button className="px-2 py-1 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition">
                          Track Live
                        </button>
                      </Link>
                    )}
                    <Link href={`/trip/${trip.id}`} className="text-blue-600 text-sm hover:underline flex items-center gap-1">
                      Details <ChevronRight size={14} />
                    </Link>
                  </div>
                </div>

                {/* Route */}
                <div className="mb-3">
                  <h3 className="font-semibold text-gray-900">{trip.route}</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                    <Calendar size={12} />
                    <span>{trip.date}</span>
                    <span>•</span>
                    <Clock size={12} />
                    <span>{trip.time}</span>
                  </div>
                </div>

                {/* Trip Details */}
                <div className="flex flex-wrap justify-between items-end gap-3">
                  <div>
                    {trip.role === 'HOST' ? (
                      <div className="flex items-center gap-2 text-sm">
                        <Users size={14} className="text-gray-400" />
                        <span className="text-gray-600">
                          {trip.seats.booked} / {trip.seats.total} seats filled
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm">
                        <Car size={14} className="text-gray-400" />
                        <span className="text-gray-600">
                          Driver: {trip.driver?.name}
                        </span>
                        {trip.driver?.rating && (
                          <span className="flex items-center gap-0.5 text-xs">
                            <Star size={10} className="fill-yellow-400 text-yellow-400" />
                            {trip.driver.rating}
                          </span>
                        )}
                      </div>
                    )}
                    {trip.role === 'HOST' && trip.passengers && trip.passengers.length > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        {trip.passengers.slice(0, 3).map((p, i) => (
                          <div key={i} className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600 border border-white">
                            {p.avatar}
                          </div>
                        ))}
                        {trip.passengers.length > 3 && (
                          <span className="text-xs text-gray-400 ml-1">+{trip.passengers.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{trip.amount}</p>
                    <div className="flex gap-2 mt-1">
                      {trip.canReview && trip.status === 'COMPLETED' && (
                        <button 
                          onClick={() => setRatingTripId(trip.id)}
                          className="flex items-center gap-1 px-3 py-1 bg-yellow-50 text-yellow-700 rounded-lg text-xs font-medium hover:bg-yellow-100 transition"
                        >
                          <Star size={12} />
                          Rate Trip
                        </button>
                      )}
                      {(trip.status === 'UPCOMING' || trip.status === 'CONFIRMED') && (
                        <button 
                          onClick={() => handleCancel(trip.id)}
                          className="px-3 py-1 text-red-600 text-xs hover:underline"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Bar (for Host trips with bookings) */}
              {trip.role === 'HOST' && trip.seats.booked > 0 && (
                <div className="h-1 bg-gray-100">
                  <div 
                    className="h-full bg-blue-600 rounded-full transition-all duration-500"
                    style={{ width: `${(trip.seats.booked / trip.seats.total) * 100}%` }}
                  />
                </div>
              )}
            </div>
          )
        })}

        {/* Empty State */}
        {filteredTrips.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Car size={24} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No trips found</h3>
            <p className="text-gray-500 text-sm">Try adjusting your filters or search for different criteria</p>
            <button
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('all')
                setActiveTab('all')
              }}
              className="mt-4 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Pagination */}
      {filteredTrips.length > 0 && (
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Showing {filteredTrips.length} of {trips.length} trips
          </p>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed">
              Previous
            </button>
            <button className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm">
              1
            </button>
            <button className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
              2
            </button>
            <button className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
              Next
            </button>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {ratingTripId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Rate Your Trip</h2>
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRatingValue(star)}
                  className="focus:outline-none"
                >
                  <Star 
                    size={32} 
                    className={star <= ratingValue ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                  />
                </button>
              ))}
            </div>
            <textarea
              placeholder="Share your experience (optional)"
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              rows={3}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setRatingTripId(null)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRate(ratingTripId)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Submit Rating
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}