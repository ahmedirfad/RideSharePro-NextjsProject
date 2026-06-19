'use client'

// AdminLiveMap.tsx — Live fleet map for the Admin Dashboard
//
// Install (same as your other map components):
//   npm install leaflet react-leaflet
//   npm install -D @types/leaflet
//
// Add to globals.css if not already present:
//   @import 'leaflet/dist/leaflet.css';

import { useEffect, useRef, useState, useCallback } from 'react'
import { Layers, Crosshair, ZoomIn, ZoomOut } from 'lucide-react'

const TILES = {
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  street: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
}



interface FleetPoint {
  id: string
  coords: [number, number]
  driverName: string
  from: string
  to: string
  status: string
}

export default function AdminLiveMap() {
  const mapDivRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const leafletRef = useRef<any>(null)
  const tileRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])

  const [tileStyle, setTileStyle] = useState<keyof typeof TILES>('dark')
  const [mapReady, setMapReady] = useState(false)
  const [fleet, setFleet] = useState<FleetPoint[]>([])

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const token = localStorage.getItem("token")

        const res = await fetch(
          'http://localhost:5002/api/admin/trips/ongoing',
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        )

        const data = await res.json()

        if (data.success) {
          setFleet(data.data)
        }
      } catch (error) {
        console.error("Failed to fetch ongoing trips:", error)
      }
    }

    fetchTrips()

    const interval = setInterval(fetchTrips, 10000)

    return () => clearInterval(interval)
  }, [])

  // ── Init Leaflet ───────────────────────────────────────────────────────────
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
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })

      const map = L.map(container, {
        center: [11.5, 77.0], // centered over Kerala/Karnataka/Tamil Nadu cluster
        zoom: 7,
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: true,
      })

      tileRef.current = L.tileLayer(TILES.dark, { maxZoom: 19 }).addTo(map)
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

  // ── Switch tile style ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!tileRef.current) return
    tileRef.current.setUrl(TILES[tileStyle])
  }, [tileStyle])

  // ── Draw fleet markers + hub circles ──────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || !leafletRef.current || fleet.length === 0) return

    const L = leafletRef.current
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    // Live fleet pulse markers
    fleet.forEach(point => {
      const icon = L.divIcon({
        className: '',
        html: `
          <div style="position:relative;width:18px;height:18px;display:flex;align-items:center;justify-content:center">
            <div style="position:absolute;width:18px;height:18px;border-radius:50%;background:rgba(34,197,94,0.25);animation:fleetPulse 2s ease-in-out infinite"></div>
            <div style="width:7px;height:7px;border-radius:50%;background:#22c55e;border:1.5px solid white;box-shadow:0 0 0 1px rgba(34,197,94,0.4);position:relative;z-index:1"></div>
          </div>
          <style>
            @keyframes fleetPulse {
              0%,100%{transform:scale(1);opacity:0.7}
              50%{transform:scale(1.8);opacity:0.15}
            }
          </style>
        `,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      })
      const marker = L.marker(point.coords, { icon })
        .bindPopup(
          `
  <div>
    <b>${point.driverName}</b><br/>
    ${point.from} → ${point.to}<br/>
    Status: ${point.status}
  </div>
  `,
          { closeButton: false }
        )
        .addTo(mapRef.current)
      markersRef.current.push(marker)
    })
  }, [mapReady, fleet])


  const cycleTile = () => {
    const keys = Object.keys(TILES) as (keyof typeof TILES)[]
    setTileStyle(keys[(keys.indexOf(tileStyle) + 1) % keys.length])
  }

  const handleRecenter = () => {
    if (fleet.length > 0) {
      mapRef.current?.flyTo(fleet[0].coords, 7, {
        animate: true,
        duration: 1,
      })
    }
  }

  return (
    <div className="relative w-full h-full bg-[#0d1117]">
      <div ref={mapDivRef} className="w-full h-full z-0" />

      {/* Loading state */}
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0d1117] z-10">
          <div className="flex flex-col items-center gap-2 text-gray-600">
            <div className="w-5 h-5 border-2 border-gray-700 border-t-blue-500 rounded-full animate-spin" />
            <span className="text-xs">Loading live map…</span>
          </div>
        </div>
      )}

      {/* HUD controls */}
      {mapReady && (
        <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 bg-black/70 backdrop-blur-md border border-white/10 rounded-xl px-2 py-1.5 shadow-lg">
          <button onClick={handleRecenter} title="Recenter"
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-blue-500/20 text-gray-400 hover:text-blue-400 flex items-center justify-center transition">
            <Crosshair size={13} />
          </button>
          <button onClick={cycleTile} title="Switch layer"
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 flex items-center justify-center transition">
            <Layers size={13} />
          </button>
          <div className="w-px h-4 bg-white/10" />
          <button onClick={() => mapRef.current?.zoomIn()}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 flex items-center justify-center transition">
            <ZoomIn size={13} />
          </button>
          <button onClick={() => mapRef.current?.zoomOut()}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 flex items-center justify-center transition">
            <ZoomOut size={13} />
          </button>
        </div>
      )}

      {/* Fleet count badge */}
      {mapReady && (
        <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-black/70 backdrop-blur-md border border-green-500/20 text-green-400 text-[10px] font-bold px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          {fleet.length} live rides
        </div>
      )}
    </div>
  )
}