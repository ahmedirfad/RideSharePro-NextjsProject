'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
    Search, SlidersHorizontal, X, Star, Users, Car,
    ChevronDown, MapPin, Calendar, User, ArrowRight,
    RotateCcw, BadgeCheck, ShieldCheck
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Trip {
    id: number
    driver: string
    avatar: string
    rating: number
    rides: number
    from: string
    to: string
    departTime: string
    departPeriod: string
    arriveTime: string
    arrivePeriod: string
    duration: string
    distance: string
    price: number
    seatsLeft: number
    totalSeats: number
    genderLabel: string
    via?: string
    badge?: 'MATCH' | 'WOMEN ONLY'
    verified: boolean
}

// ─── Mock data ────────────────────────────────────────────────────────────────
const TRIPS: Trip[] = [
    {
        id: 1, driver: 'Arjun Kumar', avatar: 'AK', rating: 4.8, rides: 130,
        from: 'Kozhikode', to: 'Bangalore', departTime: '6:00', departPeriod: 'AM',
        arriveTime: '2:00', arrivePeriod: 'PM', duration: '8h', distance: '528 km',
        price: 650, seatsLeft: 3, totalSeats: 4, genderLabel: '2 male · 1 female',
        badge: 'MATCH', verified: true,
    },
    {
        id: 2, driver: 'Fatima Ali', avatar: 'FA', rating: 4.9, rides: 88,
        from: 'Kozhikode', to: 'Bangalore', departTime: '7:30', departPeriod: 'AM',
        arriveTime: '3:30', arrivePeriod: 'PM', duration: '8h', distance: '528 km',
        price: 700, seatsLeft: 1, totalSeats: 3, genderLabel: '3 female',
        badge: 'WOMEN ONLY', verified: true,
    },
    {
        id: 3, driver: 'Meera Nair', avatar: 'MN', rating: 4.7, rides: 40,
        from: 'Kozhikode', to: 'Coimbatore', departTime: '8:30', departPeriod: 'AM',
        arriveTime: '3:30', arrivePeriod: 'PM', duration: '7h', distance: '170 km',
        price: 480, seatsLeft: 2, totalSeats: 4, genderLabel: '2 seats left',
        verified: false,
    },
    {
        id: 4, driver: 'Rahul V.', avatar: 'RV', rating: 4.2, rides: 20,
        from: 'Kozhikode', to: 'Bangalore', departTime: '9:00', departPeriod: 'AM',
        arriveTime: '5:30', arrivePeriod: 'PM', duration: '8.5h', distance: '528 km',
        price: 550, seatsLeft: 4, totalSeats: 4, genderLabel: '4 seats left',
        via: '+ suggest a pickup point', verified: false,
    },
    {
        id: 5, driver: 'Deepak S.', avatar: 'DS', rating: 4.6, rides: 65,
        from: 'Kozhikode', to: 'Bangalore', departTime: '10:00', departPeriod: 'AM',
        arriveTime: '6:00', arrivePeriod: 'PM', duration: '8h', distance: '528 km',
        price: 600, seatsLeft: 2, totalSeats: 3, genderLabel: '1 male · 1 female',
        verified: true,
    },
]

const DEPARTURE_TIMES = ['Morning', 'Afternoon', 'Evening', 'Night']
const VEHICLE_TYPES = ['Hatchback', 'Sedan', 'SUV']

