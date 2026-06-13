'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  ArrowLeft, Star, ShieldCheck, Clock, Calendar,
  Users, Zap, CreditCard, RefreshCcw,
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

// ─── Indian car database (deterministic by driver ID) ─────────────────────────
const INDIAN_CARS = [
  { name: 'Maruti Suzuki Swift',  variant: 'ZXI',       type: 'Hatchback' },
  { name: 'Maruti Suzuki Baleno', variant: 'Alpha',     type: 'Hatchback' },
  { name: 'Hyundai i20',          variant: 'Asta',      type: 'Hatchback' },
  { name: 'Tata Altroz',          variant: 'XZ+',       type: 'Hatchback' },
  { name: 'Maruti Suzuki Dzire',  variant: 'ZXI',       type: 'Sedan'     },
  { name: 'Honda City',           variant: 'VX CVT',    type: 'Sedan'     },
  { name: 'Hyundai Verna',        variant: 'SX',        type: 'Sedan'     },
  { name: 'Honda Amaze',          variant: 'V CVT',     type: 'Sedan'     },
  { name: 'Hyundai Creta',        variant: 'SX(O)',     type: 'SUV'       },
  { name: 'Kia Seltos',           variant: 'HTX',       type: 'SUV'       },
  { name: 'Maruti Suzuki Brezza', variant: 'ZXI+',      type: 'SUV'       },
  { name: 'Tata Nexon',           variant: 'XZ+ TGDi',  type: 'SUV'       },
  { name: 'Toyota Innova Crysta', variant: 'GX 7-Str',  type: 'MPV'       },
  { name: 'Maruti Suzuki Ertiga', variant: 'ZXI',       type: 'MPV'       },
  { name: 'Kia Carens',           variant: 'Prestige+', type: 'MPV'       },
]
const STATE_PREFIXES = ['KL', 'KA', 'TN', 'MH', 'DL', 'AP', 'TS', 'GJ']

function pickCar(id: string) {
  let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return INDIAN_CARS[h % INDIAN_CARS.length]
}
function pickPlate(id: string) {
  let h = 0; for (const c of id) h = (h * 17 + c.charCodeAt(0)) >>> 0
  const state = STATE_PREFIXES[h % STATE_PREFIXES.length]
  const dist  = String((h % 99) + 1).padStart(2, '0')
  const alpha = String.fromCharCode(65 + (h % 26)) + String.fromCharCode(65 + ((h >> 4) % 26))
  const num   = String((h % 9000) + 1000)
  return `${state}-${dist}-${alpha}-${num}`
}

