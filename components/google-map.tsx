"use client"

import { useCallback, useState, useEffect, useMemo } from "react"
import { GoogleMap, Marker, InfoWindow, Polygon, useJsApiLoader } from "@react-google-maps/api"
import { getGoogleMapsApiKey } from "@/app/actions/maps-actions"

const mapContainerStyle = {
  width: "100%",
  height: "100%",
}

const defaultCenter = {
  lat: 11.2421, // Eastern Visayas (Tacloban City area)
  lng: 125.0066,
}

const options = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: true,
  mapTypeControl: true,
  fullscreenControl: true,
}

interface MarkerData {
  id: string
  position: { lat: number; lng: number }
  title: string
  description?: string
}

interface PolygonData {
  id: string
  paths: { lat: number; lng: number }[]
  fillColor?: string
  strokeColor?: string
  fillOpacity?: number
  strokeOpacity?: number
  strokeWeight?: number
  title?: string
  area?: number
  landType?: string
}

interface GoogleMapComponentProps {
  markers?: MarkerData[]
  polygons?: PolygonData[]
  onMapClick?: (event: any) => void
  onPolygonComplete?: (polygon: PolygonData) => void
  onAreaCalculated?: (area: number) => void
  onMarkerAdd?: (marker: MarkerData) => void // Added marker add callback
  zoom?: number
  center?: { lat: number; lng: number }
  drawingMode?: boolean
  markerMode?: boolean // Added marker mode
  editingPolygon?: string | null // Added editing polygon ID
  onPolygonEdit?: (polygonId: string, newPaths: { lat: number; lng: number }[]) => void // Added polygon edit callback
}

function MapWithLoader({ apiKey, ...props }: GoogleMapComponentProps & { apiKey: string }) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: ["places", "geometry", "drawing"],
  })

  if (loadError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
        <p className="text-red-600 font-semibold">Error loading Google Maps</p>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-sm text-gray-600">Loading Google Maps...</p>
        </div>
      </div>
    )
  }

  return <MapContent {...props} />
}

