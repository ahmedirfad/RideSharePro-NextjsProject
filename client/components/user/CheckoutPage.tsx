'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, ArrowRight, MapPin, Clock, Users, Star, ShieldCheck,
  CreditCard, Lock, Check, ChevronRight, Tag, AlertCircle,
  Zap, Car, Navigation, CheckCircle2, Loader2, X,
} from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

// ─── Types ────────────────────────────────────────────────────────────────────
type Step = 'review' | 'payment' | 'confirmed'

// ─── Small reusables ──────────────────────────────────────────────────────────
function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden ${className}`}>
      {children}
    </div>
  )
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="px-6 py-4 border-b border-gray-100">
      <h3 className="font-bold text-gray-900 text-[15px]" style={{ fontFamily: "'Outfit',sans-serif" }}>{title}</h3>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── Trip Summary with Segment Info ─────────────────────────────────────────────
function TripSummary({ trip, fromName, toName, seatNumber, distanceKm }: { 
  trip: any; fromName: string; toName: string; seatNumber: number; distanceKm: number 
}) {
  if (!trip) return null
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getInitials = (name: string) => {
    return name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'DR'
  }

  const estimatedDuration = Math.round(distanceKm / 60 * 60) // Assuming 60 km/h avg

  return (
    <SectionCard>
      <SectionHeader title="Trip Summary" />
      <div className="p-6 space-y-5">
        {/* Your Segment */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-xs font-semibold text-blue-700 mb-2">Your Journey</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-900">{fromName}</p>
              <p className="text-[10px] text-gray-500">Boarding</p>
            </div>
            <ArrowRight size={16} className="text-blue-400" />
            <div>
              <p className="text-sm font-bold text-gray-900">{toName}</p>
              <p className="text-[10px] text-gray-500">Alighting</p>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-blue-100 flex justify-between text-xs">
            <span className="text-gray-500">{distanceKm} km</span>
            <span className="text-gray-500">~{estimatedDuration} min drive</span>
            <span className="font-semibold text-blue-700">Seat {seatNumber}</span>
          </div>
        </div>

        {/* Full Route */}
        <div>
          <p className="text-xs text-gray-400 mb-2">Full Route</p>
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow" />
              <div className="w-px h-8 bg-gray-200" />
              <span className="w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-xs text-gray-400">From</p>
                <p className="font-bold text-gray-900 text-[15px]">{trip.from}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">To</p>
                <p className="font-bold text-gray-900 text-[15px]">{trip.to}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-gray-400">{formatDate(trip.departureDate)}</p>
              <p className="text-sm font-semibold text-gray-700">{trip.departureTime}</p>
            </div>
          </div>
        </div>

        {/* Driver */}
        <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3.5">
          <div className="relative">
            <div className="w-11 h-11 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center shadow">
              {getInitials(trip.driverId?.name)}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center">
              <ShieldCheck size={8} className="text-white" />
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-gray-900 text-sm">{trip.driverId?.name}</p>
              {trip.driverId?.isVerified && <ShieldCheck size={12} className="text-blue-500" />}
            </div>
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
              <Star size={9} className="fill-amber-400 text-amber-400" /> {trip.driverId?.rating || 0}
            </p>
          </div>
        </div>

        {/* 👇 VEHICLE - Show actual vehicle info from trip */}
        <div className="flex items-center gap-2.5">
          <Car size={13} className="text-gray-400 shrink-0" />
          {trip.vehicleInfo ? (
            <p className="text-xs text-gray-700 bg-blue-50 px-2.5 py-1 rounded-full font-medium border border-blue-100">
              {trip.vehicleInfo}
            </p>
          ) : (
            <p className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full font-medium">
              Standard Sedan · Clean & Comfortable
            </p>
          )}
        </div>
      </div>
    </SectionCard>
  )
}

// ─── Price Details ────────────────────────────────────────────────────────────
function PriceDetails({ fare, platformFee, total, promoApplied, promoDiscount }: { 
  fare: number; platformFee: number; total: number; promoApplied: boolean; promoDiscount: number 
}) {
  return (
    <SectionCard>
      <SectionHeader title="Price Details" />
      <div className="p-6 space-y-3">
        <div className="space-y-2.5 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Your Segment</span>
            <span className="font-medium text-gray-900">₹{fare}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Platform fee (5%)</span>
            <span className="font-medium text-gray-900">₹{platformFee}</span>
          </div>
          {promoApplied && (
            <div className="flex justify-between text-green-600">
              <span className="flex items-center gap-1"><Tag size={12} /> Promo applied</span>
              <span className="font-semibold">−₹{promoDiscount}</span>
            </div>
          )}
        </div>
        <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
          <span className="font-bold text-gray-900">Total</span>
          <span className="text-2xl font-black text-blue-600" style={{ fontFamily: "'Outfit',sans-serif" }}>₹{total}</span>
        </div>
      </div>
    </SectionCard>
  )
}

// ─── Promo Code ───────────────────────────────────────────────────────────────
function PromoCode({ onApply }: { onApply: (discount: number) => void }) {
  const [code, setCode] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  const handleApply = () => {
    if (!code.trim()) return
    setState('loading')
    setTimeout(() => {
      if (code.toUpperCase() === 'RIDE50') {
        setState('success')
        setMsg('₹50 off applied!')
        onApply(50)
      } else {
        setState('error')
        setMsg('Invalid promo code')
        onApply(0)
      }
    }, 900)
  }

  return (
    <SectionCard>
      <div className="p-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Tag size={12} /> Promo Code
        </p>
        <div className="flex gap-2">
          <div className={`flex-1 flex items-center gap-2 border rounded-xl px-3 py-2.5 transition ${
            state === 'error' ? 'border-red-300 bg-red-50' :
            state === 'success' ? 'border-green-300 bg-green-50' :
            'border-gray-200 bg-gray-50 focus-within:border-blue-400 focus-within:bg-white'
          }`}>
            <Tag size={13} className={state === 'success' ? 'text-green-500' : state === 'error' ? 'text-red-400' : 'text-gray-400'} />
            <input
              value={code}
              onChange={e => { setCode(e.target.value.toUpperCase()); setState('idle'); setMsg('') }}
              placeholder="Enter promo code"
              className="bg-transparent flex-1 text-sm outline-none text-gray-700 placeholder-gray-400 font-medium"
              disabled={state === 'success'}
            />
            {state === 'success' && <Check size={14} className="text-green-500 shrink-0" />}
          </div>
          <button
            onClick={handleApply}
            disabled={!code.trim() || state === 'success' || state === 'loading'}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-xl transition flex items-center gap-1.5"
          >
            {state === 'loading' ? <Loader2 size={14} className="animate-spin" /> : 'Apply'}
          </button>
        </div>
        {msg && (
          <p className={`text-xs mt-2 flex items-center gap-1 font-medium ${
            state === 'success' ? 'text-green-600' : 'text-red-500'
          }`}>
            {state === 'success' ? <Check size={11} /> : <AlertCircle size={11} />} {msg}
          </p>
        )}
      </div>
    </SectionCard>
  )
}

// ─── Payment Section ──────────────────────────────────────────────────────────
function PaymentSection() {
  const [cardNum, setCardNum] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const [name, setName] = useState('')

  const formatCard = (val: string) => val.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim().slice(0, 19)
  const formatExpiry = (val: string) => {
    const d = val.replace(/\D/g, '')
    return d.length >= 3 ? `${d.slice(0,2)}/${d.slice(2,4)}` : d
  }

  return (
    <SectionCard>
      <SectionHeader title="Payment Method" sub="All transactions are secured and encrypted" />
      <div className="p-6 space-y-4">
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Card Number</label>
          <div className="flex items-center gap-2.5 border border-gray-200 rounded-xl px-3.5 py-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition bg-white">
            <CreditCard size={16} className="text-gray-400 shrink-0" />
            <input
              value={cardNum}
              onChange={e => setCardNum(formatCard(e.target.value))}
              placeholder="0000 0000 0000 0000"
              className="flex-1 text-sm outline-none text-gray-800 placeholder-gray-300 font-mono tracking-wider"
              maxLength={19}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Expiry Date</label>
            <input
              value={expiry}
              onChange={e => setExpiry(formatExpiry(e.target.value))}
              placeholder="MM/YY"
              className="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm outline-none text-gray-800 placeholder-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
              maxLength={5}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">CVC</label>
            <input
              value={cvc}
              onChange={e => setCvc(e.target.value.replace(/\D/g,'').slice(0,3))}
              placeholder="123"
              type="password"
              className="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm outline-none text-gray-800 placeholder-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
              maxLength={3}
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Name on Card</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Full Name"
            className="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm outline-none text-gray-800 placeholder-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
          />
        </div>
      </div>
    </SectionCard>
  )
}

// ─── Trust Badges ─────────────────────────────────────────────────────────────
function TrustBadges() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[
        { icon: <Lock size={13} />, text: 'Secured by Stripe Escrow', color: 'text-green-600', bg: 'bg-green-50 border-green-100' },
        { icon: <CheckCircle2 size={13} />, text: 'Free cancellation up to 24h before', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
      ].map(({ icon, text, color, bg }) => (
        <div key={text} className={`flex items-center gap-2.5 ${bg} border rounded-xl px-3.5 py-3`}>
          <span className={color}>{icon}</span>
          <p className="text-xs text-gray-600 font-medium leading-snug">{text}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Confirmation Screen ──────────────────────────────────────────────────────
function ConfirmationScreen({ bookingId, trip, fromName, toName, seatNumber, fare }: { 
  bookingId: string; trip: any; fromName: string; toName: string; seatNumber: number; fare: number 
}) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6 py-16">
      <div className="relative mb-6">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 size={40} className="text-green-500" />
        </div>
        <div className="absolute inset-0 rounded-full border-4 border-green-200 animate-ping" style={{ animationDuration: '2s' }} />
      </div>
      <h2 className="text-3xl font-black text-gray-900 mb-2" style={{ fontFamily: "'Outfit',sans-serif" }}>
        Booking Confirmed!
      </h2>
      <p className="text-gray-500 text-sm mb-1">Your seat is reserved. Safe travels! 🎉</p>
      <p className="text-xs text-gray-400 mb-8">Booking ID: <span className="font-mono font-bold text-gray-600">{bookingId}</span></p>

      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm w-full max-w-sm mb-6 text-left">
        <div className="flex items-center justify-between mb-4">
          <p className="font-bold text-gray-900 text-sm" style={{ fontFamily: "'Outfit',sans-serif" }}>Trip Details</p>
          <span className="text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">Confirmed</span>
        </div>
        <div className="space-y-2.5 text-sm">
          <div className="flex justify-between text-gray-600"><span>Journey</span><span className="font-semibold text-gray-900">{fromName} → {toName}</span></div>
          <div className="flex justify-between text-gray-600"><span>Seat</span><span className="font-semibold text-gray-900">Seat {seatNumber}</span></div>
          <div className="flex justify-between text-gray-600"><span>Date</span><span className="font-semibold text-gray-900">{formatDate(trip?.departureDate)} · {trip?.departureTime}</span></div>
          <div className="flex justify-between text-gray-600"><span>Driver</span><span className="font-semibold text-gray-900">{trip?.driverId?.name}</span></div>
          {trip?.vehicleInfo && (
            <div className="flex justify-between text-gray-600"><span>Vehicle</span><span className="font-semibold text-gray-900">{trip.vehicleInfo}</span></div>
          )}
          <div className="flex justify-between border-t border-gray-100 pt-2.5"><span className="font-bold text-gray-900">Paid</span><span className="font-black text-blue-600">₹{fare}</span></div>
        </div>
      </div>

      <div className="flex gap-3 w-full max-w-sm">
        <Link href="/trips" className="flex-1">
          <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition shadow-lg shadow-blue-200">
            View My Trips
          </button>
        </Link>
        <Link href="/search" className="flex-1">
          <button className="w-full py-3 border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold rounded-xl text-sm transition">
            Find More
          </button>
        </Link>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CheckoutPage({ tripId }: { tripId: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated } = useAuthStore()
  
  // Get segment parameters from URL
  const fromOrder = searchParams.get('fromOrder')
  const toOrder = searchParams.get('toOrder')
  const seatNumber = searchParams.get('seatNumber')
  const segmentFare = searchParams.get('fare')
  const segmentDistance = searchParams.get('distance')
  const fromName = searchParams.get('from') || ''
  const toName = searchParams.get('to') || ''
  
  const [step, setStep] = useState<Step>('review')
  const [promoApplied, setPromoApplied] = useState(false)
  const [promoDiscount, setPromoDiscount] = useState(0)
  const [booking, setBooking] = useState(false)
  const [trip, setTrip] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [bookingId, setBookingId] = useState('')

  // Validate required parameters
  useEffect(() => {
    if (!fromOrder || !toOrder || !seatNumber || !segmentFare) {
      setError('Missing booking information. Please go back and select your journey.')
      setLoading(false)
    }
  }, [fromOrder, toOrder, seatNumber, segmentFare])

  // Fetch trip details
  useEffect(() => {
    const fetchTrip = async () => {
      if (!tripId) {
        setError('No trip specified')
        setLoading(false)
        return
      }
      
      try {
        const response = await api.get(`/trips/${tripId}`)
        if (response.data.success) {
          setTrip(response.data.data)
        } else {
          setError('Trip not found')
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load trip')
      } finally {
        setLoading(false)
      }
    }
    
    fetchTrip()
  }, [tripId])

  const handlePromo = (discount: number) => {
    if (discount > 0) { setPromoApplied(true); setPromoDiscount(discount) }
    else { setPromoApplied(false); setPromoDiscount(0) }
  }

  const handleBook = async () => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    
    if (!trip || !fromOrder || !toOrder || !seatNumber) return
    
    setBooking(true)
    setError('')
    
    try {
      // Call the segment booking API
      const response = await api.post(`/trips/${tripId}/book`, {
        fromOrder: parseInt(fromOrder),
        toOrder: parseInt(toOrder),
      })
      
      if (response.data.success) {
        setBookingId(response.data.data.bookingId)
        setStep('confirmed')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Booking failed. Please try again.')
    } finally {
      setBooking(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3">
        <Loader2 size={40} className="text-blue-500 animate-spin" />
        <p className="text-gray-500 text-sm">Loading trip details...</p>
      </div>
    )
  }

  if (error || !trip) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-3" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Process Checkout</h2>
          <p className="text-gray-500 mb-4">{error || 'Trip not found'}</p>
          <Link href="/search">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              Back to Search
            </button>
          </Link>
        </div>
      </div>
    )
  }

  if (step === 'confirmed') {
    return (
      <ConfirmationScreen 
        bookingId={bookingId} 
        trip={trip} 
        fromName={fromName}
        toName={toName}
        seatNumber={parseInt(seatNumber || '0')}
        fare={parseInt(segmentFare || '0')}
      />
    )
  }

  const fare = parseInt(segmentFare || '0')
  const platformFee = Math.round(fare * 0.05)
  const total = fare + platformFee - (promoApplied ? promoDiscount : 0)
  const distance = parseFloat(segmentDistance || '0')

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px);} to {opacity:1;transform:translateY(0);} }
        .fade-1 { animation: fadeUp .45s .05s ease both; }
        .fade-2 { animation: fadeUp .45s .12s ease both; }
        .fade-3 { animation: fadeUp .45s .19s ease both; }
        .fade-4 { animation: fadeUp .45s .26s ease both; }
        .fade-5 { animation: fadeUp .45s .33s ease both; }
      `}</style>

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="fade-1 flex items-center justify-between mb-7">
          <div className="flex items-center gap-3">
            <Link href={`/trip/${tripId}?from=${encodeURIComponent(fromName)}&to=${encodeURIComponent(toName)}`}>
              <button className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 transition shadow-sm">
                <ArrowLeft size={16} />
              </button>
            </Link>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight" style={{ fontFamily: "'Outfit',sans-serif" }}>
                Checkout
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">Complete your booking</p>
            </div>
          </div>
          {/* Steps indicator */}
          <div className="hidden sm:flex items-center gap-2">
            {[
              { key: 'review',  label: 'Review'  },
              { key: 'payment', label: 'Payment' },
            ].map((s, i) => (
              <div key={s.key} className="flex items-center gap-2">
                {i > 0 && <ChevronRight size={12} className="text-gray-300" />}
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                  step === s.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  <span className="w-4 h-4 rounded-full border-2 flex items-center justify-center text-[9px] font-black border-current">
                    {i + 1}
                  </span>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">

          {/* LEFT */}
          <div className="space-y-5">
            {step === 'review' ? (
              <>
                <div className="fade-2">
                  <TripSummary 
                    trip={trip} 
                    fromName={fromName}
                    toName={toName}
                    seatNumber={parseInt(seatNumber || '0')}
                    distanceKm={distance}
                  />
                </div>
                <div className="fade-3"><PromoCode onApply={handlePromo} /></div>
                <div className="fade-4"><TrustBadges /></div>
                <div className="fade-5">
                  <button
                    onClick={() => setStep('payment')}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition shadow-lg shadow-blue-200 flex items-center justify-center gap-2 text-[15px]">
                    Continue to Payment <ChevronRight size={16} />
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="fade-2">
                  <PaymentSection />
                </div>
                <div className="fade-3"><TrustBadges /></div>
                <div className="fade-4">
                  <button
                    onClick={handleBook}
                    disabled={booking}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-2xl transition shadow-lg shadow-blue-200 flex items-center justify-center gap-2.5 text-[15px]">
                    {booking ? (
                      <><Loader2 size={17} className="animate-spin" /> Processing...</>
                    ) : (
                      <><Lock size={15} /> Pay ₹{total} Securely</>
                    )}
                  </button>
                  <p className="text-center text-xs text-gray-400 mt-2.5 flex items-center justify-center gap-1">
                    <ShieldCheck size={11} className="text-green-500" />
                    Protected by Stripe · 256-bit SSL encryption
                  </p>
                </div>
              </>
            )}
          </div>

          {/* RIGHT — sticky summary */}
          <div className="space-y-4 lg:sticky lg:top-[80px] self-start">
            <div className="fade-2">
              <PriceDetails 
                fare={fare}
                platformFee={platformFee}
                total={total}
                promoApplied={promoApplied}
                promoDiscount={promoDiscount}
              />
            </div>

            {/* Mini trip card on payment step */}
            {step === 'payment' && (
              <div className="fade-3">
                <SectionCard>
                  <div className="p-4">
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                        {trip.driverId?.name?.charAt(0) || 'D'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{trip.driverId?.name}</p>
                        <p className="text-xs text-gray-400 flex items-center gap-0.5">
                          <Star size={9} className="fill-amber-400 text-amber-400" /> {trip.driverId?.rating || 0}
                        </p>
                      </div>
                      <button onClick={() => setStep('review')} className="ml-auto text-[10px] text-blue-600 font-semibold hover:underline">
                        Edit
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2.5">
                      <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                      <span className="truncate">{fromName}</span>
                      <div className="flex-1 border-t border-dashed border-gray-300" />
                      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                      <span className="truncate">{toName}</span>
                    </div>
                    <p className="text-[10px] text-center text-gray-400 mt-2">Seat {seatNumber}</p>
                    {trip?.vehicleInfo && (
                      <p className="text-[10px] text-center text-gray-500 mt-1 flex items-center justify-center gap-1">
                        <Car size={10} className="text-gray-400" /> {trip.vehicleInfo}
                      </p>
                    )}
                  </div>
                </SectionCard>
              </div>
            )}

            {/* Cancellation policy */}
            <div className="fade-4 bg-amber-50 border border-amber-100 rounded-2xl p-4">
              <p className="text-xs font-bold text-amber-700 flex items-center gap-1.5 mb-1.5">
                <AlertCircle size={12} /> Cancellation Policy
              </p>
              <p className="text-xs text-amber-600 leading-relaxed">
                Free cancellation up to <span className="font-semibold">24 hours before departure</span>. After that, a 50% cancellation fee applies.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}