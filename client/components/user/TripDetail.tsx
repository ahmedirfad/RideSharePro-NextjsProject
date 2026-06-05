'use client'

import { useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  ArrowLeft, Star, ShieldCheck, MapPin, Clock, Calendar,
  Users, CheckCircle2, Zap, CreditCard, RefreshCcw,
  Navigation, ChevronRight, Heart, Share2, AlertCircle,
  Car, Fuel, MessageCircle, Phone
} from 'lucide-react'

// ✅ Leaflet must be client-only — never SSR
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
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={12}
          className={i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-300 fill-gray-300'} />
      ))}
    </span>
  )
}

export default function TripDetailsPage() {
  const [saved,   setSaved]   = useState(false)
  const [booking, setBooking] = useState(false)
  const [booked,  setBooked]  = useState(false)

  // Trip data — in real app these come from your API / route params
  const trip = {
    from:     'Kozhikode',
    to:       'Bangalore',
    pickup:   'Calicut University Main Gate, Kozhikode',
    distance: 528,
    eta:      8,
  }

  const handleBook = () => {
    setBooking(true)
    setTimeout(() => { setBooking(false); setBooked(true) }, 2000)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-10">

      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/search" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition">
          <ArrowLeft size={16} /> Trip Details
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSaved(!saved)}
            className={`p-2 rounded-lg border transition ${saved ? 'border-red-200 bg-red-50 text-red-500' : 'border-gray-200 text-gray-400 hover:bg-gray-50'}`}>
            <Heart size={16} fill={saved ? 'currentColor' : 'none'} />
          </button>
          <button className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 transition">
            <Share2 size={16} />
          </button>
        </div>
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-[1fr_320px] gap-6 items-start">

        {/* LEFT */}
        <div className="space-y-4">

          {/* Driver card */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <div className="flex items-start gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white font-bold text-lg flex items-center justify-center">
                  AK
                </div>
                <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-gray-900">Arjun Kumar</h1>
                  <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full font-medium">
                    <ShieldCheck size={11} /> Verified
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="flex items-center gap-1 text-sm text-gray-600">
                    <Stars rating={4.8} />
                    <span className="font-semibold text-gray-900 ml-1">4.8</span>
                    <span className="text-gray-400">(130 reviews)</span>
                  </span>
                  <span className="text-gray-300">·</span>
                  <span className="text-sm text-gray-500">Member since 2024</span>
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  <Car size={13} className="text-gray-400" />
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    Swift Dzire · 30-07-AB-1234
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

          {/* Trip Info */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Trip Information</h2>
            <div className="grid grid-cols-4 gap-4">
              {[
                { icon: Calendar,   label: 'DATE',         value: 'May 15, 2026' },
                { icon: Clock,      label: 'TIME',         value: '8:00 AM' },
                { icon: Navigation, label: 'EST. DURATION',value: `~${trip.eta} hours` },
                { icon: Users,      label: 'AVAILABILITY', value: '2 seats left', highlight: true },
              ].map(({ icon: Icon, label, value, highlight }) => (
                <div key={label} className={`rounded-lg p-3 ${highlight ? 'bg-amber-50 border border-amber-100' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon size={12} className={highlight ? 'text-amber-500' : 'text-gray-400'} />
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
                  </div>
                  <p className={`text-sm font-bold ${highlight ? 'text-amber-700' : 'text-gray-900'}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Route & Pickup */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Route & Pickup</h2>
            <div className="relative pl-6">
              <div className="absolute left-2 top-2 bottom-2 w-px bg-gray-200" />
              <div className="relative mb-5">
                <span className="absolute -left-4 top-1 w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow" />
                <p className="font-semibold text-gray-900 text-sm">{trip.from}</p>
                <p className="text-xs text-gray-400 mt-0.5">Starting Point</p>
              </div>
              <div className="relative mb-5">
                <span className="absolute -left-4 top-1 w-3 h-3 rounded-full bg-amber-400 border-2 border-white shadow" />
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Zap size={12} className="text-blue-500" />
                    <span className="text-xs font-semibold text-blue-700">AI Suggested Pickup</span>
                  </div>
                  <p className="text-sm font-medium text-gray-800">"{trip.pickup}"</p>
                  <p className="text-xs text-gray-400 mt-0.5">~3.4 km detour</p>
                </div>
              </div>
              <div className="relative">
                <span className="absolute -left-4 top-1 w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow" />
                <p className="font-semibold text-gray-900 text-sm">{trip.to}</p>
                <p className="text-xs text-gray-400 mt-0.5">Destination ({trip.distance} km)</p>
              </div>
            </div>
          </div>

          {/* Vehicle & Amenities */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Vehicle & Amenities</h2>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <Car size={22} className="text-gray-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">Maruti Swift Dzire</p>
                <p className="text-xs text-gray-400">Sedan · White · 2022</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: '❄️', label: 'AC' },
                { icon: '🎵', label: 'Music' },
                { icon: '⚡', label: 'USB Charging' },
                { icon: '🧳', label: 'Luggage OK' },
                { icon: '🐾', label: 'No Pets' },
                { icon: '🚭', label: 'No Smoking' },
              ].map(({ icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2.5 py-2">
                  <span className="text-sm">{icon}</span>
                  <span className="text-xs text-gray-600 font-medium">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Reviews */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Recent Reviews</h2>
              <button className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                View all 53 <ChevronRight size={12} />
              </button>
            </div>
            <div className="space-y-4">
              {[
                { name: 'Priya Sharma', rating: 5, avatar: 'PS', text: 'Arjun was a fantastic driver. The car was spotless and he drove very safely through the ghat section. Highly recommend!' },
                { name: 'Rahul Menon',  rating: 4, avatar: 'RM', text: 'Good trip overall. Reached Bangalore on time despite some traffic near Mysore.' },
              ].map(({ name, rating, avatar, text }) => (
                <div key={name} className="flex gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 font-semibold text-xs flex items-center justify-center shrink-0">
                    {avatar}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{name}</span>
                      <Stars rating={rating} />
                    </div>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="space-y-4 sticky top-[89px]">

          {/* ✅ Real Leaflet map with from/to/pickup geocoding */}
          <TripDetailMap
            from={trip.from}
            to={trip.to}
            pickup={trip.pickup}
            distanceKm={trip.distance}
            etaHours={trip.eta}
          />

          {/* Price Summary */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 space-y-3">
            <h2 className="font-semibold text-gray-900">Price Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>1 Seat</span><span>₹650</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Platform fee</span>
                <span className="text-green-600 font-medium">Free</span>
              </div>
              <div className="border-t border-gray-100 pt-2 flex justify-between items-center">
                <span className="font-bold text-gray-900 text-base">Total</span>
                <span className="text-2xl font-bold text-blue-600">₹650</span>
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

            <div className="space-y-2 text-xs text-gray-500">
              {[
                { icon: RefreshCcw,  text: 'Free cancellation up to 24h before' },
                { icon: ShieldCheck, text: 'ID verified participants only' },
                { icon: Navigation,  text: 'Real-time trip tracking available' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2">
                  <Icon size={12} className="text-gray-400 shrink-0" /><span>{text}</span>
                </div>
              ))}
            </div>

            <button onClick={handleBook} disabled={booking || booked}
              className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition ${
                booked   ? 'bg-green-600 text-white cursor-default'
                : booking ? 'bg-blue-400 text-white cursor-wait'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200'
              }`}>
              {booked ? <><CheckCircle2 size={16} /> Booking Confirmed!</>
                : booking ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>Confirming...</>
                : <>Book This Ride <ChevronRight size={16} /></>}
            </button>

            <p className="text-center text-xs text-gray-400">
              You won't be charged until the driver confirms
            </p>
          </div>

          <button className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition py-2">
            <AlertCircle size={12} /> Report this listing
          </button>
        </div>
      </div>
    </div>
  )
}
