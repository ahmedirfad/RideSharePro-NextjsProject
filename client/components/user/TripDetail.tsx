'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  ArrowLeft, ArrowRight, Star, ShieldCheck, MapPin, Clock, Calendar,
  Users, CheckCircle2, Zap, CreditCard, RefreshCcw,
  Navigation, ChevronRight, Heart, Share2, AlertCircle,
  Car, MessageCircle, Phone, Loader2, ChevronDown
} from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

const TripDetailMap = dynamic(() => import('@/components/maps/TripDetailMap'), {
  ssr: false,
  loading: () => (
    <div className="h-64 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center">
      <div className="flex flex-col items-center gap-2 text-gray-400">
        <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        <span className="text-xs font-medium">Loading map...</span>
      </div>
    </div>
  ),
})

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={12}
          className={i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-300 fill-gray-300'} />
      ))}
    </span>
  )
}

interface Waypoint {
  name: string
  order: number
  coordinates: [number, number]
  distanceFromStart: number
}

interface TripData {
  _id: string
  from: string
  to: string
  departureDate: string
  departureTime: string
  seatsAvailable: number
  totalSeats: number
  pricePerSeat: number
  maxDetourKm: number
  womenOnly: boolean
  totalDistanceKm?: number
  farePerKm?: number
  waypoints?: Waypoint[]
  driverId: {
    _id: string
    name: string
    rating: number
    totalRides?: number
    isVerified: boolean
  }
  createdAt: string
}

interface SeatMapData {
  seatMap: Array<{ seatNumber: number; available: boolean; occupiedBy?: any }>
  fare: number
  distanceKm: number
  freeCount: number
  waypoints: Waypoint[]
}

