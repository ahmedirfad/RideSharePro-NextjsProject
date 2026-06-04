'use client'

import Link from 'next/link'
import { Plus, ArrowRight, TrendingUp, Car, Search } from 'lucide-react'

export default function Dashboard() {
  return (
    <>
      {/* GREETING */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Good morning, Ahmed</h1>
          <p className="text-gray-500 text-sm mt-1">Wednesday, May 14, 2026 • Kozhikode</p>
        </div>
        <Link href="/host">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-700 transition">
            <Plus size={16} /> Post a Trip
          </button>
        </Link>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Trips Hosted', value: '12', change: '+14%', positive: true },
          { label: 'Trips Taken', value: '8', change: '0%', positive: false },
          { label: 'Total Saved', value: '₹6,200', change: '+22%', positive: true },
          { label: 'Your Rating', value: '4.8★', change: '', positive: true },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <p className="text-gray-500 text-xs uppercase mb-1">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            {stat.change && (
              <p className={`text-xs mt-1 ${stat.positive ? 'text-green-600' : 'text-gray-400'}`}>
                {stat.positive && <TrendingUp size={12} className="inline mr-1" />}
                {stat.change}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* CTA CARDS */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Link href="/host">
          <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm hover:shadow-md transition">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
              <Car size={20} className="text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Host a Ride</h3>
            <p className="text-gray-500 text-sm mb-3">Share your journey, save costs.</p>
            <span className="text-blue-600 text-sm font-medium flex items-center gap-1">Post a trip <ArrowRight size={14} /></span>
          </div>
        </Link>

        <Link href="/search">
          <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm hover:shadow-md transition">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
              <Search size={20} className="text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Find a Ride</h3>
            <p className="text-gray-500 text-sm mb-3">Join a trip in your direction.</p>
            <span className="text-blue-600 text-sm font-medium flex items-center gap-1">Search rides <ArrowRight size={14} /></span>
          </div>
        </Link>
      </div>

      {/* UPCOMING ACTIVITY */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-5 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Upcoming Activity</h3>
        </div>
        <div className="divide-y divide-gray-100">
          <div className="p-4 flex justify-between items-center">
            <div>
              <p className="font-medium text-gray-900">Kozhikode → Kochi</p>
              <p className="text-gray-500 text-sm">May 18, 2026 • 08:00 AM • 3 seats</p>
            </div>
            <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">UPCOMING</span>
          </div>
          <div className="p-4 flex justify-between items-center">
            <div>
              <p className="font-medium text-gray-900">Bengaluru → Mysuru</p>
              <p className="text-gray-500 text-sm">May 22, 2026 • 09:30 AM • 2 seats</p>
            </div>
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">CONFIRMED</span>
          </div>
        </div>
      </div>
    </>
  )
}