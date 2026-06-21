'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import {
  Minus, Plus, Fuel, TrendingUp, MapPin, CheckCircle2, ChevronRight, Loader2, X, PlusCircle, Car,
} from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { useSocket } from '@/hooks/useSocket'

// ✅ Leaflet must be loaded client-side only — Next.js SSR will break it otherwise
const TripMap = dynamic(() => import('@/components/maps/TripMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center">
      <div className="flex flex-col items-center gap-2 text-gray-400">
        <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        <span className="text-xs font-medium">Loading map...</span>
      </div>
    </div>
  ),
})

interface Suggestion {
  display_name: string
  lat: string
  lon: string
  type: string
}

interface Waypoint {
  name: string
  lat: number
  lon: number
  order: number
  distanceFromStart: number
}

// ─── Mock Indian cities for fallback when Nominatim fails ────────────────────
const MOCK_CITIES = [
  { name: 'Kozhikode', state: 'Kerala', lat: '11.2588', lon: '75.7804' },
  { name: 'Kochi', state: 'Kerala', lat: '9.9312', lon: '76.2673' },
  { name: 'Thiruvananthapuram', state: 'Kerala', lat: '8.5241', lon: '76.9366' },
  { name: 'Kannur', state: 'Kerala', lat: '11.8745', lon: '75.3704' },
  { name: 'Kasaragod', state: 'Kerala', lat: '12.4996', lon: '74.9869' },
  { name: 'Bangalore', state: 'Karnataka', lat: '12.9716', lon: '77.5946' },
  { name: 'Mumbai', state: 'Maharashtra', lat: '19.0760', lon: '72.8777' },
  { name: 'Chennai', state: 'Tamil Nadu', lat: '13.0827', lon: '80.2707' },
  { name: 'Delhi', state: 'Delhi', lat: '28.6139', lon: '77.2090' },
  { name: 'Hyderabad', state: 'Telangana', lat: '17.3850', lon: '78.4867' },
  { name: 'Pune', state: 'Maharashtra', lat: '18.5204', lon: '73.8567' },
  { name: 'Jaipur', state: 'Rajasthan', lat: '26.9124', lon: '75.7873' },
  { name: 'Ahmedabad', state: 'Gujarat', lat: '23.0225', lon: '72.5714' },
  { name: 'Lucknow', state: 'Uttar Pradesh', lat: '26.8467', lon: '80.9462' },
  { name: 'Kolkata', state: 'West Bengal', lat: '22.5726', lon: '88.3639' },
  { name: 'Coimbatore', state: 'Tamil Nadu', lat: '11.0168', lon: '76.9558' },
  { name: 'Thrissur', state: 'Kerala', lat: '10.5276', lon: '76.2144' },
  { name: 'Malappuram', state: 'Kerala', lat: '11.0510', lon: '76.0711' },
  { name: 'Palakkad', state: 'Kerala', lat: '10.7867', lon: '76.6548' },
  { name: 'Wayanad', state: 'Kerala', lat: '11.6854', lon: '76.1320' },
]

// ─── Search using Nominatim with fallback ──────────────────────────────────────
async function searchLocations(query: string): Promise<Suggestion[]> {
  if (!query.trim() || query.length < 2) return []

  // Try Nominatim first
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', India')}&format=json&limit=5&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'RideSharePro/1.0 (contact@ridesharepro.com)'
        },
        signal: controller.signal
      }
    )
    
    clearTimeout(timeoutId)
    
    if (res.ok) {
      const data = await res.json()
      if (data && data.length > 0) {
        return data.map((item: any) => ({
          display_name: item.display_name,
          lat: item.lat,
          lon: item.lon,
          type: item.type
        }))
      }
    }
  } catch (error) {
    console.log('Nominatim failed, using fallback')
  }

  // Fallback to mock data
  const filtered = MOCK_CITIES.filter(city => 
    city.name.toLowerCase().includes(query.toLowerCase()) ||
    city.state.toLowerCase().includes(query.toLowerCase())
  )

  return filtered.map(city => ({
    display_name: `${city.name}, ${city.state}, India`,
    lat: city.lat,
    lon: city.lon,
    type: 'city'
  }))
}

