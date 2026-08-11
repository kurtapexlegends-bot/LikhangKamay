import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
                dragging: !readOnly,
                scrollWheelZoom: !readOnly,
                doubleClickZoom: !readOnly,
                touchZoom: !readOnly,
            });

            // OpenStreetMap tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors',
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
        }

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    // Update marker, circle, and pan map when coordinates or radius change
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

        // Pan to location if moved significantly
        if (dist > 0.0001) {
            map.panTo([latNum, lngNum], { animate: true });
        }
    }, [latNum, lngNum, radiusNum]);

    return (
        <div
            className={`relative rounded-2xl overflow-hidden border border-stone-200 shadow-2xs z-0 ${className}`}
            style={{ height }}
        >
            <div ref={mapContainerRef} className="w-full h-full" />
            {!readOnly && (
                <div className="absolute bottom-2 left-2 z-[400] bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[10px] font-bold text-stone-700 border border-stone-200/80 shadow-2xs pointer-events-none">
                    Click map or drag pin to adjust coordinates
                </div>
            )}
        </div>
    );
}
