'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Layers, Crosshair, Navigation, ZoomIn, ZoomOut } from 'lucide-react'

interface ActiveTripMapProps {
  from: string
  to: string
  currentLocation?: string
  progressPct?: number
  passengerCount?: number
  distanceKm?: number
  etaHours?: number
}

const TILES = {
  dark:      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  street:    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
}

async function geocode(place: string): Promise<[number, number] | null> {
  if (!place?.trim()) return null
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place + ', India')}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'en' } }
    )
    const data = await res.json()
    if (!data.length) return null
    return [parseFloat(data[0].lat), parseFloat(data[0].lon)]
  } catch { return null }
}

function lerp(a: [number, number], b: [number, number], t: number): [number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
}

export default function ActiveTripMap({
  from, to, progressPct = 40, passengerCount = 2, distanceKm, etaHours,
}: ActiveTripMapProps) {
  const mapDivRef    = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<any>(null)
  const leafletRef   = useRef<any>(null)
  const tileRef      = useRef<any>(null)
  const routeRef     = useRef<any>(null)
  const glowRef      = useRef<any>(null)
  const coveredRef   = useRef<any>(null)
  const markersRef   = useRef<any[]>([])
  const carMarkerRef = useRef<any>(null)

  const [tileStyle, setTileStyle]       = useState<keyof typeof TILES>('dark')
  const [mapReady, setMapReady]         = useState(false)
  const [realDist, setRealDist]         = useState<number | null>(distanceKm || null)
  const [realEta, setRealEta]           = useState<number | null>(etaHours   || null)
  const [toast, setToast]               = useState('')
  const [liveProgress, setLiveProgress] = useState(progressPct)
  const [startCoords, setStartCoords]   = useState<[number, number] | null>(null)
  const [endCoords, setEndCoords]       = useState<[number, number] | null>(null)
  const [isTracking, setIsTracking]     = useState(false)
  const [userCoords, setUserCoords]     = useState<[number, number] | null>(null)
  const [dashOffset, setDashOffset]     = useState(0)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }, [])

  // Init Leaflet
  useEffect(() => {
    if (typeof window === 'undefined' || mapRef.current || !mapDivRef.current) return
    import('leaflet').then(mod => {
      const L = mod.default
      leafletRef.current = L
      const container = mapDivRef.current!
      if ((container as any)._leaflet_id) (container as any)._leaflet_id = null
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })
      const map = L.map(container, { center: [12.9716, 77.5946], zoom: 6, zoomControl: false, attributionControl: false })
      tileRef.current = L.tileLayer(TILES.dark, { maxZoom: 19 }).addTo(map)
      mapRef.current = map
      setMapReady(true)
    })
    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; setMapReady(false) }
    }
  }, [])

  // Tile switch
  useEffect(() => { tileRef.current?.setUrl(TILES[tileStyle]) }, [tileStyle])

  // Animate dashes
  useEffect(() => {
    const t = setInterval(() => setDashOffset(p => (p + 1) % 20), 60)
    return () => clearInterval(t)
  }, [])
  useEffect(() => { routeRef.current?.setStyle?.({ dashOffset: String(-dashOffset) }) }, [dashOffset])

  // Live progress creep
  useEffect(() => {
    const t = setInterval(() => setLiveProgress(p => Math.min(p + 0.05, 99)), 3000)
    return () => clearInterval(t)
  }, [])

  // Move car marker
  useEffect(() => {
    if (!startCoords || !endCoords || !carMarkerRef.current) return
    carMarkerRef.current.setLatLng(lerp(startCoords, endCoords, liveProgress / 100))
  }, [liveProgress, startCoords, endCoords])

  // Draw route
  useEffect(() => {
    if (!mapReady || !mapRef.current || !leafletRef.current || !from || !to) return
    const L = leafletRef.current

    routeRef.current?.remove()
    glowRef.current?.remove()
    coveredRef.current?.remove()
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
    carMarkerRef.current?.remove()

    const run = async () => {
      const [startC, endC] = await Promise.all([geocode(from), geocode(to)])
      if (!startC || !endC) { showToast('Could not geocode route.'); return }
      setStartCoords(startC)
      setEndCoords(endC)

      const R = 6371
      const dLat = ((endC[0]-startC[0])*Math.PI/180)
      const dLon = ((endC[1]-startC[1])*Math.PI/180)
      const a = Math.sin(dLat/2)**2 + Math.cos(startC[0]*Math.PI/180)*Math.cos(endC[0]*Math.PI/180)*Math.sin(dLon/2)**2
      const dist = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)))
      if (!distanceKm) setRealDist(dist)
      if (!etaHours)   setRealEta(parseFloat((dist/60).toFixed(1)))

      const carPos = lerp(startC, endC, liveProgress / 100)

      // Outer glow
      glowRef.current = L.polyline([startC, endC], {
        color: '#3b82f6', weight: 22, opacity: 0.07, lineCap: 'round',
      }).addTo(mapRef.current)

      // Completed segment
      coveredRef.current = L.polyline([startC, carPos], {
        color: '#1e40af', weight: 5, opacity: 0.8, lineCap: 'round',
      }).addTo(mapRef.current)

      // Remaining dashes
      routeRef.current = L.polyline([carPos, endC], {
        color: '#60a5fa', weight: 3.5,
        dashArray: '10 6', dashOffset: '0',
        lineCap: 'round', opacity: 0.9,
      }).addTo(mapRef.current)

      // Start pin
      const startIcon = L.divIcon({
        className: '',
        html: `<div style="display:flex;flex-direction:column;align-items:center;gap:3px">
          <div style="width:13px;height:13px;border-radius:50%;background:#22c55e;border:3px solid white;
            box-shadow:0 0 0 4px rgba(34,197,94,0.25)"></div>
          <div style="font-size:9px;font-weight:900;color:#22c55e;background:rgba(0,0,0,0.7);
            border-radius:4px;padding:2px 6px">${from.split(',')[0].substring(0,12)}</div>
        </div>`,
        iconSize: [90, 32], iconAnchor: [45, 7],
      })

      // End pin
      const endIcon = L.divIcon({
        className: '',
        html: `<div style="display:flex;flex-direction:column;align-items:center;gap:3px">
          <div style="width:13px;height:13px;border-radius:50%;background:#ef4444;border:3px solid white;
            box-shadow:0 0 0 4px rgba(239,68,68,0.25)"></div>
          <div style="font-size:9px;font-weight:900;color:#ef4444;background:rgba(0,0,0,0.7);
            border-radius:4px;padding:2px 6px">${to.split(',')[0].substring(0,12)}</div>
        </div>`,
        iconSize: [90, 32], iconAnchor: [45, 7],
      })

      // AI Pickup pin
      const pickupIcon = L.divIcon({
        className: '',
        html: `<div style="background:#1e293b;color:#fbbf24;font-size:9px;font-weight:900;
          padding:4px 8px;border-radius:20px;border:1px solid #fbbf24;white-space:nowrap">
          ⚡ AI PICKUP
        </div>`,
        className: '', iconAnchor: [44, 14],
      })
      const pickupPos = lerp(startC, endC, 0.12)

      // Car icon
      const carIcon = L.divIcon({
        className: '',
        html: `
          <div style="position:relative;width:42px;height:42px;display:flex;align-items:center;justify-content:center">
            <div style="position:absolute;width:42px;height:42px;border-radius:50%;background:rgba(37,99,235,0.18);
              animation:pulse 2s ease-in-out infinite"></div>
            <div style="position:absolute;width:30px;height:30px;border-radius:50%;background:rgba(37,99,235,0.25);
              animation:pulse 2s ease-in-out infinite;animation-delay:0.5s"></div>
            <div style="position:relative;z-index:2;width:24px;height:24px;border-radius:50%;
              background:linear-gradient(135deg,#2563eb,#1d4ed8);
              border:3px solid white;
              box-shadow:0 0 0 2px rgba(59,130,246,0.4);
              display:flex;align-items:center;justify-content:center;font-size:12px">🚗</div>
          </div>
          <style>@keyframes pulse{0%,100%{transform:scale(1);opacity:.5}50%{transform:scale(1.4);opacity:.1}}</style>
        `,
        iconSize: [42, 42], iconAnchor: [21, 21],
      })

      markersRef.current.push(
        L.marker(startC,    { icon: startIcon  }).addTo(mapRef.current),
        L.marker(endC,      { icon: endIcon    }).addTo(mapRef.current),
        L.marker(pickupPos, { icon: pickupIcon }).addTo(mapRef.current),
      )
      carMarkerRef.current = L.marker(carPos, { icon: carIcon, zIndexOffset: 1000 })
        .bindPopup(`<b>🚗 Live Position</b><br>${Math.round(liveProgress)}% of route`, { closeButton: false })
        .addTo(mapRef.current)

      mapRef.current.fitBounds(L.latLngBounds([startC, endC]), { padding: [52, 52] })
    }

    run()
  }, [from, to, mapReady, liveProgress, distanceKm, etaHours, showToast])

  const handleRecenter = () => {
    if (!startCoords || !endCoords) return
    mapRef.current?.fitBounds(leafletRef.current.latLngBounds([startCoords, endCoords]), { padding: [52, 52], animate: true })
  }

  const handleMyLocation = () => {
    if (!navigator.geolocation) { showToast('Geolocation not supported.'); return }
    setIsTracking(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        const c: [number, number] = [pos.coords.latitude, pos.coords.longitude]
        setUserCoords(c)
        mapRef.current?.flyTo(c, 14, { animate: true, duration: 1.5 })
        showToast('📍 Your live location found.')
        setIsTracking(false)
      },
      () => { showToast('Location access denied.'); setIsTracking(false) },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />

      <div className="relative flex-1">
        <div ref={mapDivRef} className="w-full h-full" style={{ minHeight: '340px' }} />

        {/* GPS badge */}
        <div className="absolute top-3 left-3 z-[1000] flex items-center gap-1.5 bg-black/70 backdrop-blur-sm border border-green-500/30 text-green-400 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> GPS Live
        </div>

        {/* Progress badge */}
        <div className="absolute top-3 right-3 z-[1000] bg-blue-600/90 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
          {Math.round(liveProgress)}% complete
        </div>

        {/* Telemetry HUD */}
        <div className="absolute bottom-14 right-3 z-[1000] bg-black/80 backdrop-blur-md border border-white/10 rounded-xl p-3 text-[9px] font-mono flex flex-col gap-1.5 shadow-xl">
          <span className="text-gray-500 font-sans font-black uppercase tracking-widest text-[8px] mb-0.5">Telemetry</span>
          <div className="text-gray-300">SPD <span className="text-cyan-400 font-bold ml-1">68 km/h</span></div>
          <div className="text-gray-300">ETA <span className="text-white font-bold ml-1">
            {realEta ? `~${(realEta * (1 - liveProgress/100)).toFixed(1)}h` : '—'}
          </span></div>
          <div className="text-gray-300">SIG <span className="text-green-400 font-bold ml-1">97%</span></div>
          <div className="text-gray-300">PAX <span className="text-amber-400 font-bold ml-1">{passengerCount}</span></div>
        </div>

        {/* Controls HUD */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-1.5 bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-1.5 shadow-xl">
          <button onClick={handleRecenter} title="Recenter"
            className="w-7 h-7 rounded-full bg-gray-800 hover:bg-blue-900 border border-gray-700 hover:border-blue-600 text-gray-400 hover:text-blue-400 flex items-center justify-center transition active:scale-90">
            <Crosshair size={12} />
          </button>
          <button onClick={handleMyLocation} title="My location"
            className={`w-7 h-7 rounded-full border flex items-center justify-center transition active:scale-90 ${
              isTracking || userCoords
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-gray-800 hover:bg-blue-900 border-gray-700 hover:border-blue-600 text-gray-400 hover:text-blue-400'
            }`}>
            <Navigation size={12} />
          </button>
          <div className="w-px h-4 bg-gray-700" />
          {(Object.keys(TILES) as (keyof typeof TILES)[]).map(s => (
            <button key={s} onClick={() => setTileStyle(s)}
              className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded transition ${
                tileStyle === s ? 'bg-blue-600 text-white' : 'bg-gray-800 border border-gray-700 text-gray-500 hover:text-white'
              }`}>
              {s}
            </button>
          ))}
          <div className="w-px h-4 bg-gray-700" />
          <button onClick={() => mapRef.current?.zoomIn()}
            className="w-7 h-7 rounded-full bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition">
            <ZoomIn size={12} />
          </button>
          <button onClick={() => mapRef.current?.zoomOut()}
            className="w-7 h-7 rounded-full bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition">
            <ZoomOut size={12} />
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[2000] bg-gray-900 text-white text-xs font-medium px-4 py-2 rounded-xl shadow-xl flex items-center gap-2 whitespace-nowrap pointer-events-none border border-white/10">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" /> {toast}
        </div>
      )}
    </div>
  )
}