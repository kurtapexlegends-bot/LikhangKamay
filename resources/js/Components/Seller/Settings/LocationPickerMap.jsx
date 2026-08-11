import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, Navigation } from 'lucide-react';

// Fix Leaflet marker icon URLs in Vite bundle
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
});

export default function LocationPickerMap({
    latitude = 14.5995,
    longitude = 120.9842,
    radiusMeters = 100,
    onLocationSelect = null,
    readOnly = false,
    isLocating = false,
    height = '280px',
    className = '',
}) {
    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markerRef = useRef(null);
    const circleRef = useRef(null);

    const latNum = Number(latitude) || 14.5995;
    const lngNum = Number(longitude) || 120.9842;
    const radiusNum = Number(radiusMeters) || 100;

    // Initialize Leaflet Map Instance
    useEffect(() => {
        if (!mapContainerRef.current) return;

        if (!mapInstanceRef.current) {
            const map = L.map(mapContainerRef.current, {
                center: [latNum, lngNum],
                zoom: readOnly ? 15 : 16,
                zoomControl: !readOnly,
                attributionControl: false,
                dragging: !readOnly,
                scrollWheelZoom: !readOnly,
                doubleClickZoom: !readOnly,
                touchZoom: !readOnly,
            });

            // OpenStreetMap tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
            }).addTo(map);

            // Custom Marker Pin
            const marker = L.marker([latNum, lngNum], {
                draggable: !readOnly,
            }).addTo(map);

            // Geofence Circle Radius Overlay
            const circle = L.circle([latNum, lngNum], {
                radius: radiusNum,
                color: '#89432d', // Clay brown theme
                fillColor: '#89432d',
                fillOpacity: 0.15,
                weight: 2,
            }).addTo(map);

            markerRef.current = marker;
            circleRef.current = circle;
            mapInstanceRef.current = map;

            // Invalidate size after modal transition to force full tile load
            const timer = setTimeout(() => {
                if (mapInstanceRef.current) {
                    mapInstanceRef.current.invalidateSize();
                }
            }, 150);

            if (!readOnly && onLocationSelect) {
                // Drag marker event
                marker.on('dragend', (e) => {
                    const coord = e.target.getLatLng();
                    const newLat = Number(coord.lat.toFixed(8));
                    const newLng = Number(coord.lng.toFixed(8));
                    onLocationSelect({ latitude: newLat, longitude: newLng });
                });

                // Click anywhere on map event
                map.on('click', (e) => {
                    const newLat = Number(e.latlng.lat.toFixed(8));
                    const newLng = Number(e.latlng.lng.toFixed(8));
                    marker.setLatLng([newLat, newLng]);
                    circle.setLatLng([newLat, newLng]);
                    onLocationSelect({ latitude: newLat, longitude: newLng });
                });
            }

            return () => clearTimeout(timer);
        }

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    // Smoothly fly to coordinates when updated
    useEffect(() => {
        if (!mapInstanceRef.current) return;

        const map = mapInstanceRef.current;
        const marker = markerRef.current;
        const circle = circleRef.current;

        const currentCenter = map.getCenter();
        const dist = Math.hypot(currentCenter.lat - latNum, currentCenter.lng - lngNum);

        if (marker) marker.setLatLng([latNum, lngNum]);
        if (circle) {
            circle.setLatLng([latNum, lngNum]);
            circle.setRadius(radiusNum);
        }

        // Smooth flyTo animation
        if (dist > 0.0001) {
            map.flyTo([latNum, lngNum], readOnly ? 15 : 16, {
                duration: 1.2,
                easeLinearity: 0.25,
            });
        }
        map.invalidateSize();
    }, [latNum, lngNum, radiusNum]);

    return (
        <div
            className={`isolate relative rounded-2xl overflow-hidden border border-stone-200 shadow-2xs z-0 ${className}`}
            style={{ height }}
        >
            <div ref={mapContainerRef} className="w-full h-full" />

            {/* Pleasant Locating Overlay */}
            {isLocating && (
                <div className="absolute inset-0 z-[500] bg-stone-900/40 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-white animate-in fade-in duration-200">
                    <div className="relative flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-clay-500/30 animate-ping absolute" />
                        <div className="w-10 h-10 rounded-full bg-clay-600 flex items-center justify-center shadow-lg relative z-10">
                            <Navigation size={18} className="animate-spin text-white" />
                        </div>
                    </div>
                    <span className="text-xs font-bold tracking-wide drop-shadow-md">
                        Pinpointing your store location...
                    </span>
                </div>
            )}

            {!readOnly && !isLocating && (
                <div className="absolute bottom-2 left-2 z-[400] bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[10px] font-bold text-stone-700 border border-stone-200/80 shadow-2xs pointer-events-none">
                    Click map or drag pin to adjust coordinates
                </div>
            )}
        </div>
    );
}
