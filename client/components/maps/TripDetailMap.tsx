'use client'

// TripDetailMap.tsx — Real Leaflet map for Trip Details page
// Same install as TripMap: npm install leaflet react-leaflet @types/leaflet
// Add to globals.css: @import 'leaflet/dist/leaflet.css';

import { useEffect, useRef, useState, useCallback } from 'react'
import { Layers, Crosshair, Navigation, ZoomIn, ZoomOut, MapPin } from 'lucide-react'

interface TripDetailMapProps {
  from: string        // e.g. "Kozhikode"
  to: string          // e.g. "Bangalore"
  pickup?: string     // optional AI pickup stop e.g. "Calicut University Main Gate"
  distanceKm?: number
  etaHours?: number
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
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place + ', India')}&format=json&limit=1`,
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
  const x = Math.sin(dLat/2)**2 + Math.cos(a[0]*Math.PI/180)*Math.cos(b[0]*Math.PI/180)*Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x))
}

export default function TripDetailMap({ from, to, pickup, distanceKm, etaHours }: TripDetailMapProps) {
  const mapDivRef  = useRef<HTMLDivElement>(null)
  const mapRef     = useRef<any>(null)
  const leafletRef = useRef<any>(null)
  const tileRef    = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const routeRef   = useRef<any>(null)
  const pulseRef   = useRef<any>(null)

  const [tileStyle,   setTileStyle]   = useState<keyof typeof TILES>('street')
  const [mapReady,    setMapReady]    = useState(false)
  const [realDist,    setRealDist]    = useState<number | null>(distanceKm || null)
  const [realEta,     setRealEta]     = useState<number | null>(etaHours || null)
  const [toast,       setToast]       = useState('')
  const [isTracking,  setIsTracking]  = useState(false)
  const [userCoords,  setUserCoords]  = useState<[number, number] | null>(null)
  const [animProgress, setAnimProgress] = useState(0)
  const animRef = useRef<any>(null)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }, [])

  // ── Init map ─────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || mapRef.current || !mapDivRef.current) return
    import('leaflet').then((mod) => {
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
      const map = L.map(container, {
        center: [12.9716, 77.5946],
        zoom: 6,
        zoomControl: false,
        attributionControl: false,
      })
      tileRef.current = L.tileLayer(TILES.street, { maxZoom: 19 }).addTo(map)
      mapRef.current = map
      setMapReady(true)
    })
    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; setMapReady(false) }
      if (animRef.current) clearInterval(animRef.current)
    }
  }, [])

  // ── Switch tile ───────────────────────────────────────────
  useEffect(() => {
    if (!tileRef.current) return
    tileRef.current.setUrl(TILES[tileStyle])
  }, [tileStyle])

  // ── Draw route when ready ─────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || !leafletRef.current) return
    if (!from || !to) return

    const L = leafletRef.current
    routeRef.current?.remove()
    pulseRef.current?.remove()
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
    if (animRef.current) clearInterval(animRef.current)

    const run = async () => {
      const queries = [geocode(from), geocode(to)]
      if (pickup) queries.push(geocode(pickup))
      const results = await Promise.all(queries)

      const startC = results[0]
      const endC   = results[1]
      const pickC  = results[2] || null

      if (!startC || !endC) { showToast('Could not geocode locations.'); return }

      const dist = haversine(startC, endC)
      if (!distanceKm) setRealDist(Math.round(dist))
      if (!etaHours)   setRealEta(parseFloat((dist / 60).toFixed(1)))

      // Route path through pickup if available
      const pathPoints: [number,number][] = pickC
        ? [startC, pickC, endC]
        : [startC, endC]

      // Dashed background glow line
      L.polyline(pathPoints, {
        color: '#2563eb', weight: 10, opacity: 0.08,
        lineCap: 'round', lineJoin: 'round',
      }).addTo(mapRef.current)

      // Main route line
      routeRef.current = L.polyline(pathPoints, {
        color: '#2563eb', weight: 3.5,
        dashArray: '10 5', dashOffset: '0',
        lineCap: 'round', lineJoin: 'round',
        opacity: 0.9,
      }).addTo(mapRef.current)

      // Animate dash offset for "moving route" effect
      let offset = 0
      animRef.current = setInterval(() => {
        offset = (offset + 1) % 15
        routeRef.current?.setStyle({ dashOffset: String(-offset) })
        setAnimProgress(p => (p + 0.5) % 100)
      }, 80)

      // ── Custom markers ─────────────────────────────────────
      const makePin = (color: string, label: string, emoji: string) =>
        L.divIcon({
          className: '',
          html: `<div style="display:flex;flex-direction:column;align-items:center;gap:3px;filter:drop-shadow(0 2px 6px ${color}66)">
            <div style="
              width:36px;height:36px;border-radius:50% 50% 50% 0;
              background:${color};border:3px solid white;
              transform:rotate(-45deg);
              box-shadow:0 3px 10px ${color}55;
              display:flex;align-items:center;justify-content:center;
            ">
              <span style="transform:rotate(45deg);font-size:14px">${emoji}</span>
            </div>
            <div style="
              font-size:9px;font-weight:800;color:white;background:${color};
              border-radius:4px;padding:2px 6px;white-space:nowrap;
              box-shadow:0 1px 4px rgba(0,0,0,.2);
            ">${label}</div>
          </div>`,
          iconSize: [80, 52],
          iconAnchor: [40, 42],
        })

      const pulsingIcon = (color: string) =>
        L.divIcon({
          className: '',
          html: `<div style="position:relative;display:flex;align-items:center;justify-content:center;width:28px;height:28px">
            <div style="
              position:absolute;width:28px;height:28px;border-radius:50%;
              background:${color}33;animation:pulse 1.5s ease-in-out infinite;
            "></div>
            <div style="
              position:absolute;width:18px;height:18px;border-radius:50%;
              background:${color}55;animation:pulse 1.5s ease-in-out infinite;
              animation-delay:0.3s;
            "></div>
            <div style="
              width:12px;height:12px;border-radius:50%;
              background:${color};border:2px solid white;
              box-shadow:0 0 0 2px ${color}66;
              position:relative;z-index:1;
            "></div>
          </div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        })

      markersRef.current.push(
        L.marker(startC, { icon: makePin('#16a34a', from.split(',')[0].substring(0,12), '🟢') })
          .bindPopup(`<b>🟢 Start</b><br>${from}`, { closeButton: false })
          .addTo(mapRef.current),

        L.marker(endC, { icon: makePin('#dc2626', to.split(',')[0].substring(0,12), '🏁') })
          .bindPopup(`<b>🏁 Destination</b><br>${to}`, { closeButton: false })
          .addTo(mapRef.current),
      )

      if (pickC) {
        markersRef.current.push(
          L.marker(pickC, { icon: pulsingIcon('#f59e0b') })
            .bindPopup(`<b>⚡ AI Pickup</b><br>${pickup}`, { closeButton: false })
            .addTo(mapRef.current)
        )
      }

      // Fit bounds with padding
      const allPoints = [startC, endC, ...(pickC ? [pickC] : [])]
      mapRef.current.fitBounds(L.latLngBounds(allPoints), { padding: [50, 50] })
    }

    run()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, pickup, mapReady])

  // ── Tile switch handler ───────────────────────────────────
  const cycleTile = () => {
    const keys = Object.keys(TILES) as (keyof typeof TILES)[]
    const next = keys[(keys.indexOf(tileStyle) + 1) % keys.length]
    setTileStyle(next)
    showToast(`Map: ${next}`)
  }

  // ── Recenter ──────────────────────────────────────────────
  const handleRecenter = async () => {
    if (!mapRef.current || !leafletRef.current) return
    const [s, e] = await Promise.all([geocode(from), geocode(to)])
    if (s && e) {
      mapRef.current.fitBounds(leafletRef.current.latLngBounds([s,e]), { padding:[50,50], animate:true })
      showToast('Map recentered to route.')
    }
  }

  // ── My location ───────────────────────────────────────────
  const handleMyLocation = () => {
    if (!navigator.geolocation) { showToast('Geolocation not supported.'); return }
    setIsTracking(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c: [number,number] = [pos.coords.latitude, pos.coords.longitude]
        setUserCoords(c)
        mapRef.current?.flyTo(c, 14, { animate: true, duration: 1.5 })
        const L = leafletRef.current
        if (L && mapRef.current) {
          L.marker(c, {
            icon: L.divIcon({
              className: '',
              html: `<div style="width:14px;height:14px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 4px #3b82f644"></div>`,
              iconSize: [14,14], iconAnchor: [7,7],
            })
          }).bindPopup('<b>📍 You are here</b>', { closeButton: false }).addTo(mapRef.current)
        }
        showToast('Your location found.')
        setIsTracking(false)
      },
      () => { showToast('Location access denied.'); setIsTracking(false) },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  return (
    <div className="relative rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-xs font-semibold text-gray-700 truncate max-w-[180px]">
            {from} → {to}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {(Object.keys(TILES) as (keyof typeof TILES)[]).map((s) => (
            <button key={s} onClick={() => setTileStyle(s)}
              className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded transition ${
                tileStyle === s ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:text-gray-700'
              }`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="relative" style={{ height: '256px' }}>
        <div ref={mapDivRef} className="w-full h-full z-0" />

        {/* Animated route progress bar */}
        {realDist && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gray-100 z-20 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
              style={{ width: `${animProgress}%`, opacity: 0.7 }}
            />
          </div>
        )}

        {/* GPS badge */}
        <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm border border-blue-200 text-blue-600 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          GPS Active
        </div>

        {/* Distance badge */}
        {realDist && (
          <div className="absolute top-3 right-3 z-20 bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow">
            {realDist} km · ~{realEta}h
          </div>
        )}

        {/* Sat lock */}
        <div className="absolute bottom-14 right-3 z-20 bg-black/75 backdrop-blur-md border border-white/10 rounded-xl p-2 text-[9px] font-mono flex flex-col gap-0.5 shadow-lg">
          <span className="text-gray-500 font-sans font-bold uppercase tracking-wider text-[8px] mb-0.5">Sat Lock</span>
          <div className="text-gray-300">
            ROUTE <span className="text-green-400 font-bold">SYNCED</span>
          </div>
          <div className="text-gray-300">
            SIG <span className="text-green-400 font-bold">98%</span>
          </div>
        </div>

        {/* Legend */}
        {pickup && (
          <div className="absolute bottom-14 left-3 z-20 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl p-2.5 shadow-sm flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
              <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
              <span className="font-semibold">Start</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-amber-600">
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 animate-pulse" />
              <span className="font-semibold">AI Pickup</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
              <span className="font-semibold">End</span>
            </div>
          </div>
        )}

        {/* HUD controls */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-white/95 backdrop-blur-md border border-gray-200 rounded-2xl px-4 py-1.5 shadow-lg">
          <button onClick={handleRecenter} title="Recenter"
            className="w-7 h-7 rounded-full bg-gray-100 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 text-gray-500 hover:text-blue-600 flex items-center justify-center transition active:scale-90">
            <Crosshair size={12} />
          </button>

          <button onClick={handleMyLocation} disabled={isTracking} title="My location"
            className={`w-7 h-7 rounded-full border flex items-center justify-center transition active:scale-90 ${
              isTracking ? 'bg-blue-50 border-blue-300 text-blue-400 animate-pulse'
              : userCoords ? 'bg-blue-600 border-blue-600 text-white'
              : 'bg-gray-100 hover:bg-blue-50 border-gray-200 hover:border-blue-300 text-gray-500 hover:text-blue-600'
            }`}>
            <Navigation size={12} />
          </button>

          <div className="w-px h-4 bg-gray-200" />

          <button onClick={cycleTile} title="Switch layer"
            className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-500 flex items-center justify-center transition active:scale-90">
            <Layers size={12} />
          </button>

          <div className="w-px h-4 bg-gray-200" />

          <button onClick={() => mapRef.current?.zoomIn()}
            className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-500 flex items-center justify-center transition active:scale-90">
            <ZoomIn size={12} />
          </button>
          <button onClick={() => mapRef.current?.zoomOut()}
            className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-500 flex items-center justify-center transition active:scale-90">
            <ZoomOut size={12} />
          </button>
        </div>
      </div>

      {/* Stats strip */}
      {realDist && (
        <div className="border-t border-gray-100 px-4 py-2 grid grid-cols-3 gap-2 bg-gray-50/70">
          <div className="text-center">
            <p className="text-xs font-bold text-gray-900">{realDist} km</p>
            <p className="text-[9px] text-gray-400 uppercase tracking-wide font-semibold">Distance</p>
          </div>
          <div className="text-center border-x border-gray-200">
            <p className="text-xs font-bold text-gray-900">~{realEta}h</p>
            <p className="text-[9px] text-gray-400 uppercase tracking-wide font-semibold">Est. Drive</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-blue-600">Live</p>
            <p className="text-[9px] text-gray-400 uppercase tracking-wide font-semibold">Route Feed</p>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-30 bg-gray-900 text-white text-xs font-medium px-4 py-2 rounded-xl shadow-xl flex items-center gap-2 whitespace-nowrap pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
          {toast}
        </div>
      )}
    </div>
  )
}
