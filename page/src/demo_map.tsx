import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix: Leaflet's default marker icon path breaks with Vite/Webpack bundlers
// เพราะ bundler rename ไฟล์ image → ต้อง set path ใหม่ด้วยตัวเอง
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

interface MapViewProps {
  onMapReady?: (map: L.Map) => void
}

export default function MapView({ onMapReady }: MapViewProps) {
  // Reference to the HTML div that will contain the map
  const mapRef = useRef<HTMLDivElement>(null)
  // Store Leaflet map instance to prevent re-creating on re-render
  const mapInstance = useRef<L.Map | null>(null)

  useEffect(() => {
    // Initialize map only once (guard ด้วย mapInstance.current)
    if (mapRef.current && !mapInstance.current) {
      // Create map centered on Bangkok
      const map = L.map(mapRef.current).setView([13.7563, 100.5018], 13)

      // Add OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map)

      // Save map instance to ref
      mapInstance.current = map

      // Callback เมื่อ map พร้อมใช้งาน
      onMapReady?.(map)
    }

    // Cleanup: ลบ map เมื่อ component unmount เพื่อป้องกัน memory leak
    return () => {
      mapInstance.current?.remove()
      mapInstance.current = null
    }
  }, []) // [] = run ครั้งเดียวตอน mount

  // Map container — ต้อง fill parent เต็ม 100%
  return (
  <div
    ref={mapRef}
    style={{
      width: '100%',
      height: '480px',   // ✅ fixed height — ต้องไม่ใช้ 100%
      borderRadius: '8px',
    }}
  />
)
}