export default function TripDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated } = useAuthStore()
  const tripId = params.id as string

  const [trip, setTrip] = useState<TripData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  
  // Segment selection state
  const [selectedFromOrder, setSelectedFromOrder] = useState<number>(0)
  const [selectedToOrder, setSelectedToOrder] = useState<number>(0)
  const [seatMap, setSeatMap] = useState<SeatMapData | null>(null)
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null)
  const [loadingSeatMap, setLoadingSeatMap] = useState(false)
  const [segmentFare, setSegmentFare] = useState<number>(0)
  const [segmentDistance, setSegmentDistance] = useState<number>(0)
  const [showWaypointSelector, setShowWaypointSelector] = useState(false)

  // Get returnTo parameter for back navigation
  const returnTo = searchParams.get('returnTo') || '/search'
  const isFromMyTrips = returnTo === '/trips'
  const fromParam = searchParams.get('from') || ''
  const toParam = searchParams.get('to') || ''
  const dateParam = searchParams.get('date') || ''
  
  // Build return URL with preserved search params if returnTo is search
  const returnUrl = returnTo === '/search' 
    ? `/search?from=${encodeURIComponent(fromParam)}&to=${encodeURIComponent(toParam)}&date=${dateParam}`
    : returnTo

  // Fetch trip details
  useEffect(() => {
    const fetchTrip = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await api.get(`/trips/${tripId}`)
        if (res.data.success) {
          const tripData = res.data.data
          setTrip(tripData)
          // Set default segment (first to last waypoint)
          if (tripData.waypoints && tripData.waypoints.length >= 2) {
            const firstOrder = tripData.waypoints[0].order
            const lastOrder = tripData.waypoints[tripData.waypoints.length - 1].order
            setSelectedFromOrder(firstOrder)
            setSelectedToOrder(lastOrder)
          }
        }
      } catch (e: any) {
        setError(e.response?.data?.message || 'Failed to load trip details')
      } finally {
        setLoading(false)
      }
    }
    if (tripId) fetchTrip()
  }, [tripId])

  // Fetch seat map when segment changes
  useEffect(() => {
    const fetchSeatMap = async () => {
      if (!tripId || selectedFromOrder >= selectedToOrder) return
      
      setLoadingSeatMap(true)
      try {
        const res = await api.get(`/trips/${tripId}/seat-map?fromOrder=${selectedFromOrder}&toOrder=${selectedToOrder}`)
        if (res.data.success) {
          setSeatMap(res.data.data)
          setSegmentFare(res.data.data.fare)
          setSegmentDistance(res.data.data.distanceKm)
          setSelectedSeat(null)
        }
      } catch (e: any) {
        console.error('Failed to fetch seat map:', e)
      } finally {
        setLoadingSeatMap(false)
      }
    }
    
    if (trip && trip.waypoints && trip.waypoints.length > 0 && selectedFromOrder < selectedToOrder) {
      fetchSeatMap()
    }
  }, [tripId, selectedFromOrder, selectedToOrder, trip])

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  const getWaypointName = (order: number) => {
    return trip?.waypoints?.find(w => w.order === order)?.name || ''
  }

  const getAvailableWaypoints = () => {
    return trip?.waypoints || []
  }

  const handleProceedToCheckout = () => {
    if (!selectedSeat) {
      alert('Please select a seat')
      return
    }
    router.push(`/checkout/${tripId}?fromOrder=${selectedFromOrder}&toOrder=${selectedToOrder}&seatNumber=${selectedSeat}&fare=${segmentFare}&distance=${segmentDistance}&from=${encodeURIComponent(fromParam)}&to=${encodeURIComponent(toParam)}&date=${dateParam}&returnTo=${returnTo}`)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3">
        <Loader2 size={40} className="text-blue-500 animate-spin" />
        <p className="text-gray-500 text-sm">Loading trip details…</p>
      </div>
    )
  }

  if (error || !trip) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-3" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Trip</h2>
          <p className="text-gray-500 mb-4">{error || 'Trip not found'}</p>
          <Link href={returnTo}>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              {isFromMyTrips ? 'Back to My Trips' : 'Go to Search'}
            </button>
          </Link>
        </div>
      </div>
    )
  }

  const driver = trip.driverId
  const seatsLeft = trip.seatsAvailable
  const fillPct = ((trip.totalSeats - seatsLeft) / trip.totalSeats) * 100
  const platformFee = Math.round(segmentFare * 0.05)
  const total = segmentFare + platformFee
  const waypoints = getAvailableWaypoints()

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-10">

      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href={returnUrl} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition">
          <ArrowLeft size={16} /> {isFromMyTrips ? 'Back to My Trips' : 'Back to Search'}
        </Link>
        <div className="flex items-center gap-2">
          <button onClick={() => setSaved(!saved)}
            className={`p-2 rounded-lg border transition ${saved ? 'border-red-200 bg-red-50 text-red-500' : 'border-gray-200 text-gray-400 hover:bg-gray-50'}`}>
            <Heart size={16} fill={saved ? 'currentColor' : 'none'} />
          </button>
          <button className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 transition">
            <Share2 size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_380px] gap-6 items-start">

        {/* LEFT COLUMN */}
        <div className="space-y-4">

          {/* Driver card */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <div className="flex items-start gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white font-bold text-lg flex items-center justify-center">
                  {getInitials(driver.name)}
                </div>
                <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-gray-900">{driver.name}</h1>
                  {driver.isVerified && (
                    <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full font-medium">
                      <ShieldCheck size={11} /> Verified
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="flex items-center gap-1 text-sm text-gray-600">
                    <Stars rating={driver.rating ?? 0} />
                    <span className="font-semibold text-gray-900 ml-1">{(driver.rating ?? 0).toFixed(1)}</span>
                  </span>
                  <span className="text-gray-300">·</span>
                  <span className="text-sm text-gray-500">Member since {new Date(trip.createdAt).getFullYear()}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition">
                  <MessageCircle size={13} /> Chat
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition">
                  <Phone size={13} /> Call
                </button>
              </div>
            </div>
          </div>

          {/* Trip Information */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Trip Information</h2>
            <div className="grid grid-cols-4 gap-4">
              {[
                { icon: Calendar, label: 'DATE', value: formatDate(trip.departureDate), highlight: false },
                { icon: Clock, label: 'DEPARTURE', value: trip.departureTime, highlight: false },
                { icon: Navigation, label: 'TOTAL DISTANCE', value: trip.totalDistanceKm ? `${trip.totalDistanceKm} km` : '~500 km', highlight: false },
                { icon: Users, label: 'AVAILABILITY', value: `${seatsLeft} seat${seatsLeft !== 1 ? 's' : ''} left`, highlight: true },
              ].map(({ icon: Icon, label, value, highlight }) => (
                <div key={label} className={`rounded-lg p-3 ${highlight ? 'bg-amber-50 border border-amber-100' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon size={12} className={highlight ? 'text-amber-500' : 'text-gray-400'} />
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide leading-tight">{label}</span>
                  </div>
                  <p className={`text-sm font-bold ${highlight ? 'text-amber-700' : 'text-gray-900'}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Route Details with Waypoint Selector */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Route Details</h2>
              <button 
                onClick={() => setShowWaypointSelector(!showWaypointSelector)}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
              >
                <ChevronDown size={14} className={`transition-transform ${showWaypointSelector ? 'rotate-180' : ''}`} />
                {showWaypointSelector ? 'Hide stops' : 'Show all stops'}
              </button>
            </div>
            
            {/* Selected segment display */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4">
              <p className="text-xs font-semibold text-blue-700 mb-2">Your Selected Journey</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-900">{getWaypointName(selectedFromOrder) || trip.from}</p>
                  <p className="text-[10px] text-gray-500">Boarding</p>
                </div>
                <ArrowRight size={16} className="text-blue-400" />
                <div>
                  <p className="text-sm font-bold text-gray-900">{getWaypointName(selectedToOrder) || trip.to}</p>
                  <p className="text-[10px] text-gray-500">Alighting</p>
                </div>
              </div>
              {segmentDistance > 0 && (
                <p className="text-xs text-gray-500 mt-2">{segmentDistance} km · Estimated {Math.round(segmentDistance / 60 * 60)} min drive</p>
              )}
            </div>
            
            {/* Waypoint selector dropdowns */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">Boarding Point</label>
                <select 
                  value={selectedFromOrder}
                  onChange={(e) => setSelectedFromOrder(parseInt(e.target.value))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  {waypoints.map((wp) => (
                    <option key={wp.order} value={wp.order} disabled={wp.order >= selectedToOrder}>
                      {wp.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">Alighting Point</label>
                <select 
                  value={selectedToOrder}
                  onChange={(e) => setSelectedToOrder(parseInt(e.target.value))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  {waypoints.map((wp) => (
                    <option key={wp.order} value={wp.order} disabled={wp.order <= selectedFromOrder}>
                      {wp.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* All waypoints list (expandable) */}
            {showWaypointSelector && (
              <div className="border-t border-gray-100 pt-3 mt-2">
                <p className="text-xs font-semibold text-gray-500 mb-2">Full Route Stops</p>
                <div className="space-y-2">
                  {waypoints.map((wp, idx) => (
                    <div key={wp.order} className="flex items-center gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-2 h-2 rounded-full ${
                          wp.order === selectedFromOrder ? 'bg-green-500' : 
                          wp.order === selectedToOrder ? 'bg-red-500' : 
                          'bg-gray-300'
                        }`} />
                        {idx < waypoints.length - 1 && <div className="w-px h-4 bg-gray-200" />}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm ${wp.order === selectedFromOrder ? 'font-bold text-green-700' : 
                                          wp.order === selectedToOrder ? 'font-bold text-red-700' : 
                                          'text-gray-600'}`}>
                          {wp.name}
                          {wp.order === selectedFromOrder && ' (Your boarding)'}
                          {wp.order === selectedToOrder && ' (Your alighting)'}
                        </p>
                        {wp.distanceFromStart > 0 && (
                          <p className="text-[10px] text-gray-400">{wp.distanceFromStart} km from start</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Seat Map */}
          {selectedFromOrder < selectedToOrder && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Select a Seat</h2>
              {loadingSeatMap ? (
                <div className="flex justify-center py-8">
                  <Loader2 size={24} className="text-blue-500 animate-spin" />
                </div>
              ) : seatMap ? (
                <>
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    {seatMap.seatMap.map((seat) => (
                      <button
                        key={seat.seatNumber}
                        onClick={() => seat.available && setSelectedSeat(seat.seatNumber)}
                        disabled={!seat.available}
                        className={`
                          py-3 rounded-xl text-center font-semibold text-sm transition-all
                          ${!seat.available ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}
                          ${seat.available && selectedSeat === seat.seatNumber ? 'bg-blue-600 text-white ring-2 ring-blue-300' : ''}
                          ${seat.available && selectedSeat !== seat.seatNumber ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' : ''}
                        `}
                      >
                        Seat {seat.seatNumber}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 text-center">
                    {seatMap.freeCount} seats available for this segment
                  </p>
                </>
              ) : (
                <p className="text-center text-gray-500 text-sm py-4">Select boarding and alighting points first</p>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-4 sticky top-[89px]">
          <TripDetailMap
            from={trip.from}
            to={trip.to}
            pickup={getWaypointName(selectedFromOrder)}
            distanceKm={segmentDistance}
            etaHours={segmentDistance / 60}
          />

          {/* Price Summary */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 space-y-3">
            <h2 className="font-semibold text-gray-900">Price Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>{segmentDistance > 0 ? `${segmentDistance} km segment` : '1 Seat'}</span>
                <span>₹{segmentFare}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span className="flex items-center gap-1.5">
                  Platform fee
                  <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">5%</span>
                </span>
                <span>₹{platformFee}</span>
              </div>
              <div className="border-t border-gray-100 pt-2 flex justify-between items-center">
                <span className="font-bold text-gray-900">Total</span>
                <span className="text-2xl font-bold text-blue-600">₹{total}</span>
              </div>
            </div>

            <div className="bg-green-50 border border-green-100 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <CreditCard size={14} className="text-green-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-green-800">Secured by Stripe Escrow</p>
                  <p className="text-xs text-green-600">Funds held safely until trip completes</p>
                </div>
              </div>
            </div>

            {fillPct > 0 && (
              <div>
                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                  <span>Seats filled</span><span>{Math.round(fillPct)}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${fillPct}%` }} />
                </div>
              </div>
            )}

            <button
              onClick={handleProceedToCheckout}
              disabled={seatsLeft === 0 || !selectedSeat || selectedFromOrder >= selectedToOrder}
              className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition ${
                seatsLeft === 0 || !selectedSeat || selectedFromOrder >= selectedToOrder
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200'
              }`}>
              {!selectedSeat ? 'Select a Seat' : seatsLeft === 0 ? 'No Seats Available' : <>Proceed to Checkout <ChevronRight size={16} /></>}
            </button>

            {trip.womenOnly && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                <p className="text-xs text-rose-700 font-medium flex items-center gap-2">
                  <ShieldCheck size={12} /> Women-only ride
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}