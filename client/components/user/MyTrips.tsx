'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Car, Calendar, Users, ChevronRight, Eye, 
  Star, XCircle, CheckCircle, Clock, AlertCircle,
  Download, Search, Filter, MapPin, Phone, MessageCircle, Loader2, ArrowRight
} from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

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
  segment?: string
  fromName?: string
  toName?: string
  seatNumber?: number
  distanceKm?: number
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
  tripId?: string
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

export default function MyTrips() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const [activeTab, setActiveTab] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ratingTripId, setRatingTripId] = useState<string | null>(null)
  const [ratingValue, setRatingValue] = useState(5)
  const [ratingComment, setRatingComment] = useState('')
  const [submittingRating, setSubmittingRating] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const fetchTrips = async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    
    try {
      const response = await api.get('/trips/my-trips/all')
      
      if (response.data.success) {
        const allTrips = response.data.data.all || []
        
        const formattedTrips: Trip[] = allTrips.map((trip: any) => ({
          id: trip.id,
          tripId: trip.id,
          route: trip.route,
          segment: trip.segment || (trip.fromName && trip.toName ? `${trip.fromName} → ${trip.toName}` : trip.route),
          fromName: trip.fromName,
          toName: trip.toName,
          seatNumber: trip.seatNumber,
          distanceKm: trip.distanceKm,
          role: trip.role,
          date: trip.date,
          time: trip.time,
          status: trip.status,
          seats: trip.seats,
          amount: trip.amount,
          passengers: trip.passengers,
          driver: trip.driver,
          canReview: trip.canReview,
          canTrack: trip.status === 'ONGOING',
        }))
        
        setTrips(formattedTrips)
      }
    } catch (error: any) {
      console.error('Failed to fetch trips', error)
      setError(error.response?.data?.message || 'Failed to load trips')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrips()
  }, [isAuthenticated])

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
    if (searchTerm && !trip.route.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !(trip.segment?.toLowerCase().includes(searchTerm.toLowerCase()))) return false
    return true
  })

  const handleCancel = async (tripId: string) => {
    if (!confirm('Are you sure you want to cancel this trip? This action cannot be undone.')) return
    
    setCancellingId(tripId)
    
    try {
      const response = await api.put(`/trips/${tripId}/cancel`)
      
      if (response.data.success) {
        setTrips(prev => prev.map(t => 
          t.id === tripId ? { ...t, status: 'CANCELLED' as Trip['status'] } : t
        ))
        alert('Trip cancelled successfully')
      }
    } catch (error: any) {
      console.error('Failed to cancel trip', error)
      alert(error.response?.data?.message || 'Failed to cancel trip')
    } finally {
      setCancellingId(null)
    }
  }

  const handleRate = async (tripId: string) => {
    setSubmittingRating(true)
    
    try {
      const response = await api.post(`/trips/${tripId}/review`, { 
        rating: ratingValue, 
        comment: ratingComment 
      })
      
      if (response.data.success) {
        alert(`Thank you for rating! ${ratingValue} stars`)
        setRatingTripId(null)
        setRatingValue(5)
        setRatingComment('')
        fetchTrips()
      }
    } catch (error: any) {
      console.error('Failed to submit rating', error)
      alert(error.response?.data?.message || 'Failed to submit rating')
    } finally {
      setSubmittingRating(false)
    }
  }

  const handleExport = () => {
    if (filteredTrips.length === 0) {
      alert('No trips to export')
      return
    }
    
    const headers = ['ID', 'Journey', 'Segment', 'Role', 'Seat', 'Date', 'Time', 'Status', 'Amount']
    const csvData = filteredTrips.map(t => [
      t.id.slice(-8), 
      t.route, 
      t.segment || t.route, 
      t.role, 
      t.seatNumber || '-', 
      t.date, 
      t.time, 
      t.status, 
      t.amount
    ])
    const csv = [headers, ...csvData].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trips-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    if (!isAuthenticated && !loading) {
      router.push('/login')
    }
  }, [isAuthenticated, loading, router])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 size={32} className="text-blue-500 animate-spin" />
        <p className="text-gray-500 text-sm">Loading your trips...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Trips</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your hosted and booked trips</p>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-600 text-sm">{error}</p>
          <button onClick={fetchTrips} className="mt-2 text-red-600 text-xs hover:underline">
            Try again
          </button>
        </div>
      )}

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
              placeholder="Search by route or segment..."
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
        <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
          <Download size={14} /> Export
        </button>
      </div>

      {/* Trips List */}
      <div className="space-y-3">
        {filteredTrips.length === 0 && !loading && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Car size={24} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No trips found</h3>
            <p className="text-gray-500 text-sm">
              {searchTerm || statusFilter !== 'all' || activeTab !== 'all'
                ? 'Try adjusting your filters or search for different criteria'
                : 'You haven\'t hosted or booked any trips yet'}
            </p>
            {(searchTerm || statusFilter !== 'all' || activeTab !== 'all') && (
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
            )}
            {!searchTerm && statusFilter === 'all' && activeTab === 'all' && trips.length === 0 && (
              <div className="mt-4 flex gap-3 justify-center">
                <Link href="/host">
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
                    Host a Ride
                  </button>
                </Link>
                <Link href="/search">
                  <button className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition">
                    Find a Ride
                  </button>
                </Link>
              </div>
            )}
          </div>
        )}

        {filteredTrips.map((trip) => {
          const StatusIcon = statusConfig[trip.status]?.icon || AlertCircle
          const status = statusConfig[trip.status] || { label: trip.status, color: 'bg-gray-100 text-gray-600' }
          const role = roleConfig[trip.role] || { label: trip.role, color: 'bg-gray-100 text-gray-600' }
          const isCancelling = cancellingId === trip.id
          const isGuest = trip.role === 'GUEST'

          return (
            <div key={trip.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition overflow-hidden">
              <div className="p-4">
                {/* Header Row */}
                <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-400 font-mono">{trip.id.slice(-8)}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${role.color}`}>
                      {role.label}
                    </span>
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                      <StatusIcon size={10} />
                      {status.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {trip.canTrack && trip.status === 'ONGOING' && (
                      <Link href={`/active-trip/${trip.tripId || trip.id}?returnTo=/trips`}>
                        <button className="px-2 py-1 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition">
                          Track Live
                        </button>
                      </Link>
                    )}
                    {/* Updated: Pass returnTo=/trips parameter */}
                    <Link href={`/trip/${trip.tripId || trip.id}?returnTo=/trips`} className="text-blue-600 text-sm hover:underline flex items-center gap-1">
                      Details <ChevronRight size={14} />
                    </Link>
                  </div>
                </div>

                {/* Route - Show segment for guest trips */}
                <div className="mb-3">
                  {isGuest && trip.segment && trip.segment !== trip.route ? (
                    <>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{trip.segment}</h3>
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                          Your journey
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">Full route: {trip.route}</p>
                    </>
                  ) : (
                    <h3 className="font-semibold text-gray-900">{trip.route}</h3>
                  )}
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
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Car size={14} className="text-gray-400" />
                          <span className="text-gray-600">Driver: {trip.driver?.name}</span>
                          {trip.driver?.rating && (
                            <span className="flex items-center gap-0.5 text-xs">
                              <Star size={10} className="fill-yellow-400 text-yellow-400" />
                              {trip.driver.rating}
                            </span>
                          )}
                        </div>
                        {trip.seatNumber && (
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <MapPin size={10} /> Seat {trip.seatNumber}
                            </span>
                            {trip.distanceKm && (
                              <span>{trip.distanceKm} km journey</span>
                            )}
                          </div>
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
                        <button onClick={() => setRatingTripId(trip.id)}
                          className="flex items-center gap-1 px-3 py-1 bg-yellow-50 text-yellow-700 rounded-lg text-xs font-medium hover:bg-yellow-100 transition">
                          <Star size={12} /> Rate Trip
                        </button>
                      )}
                      {(trip.status === 'UPCOMING' || trip.status === 'CONFIRMED') && (
                        <button onClick={() => handleCancel(trip.id)} disabled={isCancelling}
                          className="px-3 py-1 text-red-600 text-xs hover:underline disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1">
                          {isCancelling ? <Loader2 size={10} className="animate-spin" /> : null}
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
                  <div className="h-full bg-blue-600 rounded-full transition-all duration-500"
                    style={{ width: `${(trip.seats.booked / trip.seats.total) * 100}%` }} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Rating Modal */}
      {ratingTripId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={(e) => { if (e.target === e.currentTarget) setRatingTripId(null) }}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Rate Your Trip</h2>
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => setRatingValue(star)}
                  className="focus:outline-none transition-transform hover:scale-110">
                  <Star size={32} className={star <= ratingValue ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />
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
              <button onClick={() => setRatingTripId(null)} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={() => handleRate(ratingTripId)} disabled={submittingRating}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {submittingRating ? <Loader2 size={16} className="animate-spin" /> : null}
                Submit Rating
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}