function MapContent({
  markers = [],
  polygons = [],
  onMapClick,
  onPolygonComplete,
  onAreaCalculated,
  onMarkerAdd,
  zoom = 10,
  center,
  drawingMode = false,
  markerMode = false,
  editingPolygon = null,
  onPolygonEdit,
}: GoogleMapComponentProps) {
  const [map, setMap] = useState<any | null>(null)
  const [selectedMarker, setSelectedMarker] = useState<MarkerData | null>(null)
  const [selectedPolygon, setSelectedPolygon] = useState<PolygonData | null>(null)
  const [drawingPath, setDrawingPath] = useState<{ lat: number; lng: number }[]>([])
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationLoading, setLocationLoading] = useState(true)
  const [editingPath, setEditingPath] = useState<{ lat: number; lng: number }[]>([])
  const [editablePolygonRef, setEditablePolygonRef] = useState<any>(null)

  const memoizedOnAreaCalculated = useCallback(
    (area: number) => {
      onAreaCalculated?.(area)
    },
    [onAreaCalculated],
  )

  useEffect(() => {
    if (!center) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            })
            setLocationLoading(false)
          },
          (error) => {
            console.log("Geolocation error, defaulting to Eastern Visayas:", error)
            setUserLocation(defaultCenter)
            setLocationLoading(false)
          },
          {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 300000,
          },
        )
      } else {
        console.log("Geolocation not supported, defaulting to Eastern Visayas")
        setUserLocation(defaultCenter)
        setLocationLoading(false)
      }
    } else {
      setLocationLoading(false)
    }
  }, [center])

  useEffect(() => {
    if (editingPolygon) {
      const polygon = polygons.find((p) => p.id === editingPolygon)
      if (polygon) {
        setEditingPath([...polygon.paths])
      }
    } else {
      setEditingPath([])
      setEditablePolygonRef(null)
    }
  }, [editingPolygon, polygons])

  const calculatePolygonArea = useCallback((paths: { lat: number; lng: number }[]) => {
    if (paths.length < 3 || !window.google) return 0

    try {
      const googlePaths = paths.map((path) => new window.google.maps.LatLng(path.lat, path.lng))
      const area = window.google.maps.geometry.spherical.computeArea(googlePaths)
      return area / 10000
    } catch (error) {
      console.error("Error calculating area:", error)
      return calculatePolygonAreaManual(paths)
    }
  }, [])

  const calculatePolygonAreaManual = (paths: { lat: number; lng: number }[]) => {
    if (paths.length < 3) return 0

    let area = 0
    const earthRadius = 6371000

    for (let i = 0; i < paths.length; i++) {
      const j = (i + 1) % paths.length
      const lat1 = (paths[i].lat * Math.PI) / 180
      const lat2 = (paths[j].lat * Math.PI) / 180
      const lng1 = (paths[i].lng * Math.PI) / 180
      const lng2 = (paths[j].lng * Math.PI) / 180

      area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2))
    }

    area = Math.abs((area * earthRadius * earthRadius) / 2)
    return area / 10000
  }

  const currentPath = useMemo(() => {
    return editingPolygon ? editingPath : drawingPath
  }, [editingPolygon, editingPath, drawingPath])

  useEffect(() => {
    if (currentPath.length >= 3) {
      const area = calculatePolygonArea(currentPath)
      memoizedOnAreaCalculated(area)
    } else {
      memoizedOnAreaCalculated(0)
    }
  }, [currentPath, calculatePolygonArea, memoizedOnAreaCalculated])

  const mapCenter = center || userLocation || defaultCenter

  const onLoad = useCallback((map: any) => {
    setMap(map)
  }, [])

  const onUnmount = useCallback(() => {
    setMap(null)
  }, [])

  const handleMapClick = useCallback(
    (event: any) => {
      setSelectedMarker(null)
      setSelectedPolygon(null)

      if (editingPolygon && event.latLng) {
        const newPoint = {
          lat: event.latLng.lat(),
          lng: event.latLng.lng(),
        }
        setEditingPath((prev) => [...prev, newPoint])
      } else if (drawingMode && event.latLng) {
        const newPoint = {
          lat: event.latLng.lat(),
          lng: event.latLng.lng(),
        }
        setDrawingPath((prev) => [...prev, newPoint])
      } else if (markerMode && event.latLng) {
        const newMarker: MarkerData = {
          id: Date.now().toString(),
          position: {
            lat: event.latLng.lat(),
            lng: event.latLng.lng(),
          },
          title: `Marker ${Date.now()}`,
          description: "Custom marker",
        }
        onMarkerAdd?.(newMarker)
      } else {
        onMapClick?.(event)
      }
    },
    [onMapClick, drawingMode, markerMode, editingPolygon, onMarkerAdd],
  )

  const handlePolygonClick = useCallback(
    (polygon: PolygonData, event: any) => {
      event.stop() // Prevent map click

      if (markerMode && event.latLng) {
        const newMarker: MarkerData = {
          id: Date.now().toString(),
          position: {
            lat: event.latLng.lat(),
            lng: event.latLng.lng(),
          },
          title: `Marker in ${polygon.title}`,
          description: `Marker placed in ${polygon.landType} area`,
        }
        onMarkerAdd?.(newMarker)
      } else {
        setSelectedPolygon(polygon)
      }
    },
    [markerMode, onMarkerAdd],
  )

  const handlePolygonLoad = useCallback(
    (polygon: any, polygonId: string) => {
      if (polygonId === editingPolygon) {
        setEditablePolygonRef(polygon)

        // Add listeners for path changes
        const path = polygon.getPath()
        const pathChangeListener = () => {
          const newPaths: { lat: number; lng: number }[] = []
          for (let i = 0; i < path.getLength(); i++) {
            const vertex = path.getAt(i)
            newPaths.push({
              lat: vertex.lat(),
              lng: vertex.lng(),
            })
          }
          setEditingPath(newPaths)
        }

        path.addListener("set_at", pathChangeListener)
        path.addListener("insert_at", pathChangeListener)
        path.addListener("remove_at", pathChangeListener)
      }
    },
    [editingPolygon],
  )

  const completePolygon = useCallback(() => {
    if (drawingPath.length >= 3) {
      const area = calculatePolygonArea(drawingPath)
      const newPolygon: PolygonData = {
        id: Date.now().toString(),
        paths: drawingPath,
        fillColor: "#FF0000",
        strokeColor: "#FF0000",
        fillOpacity: 0.35,
        strokeOpacity: 0.8,
        strokeWeight: 2,
        title: `Area ${Date.now()}`,
        area: area,
        landType: "default",
      }
      onPolygonComplete?.(newPolygon)
      setDrawingPath([])
      memoizedOnAreaCalculated(0)
    }
  }, [drawingPath, onPolygonComplete, calculatePolygonArea, memoizedOnAreaCalculated])

  const completePolygonEdit = useCallback(() => {
    if (editingPolygon && editingPath.length >= 3) {
      onPolygonEdit?.(editingPolygon, editingPath)
      setEditingPath([])
      setEditablePolygonRef(null)
    }
  }, [editingPolygon, editingPath, onPolygonEdit])

  const cancelDrawing = useCallback(() => {
    setDrawingPath([])
    setEditingPath([])
    setEditablePolygonRef(null)
    memoizedOnAreaCalculated(0)
  }, [memoizedOnAreaCalculated])

  const clearAll = useCallback(() => {
    setDrawingPath([])
    setEditingPath([])
    setEditablePolygonRef(null)
    setSelectedMarker(null)
    setSelectedPolygon(null)
    memoizedOnAreaCalculated(0)
  }, [memoizedOnAreaCalculated])

  useEffect(() => {
    if (window) {
      ;(window as any).clearGoogleMapDrawing = clearAll
    }
  }, [clearAll])

  if (locationLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-sm text-gray-600">Getting your location...</p>
        </div>
      </div>
    )
  }

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      zoom={zoom}
      center={mapCenter}
      onLoad={onLoad}
      onUnmount={onUnmount}
      onClick={handleMapClick}
      options={options}
    >
      {userLocation && !center && (
        <Marker
          position={userLocation}
          title="Your Location"
          icon={{
            path: 0,
            scale: 8,
            fillColor: "#4285F4",
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: "#FFFFFF",
          }}
        />
      )}

      {markers.map((marker) => (
        <Marker
          key={marker.id}
          position={marker.position}
          title={marker.title}
          onClick={() => setSelectedMarker(marker)}
        />
      ))}

      {polygons.map((polygon) => (
        <Polygon
          key={polygon.id}
          paths={polygon.paths}
          onLoad={(polygonRef) => handlePolygonLoad(polygonRef, polygon.id)}
          options={{
            fillColor: polygon.fillColor || "#FF0000",
            fillOpacity: polygon.fillOpacity || 0.35,
            strokeColor: polygon.strokeColor || "#FF0000",
            strokeOpacity: polygon.strokeOpacity || 0.8,
            strokeWeight: polygon.strokeWeight || 2,
            editable: polygon.id === editingPolygon,
            draggable: false,
          }}
          onClick={(event) => handlePolygonClick(polygon, event)}
        />
      ))}

      {drawingPath.length > 0 && !editingPolygon && (
        <Polygon
          paths={drawingPath}
          options={{
            fillColor: "#0000FF",
            fillOpacity: 0.2,
            strokeColor: "#0000FF",
            strokeOpacity: 0.6,
            strokeWeight: 2,
            editable: false,
            draggable: false,
          }}
        />
      )}

      {drawingPath.map((point, index) => (
        <Marker
          key={`drawing-${index}`}
          position={point}
          icon={{
            path: 0,
            scale: 4,
            fillColor: "#0000FF",
            fillOpacity: 0.8,
            strokeWeight: 1,
            strokeColor: "#FFFFFF",
          }}
        />
      ))}

      {selectedMarker && (
        <InfoWindow position={selectedMarker.position} onCloseClick={() => setSelectedMarker(null)}>
          <div className="p-2">
            <h3 className="font-semibold text-sm">{selectedMarker.title}</h3>
            {selectedMarker.description && <p className="text-xs text-gray-600 mt-1">{selectedMarker.description}</p>}
          </div>
        </InfoWindow>
      )}

      {selectedPolygon && (
        <InfoWindow position={selectedPolygon.paths[0]} onCloseClick={() => setSelectedPolygon(null)}>
          <div className="p-2">
            <h3 className="font-semibold text-sm">{selectedPolygon.title}</h3>
            {selectedPolygon.landType && <p className="text-xs text-gray-600">Land Type: {selectedPolygon.landType}</p>}
            {selectedPolygon.area && (
              <p className="text-xs text-green-600 font-medium">Area: {selectedPolygon.area.toFixed(2)} hectares</p>
            )}
            <div className="flex items-center gap-1 mt-1">
              <div className="w-3 h-3 rounded border" style={{ backgroundColor: selectedPolygon.fillColor }}></div>
              <span className="text-xs text-gray-600">Color: {selectedPolygon.fillColor}</span>
            </div>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  )
}

export default function GoogleMapComponent(props: GoogleMapComponentProps) {
  const [apiKey, setApiKey] = useState<string>("")

  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const key = await getGoogleMapsApiKey()
        setApiKey(key)
      } catch (error) {
        console.error("Failed to fetch Google Maps API key:", error)
      }
    }
    fetchApiKey()
  }, [])

  if (!apiKey) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-sm text-gray-600">Loading Maps...</p>
        </div>
      </div>
    )
  }

  return <MapWithLoader apiKey={apiKey} {...props} />
}

export type { PolygonData, MarkerData }
