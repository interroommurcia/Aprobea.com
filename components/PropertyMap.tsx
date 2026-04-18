'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  lat: number
  lon: number
  address?: string
}

type TileLayer = 'osm' | 'satellite' | 'streetview'

export default function PropertyMap({ lat, lon, address }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const [layer, setLayer] = useState<TileLayer>('osm')
  const tileLayerRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current || mapInstance.current) return

    import('leaflet').then(L => {
      // Fix default marker icons (webpack asset issue)
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(mapRef.current!, { zoomControl: true, scrollWheelZoom: false }).setView([lat, lon], 17)
      mapInstance.current = map

      tileLayerRef.current = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        { attribution: '© OpenStreetMap', maxZoom: 19 }
      ).addTo(map)

      L.marker([lat, lon])
        .addTo(map)
        .bindPopup(address ?? `${lat.toFixed(6)}, ${lon.toFixed(6)}`)
        .openPopup()
    })

    return () => {
      if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!mapInstance.current || layer === 'streetview') return
    import('leaflet').then(L => {
      if (tileLayerRef.current) { tileLayerRef.current.remove() }
      const url = layer === 'satellite'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      const attr = layer === 'satellite' ? '© Esri World Imagery' : '© OpenStreetMap'
      tileLayerRef.current = L.tileLayer(url, { attribution: attr, maxZoom: 19 }).addTo(mapInstance.current)
    })
  }, [layer])

  const btn = (l: TileLayer, label: string) => (
    <button
      type="button"
      onClick={() => setLayer(l)}
      style={{
        padding: '4px 10px', fontSize: '10px', letterSpacing: '0.08em',
        background: layer === l ? 'var(--gold-200, #C9A043)' : 'rgba(255,255,255,0.06)',
        color: layer === l ? '#000' : 'var(--text-2, #aaa)',
        border: 'none', borderRadius: '4px', cursor: 'pointer',
      }}
    >{label}</button>
  )

  return (
    <div style={{ marginTop: '10px', borderRadius: '8px', overflow: 'hidden', border: '0.5px solid rgba(255,255,255,0.08)' }}>
      {/* Toolbar */}
      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '6px 10px', display: 'flex', gap: '6px', alignItems: 'center' }}>
        {btn('osm', 'Mapa')}
        {btn('satellite', 'Satélite')}
        {btn('streetview', 'Street View')}
        <span style={{ flex: 1 }} />
        <a
          href={`https://maps.google.com/?q=${lat},${lon}&z=18`}
          target="_blank" rel="noopener noreferrer"
          style={{ fontSize: '10px', color: 'var(--gold-200, #C9A043)', textDecoration: 'none' }}
        >Abrir en Google Maps ↗</a>
      </div>

      {/* Map or Street View */}
      {layer === 'streetview' ? (
        <iframe
          title="Street View"
          src={`https://maps.google.com/maps?q=${lat},${lon}&layer=c&cbp=12,0,0,0,0&cbll=${lat},${lon}&output=svembed`}
          width="100%" height="280"
          style={{ border: 'none', display: 'block' }}
          loading="lazy"
          allowFullScreen
        />
      ) : (
        <>
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <div ref={mapRef} style={{ height: '280px', width: '100%' }} />
        </>
      )}
    </div>
  )
}
