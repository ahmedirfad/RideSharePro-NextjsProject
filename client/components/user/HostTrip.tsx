'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Minus, Plus, Fuel, TrendingUp, MapPin, CheckCircle2, ChevronRight,
} from 'lucide-react'

// Map preview component
function MapPreview() {
  return (
    <div className="relative rounded-lg overflow-hidden h-48 bg-gray-100 border border-gray-200">
      <div className="absolute inset-0 bg-gradient-to-br from-green-100 via-emerald-50 to-teal-100">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="absolute border-gray-200 border-t w-full" style={{ top: `${i * 16}%` }} />
        ))}
        {[...Array(7)].map((_, i) => (
          <div key={i} className="absolute border-gray-200 border-l h-full" style={{ left: `${i * 16}%` }} />
        ))}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 192" preserveAspectRatio="none">
          <defs>
            <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
          <path
            d="M 30 155 Q 110 90 200 100 Q 290 110 370 35"
            stroke="url(#routeGrad)" strokeWidth="3"
            fill="none" strokeDasharray="7 4" strokeLinecap="round"
          />
          <circle cx="30" cy="155" r="5" fill="#16a34a" />
          <circle cx="370" cy="35" r="5" fill="#dc2626" />
          <circle cx="30" cy="155" r="11" fill="#16a34a" fillOpacity="0.18" />
          <circle cx="370" cy="35" r="11" fill="#dc2626" fillOpacity="0.18" />
        </svg>
      </div>

      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 bg-white/90 border border-blue-200 text-blue-600 text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
        AI Routing Active
      </div>

      <div className="absolute bottom-2.5 left-2.5 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm">
        <p className="text-gray-900 font-bold text-base leading-none">520 km</p>
        <p className="text-gray-400 text-xs mt-0.5">Est. 8 hours</p>
      </div>

      <button className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 bg-white border border-gray-200 text-blue-600 text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-sm hover:bg-blue-50 transition">
        <MapPin size={12} /> Connect Maps <ChevronRight size={12} />
      </button>
    </div>
  )
}

