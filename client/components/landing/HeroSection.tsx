'use client'

import Link from 'next/link'
import { ArrowRight, Star, MapPin, Shield } from 'lucide-react'

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
      {/* Blobs */}
      <div className="absolute w-[600px] h-[600px] bg-blue-400 rounded-full filter blur-80 opacity-35 top-[-100px] right-[-150px] pointer-events-none" />
      <div className="absolute w-[400px] h-[400px] bg-sky-300 rounded-full filter blur-80 opacity-35 bottom-0 left-[-100px] pointer-events-none" />
      <div className="absolute w-[300px] h-[300px] bg-indigo-300 rounded-full filter blur-80 opacity-35 top-[30%] left-[30%] pointer-events-none" />

      {/* Dot grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(#2563eb18 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }} />

      <div className="max-w-7xl mx-auto px-5 sm:px-8 w-full py-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              AI-Powered Carpooling
            </div>

            <h1 className="font-display font-black text-[clamp(42px,6vw,76px)] text-gray-900 leading-[1.04] tracking-[-2px] mb-6">
              <span className="block">Travel</span>
              <span className="block bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">Together.</span>
              <span className="block">Save More.</span>
            </h1>

            <p className="text-gray-500 text-[17px] leading-relaxed mb-10 max-w-md">
              AI-powered intercity carpooling. Share rides, split costs, travel safely — all with real-time tracking and zero fraud.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link href="/search" className="bg-blue-600 text-white rounded-full font-semibold text-[15px] py-3.5 px-7 inline-flex items-center gap-2 shadow-lg shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5 transition-all">
                Find a Ride <ArrowRight size={16} />
              </Link>
              <Link href="/host" className="bg-white text-gray-800 border border-gray-200 rounded-full font-semibold text-[15px] py-3.5 px-7 inline-flex items-center gap-2 hover:border-blue-600 hover:text-blue-600 hover:-translate-y-0.5 transition-all">
                Host a Ride
              </Link>
            </div>

            <div className="flex items-center gap-4 mt-10">
              <div className="flex -space-x-2.5">
                {['P', 'A', 'M', 'R', 'K'].map((l, i) => (
                  <div key={i} className="w-9 h-9 rounded-full border-2 border-white bg-gradient-to-br from-blue-400 to-blue-700 text-white text-xs font-bold flex items-center justify-center shadow">
                    {l}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => <Star key={i} size={12} className="fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">1,284+ travelers today</p>
              </div>
            </div>
          </div>

          {/* Right - Card */}
          <div className="relative hidden lg:flex items-center justify-center">
            <div className="relative z-10 bg-white rounded-3xl shadow-2xl shadow-blue-100/60 border border-gray-100 p-7 w-[340px]">
              {/* Map placeholder */}
              <div className="relative h-44 bg-gradient-to-br from-blue-50 to-sky-100 rounded-2xl overflow-hidden mb-5">
                <div className="absolute inset-0" style={{
                  backgroundImage: 'linear-gradient(#2563eb12 1px, transparent 1px), linear-gradient(90deg, #2563eb12 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                }} />
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 340 176">
                  <defs>
                    <linearGradient id="rg2" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#22c55e" />
                      <stop offset="100%" stopColor="#2563eb" />
                    </linearGradient>
                  </defs>
                  <path d="M 50 140 Q 130 80 200 100 Q 270 120 300 40" stroke="url(#rg2)" strokeWidth="3" fill="none" strokeDasharray="8 4" strokeLinecap="round" />
                  <circle cx="50" cy="140" r="6" fill="#22c55e" />
                  <circle cx="50" cy="140" r="12" fill="#22c55e" fillOpacity=".2" />
                  <circle cx="300" cy="40" r="6" fill="#2563eb" />
                  <circle cx="300" cy="40" r="12" fill="#2563eb" fillOpacity=".2" />
                  <text x="185" y="85" fontSize="18" textAnchor="middle">🚗</text>
                </svg>
                <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-white/90 border border-green-200 text-green-700 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" /> Live
                </div>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center">AK</div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-sm">Arjun Kumar</p>
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <Star size={9} className="fill-amber-400 text-amber-400" /> 4.8 · 130 rides · ✓ Verified
                  </p>
                </div>
                <p className="text-xl font-black text-blue-600">₹650</p>
              </div>

              <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3.5">
                <div className="flex flex-col items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  <div className="w-px h-8 bg-gray-300" />
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                </div>
                <div className="flex-1 space-y-3">
                  <div><p className="text-xs text-gray-400">From</p><p className="text-sm font-semibold text-gray-900">Kozhikode</p></div>
                  <div><p className="text-xs text-gray-400">To</p><p className="text-sm font-semibold text-gray-900">Bangalore</p></div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">ETA</p>
                  <p className="text-sm font-bold text-gray-900">6:23 AM</p>
                  <p className="text-[10px] text-gray-400">528 km</p>
                </div>
              </div>

              <button className="mt-4 w-full py-3 bg-blue-600 text-white font-semibold rounded-2xl hover:bg-blue-700 transition text-sm shadow-lg shadow-blue-200">
                Book This Ride →
              </button>
            </div>

            {/* Floating pills */}
            <div className="absolute -top-4 -right-10 bg-white/95 backdrop-blur-sm border border-gray-100 rounded-2xl shadow-lg px-4 py-3 flex items-center gap-2 animate-float">
              <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
                <Shield size={13} className="text-green-600" />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-700">Escrow Protected</p>
                <p className="text-[9px] text-gray-400">0 fraud cases</p>
              </div>
            </div>

            <div className="absolute -bottom-2 -left-12 bg-white/95 backdrop-blur-sm border border-gray-100 rounded-2xl shadow-lg px-4 py-3 flex items-center gap-2 animate-float delay-1000">
              <div className="text-lg">💰</div>
              <div>
                <p className="text-[10px] font-black text-gray-700">₹4,200 saved</p>
                <p className="text-[9px] text-gray-400">this month</p>
              </div>
            </div>

            <div className="absolute top-1/2 -right-16 bg-white/95 backdrop-blur-sm border border-gray-100 rounded-2xl shadow-lg px-4 py-3 flex items-center gap-2 animate-float delay-2000">
              <span className="text-lg">⚡</span>
              <div>
                <p className="text-[10px] font-black text-gray-700">AI Pickup</p>
                <p className="text-[9px] text-gray-400">~3.4 km detour</p>
              </div>
            </div>

            <div className="absolute w-80 h-80 rounded-full border border-blue-200 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none animate-pulse-ring" />
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-gray-400">
        <p className="text-[10px] uppercase tracking-widest font-semibold">Scroll</p>
        <div className="w-px h-10 bg-gradient-to-b from-gray-300 to-transparent" />
      </div>
    </section>
  )
}