export default function TripDetailsPage() {
  const params       = useParams()
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, user } = useAuthStore()
  const tripId = params.id as string

  const [trip, setTrip]               = useState<TripData | null>(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [saved, setSaved]             = useState(false)
  const [selectedFromOrder, setSelectedFromOrder] = useState<number>(0)
  const [selectedToOrder, setSelectedToOrder]     = useState<number>(0)
  const [seatMap, setSeatMap]         = useState<SeatMapData | null>(null)
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null)
  const [loadingSeatMap, setLoadingSeatMap] = useState(false)
  const [segmentFare, setSegmentFare] = useState<number>(0)
  const [segmentDistance, setSegmentDistance] = useState<number>(0)
  const [showStops, setShowStops]     = useState(false)

  // ── URL params ──────────────────────────────────────────────────────────────
  const returnTo   = searchParams.get('returnTo') || '/search'
  const fromParam  = searchParams.get('from')     || ''
  const toParam    = searchParams.get('to')       || ''
  const dateParam  = searchParams.get('date')     || ''

  // Guest segment params — set by MyTrips when a passenger clicks Details
  const guestFrom      = searchParams.get('guestFrom')     || ''
  const guestTo        = searchParams.get('guestTo')       || ''
  const guestDistance  = parseFloat(searchParams.get('guestDistance') || '0')
  const guestFare      = parseInt(searchParams.get('guestFare') || '0')
  const guestFromOrder = parseInt(searchParams.get('fromOrder')   || '-1', 10)
  const guestToOrder   = parseInt(searchParams.get('toOrder')     || '-1', 10)
  const guestSeatNum   = searchParams.get('seatNumber') || ''

  // Determine if current user is the host
  const isHost = trip && user && trip.driverId._id === user.id

  // Guest view only when coming from My Trips as passenger AND not the host
  const isGuestView = !isHost && returnTo === '/trips' && !!(guestFrom && guestTo && guestFromOrder >= 0 && guestToOrder > guestFromOrder)
  const isFromMyTrips = returnTo === '/trips'
  const isFromDashboard = returnTo === '/dashboard'

  const getBackButtonText = () => {
    if (isFromMyTrips) return 'Back to My Trips'
    if (isFromDashboard) return 'Back to Dashboard'
    return 'Back to Search'
  }

  const returnUrl = returnTo === '/search'
    ? `/search?from=${encodeURIComponent(fromParam)}&to=${encodeURIComponent(toParam)}&date=${dateParam}`
    : returnTo

  // ── Fetch trip ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchTrip = async () => {
      setLoading(true); setError('')
      try {
        const res = await api.get(`/trips/${tripId}`)
        if (res.data.success) {
          const data: TripData = res.data.data
          setTrip(data)

          if (isGuestView) {
            setSelectedFromOrder(guestFromOrder)
            setSelectedToOrder(guestToOrder)
            if (guestFare > 0) {
              setSegmentFare(guestFare)
            }
          } else if (data.waypoints && data.waypoints.length >= 2) {
            setSelectedFromOrder(data.waypoints[0].order)
            setSelectedToOrder(data.waypoints[data.waypoints.length - 1].order)
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

  // ── Fetch seat map (only for non-host, non-guest views) ─────────────────────
  useEffect(() => {
    if (isHost || isGuestView) return
    if (!trip || selectedFromOrder < 0 || selectedToOrder <= selectedFromOrder) return

    const fetchSeatMap = async () => {
      setLoadingSeatMap(true)
      try {
        const res = await api.get(
          `/trips/${tripId}/seat-map?fromOrder=${selectedFromOrder}&toOrder=${selectedToOrder}`
        )
        if (res.data.success) {
          const data: SeatMapData = res.data.data
          setSeatMap(data)
          setSegmentFare(data.fare)
          setSegmentDistance(data.distanceKm)
          setSelectedSeat(null)
        }
      } catch (e) {
        console.error('Failed to fetch seat map:', e)
      } finally {
        setLoadingSeatMap(false)
      }
    }

    fetchSeatMap()
  }, [tripId, selectedFromOrder, selectedToOrder, trip, isHost, isGuestView])

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-96 gap-3">
      <Loader2 size={40} className="text-blue-500 animate-spin" />
      <p className="text-gray-500 text-sm">Loading trip details…</p>
    </div>
  )

  if (error || !trip) return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
        <AlertCircle size={48} className="text-red-500 mx-auto mb-3" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Trip</h2>
        <p className="text-gray-500 mb-4">{error || 'Trip not found'}</p>
        <Link href={returnTo}>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            {getBackButtonText()}
          </button>
        </Link>
      </div>
    </div>
  )

  const driver = trip.driverId
  const seatsLeft = trip.seatsAvailable
  const fillPct = ((trip.totalSeats - seatsLeft) / trip.totalSeats) * 100
  const car = pickCar(driver._id)
  const plate = pickPlate(driver._id)
  const waypoints = trip.waypoints || []

  const displayFrom = isGuestView ? guestFrom : trip.from
  const displayTo = isGuestView ? guestTo : trip.to

  const displayDistance = segmentDistance > 0
    ? segmentDistance
    : (isGuestView ? guestDistance : (trip.totalDistanceKm ?? 0))

  const displayETA = displayDistance > 0 ? displayDistance / 60 : 0
  const platformFee = Math.round(segmentFare * 0.05)
  const total = segmentFare + platformFee

  const handleProceedToCheckout = () => {
    if (!selectedSeat) { alert('Please select a seat'); return }
    router.push(
      `/checkout/${tripId}` +
      `?fromOrder=${selectedFromOrder}&toOrder=${selectedToOrder}` +
      `&seatNumber=${selectedSeat}&fare=${segmentFare}&distance=${segmentDistance}` +
      `&from=${encodeURIComponent(fromParam)}&to=${encodeURIComponent(toParam)}` +
      `&date=${dateParam}&returnTo=${returnTo}`
    )
  }

  // Calculate total potential earnings (full trip)
  const totalPotential = trip.pricePerSeat * trip.totalSeats
  // Calculate actual earnings (from bookings - you can add this later)
  const totalEarned = 0 // Will be calculated from bookings

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-10">

      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href={returnUrl} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition">
          <ArrowLeft size={16} /> {getBackButtonText()}
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

      {/* Host Earnings Banner */}
      {isHost && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-green-600 uppercase tracking-wider">Your Trip</p>
              <p className="text-xl font-bold text-green-700">{trip.from} → {trip.to}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">{seatsLeft} seats left</p>
              <p className="text-xs text-gray-500">{trip.totalSeats - seatsLeft} booked</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-green-100 flex justify-between">
            <span className="text-sm font-semibold text-gray-700">Potential Earnings</span>
            <span className="text-lg font-bold text-green-600">₹{totalPotential}</span>
          </div>
        </div>
      )}

      {/* Guest journey banner */}
      {isGuestView && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1">Your Journey</p>
              <p className="text-xl font-bold text-gray-900">{displayFrom} → {displayTo}</p>
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                <span>{displayDistance} km</span>
                {displayETA > 0 && <><span>·</span><span>~{Math.round(displayETA * 60)} min</span></>}
                {guestSeatNum && <><span>·</span><span>Seat {guestSeatNum}</span></>}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-gray-400 mb-1">Your fare</p>
              <p className="text-2xl font-black text-blue-600">₹{segmentFare}</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-blue-100 flex items-center gap-1.5 text-xs text-blue-400">
            <span>Full route:</span>
            <span className="font-medium text-blue-600">{trip.from} → {trip.to}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-[1fr_360px] gap-6 items-start">

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
                  {isHost && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full ml-2">You are the host</span>}
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="flex items-center gap-1 text-sm">
                    <Stars rating={driver.rating ?? 0} />
                    <span className="font-semibold text-gray-900 ml-1">{(driver.rating ?? 0).toFixed(1)}</span>
                  </span>
                  <span className="text-gray-300">·</span>
                  <span className="text-sm text-gray-500">Member since {new Date(trip.createdAt).getFullYear()}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  <Car size={13} className="text-gray-400" />
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    {car.name} {car.variant} · {plate}
                  </span>
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
                { icon: Navigation, label: isGuestView ? 'YOUR DISTANCE' : 'TOTAL DISTANCE', value: displayDistance > 0 ? `${displayDistance} km` : `${trip.totalDistanceKm || '—'} km`, highlight: false },
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

          {/* Route Details */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-gray-900">Route Details</h2>
                {isGuestView && <p className="text-xs text-gray-400 mt-0.5">Showing your booked segment</p>}
              </div>
              {!isGuestView && waypoints.length > 2 && (
                <button onClick={() => setShowStops(!showStops)} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700">
                  <ChevronDown size={14} className={`transition-transform ${showStops ? 'rotate-180' : ''}`} />
                  {showStops ? 'Hide stops' : `Show ${waypoints.length - 2} intermediate stop${waypoints.length - 2 > 1 ? 's' : ''}`}
                </button>
              )}
            </div>

            <div className="relative pl-6">
              <div className="absolute left-2 top-2 bottom-2 w-px bg-gray-200" />

              <div className="relative mb-6">
                <span className="absolute -left-4 top-1 w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow" />
                <p className="font-semibold text-gray-900 text-sm">{displayFrom}</p>
                <p className="text-xs text-gray-400 mt-0.5">{isGuestView ? 'Your Boarding Point' : 'Departure'} · {trip.departureTime}</p>
              </div>

              {!isGuestView && showStops && waypoints.slice(1, -1).map(wp => (
                <div key={wp.order} className="relative mb-6">
                  <span className="absolute -left-4 top-1 w-3 h-3 rounded-full bg-amber-400 border-2 border-white shadow" />
                  <p className="font-semibold text-gray-900 text-sm">{wp.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Intermediate Stop · {wp.distanceFromStart} km from start</p>
                </div>
              ))}

              <div className="relative">
                <span className="absolute -left-4 top-1 w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow" />
                <p className="font-semibold text-gray-900 text-sm">{displayTo}</p>
                <p className="text-xs text-gray-400 mt-0.5">{isGuestView ? 'Your Alighting Point' : 'Destination'}</p>
              </div>
            </div>

            {isGuestView && (
              <div className="mt-4 p-3 bg-gray-50 border border-gray-100 rounded-lg">
                <p className="text-xs text-gray-500"><span className="font-semibold text-gray-600">Full route: </span>{trip.from} → {trip.to}</p>
              </div>
            )}

            {trip.maxDetourKm > 0 && !isGuestView && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <div className="flex items-center gap-1.5">
                  <Zap size={12} className="text-blue-500" />
                  <span className="text-xs font-semibold text-blue-700">Allows up to {trip.maxDetourKm} km detour for pickups</span>
                </div>
              </div>
            )}
          </div>

          {/* Vehicle & Amenities */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Vehicle & Amenities</h2>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <Car size={22} className="text-gray-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{car.name} · {car.variant}</p>
                <p className="text-xs text-gray-400">{car.type} · {plate}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {['❄️ AC', '🎵 Music', '⚡ USB Charging', '🧳 Luggage OK', '🐾 No Pets', '🚭 No Smoking'].map(item => (
                <div key={item} className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2.5 py-2">
                  <span className="text-xs text-gray-600 font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Seat selection - only for search/booking flow (not host, not guest) */}
          {!isHost && !isGuestView && selectedFromOrder < selectedToOrder && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Select a Seat</h2>
              {loadingSeatMap ? (
                <div className="flex justify-center py-8"><Loader2 size={24} className="text-blue-500 animate-spin" /></div>
              ) : seatMap ? (
                <>
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    {seatMap.seatMap.map(seat => (
                      <button key={seat.seatNumber}
                        onClick={() => seat.available && setSelectedSeat(seat.seatNumber)}
                        disabled={!seat.available}
                        className={`py-3 rounded-xl text-sm font-semibold transition-all
                          ${!seat.available ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}
                          ${seat.available && selectedSeat === seat.seatNumber ? 'bg-blue-600 text-white ring-2 ring-blue-300' : ''}
                          ${seat.available && selectedSeat !== seat.seatNumber ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' : ''}
                        `}>
                        Seat {seat.seatNumber}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 text-center">{seatMap.freeCount} seats available for this segment</p>
                </>
              ) : (
                <p className="text-center text-gray-500 text-sm py-4">Select boarding and alighting points first</p>
              )}
            </div>
          )}

          {/* Guest: show reserved seat */}
          {isGuestView && guestSeatNum && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Your Reserved Seat</h2>
              <div className="text-center py-4">
                <div className="inline-block p-6 bg-blue-50 rounded-2xl border-2 border-blue-200">
                  <p className="text-4xl font-black text-blue-600">Seat {guestSeatNum}</p>
                  <p className="text-xs text-gray-500 mt-2">Reserved for you</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-4 sticky top-[80px]">
          <TripDetailMap from={displayFrom} to={displayTo} pickup={displayFrom} distanceKm={displayDistance || undefined} etaHours={displayETA || undefined} />

          {/* Price Summary */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 space-y-3">
            <h2 className="font-semibold text-gray-900">Price Summary</h2>

            {!isHost ? (
              <>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>{displayDistance > 0 ? `${displayDistance} km segment` : '1 Seat'}</span>
                    <span>₹{segmentFare}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span className="flex items-center gap-1.5">Platform fee <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">5%</span></span>
                    <span>₹{platformFee}</span>
                  </div>
                  <div className="border-t border-gray-100 pt-2 flex justify-between items-center">
                    <span className="font-bold text-gray-900">Total</span>
                    <span className="text-2xl font-bold text-blue-600">₹{total}</span>
                  </div>
                </div>

                {!isGuestView && (
                  <button onClick={handleProceedToCheckout} disabled={seatsLeft === 0 || !selectedSeat}
                    className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition ${
                      seatsLeft === 0 || !selectedSeat ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200'
                    }`}>
                    {seatsLeft === 0 ? 'No Seats Available' : !selectedSeat ? 'Select a Seat First' : <>Proceed to Checkout <ChevronRight size={16} /></>}
                  </button>
                )}

                {isGuestView && (
                  <Link href="/trips">
                    <button className="w-full py-3 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white transition">
                      Back to My Trips
                    </button>
                  </Link>
                )}
              </>
            ) : (
              /* Host View - Show price summary differently */
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Price per Seat</span>
                  <span>₹{trip.pricePerSeat}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Total Seats</span>
                  <span>{trip.totalSeats}</span>
                </div>
                <div className="border-t border-gray-100 pt-2 flex justify-between items-center">
                  <span className="font-bold text-gray-900">Full Trip Value</span>
                  <span className="text-2xl font-bold text-green-600">₹{totalPotential}</span>
                </div>
                <p className="text-xs text-gray-400 text-center mt-2">Earnings based on confirmed bookings</p>
              </div>
            )}

            <div className="bg-green-50 border border-green-100 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <CreditCard size={14} className="text-green-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-green-800">Secured by Stripe Escrow</p>
                  <p className="text-xs text-green-600">Funds held safely until trip completes</p>
                </div>
              </div>
            </div>

            {!isGuestView && fillPct > 0 && (
              <div>
                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                  <span>Seats filled</span><span>{Math.round(fillPct)}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: `${fillPct}%` }} />
                </div>
              </div>
            )}

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