// AI Fare Analysis component
function FareAnalysis({ price }: { price: number }) {
  const low = 500, high = 800
  const pct = Math.min(Math.max(((price - low) / (high - low)) * 100, 3), 95)

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-yellow-500 text-base">✦</span>
        <h3 className="font-semibold text-gray-900 text-sm">AI Fare Analysis</h3>
      </div>

      <div>
        <div className="flex justify-between text-xs text-gray-400 mb-1.5">
          <span>Low Demand</span>
          <span>High Demand</span>
        </div>
        <div className="relative h-2 rounded-full bg-gradient-to-r from-blue-400 via-amber-400 to-rose-500">
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-full shadow transition-all"
            style={{ left: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1.5">
          <span>₹{low}</span>
          <span className="text-blue-600 font-semibold">₹{price}</span>
          <span>₹{high}</span>
        </div>
      </div>

      <div className="space-y-2 text-sm border-t border-gray-100 pt-3">
        <div className="flex justify-between text-gray-600">
          <span className="flex items-center gap-1.5"><Fuel size={14} className="text-gray-400" /> Fuel Cost Estimate</span>
          <span className="font-semibold text-gray-900">₹2,400</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span className="flex items-center gap-1.5"><TrendingUp size={14} className="text-gray-400" /> Current Demand</span>
          <span className="font-semibold text-green-600">High ↑</span>
        </div>
      </div>
    </div>
  )
}

// Pro Tips component
function ProTips() {
  const tips = [
    'Setting a competitive price increases your chances of filling all seats by 40%.',
    'Allowing a small detour (up to 5km) significantly broadens your potential passenger pool.',
    'Confirm bookings quickly to maintain a high host rating.',
  ]
  return (
    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-blue-600" />
        <h3 className="font-semibold text-gray-900 text-sm">Pro Tips for Hosts</h3>
      </div>
      <ul className="space-y-2">
        {tips.map((tip, i) => (
          <li key={i} className="flex items-start gap-2 text-gray-600 text-xs leading-relaxed">
            <CheckCircle2 size={13} className="text-blue-500 shrink-0 mt-0.5" />
            {tip}
          </li>
        ))}
      </ul>
    </div>
  )
}

// Main Host a Trip Component (Content Only - No Sidebar/No Navbar)
export default function HostTrip() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [seats, setSeats] = useState(3)
  const [price, setPrice] = useState(650)
  const [detour, setDetour] = useState(5)
  const [womenOnly, setWomenOnly] = useState(false)
  const [posting, setPosting] = useState(false)
  const [posted, setPosted] = useState(false)

  const handlePost = () => {
    setPosting(true)
    setTimeout(() => { setPosting(false); setPosted(true) }, 1800)
  }

  return (
    <div>
      {/* Page heading */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Host a Ride</h1>
          <p className="text-gray-500 text-sm mt-1">Fill in your trip details and post for passengers to book.</p>
        </div>
        <Link href="/dashboard">
          <button className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 transition">
            ← Back to Dashboard
          </button>
        </Link>
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-[1fr_320px] gap-6 items-start">

        {/* LEFT column */}
        <div className="space-y-5">

          {/* Route Details */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 space-y-4">
            <h2 className="font-semibold text-gray-900 text-sm">Route Details</h2>

            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-green-500 shrink-0" />
                <input
                  type="text"
                  placeholder="Leaving from..."
                  value={from}
                  onChange={e => setFrom(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>

              <div className="ml-1 pl-px flex flex-col items-start gap-0">
                <div className="w-px h-3 bg-gray-300 ml-1" />
                <div className="w-2 h-2 rounded-full border-2 border-gray-300 ml-0.5" />
                <div className="w-px h-3 bg-gray-300 ml-1" />
              </div>

              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-red-500 shrink-0" />
                <input
                  type="text"
                  placeholder="Going to..."
                  value={to}
                  onChange={e => setTo(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
          </div>

          {/* Seats & Pricing */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 space-y-4">
            <h2 className="font-semibold text-gray-900 text-sm">Seats & Pricing</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-2 block">Available Seats</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSeats(Math.max(1, seats - 1))}
                    className="w-9 h-9 rounded-lg border border-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-50 transition"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="text-2xl font-bold text-gray-900 w-6 text-center">{seats}</span>
                  <button
                    onClick={() => setSeats(Math.min(8, seats + 1))}
                    className="w-9 h-9 rounded-lg border border-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-50 transition"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-2 block">Price per Seat</label>
                <div className="flex items-center border border-gray-200 rounded-lg px-3 py-2.5 gap-1 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition">
                  <span className="text-gray-500 text-sm">₹</span>
                  <input
                    type="number"
                    value={price}
                    onChange={e => setPrice(Number(e.target.value))}
                    className="bg-transparent flex-1 text-gray-900 font-semibold text-sm focus:outline-none w-16"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-lg p-3">
              <span className="text-blue-500 text-sm mt-0.5">✦</span>
              <div>
                <p className="text-blue-700 text-xs font-semibold">AI Suggested: ₹580–₹650 per seat</p>
                <p className="text-blue-500 text-xs mt-0.5">Based on current demand and fuel prices for this route.</p>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 space-y-5">
            <h2 className="font-semibold text-gray-900 text-sm">Preferences</h2>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs text-gray-500">Max Detour for Pickups</label>
                <span className="text-blue-600 text-xs font-semibold">{detour} km</span>
              </div>
              <input
                type="range" min={0} max={20} value={detour}
                onChange={e => setDetour(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>0 km</span><span>20 km</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <p className="text-sm font-medium text-gray-900">Women Only</p>
                <p className="text-xs text-gray-500">Only visible to female passengers</p>
              </div>
              <button
                onClick={() => setWomenOnly(!womenOnly)}
                className={`relative w-11 h-6 rounded-full transition-colors ${womenOnly ? 'bg-blue-600' : 'bg-gray-200'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${womenOnly ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>

          {/* Post Trip CTA */}
          <button
            onClick={handlePost}
            disabled={posting || posted}
            className={`w-full py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition ${
              posted
                ? 'bg-green-600 text-white cursor-default'
                : posting
                ? 'bg-blue-400 text-white cursor-wait'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {posted ? (
              <><CheckCircle2 size={16} /> Trip Posted Successfully!</>
            ) : posting ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Posting Trip...
              </>
            ) : (
              <>Post Trip <ChevronRight size={16} /></>
            )}
          </button>
        </div>

        {/* RIGHT column */}
        <div className="space-y-4">
          <MapPreview />
          <FareAnalysis price={price} />
          <ProTips />
        </div>
      </div>
    </div>
  )
}