// ─── Haversine distance calculation ──────────────────────────────────────
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// ─── Calculate suggested price based on distance (₹3.5 per km) ────────────
function calculateSuggestedPrice(distanceKm: number): number {
  const basePrice = distanceKm * 3.5
  const minPrice = 50
  const maxPrice = 2000

  let price = Math.round(basePrice / 10) * 10

  if (price < minPrice) price = minPrice
  if (price > maxPrice) price = maxPrice

  return price
}

// ─── Autocomplete Input Component ────────────────────────────────────────────
function LocationInput({
  value,
  onChange,
  placeholder,
  onLocationSelect,
  icon,
  disabled = false
}: {
  value: string
  onChange: (val: string) => void
  placeholder: string
  onLocationSelect?: (lat: number, lon: number, name: string) => void
  icon?: React.ReactNode
  disabled?: boolean
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (disabled) return
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
    }, 500)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [value, disabled])

  const selectLocation = (suggestion: Suggestion) => {
    const locationName = suggestion.display_name.split(',')[0]
    onChange(locationName)
    if (onLocationSelect) {
      onLocationSelect(parseFloat(suggestion.lat), parseFloat(suggestion.lon), locationName)
    }
    setShowSuggestions(false)
    setSuggestions([])
  }

  return (
    <div className="relative flex-1">
      <div className={`flex items-center gap-2 border rounded-lg px-3 py-2.5 focus-within:ring-2 focus-within:ring-blue-500 transition ${disabled ? 'bg-gray-100 border-gray-200' : 'border-gray-200'
        }`}>
        {icon}
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`flex-1 text-sm text-gray-900 outline-none placeholder-gray-400 bg-transparent ${disabled ? 'cursor-not-allowed' : ''
            }`}
        />
        {isLoading && <Loader2 size={14} className="text-gray-400 animate-spin" />}
      </div>

      {!disabled && showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              onClick={() => selectLocation(s)}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 transition flex items-start gap-2 border-b border-gray-100 last:border-0"
            >
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

// ─── Waypoint Item Component ────────────────────────────────────────────────
function WaypointItem({ waypoint, index, onRemove, onUpdate }: {
  waypoint: Waypoint
  index: number
  onRemove: () => void
  onUpdate: (lat: number, lon: number, name: string) => void
}) {
  const [name, setName] = useState(waypoint.name)
  const [lat, setLat] = useState(waypoint.lat)
  const [lon, setLon] = useState(waypoint.lon)

  const handleLocationSelect = (newLat: number, newLon: number, newName: string) => {
    setLat(newLat)
    setLon(newLon)
    setName(newName)
    onUpdate(newLat, newLon, newName)
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col items-center">
        <div className="w-2 h-2 rounded-full bg-amber-400" />
        {index > 0 && <div className="w-px h-6 bg-gray-300" />}
      </div>
      <div className="flex-1">
        <LocationInput
          value={name}
          onChange={setName}
          onLocationSelect={handleLocationSelect}
          placeholder={`Stop ${index + 1}`}
          icon={<MapPin size={14} className="text-amber-500" />}
        />
      </div>
      <button
        onClick={onRemove}
        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
      >
        <X size={14} />
      </button>
    </div>
  )
}

function FareAnalysis({ price, distance }: { price: number; distance: number }) {
  const lowPerKm = 2.5
  const highPerKm = 4.5
  const yourRate = distance > 0 ? price / distance : 0

  const low = Math.round(distance * lowPerKm / 10) * 10
  const high = Math.round(distance * highPerKm / 10) * 10

  const finalLow = Math.max(50, low)
  const finalHigh = Math.max(100, high)

  let pct = 50
  if (distance > 0) {
    const range = highPerKm - lowPerKm
    const position = (yourRate - lowPerKm) / range
    pct = Math.min(95, Math.max(5, position * 100))
  }

  const fuelCost = Math.round(distance * 8)

  let demandLevel = 'Medium →'
  let demandColor = 'text-yellow-600'
  if (yourRate > 3.8) {
    demandLevel = 'High ↑'
    demandColor = 'text-green-600'
  } else if (yourRate < 3.2) {
    demandLevel = 'Low ↓'
    demandColor = 'text-red-500'
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-yellow-500 text-base">✦</span>
        <h3 className="font-semibold text-gray-900 text-sm">AI Fare Analysis</h3>
      </div>
      <div>
        <div className="flex justify-between text-xs text-gray-400 mb-1.5">
          <span>Low Demand (₹{lowPerKm}/km)</span>
          <span>High Demand (₹{highPerKm}/km)</span>
        </div>
        <div className="relative h-2 rounded-full bg-gradient-to-r from-blue-400 via-amber-400 to-rose-500">
          <div className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-full shadow transition-all"
            style={{ left: `${pct}%` }} />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1.5">
          <span>₹{finalLow}</span>
          <span className="text-blue-600 font-semibold">₹{price}</span>
          <span>₹{finalHigh}</span>
        </div>
        <p className="text-[10px] text-gray-500 text-center mt-2">
          Your rate: <span className="font-semibold text-blue-600">₹{yourRate.toFixed(2)}/km</span>
        </p>
      </div>
      <div className="space-y-2 text-sm border-t border-gray-100 pt-3">
        <div className="flex justify-between text-gray-600">
          <span className="flex items-center gap-1.5"><Fuel size={14} className="text-gray-400" /> Fuel Cost Estimate</span>
          <span className="font-semibold text-gray-900">₹{fuelCost}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span className="flex items-center gap-1.5"><TrendingUp size={14} className="text-gray-400" /> Current Demand</span>
          <span className={`font-semibold ${demandColor}`}>{demandLevel}</span>
        </div>
      </div>
    </div>
  )
}

function ProTips() {
  const tips = [
    'Setting a competitive price increases your chances of filling all seats by 40%.',
    'Allowing a small detour (up to 5km) significantly broadens your potential passenger pool.',
    'Adding intermediate stops helps passengers find more flexible booking options.',
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

export default function HostTrip() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const socket = useSocket()

  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [waypoints, setWaypoints] = useState<Waypoint[]>([])
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [seats, setSeats] = useState(3)
  const [price, setPrice] = useState(0)
  const [detour, setDetour] = useState(5)
  const [womenOnly, setWomenOnly] = useState(false)
  const [vehicleInfo, setVehicleInfo] = useState('')
  const [posting, setPosting] = useState(false)
  const [posted, setPosted] = useState(false)
  const [error, setError] = useState('')
  const [suggestedPrice, setSuggestedPrice] = useState(0)
  const [tripId, setTripId] = useState<string | null>(null)

  const [fromLat, setFromLat] = useState<number | null>(null)
  const [fromLon, setFromLon] = useState<number | null>(null)
  const [toLat, setToLat] = useState<number | null>(null)
  const [toLon, setToLon] = useState<number | null>(null)

  const [mapFrom, setMapFrom] = useState('')
  const [mapTo, setMapTo] = useState('')
  const fromTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Convert waypoints for map display
  const mapWaypoints = waypoints
    .filter(wp => wp.name && wp.lat && wp.lon)
    .map(wp => ({ name: wp.name, lat: wp.lat, lon: wp.lon }))

  const handleFromChange = (val: string) => {
    setFrom(val)
    if (fromTimerRef.current) clearTimeout(fromTimerRef.current)
    fromTimerRef.current = setTimeout(() => setMapFrom(val), 900)
  }

  const handleToChange = (val: string) => {
    setTo(val)
    if (toTimerRef.current) clearTimeout(toTimerRef.current)
    toTimerRef.current = setTimeout(() => setMapTo(val), 900)
  }

  const handleFromLocationSelect = (lat: number, lon: number, name: string) => {
    setFromLat(lat)
    setFromLon(lon)
    updateSuggestedPrice()
  }

  const handleToLocationSelect = (lat: number, lon: number, name: string) => {
    setToLat(lat)
    setToLon(lon)
    updateSuggestedPrice()
  }

  const updateSuggestedPrice = () => {
    const totalDist = calculateTotalDistance()
    if (totalDist > 0) {
      const suggested = calculateSuggestedPrice(totalDist)
      setSuggestedPrice(suggested)
      setPrice(suggested)
    }
  }

  const addWaypoint = () => {
    setWaypoints([...waypoints, {
      name: '',
      lat: 0,
      lon: 0,
      order: waypoints.length + 1,
      distanceFromStart: 0
    }])
  }

  const removeWaypoint = (index: number) => {
    setWaypoints(waypoints.filter((_, i) => i !== index))
    setTimeout(updateSuggestedPrice, 100)
  }

  const updateWaypoint = (index: number, lat: number, lon: number, name: string) => {
    const updated = [...waypoints]
    updated[index] = { ...updated[index], name, lat, lon }
    setWaypoints(updated)
    setTimeout(updateSuggestedPrice, 100)
  }

  const calculateTotalDistance = (): number => {
    let total = 0
    const allPoints = [
      { lat: fromLat, lon: fromLon },
      ...waypoints.map(w => ({ lat: w.lat, lon: w.lon })),
      { lat: toLat, lon: toLon }
    ]

    for (let i = 0; i < allPoints.length - 1; i++) {
      if (allPoints[i].lat && allPoints[i + 1].lat) {
        total += haversineDistance(
          allPoints[i].lat!, allPoints[i].lon!,
          allPoints[i + 1].lat!, allPoints[i + 1].lon!
        )
      }
    }
    return total
  }

  useEffect(() => {
    updateSuggestedPrice()
  }, [fromLat, fromLon, toLat, toLon, waypoints])

  const buildWaypointsArray = () => {
    const allWaypoints = []
    let cumulativeDistance = 0

    allWaypoints.push({
      name: from,
      lat: fromLat!,
      lon: fromLon!,
      order: 0,
      distanceFromStart: 0
    })

    for (let i = 0; i < waypoints.length; i++) {
      const wp = waypoints[i]
      const prevPoint = i === 0 ? { lat: fromLat!, lon: fromLon! } : waypoints[i - 1]
      const segmentDist = haversineDistance(
        wp.lat, wp.lon,
        prevPoint.lat, prevPoint.lon
      )
      cumulativeDistance += segmentDist
      allWaypoints.push({
        name: wp.name,
        lat: wp.lat,
        lon: wp.lon,
        order: i + 1,
        distanceFromStart: parseFloat(cumulativeDistance.toFixed(2))
      })
    }

    const lastPoint = waypoints.length > 0 ? waypoints[waypoints.length - 1] : null
    const finalSegment = lastPoint
      ? haversineDistance(toLat!, toLon!, lastPoint.lat, lastPoint.lon)
      : haversineDistance(toLat!, toLon!, fromLat!, fromLon!)
    cumulativeDistance += finalSegment

    allWaypoints.push({
      name: to,
      lat: toLat!,
      lon: toLon!,
      order: waypoints.length + 1,
      distanceFromStart: parseFloat(cumulativeDistance.toFixed(2))
    })

    return allWaypoints
  }

  const validateForm = () => {
    if (!from.trim()) {
      setError('Please enter your departure location')
      return false
    }
    if (!to.trim()) {
      setError('Please enter your destination')
      return false
    }
    if (!date) {
      setError('Please select a departure date')
      return false
    }
    if (!time) {
      setError('Please select a departure time')
      return false
    }
    if (fromLat === null || fromLon === null) {
      setError('Please select a valid departure location from suggestions')
      return false
    }
    if (toLat === null || toLon === null) {
      setError('Please select a valid destination from suggestions')
      return false
    }
    if (price <= 0) {
      setError('Please set a valid price per seat')
      return false
    }

    for (let i = 0; i < waypoints.length; i++) {
      const wp = waypoints[i]
      if (!wp.name.trim()) {
        setError(`Please enter a name for stop ${i + 1}`)
        return false
      }
      if (wp.lat === 0 || wp.lon === 0) {
        setError(`Please select a valid location for stop ${i + 1} from suggestions`)
        return false
      }
    }

    setError('')
    return true
  }

  const handlePost = async () => {
    if (!isAuthenticated || !user) {
      setError('Please login to host a trip')
      router.push('/login')
      return
    }

    if (!validateForm()) {
      return
    }

    setPosting(true)
    setError('')

    try {
      const waypointsArray = buildWaypointsArray()
      const totalDistance = calculateTotalDistance()

      const tripData = {
        from,
        to,
        fromLat: fromLat!,
        fromLon: fromLon!,
        toLat: toLat!,
        toLon: toLon!,
        departureDate: date,
        departureTime: time,
        totalSeats: seats,
        pricePerSeat: price,
        maxDetourKm: detour,
        womenOnly,
        waypoints: waypointsArray,
        totalDistanceKm: parseFloat(totalDistance.toFixed(2)),
        vehicleInfo: vehicleInfo
      }

      const response = await api.post('/trips', tripData)

      if (response.data.success) {
        const tripId = response.data.data._id
        setTripId(tripId)
        setPosted(true)

        // ─── Send notification via Socket.IO ──────────────────────────────
        if (socket) {
          // Notify admin about new trip
          socket.emit('notification:send', {
            userId: 'admin', // You might want to broadcast to all admins
            type: 'trip_created',
            title: 'New Trip Posted!',
            body: `${user.name} posted a trip from ${from} to ${to}`,
            link: `/admin/trips/${tripId}`,
            meta: {
              tripId,
              driverId: user.id,
              from,
              to,
              departureDate: date,
              departureTime: time,
              seats,
              price,
            },
          })

          // Broadcast to all users (or specific region)
          socket.emit('trip:new', {
            tripId,
            from,
            to,
            departureDate: date,
            departureTime: time,
            price,
            seats,
            driverName: user.name,
          })
        }

        setTimeout(() => {
          router.push(`/trip/${tripId}`)
        }, 1500)
      }
    } catch (error: any) {
      console.error('Failed to post trip:', error)
      setError(error.response?.data?.message || 'Failed to post trip. Please try again.')
      setPosting(false)
    }
  }

  const totalDistance = calculateTotalDistance()

  return (
    <div>
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

      <div className="grid grid-cols-[1fr_320px] gap-6 items-start">

        {/* LEFT column */}
        <div className="space-y-5">

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Route Details */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 space-y-4">
            <h2 className="font-semibold text-gray-900 text-sm">Route Details</h2>
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-green-500 shrink-0" />
                <LocationInput
                  value={from}
                  onChange={handleFromChange}
                  onLocationSelect={handleFromLocationSelect}
                  placeholder="Leaving from..."
                />
              </div>

              {waypoints.map((wp, index) => (
                <WaypointItem
                  key={index}
                  waypoint={wp}
                  index={index}
                  onRemove={() => removeWaypoint(index)}
                  onUpdate={(lat, lon, name) => updateWaypoint(index, lat, lon, name)}
                />
              ))}

              <button
                onClick={addWaypoint}
                className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700 mt-2 ml-6"
              >
                <PlusCircle size={14} />
                Add intermediate stop
              </button>

              <div className="ml-1 pl-px flex flex-col items-start gap-0">
                <div className="w-px h-3 bg-gray-300 ml-1" />
                <div className="w-2 h-2 rounded-full border-2 border-gray-300 ml-0.5" />
                <div className="w-px h-3 bg-gray-300 ml-1" />
              </div>

              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-red-500 shrink-0" />
                <LocationInput
                  value={to}
                  onChange={handleToChange}
                  onLocationSelect={handleToLocationSelect}
                  placeholder="Going to..."
                />
              </div>
            </div>

            {totalDistance > 0 && (
              <div className="mt-3 p-2 bg-gray-50 rounded-lg text-center">
                <p className="text-xs text-gray-500">
                  Total route distance: <span className="font-semibold text-gray-700">{totalDistance.toFixed(1)} km</span>
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Estimated travel time: ~{Math.round(totalDistance / 60)} hours
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              ⚠️ Please select locations from the suggestions to get accurate coordinates
            </p>
          </div>

          {/* Seats & Pricing */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 space-y-4">
            <h2 className="font-semibold text-gray-900 text-sm">Seats & Pricing</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-2 block">Available Seats</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setSeats(Math.max(1, seats - 1))}
                    className="w-9 h-9 rounded-lg border border-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-50 transition">
                    <Minus size={14} />
                  </button>
                  <span className="text-2xl font-bold text-gray-900 w-6 text-center">{seats}</span>
                  <button onClick={() => setSeats(Math.min(6, seats + 1))}
                    className="w-9 h-9 rounded-lg border border-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-50 transition">
                    <Plus size={14} />
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Maximum 6 seats</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-2 block">Price per Seat (₹)</label>
                <div className="flex items-center border border-gray-200 rounded-lg px-3 py-2.5 gap-1 focus-within:ring-2 focus-within:ring-blue-500 transition">
                  <span className="text-gray-500 text-sm">₹</span>
                  <input
                    type="number"
                    value={price}
                    onChange={e => setPrice(Number(e.target.value))}
                    className="bg-transparent flex-1 text-gray-900 font-semibold text-sm focus:outline-none w-16"
                  />
                </div>
                {totalDistance > 0 && (
                  <p className="text-[10px] text-gray-400 mt-1">
                    ₹3.5/km · Suggested: ₹{suggestedPrice} ({Math.round(price / totalDistance * 10) / 10} ₹/km)
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-lg p-3">
              <span className="text-blue-500 text-sm mt-0.5">✦</span>
              <div>
                <p className="text-blue-700 text-xs font-semibold">
                  AI Suggested: ₹{suggestedPrice} per seat
                </p>
                <p className="text-blue-500 text-xs mt-0.5">
                  Based on {totalDistance.toFixed(1)} km route at ₹3.5/km
                </p>
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
              <input type="range" min={0} max={20} value={detour}
                onChange={e => setDetour(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer" />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>0 km</span><span>20 km</span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <div>
                <p className="text-sm font-medium text-gray-900">Women Only</p>
                <p className="text-xs text-gray-500">Only visible to female passengers</p>
              </div>
              <button onClick={() => setWomenOnly(!womenOnly)}
                className={`relative w-11 h-6 rounded-full transition-colors ${womenOnly ? 'bg-blue-600' : 'bg-gray-200'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${womenOnly ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>

          {/* ── Vehicle Details ── */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 space-y-4">
            <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
              <Car size={16} className="text-gray-500" /> Vehicle Details
            </h2>
            <div>
              <label className="text-xs text-gray-500 mb-2 block">Your Vehicle (for this trip)</label>
              <input
                type="text"
                value={vehicleInfo}
                onChange={(e) => setVehicleInfo(e.target.value)}
                placeholder="e.g. Toyota Innova - White - KA-01-AB-1234"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
              <p className="text-[10px] text-gray-400 mt-1.5">
                This will be shown to passengers when they book your ride
              </p>
            </div>
          </div>

          {/* Post Trip CTA */}
          <button onClick={handlePost} disabled={posting || posted}
            className={`w-full py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition ${posted ? 'bg-green-600 text-white cursor-default'
              : posting ? 'bg-blue-400 text-white cursor-wait'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}>
            {posted ? <><CheckCircle2 size={16} /> Trip Posted Successfully!</>
              : posting ? <><Loader2 size={16} className="animate-spin" /> Posting Trip...</>
                : <>Post Trip <ChevronRight size={16} /></>}
          </button>
        </div>

        {/* RIGHT column */}
        <div className="space-y-4">
          <TripMap from={mapFrom} to={mapTo} waypoints={mapWaypoints} />
          <FareAnalysis price={price} distance={totalDistance} />
          <ProTips />
        </div>
      </div>
    </div>
  )
}