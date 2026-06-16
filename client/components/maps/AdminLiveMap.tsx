'use client'

import { useEffect, useRef } from 'react'

export default function AdminLiveMap() {
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Basic map placeholder - add your Leaflet logic here
    console.log('Map loaded')
  }, [])

  return (
    <div ref={mapRef} className="w-full h-full bg-[#0d1117] flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 mx-auto mb-2">
          <div className="w-full h-full bg-blue-500/20 rounded-full animate-ping" />
        </div>
        <p className="text-xs text-gray-500">Live map loading...</p>
      </div>
    </div>
  )
}