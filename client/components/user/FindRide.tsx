'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
    Search, SlidersHorizontal, Star, Users, Car,
    MapPin, Calendar, User, ArrowRight, ArrowLeftRight,
    RotateCcw, ShieldCheck, AlertCircle, Loader2, ChevronDown
} from 'lucide-react'
import api from '@/lib/api'

interface Suggestion {
    display_name: string
    lat: string
    lon: string
    type: string
}

interface Waypoint {
    name: string
    order: number
    coords: [number, number]
    distanceFromStart: number
}

interface Trip {
    id: string
    driver: string
    avatar: string
    rating: number
    rides: number
    from: string
    to: string
    fullFrom: string
    fullTo: string
    departTime: string
    departureDate: string
    price: number
    fullPrice: number
    seatsLeft: number
    totalSeats: number
    genderLabel: string
    badge?: 'MATCH' | 'WOMEN ONLY'
    verified: boolean
    womenOnly: boolean
    distanceKm: number
    totalDistanceKm: number
    fromOrder: number
    toOrder: number
    fromWaypointName: string
    toWaypointName: string
    waypoints: Waypoint[]
}

const DEPARTURE_TIMES = ['Morning', 'Afternoon', 'Evening', 'Night']
const VEHICLE_TYPES = ['Hatchback', 'Sedan', 'SUV']