// ─── Filter Sidebar ────────────────────────────────────────────────────────────
function FilterSidebar({
    filters, setFilters, onReset,
}: {
    filters: any; setFilters: (f: any) => void; onReset: () => void
}) {
    return (
        <aside className="w-56 shrink-0 bg-white border border-gray-200 rounded-lg p-4 space-y-5 self-start sticky top-[89px]">
            <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                    <SlidersHorizontal size={14} /> Filters
                </span>
                <button onClick={onReset} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                    <RotateCcw size={11} /> Reset
                </button>
            </div>

            {/* Trip Type */}
            <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Trip Type</p>
                <label className="flex items-center gap-2 text-sm text-gray-700 mb-1.5 cursor-pointer">
                    <input type="checkbox" checked={filters.womenOnly}
                        onChange={e => setFilters({ ...filters, womenOnly: e.target.checked })}
                        className="accent-blue-600" />
                    Women Only
                </label>
                <p className="text-xs text-gray-400 mb-2">Shows exclusive safe female passengers</p>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={filters.verifiedOnly}
                        onChange={e => setFilters({ ...filters, verifiedOnly: e.target.checked })}
                        className="accent-blue-600" />
                    Verified Drivers
                </label>
            </div>

            {/* Price Range */}
            <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Price Range</p>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>₹0</span><span>₹{filters.maxPrice.toLocaleString()}</span>
                </div>
                <input type="range" min={100} max={2000} value={filters.maxPrice}
                    onChange={e => setFilters({ ...filters, maxPrice: Number(e.target.value) })}
                    className="w-full accent-blue-600 cursor-pointer" />
            </div>

            {/* Departure Time */}
            <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Departure Time</p>
                <div className="grid grid-cols-2 gap-1.5">
                    {DEPARTURE_TIMES.map(t => (
                        <button key={t}
                            onClick={() => {
                                const times = filters.times.includes(t)
                                    ? filters.times.filter((x: string) => x !== t)
                                    : [...filters.times, t]
                                setFilters({ ...filters, times })
                            }}
                            className={`text-xs py-1.5 rounded-lg border transition font-medium ${filters.times.includes(t)
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'text-gray-600 border-gray-200 hover:bg-gray-50'
                                }`}
                        >{t}</button>
                    ))}
                </div>
            </div>

            {/* Seats Available */}
            <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Seats Available</p>
                <div className="flex gap-2">
                    {[1, 2, 3].map(n => (
                        <button key={n}
                            onClick={() => setFilters({ ...filters, seats: filters.seats === n ? 0 : n })}
                            className={`w-9 h-9 rounded-lg border text-sm font-semibold transition ${filters.seats === n
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'text-gray-600 border-gray-200 hover:bg-gray-50'
                                }`}
                        >{n}+</button>
                    ))}
                </div>
            </div>

            {/* Vehicle Type */}
            <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Vehicle Type</p>
                <div className="space-y-1.5">
                    {VEHICLE_TYPES.map(v => (
                        <label key={v} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                            <input type="checkbox"
                                checked={filters.vehicles.includes(v)}
                                onChange={e => {
                                    const vehicles = e.target.checked
                                        ? [...filters.vehicles, v]
                                        : filters.vehicles.filter((x: string) => x !== v)
                                    setFilters({ ...filters, vehicles })
                                }}
                                className="accent-blue-600" />
                            {v}
                        </label>
                    ))}
                </div>
            </div>

            <button className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition">
                Apply Filters
            </button>
        </aside>
    )
}

