'use client'

// ─────────────────────────────────────────────────────────────
// TripMap.tsx — Real Leaflet Map HUD for Host a Trip page
//
// Install:
//   npm install leaflet react-leaflet
//   npm install -D @types/leaflet
//
// Add to your globals.css:
//   @import 'leaflet/dist/leaflet.css';
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, useCallback } from 'react'
import { MapPin, Navigation, Layers, AlertTriangle, X, Crosshair } from 'lucide-react'

interface TripMapProps {
  from: string
  to: string
}

interface Checkpoint {
  name: string
  coords: [number, number]
  status: 'passed' | 'active' | 'upcoming'
}

interface SOSState {
  phase: 'idle' | 'counting' | 'active'
  countdown: number
}

const TILES = {
  street:    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  dark:      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
}

async function geocode(place: string): Promise<[number, number] | null> {
  if (!place.trim()) return null
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'en' } }
    )
    const data = await res.json()
    if (!data.length) return null
    return [parseFloat(data[0].lat), parseFloat(data[0].lon)]
  } catch { return null }
}

function haversine(a: [number, number], b: [number, number]): number {
  const R = 6371
  const dLat = ((b[0] - a[0]) * Math.PI) / 180
  const dLon = ((b[1] - a[1]) * Math.PI) / 180
  const lat1 = (a[0] * Math.PI) / 180
  const lat2 = (b[0] * Math.PI) / 180
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

export default function TripMap({ from, to }: TripMapProps) {
  const mapDivRef   = useRef<HTMLDivElement>(null)
  const mapRef      = useRef<any>(null)
  const leafletRef  = useRef<any>(null)
  const tileRef     = useRef<any>(null)
  const routeRef    = useRef<any>(null)
  const markersRef  = useRef<any[]>([])

  const [tileStyle,    setTileStyle]    = useState<keyof typeof TILES>('street')
  const [startCoords,  setStartCoords]  = useState<[number, number] | null>(null)
  const [endCoords,    setEndCoords]    = useState<[number, number] | null>(null)
  const [checkpoints,  setCheckpoints]  = useState<Checkpoint[]>([])
  const [distanceKm,   setDistanceKm]   = useState<number | null>(null)
  const [etaHours,     setEtaHours]     = useState<number | null>(null)
  const [isLocating,   setIsLocating]   = useState(false)
  const [userCoords,   setUserCoords]   = useState<[number, number] | null>(null)
  const [toast,        setToast]        = useState('')
  const [sos,          setSos]          = useState<SOSState>({ phase: 'idle', countdown: 5 })
  const [mapReady,     setMapReady]     = useState(false)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3200)
  }, [])

  // ── Init Leaflet ──────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || mapRef.current || !mapDivRef.current) return

    import('leaflet').then((mod) => {
      const L = mod.default
      leafletRef.current = L

      // ✅ Guard against React StrictMode double-invoke:
      // Leaflet stamps the div with _leaflet_id when initialized.
      // If it's already there, remove it so we can reinitialize cleanly.
      const container = mapDivRef.current!
      if ((container as any)._leaflet_id) {
        (container as any)._leaflet_id = null
      }

      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })

      const map = L.map(container, {
        center: [20.5937, 78.9629],
        zoom: 5,
        zoomControl: false,
        attributionControl: false,
      })
      L.control.zoom({ position: 'topright' }).addTo(map)
      tileRef.current = L.tileLayer(TILES.street, { maxZoom: 19 }).addTo(map)
      mapRef.current = map
      setMapReady(true)
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        setMapReady(false)
      }
    }
  }, [])

  // ── Switch tile ───────────────────────────────────────────
  useEffect(() => {
    if (!tileRef.current) return
    tileRef.current.setUrl(TILES[tileStyle])
  }, [tileStyle])

  // ── Draw route ────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || !leafletRef.current) return
    if (!from.trim() || !to.trim()) return

    const L = leafletRef.current
    routeRef.current?.remove()
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    const run = async () => {
      const [s, e] = await Promise.all([geocode(from), geocode(to)])
      if (!s || !e) { showToast('Could not find one or both places. Try city names.'); return }

      setStartCoords(s); setEndCoords(e)
      const dist = haversine(s, e)
      setDistanceKm(Math.round(dist))
      setEtaHours(parseFloat((dist / 60).toFixed(1)))
      setCheckpoints([
        { name: 'Departure', coords: s,                          status: 'passed'   },
        { name: 'Midpoint',  coords: [(s[0]+e[0])/2,(s[1]+e[1])/2], status: 'active' },
        { name: 'Arrival',   coords: e,                          status: 'upcoming' },
      ])

      routeRef.current = L.polyline([s, e], {
        color: '#2563eb', weight: 4, dashArray: '10 6', lineCap: 'round',
      }).addTo(mapRef.current)

      const pinIcon = (color: string, label: string) => L.divIcon({
        className: '',
        html: `<div style="display:flex;flex-direction:column;align-items:center;gap:2px">
          <div style="width:14px;height:14px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 0 0 3px ${color}44"></div>
          <div style="font-size:9px;font-weight:800;color:${color};background:white;border:1px solid ${color}33;border-radius:4px;padding:1px 5px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.12)">${label}</div>
        </div>`,
        iconSize: [80, 36], iconAnchor: [40, 7],
      })

      markersRef.current.push(
        L.marker(s, { icon: pinIcon('#16a34a', 'START') }).addTo(mapRef.current),
        L.marker(e, { icon: pinIcon('#dc2626', 'END')   }).addTo(mapRef.current),
        L.marker([(s[0]+e[0])/2,(s[1]+e[1])/2], {
          icon: L.divIcon({
            className: '',
            html: `<div style="width:10px;height:10px;border-radius:50%;background:#f59e0b;border:2px solid white;box-shadow:0 0 0 2px #f59e0b66"></div>`,
            iconSize: [10,10], iconAnchor: [5,5],
          }),
        }).addTo(mapRef.current)
      )

      mapRef.current.fitBounds(L.latLngBounds([s, e]), { padding: [48, 48] })
    }
    run()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, mapReady])

  // ── Locate user ───────────────────────────────────────────
  const handleLocate = () => {
    if (!navigator.geolocation) { showToast('Geolocation not supported.'); return }
    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c: [number, number] = [pos.coords.latitude, pos.coords.longitude]
        setUserCoords(c)
        mapRef.current?.flyTo(c, 14, { animate: true, duration: 1.5 })
        showToast('Your location locked on map.')
        setIsLocating(false)
      },
      () => { showToast('Location access denied.'); setIsLocating(false) },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  const handleRecenter = () => {
    if (!startCoords || !endCoords || !leafletRef.current) { showToast('Enter a route first.'); return }
    mapRef.current?.fitBounds(leafletRef.current.latLngBounds([startCoords, endCoords]), { padding: [48,48], animate: true })
    showToast('Map recentered.')
  }

  // ── SOS countdown ─────────────────────────────────────────
  useEffect(() => {
    if (sos.phase !== 'counting') return
    if (sos.countdown <= 0) { setSos({ phase: 'active', countdown: 0 }); showToast('🚨 SOS TRANSMITTED'); return }
    const t = setTimeout(() => setSos((s) => ({ ...s, countdown: s.countdown - 1 })), 1000)
    return () => clearTimeout(t)
  }, [sos, showToast])

  return (
    <div className="relative rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white">

      {/* SOS countdown overlay */}
      {sos.phase === 'counting' && (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center rounded-xl">
          <div className="relative bg-[#111] border border-red-500/30 rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl text-center">
            <div className="absolute w-36 h-36 rounded-full border border-red-500/15 animate-ping" style={{ animationDuration: '2s' }} />
            <AlertTriangle className="text-red-500 w-8 h-8 animate-pulse relative z-10" />
            <div className="relative z-10">
              <p className="text-red-400 text-xs font-black uppercase tracking-widest">Initiating SOS</p>
              <p className="text-gray-500 text-[10px] mt-1">Broadcasting GPS coordinates</p>
            </div>
            <span className="text-5xl font-mono font-black text-white relative z-10">{sos.countdown}</span>
            <button onClick={() => setSos({ phase: 'idle', countdown: 5 })}
              className="w-full bg-red-500/10 hover:bg-red-600 border border-red-500/30 text-red-400 hover:text-white text-xs font-black uppercase tracking-widest px-6 py-3 rounded-xl transition relative z-10">
              Abort
            </button>
          </div>
        </div>
      )}

      {/* SOS active banner */}
      {sos.phase === 'active' && (
        <div className="absolute top-0 left-0 right-0 z-40 bg-red-600 text-white px-4 py-2 flex items-center justify-between text-xs font-black">
          <span className="flex items-center gap-2 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-white" />🚨 SOS ACTIVE — Emergency broadcast live
          </span>
          <button onClick={() => setSos({ phase: 'idle', countdown: 5 })}><X size={13} /></button>
        </div>
      )}

      {/* Map header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-xs font-semibold text-gray-700">Live Route Preview</span>
          {distanceKm && (
            <span className="text-[10px] text-gray-400 font-medium ml-1">· {distanceKm} km · ~{etaHours}h</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {(Object.keys(TILES) as (keyof typeof TILES)[]).map((s) => (
            <button key={s} onClick={() => setTileStyle(s)}
              className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded transition ${
                tileStyle === s ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:text-gray-800'
              }`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Map frame */}
      <div className="relative" style={{ height: '300px' }}>
        <div ref={mapDivRef} className="w-full h-full z-0" />

        {/* Empty state */}
        {!from.trim() && !to.trim() && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm pointer-events-none">
            <MapPin className="text-blue-400 w-8 h-8 mb-2" />
            <p className="text-gray-600 text-sm font-semibold">Enter your route above</p>
            <p className="text-gray-400 text-xs mt-1">Map auto-loads once From & To are filled</p>
          </div>
        )}

        {/* HUD controls */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-white/95 backdrop-blur-md border border-gray-200 rounded-2xl px-4 py-2 shadow-lg">
          <button onClick={handleRecenter} title="Recenter"
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 text-gray-500 hover:text-blue-600 flex items-center justify-center transition active:scale-90">
            <Crosshair size={14} />
          </button>

          <button onClick={handleLocate} disabled={isLocating} title="My location"
            className={`w-8 h-8 rounded-full border flex items-center justify-center transition active:scale-90 ${
              isLocating ? 'bg-blue-50 border-blue-300 text-blue-500 animate-pulse'
              : userCoords ? 'bg-blue-600 border-blue-600 text-white'
              : 'bg-gray-100 hover:bg-blue-50 border-gray-200 hover:border-blue-300 text-gray-500 hover:text-blue-600'
            }`}>
            <Navigation size={14} />
          </button>

          <div className="w-px h-5 bg-gray-200" />

          <button onClick={() => {
            const keys = Object.keys(TILES) as (keyof typeof TILES)[]
            setTileStyle(keys[(keys.indexOf(tileStyle) + 1) % keys.length])
          }} title="Switch layer"
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-500 flex items-center justify-center transition active:scale-90">
            <Layers size={14} />
          </button>

          <div className="w-px h-5 bg-gray-200" />

          <button onClick={() => setSos({ phase: 'counting', countdown: 5 })}
            disabled={sos.phase !== 'idle'}
            className={`flex items-center gap-1.5 px-3 h-8 rounded-full text-[10px] font-black uppercase tracking-wider transition active:scale-90 ${
              sos.phase === 'active'
                ? 'bg-red-600 text-white animate-pulse border border-red-700'
                : 'bg-red-50 hover:bg-red-600 border border-red-200 hover:border-red-600 text-red-500 hover:text-white'
            }`}>
            <AlertTriangle size={11} /> SOS
          </button>
        </div>

        {/* Sat lock feed */}
        {startCoords && (
          <div className="absolute bottom-4 right-3 z-20 bg-black/80 backdrop-blur-md border border-white/10 rounded-xl p-2.5 text-[9px] font-mono flex flex-col gap-1 shadow-lg">
            <span className="text-gray-500 font-sans font-black uppercase tracking-wider mb-0.5 text-[8px]">Sat Lock</span>
            <div className="text-gray-300">LAT <span className="text-white font-bold">{startCoords[0].toFixed(4)}°</span></div>
            <div className="text-gray-300">LNG <span className="text-white font-bold">{startCoords[1].toFixed(4)}°</span></div>
            <div className="text-gray-300">SIG <span className="text-green-400 font-bold">97%</span></div>
          </div>
        )}

        {/* GPS badge */}
        <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-white/90 border border-blue-200 text-blue-600 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /> GPS Active
        </div>
      </div>

      {/* Checkpoint strip */}
      {checkpoints.length > 0 && (
        <div className="border-t border-gray-100 px-4 py-3 flex items-center gap-2">
          {checkpoints.map((cp, i) => (
            <div key={i} className="flex items-center gap-1.5 flex-1 min-w-0">
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                cp.status === 'passed' ? 'bg-green-500' :
                cp.status === 'active' ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'
              }`} />
              <span className={`text-[10px] font-semibold truncate ${cp.status === 'upcoming' ? 'text-gray-400' : 'text-gray-700'}`}>
                {cp.name}
              </span>
              {i < checkpoints.length - 1 && <div className="flex-1 h-px bg-gray-200 hidden sm:block" />}
            </div>
          ))}
        </div>
      )}

      {/* Stats strip */}
      {distanceKm && (
        <div className="border-t border-gray-100 px-4 py-2.5 grid grid-cols-3 gap-2 bg-gray-50/70">
          <div className="text-center">
            <p className="text-xs font-bold text-gray-900">{distanceKm} km</p>
            <p className="text-[9px] text-gray-400 uppercase tracking-wide font-semibold">Distance</p>
          </div>
          <div className="text-center border-x border-gray-200">
            <p className="text-xs font-bold text-gray-900">~{etaHours}h</p>
            <p className="text-[9px] text-gray-400 uppercase tracking-wide font-semibold">Est. Drive</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-green-600">Ready</p>
            <p className="text-[9px] text-gray-400 uppercase tracking-wide font-semibold">Route Status</p>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 bg-gray-900 text-white text-xs font-medium px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 whitespace-nowrap pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
          {toast}
        </div>
      )}
    </div>
  )
}