async function searchLocations(query: string): Promise<Suggestion[]> {
    if (!query.trim() || query.length < 2) return []

    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', India')}&format=json&limit=5&addressdetails=1`,
            { headers: { 'User-Agent': 'RideSharePro/1.0' } }
        )
        if (!res.ok) return []
        const data = await res.json()
        return data.map((item: any) => ({
            display_name: item.display_name,
            lat: item.lat,
            lon: item.lon,
            type: item.type
        }))
    } catch (error) {
        return []
    }
}

function LocationInput({ value, onChange, placeholder, icon }: {
    value: string; onChange: (val: string) => void; placeholder: string; icon: React.ReactNode
}) {
    const [suggestions, setSuggestions] = useState<Suggestion[]>([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const debounceRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        if (value.length < 2) {
            setSuggestions([])
            setShowSuggestions(false)
            return
        }
        setIsLoading(true)
        debounceRef.current = setTimeout(async () => {
            const results = await searchLocations(value)
            setSuggestions(results)
            setShowSuggestions(results.length > 0)
            setIsLoading(false)
        }, 300)
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    }, [value])

    const selectLocation = (suggestion: Suggestion) => {
        onChange(suggestion.display_name.split(',')[0])
        setShowSuggestions(false)
        setSuggestions([])
    }

    return (
        <div className="relative">
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2.5 focus-within:ring-2 focus-within:ring-blue-500 transition">
                {icon}
                <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                    className="flex-1 text-sm text-gray-900 outline-none placeholder-gray-400 bg-transparent" />
                {isLoading && <Loader2 size={14} className="text-gray-400 animate-spin" />}
            </div>
            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {suggestions.map((s, idx) => (
                        <button key={idx} onClick={() => selectLocation(s)}
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 transition flex items-start gap-2 border-b border-gray-100 last:border-0">
                            <MapPin size={14} className="text-gray-400 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-sm text-gray-900">{s.display_name.split(',')[0]}</p>
                                <p className="text-xs text-gray-400">{s.display_name.split(',').slice(1, 3).join(',')}</p>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

function FilterSidebar({ filters, setFilters, onReset }: { filters: any; setFilters: (f: any) => void; onReset: () => void }) {
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

            <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Trip Type</p>
                <label className="flex items-center gap-2 text-sm text-gray-700 mb-1.5 cursor-pointer">
                    <input type="checkbox" checked={filters.womenOnly}
                        onChange={e => setFilters({ ...filters, womenOnly: e.target.checked })} className="accent-blue-600" />
                    Women Only
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={filters.verifiedOnly}
                        onChange={e => setFilters({ ...filters, verifiedOnly: e.target.checked })} className="accent-blue-600" />
                    Verified Drivers
                </label>
            </div>

            <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Price Range</p>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>₹0</span><span>₹{filters.maxPrice.toLocaleString()}</span>
                </div>
                <input type="range" min={100} max={2000} value={filters.maxPrice}
                    onChange={e => setFilters({ ...filters, maxPrice: Number(e.target.value) })}
                    className="w-full accent-blue-600 cursor-pointer" />
            </div>

            <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Departure Time</p>
                <div className="grid grid-cols-2 gap-1.5">
                    {DEPARTURE_TIMES.map(t => (
                        <button key={t} onClick={() => {
                            const times = filters.times.includes(t)
                                ? filters.times.filter((x: string) => x !== t)
                                : [...filters.times, t]
                            setFilters({ ...filters, times })
                        }} className={`text-xs py-1.5 rounded-lg border transition font-medium ${filters.times.includes(t)
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Seats Available</p>
                <div className="flex gap-2">
                    {[1, 2, 3].map(n => (
                        <button key={n} onClick={() => setFilters({ ...filters, seats: filters.seats === n ? 0 : n })}
                            className={`w-9 h-9 rounded-lg border text-sm font-semibold transition ${filters.seats === n
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                            {n}+
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Vehicle Type</p>
                <div className="space-y-1.5">
                    {VEHICLE_TYPES.map(v => (
                        <label key={v} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                            <input type="checkbox" checked={filters.vehicles.includes(v)}
                                onChange={e => {
                                    const vehicles = e.target.checked
                                        ? [...filters.vehicles, v]
                                        : filters.vehicles.filter((x: string) => x !== v)
                                    setFilters({ ...filters, vehicles })
                                }} className="accent-blue-600" />
                            {v}
                        </label>
                    ))}
                </div>
            </div>
        </aside>
    )
}

function TripCard({ trip, searchFrom, searchTo, searchDate }: { 
    trip: Trip
    searchFrom: string
    searchTo: string
    searchDate: string
}) {
    const [showWaypoints, setShowWaypoints] = useState(false)
    
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
    
    const parseTime = (timeStr: string) => {
        const [hour, minute] = timeStr.split(':')
        const h = parseInt(hour)
        const period = h >= 12 ? 'PM' : 'AM'
        const displayHour = h % 12 || 12
        return `${displayHour}:${minute} ${period}`
    }

    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition overflow-hidden">
            <div className="flex">
                {trip.badge && (
                    <div className={`w-1.5 shrink-0 ${trip.badge === 'WOMEN ONLY' ? 'bg-rose-500' : 'bg-blue-600'}`} />
                )}
                <div className="flex-1 p-4">
                    <div className="flex items-start gap-4">
                        <div className="shrink-0">
                            <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center">
                                {trip.avatar}
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-gray-900 text-sm">{trip.driver}</span>
                                {trip.verified && <ShieldCheck size={13} className="text-blue-500" />}
                                <span className="flex items-center gap-0.5 text-xs text-amber-500 font-medium">
                                    <Star size={11} fill="currentColor" /> {trip.rating}
                                </span>
                            </div>
                            
                            <div className="mt-2">
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="font-semibold text-gray-900">{trip.fromWaypointName || trip.from}</span>
                                    <ArrowRight size={12} className="text-gray-400" />
                                    <span className="font-semibold text-gray-900">{trip.toWaypointName || trip.to}</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    Full route: {trip.fullFrom} → {trip.fullTo}
                                </p>
                            </div>
                            
                            {trip.waypoints && trip.waypoints.length > 2 && (
                                <div className="mt-2">
                                    <button 
                                        onClick={() => setShowWaypoints(!showWaypoints)}
                                        className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-600"
                                    >
                                        <ChevronDown size={10} className={`transition-transform ${showWaypoints ? 'rotate-180' : ''}`} />
                                        {showWaypoints ? 'Hide' : 'Show'} route stops
                                    </button>
                                    {showWaypoints && (
                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {trip.waypoints.map((wp, idx) => (
                                                <span key={idx} className={`text-[9px] px-2 py-0.5 rounded-full ${
                                                    wp.order === trip.fromOrder ? 'bg-green-100 text-green-700' :
                                                    wp.order === trip.toOrder ? 'bg-red-100 text-red-700' :
                                                    'bg-gray-100 text-gray-500'
                                                }`}>
                                                    {wp.name}
                                                    {wp.order === trip.fromOrder && ' (Board)'}
                                                    {wp.order === trip.toOrder && ' (Alight)'}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            <div className="flex items-center gap-3 mt-3">
                                <div className="text-center">
                                    <p className="text-sm font-bold text-gray-900">
                                        {parseTime(trip.departTime)}
                                    </p>
                                    <p className="text-[10px] text-gray-400">{formatDate(trip.departureDate)}</p>
                                </div>
                                <div className="flex-1 flex flex-col items-center gap-0.5">
                                    <span className="text-[10px] text-gray-400">{trip.distanceKm} km</span>
                                    <div className="flex items-center gap-1 w-full">
                                        <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                                        <div className="flex-1 border-t border-dashed border-gray-300" />
                                        <span className="text-[10px] text-gray-400">segment</span>
                                        <div className="flex-1 border-t border-dashed border-gray-300" />
                                        <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                                    </div>
                                    <span className="text-[10px] text-gray-400">of {trip.totalDistanceKm} km</span>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                                <span className="flex items-center gap-1 text-xs text-gray-500">
                                    <Users size={12} /> {trip.seatsLeft} seats left
                                </span>
                                {trip.womenOnly && (
                                    <span className="text-[10px] font-medium bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full">
                                        Women Only
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-2 ml-2">
                            <div className="text-right">
                                <p className="text-xs text-gray-400 line-through">₹{trip.fullPrice}</p>
                                <p className="text-2xl font-bold text-blue-600">₹{trip.price}</p>
                                <p className="text-[10px] text-gray-400">for {trip.distanceKm}km</p>
                            </div>
                            <Link href={`/trip/${trip.id}?from=${encodeURIComponent(searchFrom)}&to=${encodeURIComponent(searchTo)}&date=${searchDate}`}>
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

export default function FindARidePage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [initialLoadDone, setInitialLoadDone] = useState(false)

    const [from, setFrom] = useState('')
    const [to, setTo] = useState('')
    const [date, setDate] = useState('')
    const [passengers, setPassengers] = useState(1)
    const [sortBy, setSortBy] = useState('Price: Low')
    const [showAll, setShowAll] = useState(false)
    const [searched, setSearched] = useState(false)
    const [loading, setLoading] = useState(false)
    const [trips, setTrips] = useState<Trip[]>([])
    const [error, setError] = useState('')

    const [filters, setFilters] = useState({
        womenOnly: false,
        verifiedOnly: false,
        maxPrice: 1000,
        times: [] as string[],
        seats: 0,
        vehicles: ['Sedan', 'SUV'] as string[],
    })

    // Swap from and to
    const swapLocations = () => {
        const tempFrom = from
        const tempTo = to
        setFrom(tempTo)
        setTo(tempFrom)
        
        // If search was already performed, search again with swapped values
        if (searched) {
            setTimeout(() => {
                performSearch(filters, true)
            }, 100)
        }
    }

    const performSearch = async (currentFilters = filters, updateUrl = true) => {
        if (!from || !to) return
        setLoading(true)
        setError('')
        setSearched(true)

        if (updateUrl) {
            const urlParams = new URLSearchParams()
            if (from) urlParams.set('from', from)
            if (to) urlParams.set('to', to)
            if (date) urlParams.set('date', date)
            if (passengers > 1) urlParams.set('passengers', passengers.toString())
            if (currentFilters.womenOnly) urlParams.set('womenOnly', 'true')
            if (currentFilters.maxPrice !== 1000) urlParams.set('maxPrice', currentFilters.maxPrice.toString())
            router.replace(`/search?${urlParams.toString()}`, { scroll: false })
        }

        try {
            const params = new URLSearchParams({ 
                from, 
                to, 
                passengers: passengers.toString(), 
                maxPrice: currentFilters.maxPrice.toString(), 
                womenOnly: currentFilters.womenOnly.toString() 
            })
            if (date) params.append('date', date)
            const response = await api.get(`/trips/search?${params}`)
            if (response.data.success) {
                let results = response.data.data || []
                if (currentFilters.verifiedOnly) results = results.filter((t: Trip) => t.verified)
                if (currentFilters.seats > 0) results = results.filter((t: Trip) => t.seatsLeft >= currentFilters.seats)
                if (sortBy === 'Price: Low') results.sort((a, b) => a.price - b.price)
                else if (sortBy === 'Price: High') results.sort((a, b) => b.price - a.price)
                else if (sortBy === 'Rating') results.sort((a, b) => b.rating - a.rating)
                setTrips(results)
                if (results.length === 0) setError('No trips found')
            }
        } catch (error: any) {
            setError(error.response?.data?.message || 'Failed to search trips')
            setTrips([])
        } finally {
            setLoading(false)
        }
    }

    const handleSearch = async () => {
        if (!from || !to) {
            setError('Please enter both origin and destination')
            return
        }
        await performSearch(filters, true)
    }

    const resetFilters = () => {
        const newFilters = { womenOnly: false, verifiedOnly: false, maxPrice: 1000, times: [], seats: 0, vehicles: [] }
        setFilters(newFilters)
        if (searched) performSearch(newFilters, true)
    }

    // Load from URL params only once on mount
    useEffect(() => {
        const fromParam = searchParams.get('from')
        const toParam = searchParams.get('to')
        const dateParam = searchParams.get('date')
        const passengersParam = searchParams.get('passengers')
        const womenOnlyParam = searchParams.get('womenOnly')
        const maxPriceParam = searchParams.get('maxPrice')

        if (fromParam) setFrom(fromParam)
        if (toParam) setTo(toParam)
        if (dateParam) setDate(dateParam)
        if (passengersParam) setPassengers(parseInt(passengersParam))
        if (womenOnlyParam === 'true') setFilters(prev => ({ ...prev, womenOnly: true }))
        if (maxPriceParam) setFilters(prev => ({ ...prev, maxPrice: parseInt(maxPriceParam) }))

        if (!dateParam && !date) {
            setDate(new Date().toISOString().split('T')[0])
        }

        if (!initialLoadDone && fromParam && toParam) {
            setInitialLoadDone(true)
            setTimeout(() => {
                performSearch(filters, false)
            }, 100)
        }
    }, [])

    const displayed = showAll ? trips : trips.slice(0, 4)

    return (
        <div className="space-y-5">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
                <div className="grid grid-cols-[1fr_auto_1fr_auto_auto_auto] gap-3 items-end">
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">From</label>
                        <LocationInput value={from} onChange={setFrom} placeholder="Enter origin city" icon={<span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />} />
                    </div>
                    
                    {/* Swap Button */}
                    <div className="mb-1">
                        <button
                            onClick={swapLocations}
                            type="button"
                            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 hover:text-blue-600 transition"
                            title="Swap locations"
                        >
                            <ArrowLeftRight size={16} />
                        </button>
                    </div>
                    
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">To</label>
                        <LocationInput value={to} onChange={setTo} placeholder="Enter destination city" icon={<span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />} />
                    </div>
                    
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">Date</label>
                        <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2.5 focus-within:ring-2 focus-within:ring-blue-500 transition">
                            <Calendar size={14} className="text-gray-400 shrink-0" />
                            <input type="date" value={date} onChange={e => setDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className="text-sm text-gray-700 outline-none bg-transparent" />
                        </div>
                    </div>
                    
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
                    
                    <button onClick={handleSearch} disabled={loading}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-lg transition h-[42px]">
                        {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
                        {loading ? 'Searching...' : 'Search'}
                    </button>
                </div>
            </div>

            {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3"><p className="text-red-600 text-sm">{error}</p></div>}

            <div className="flex gap-5 items-start">
                <FilterSidebar filters={filters} setFilters={setFilters} onReset={resetFilters} />
                <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-gray-900 font-semibold text-sm">
                            {loading ? 'Searching...' : `${trips.length} trip${trips.length !== 1 ? 's' : ''} found`}
                        </p>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Sort by:</span>
                            <div className="flex items-center gap-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 bg-white cursor-pointer hover:bg-gray-50">
                                <select value={sortBy} onChange={e => { setSortBy(e.target.value); if (searched) performSearch(filters, false) }}
                                    className="outline-none bg-transparent cursor-pointer text-xs text-gray-700">
                                    {['Price: Low', 'Price: High', 'Rating', 'Earliest'].map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {!searched ? (
                        <div className="bg-white border border-gray-200 rounded-lg p-10 text-center">
                            <Search size={32} className="text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 text-sm">Enter your journey details and click Search</p>
                        </div>
                    ) : loading ? (
                        <div className="bg-white border border-gray-200 rounded-lg p-10 text-center">
                            <Loader2 size={32} className="text-blue-500 mx-auto mb-3 animate-spin" />
                            <p className="text-gray-500 text-sm">Searching for trips...</p>
                        </div>
                    ) : displayed.length > 0 ? (
                        displayed.map(trip => (
                            <TripCard 
                                key={trip.id} 
                                trip={trip} 
                                searchFrom={from} 
                                searchTo={to} 
                                searchDate={date} 
                            />
                        ))
                    ) : (
                        <div className="bg-white border border-gray-200 rounded-lg p-10 text-center">
                            <AlertCircle size={32} className="text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 text-sm">No trips found from {from} to {to}</p>
                            <button onClick={resetFilters} className="mt-3 text-blue-600 text-sm hover:underline">Try different filters</button>
                        </div>
                    )}

                    {trips.length > 4 && !showAll && !loading && (
                        <button onClick={() => setShowAll(true)}
                            className="w-full py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition font-medium">
                            Load more trips
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}