// ─── Trip Card ─────────────────────────────────────────────────────────────────
function TripCard({ trip }: { trip: Trip }) {
    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition overflow-hidden">
            <div className="flex">
                {/* Badge stripe */}
                {trip.badge && (
                    <div className={`w-1.5 shrink-0 ${trip.badge === 'WOMEN ONLY' ? 'bg-rose-500' : 'bg-blue-600'}`} />
                )}

                <div className="flex-1 p-4">
                    <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <div className="shrink-0">
                            <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center">
                                {trip.avatar}
                            </div>
                        </div>

                        {/* Driver info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-gray-900 text-sm">{trip.driver}</span>
                                {trip.verified && <ShieldCheck size={13} className="text-blue-500" />}
                                <span className="flex items-center gap-0.5 text-xs text-amber-500 font-medium">
                                    <Star size={11} fill="currentColor" /> {trip.rating}
                                </span>
                                <span className="text-xs text-gray-400">({trip.rides} rides)</span>
                            </div>

                            {/* Route timeline */}
                            <div className="flex items-center gap-3 mt-3">
                                <div className="text-center">
                                    <p className="text-lg font-bold text-gray-900 leading-none">
                                        {trip.departTime} <span className="text-xs font-normal text-gray-500">{trip.departPeriod}</span>
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">{trip.from}</p>
                                </div>
                                <div className="flex-1 flex flex-col items-center gap-0.5">
                                    <span className="text-xs text-gray-400">{trip.duration}</span>
                                    <div className="flex items-center gap-1 w-full">
                                        <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                                        <div className="flex-1 border-t border-dashed border-gray-300" />
                                        <span className="text-xs text-gray-400">{trip.distance}</span>
                                        <div className="flex-1 border-t border-dashed border-gray-300" />
                                        <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                                    </div>
                                    <span className="text-xs text-gray-400">&nbsp;</span>
                                </div>
                                <div className="text-center">
                                    <p className="text-lg font-bold text-gray-900 leading-none">
                                        {trip.arriveTime} <span className="text-xs font-normal text-gray-500">{trip.arrivePeriod}</span>
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">{trip.to}</p>
                                </div>
                            </div>

                            {/* Meta row */}
                            <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                                <span className="flex items-center gap-1 text-xs text-gray-500">
                                    <Users size={12} /> {trip.seatsLeft} seats left
                                </span>
                                <span className="flex items-center gap-1 text-xs text-gray-500">
                                    <User size={12} /> {trip.genderLabel}
                                </span>
                                {trip.via && (
                                    <span className="text-xs text-blue-500 font-medium">{trip.via}</span>
                                )}
                            </div>
                        </div>

                        {/* Price & CTA */}
                        <div className="shrink-0 flex flex-col items-end gap-2 ml-2">
                            {trip.badge && (
                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${trip.badge === 'WOMEN ONLY'
                                        ? 'bg-rose-100 text-rose-600'
                                        : 'bg-blue-100 text-blue-600'
                                    }`}>
                                    {trip.badge}
                                </span>
                            )}
                            <div className="text-right">
                                <p className="text-2xl font-bold text-gray-900">₹{trip.price}</p>
                                <p className="text-xs text-gray-400">per seat</p>
                            </div>
                            <Link href={`/trip/${trip.id}`}>
                                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition">
                                    View Ride
                                </button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function FindARidePage() {
    const [from, setFrom] = useState('Kozhikode')
    const [to, setTo] = useState('Bangalore')
    const [date, setDate] = useState('2026-05-14')
    const [passengers, setPassengers] = useState(1)
    const [sortBy, setSortBy] = useState('Price: Low')
    const [showAll, setShowAll] = useState(false)

    const [filters, setFilters] = useState({
        womenOnly: false,
        verifiedOnly: false,
        maxPrice: 1000,
        times: [],
        seats: 0,
        vehicles: ['Sedan', 'SUV'] as string[],
    })

    const resetFilters = () => setFilters({
        womenOnly: false, verifiedOnly: false, maxPrice: 1000,
        times: [], seats: 0, vehicles: [],
    })

    // Apply filters
    let results = TRIPS.filter(t => {
        if (filters.womenOnly && t.badge !== 'WOMEN ONLY') return false
        if (filters.verifiedOnly && !t.verified) return false
        if (t.price > filters.maxPrice) return false
        if (filters.seats > 0 && t.seatsLeft < filters.seats) return false
        return true
    })

    // Sort
    if (sortBy === 'Price: Low') results = [...results].sort((a, b) => a.price - b.price)
    else if (sortBy === 'Price: High') results = [...results].sort((a, b) => b.price - a.price)
    else if (sortBy === 'Rating') results = [...results].sort((a, b) => b.rating - a.rating)
    else if (sortBy === 'Earliest') results = [...results].sort((a, b) => a.departTime.localeCompare(b.departTime))

    const displayed = showAll ? results : results.slice(0, 4)

    return (
        <div className="space-y-5">
            {/* ── Search Bar ── */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
                <div className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-3 items-end">
                    {/* From */}
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">From</label>
                        <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2.5 focus-within:ring-2 focus-within:ring-blue-500 transition">
                            <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                            <input value={from} onChange={e => setFrom(e.target.value)}
                                className="flex-1 text-sm text-gray-900 outline-none placeholder-gray-400 bg-transparent" />
                        </div>
                    </div>

                    {/* To */}
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">To</label>
                        <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2.5 focus-within:ring-2 focus-within:ring-blue-500 transition">
                            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                            <input value={to} onChange={e => setTo(e.target.value)}
                                className="flex-1 text-sm text-gray-900 outline-none placeholder-gray-400 bg-transparent" />
                        </div>
                    </div>

                    {/* Date */}
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">Date</label>
                        <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2.5 focus-within:ring-2 focus-within:ring-blue-500 transition">
                            <Calendar size={14} className="text-gray-400 shrink-0" />
                            <input type="date" value={date} onChange={e => setDate(e.target.value)}
                                className="text-sm text-gray-700 outline-none bg-transparent" />
                        </div>
                    </div>

                    {/* Passengers */}
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">Passengers</label>
                        <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2.5 focus-within:ring-2 focus-within:ring-blue-500 transition">
                            <User size={14} className="text-gray-400 shrink-0" />
                            <select value={passengers} onChange={e => setPassengers(Number(e.target.value))}
                                className="text-sm text-gray-700 outline-none bg-transparent cursor-pointer">
                                {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n} Passenger{n > 1 ? 's' : ''}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Search CTA */}
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition h-[42px]">
                        <Search size={15} /> Search
                    </button>
                </div>
            </div>

            {/* ── Results area ── */}
            <div className="flex gap-5 items-start">
                {/* Filters */}
                <FilterSidebar filters={filters} setFilters={setFilters} onReset={resetFilters} />

                {/* Trip list */}
                <div className="flex-1 space-y-3">
                    {/* Results header */}
                    <div className="flex items-center justify-between">
                        <p className="text-gray-900 font-semibold text-sm">
                            {results.length} trip{results.length !== 1 ? 's' : ''} found
                        </p>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Sort by:</span>
                            <div className="flex items-center gap-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 bg-white cursor-pointer hover:bg-gray-50">
                                <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                                    className="outline-none bg-transparent cursor-pointer text-xs text-gray-700">
                                    {['Price: Low', 'Price: High', 'Rating', 'Earliest'].map(s =>
                                        <option key={s} value={s}>{s}</option>
                                    )}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Cards */}
                    {displayed.length > 0 ? (
                        displayed.map(trip => <TripCard key={trip.id} trip={trip} />)
                    ) : (
                        <div className="bg-white border border-gray-200 rounded-lg p-10 text-center">
                            <p className="text-gray-400 text-sm">No trips match your filters.</p>
                            <button onClick={resetFilters} className="mt-3 text-blue-600 text-sm hover:underline">
                                Clear filters
                            </button>
                        </div>
                    )}

                    {/* Load more */}
                    {results.length > 4 && !showAll && (
                        <button
                            onClick={() => setShowAll(true)}
                            className="w-full py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition font-medium"
                        >
                            Load more trips
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
