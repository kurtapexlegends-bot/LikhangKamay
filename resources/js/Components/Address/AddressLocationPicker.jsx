import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, Crosshair, Loader2 } from 'lucide-react';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { getCaviteCoordinatesForCity } from '@/lib/caviteAddresses';

// Ensure standard Leaflet marker icons resolve correctly in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
});

export default function AddressLocationPicker({
    latitude = null,
    longitude = null,
    city = '',
    barangay = '',
    onLocationSelect = null,
    readOnly = false,
    height = '240px',
    className = '',
}) {
    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markerRef = useRef(null);
    const [isLocating, setIsLocating] = useState(false);
    const [isExpanded, setIsExpanded] = useState(true);

    const hasCoordinates = latitude !== null && longitude !== null && !isNaN(Number(latitude)) && !isNaN(Number(longitude));
    
    // Resolve initial center: provided coords > city center > Dasmariñas default
    const getInitialCenter = useCallback(() => {
        if (hasCoordinates) {
            return [Number(latitude), Number(longitude)];
        }
        const cityCoord = getCaviteCoordinatesForCity(city);
        return [cityCoord.lat, cityCoord.lng];
    }, [hasCoordinates, latitude, longitude, city]);

    // Initialize Leaflet Map
    useEffect(() => {
        if (!mapContainerRef.current) return;

        if (!mapInstanceRef.current) {
            const [initialLat, initialLng] = getInitialCenter();

            const map = L.map(mapContainerRef.current, {
                center: [initialLat, initialLng],
                zoom: hasCoordinates ? 16 : 14,
                zoomControl: !readOnly,
                attributionControl: false,
                dragging: !readOnly,
                scrollWheelZoom: !readOnly,
                doubleClickZoom: !readOnly,
                touchZoom: !readOnly,
            });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
            }).addTo(map);

            // Marker
            const marker = L.marker([initialLat, initialLng], {
                draggable: !readOnly,
            }).addTo(map);

            markerRef.current = marker;
            mapInstanceRef.current = map;

            // Invalidate size on mount to ensure tiles render properly
            const timer = setTimeout(() => {
                if (mapInstanceRef.current) {
                    mapInstanceRef.current.invalidateSize();
                }
            }, 200);

            if (!readOnly && onLocationSelect) {
                marker.on('dragend', (e) => {
                    const coord = e.target.getLatLng();
                    const nextLat = Number(coord.lat.toFixed(7));
                    const nextLng = Number(coord.lng.toFixed(7));
                    onLocationSelect({ latitude: nextLat, longitude: nextLng });
                });

                map.on('click', (e) => {
                    const nextLat = Number(e.latlng.lat.toFixed(7));
                    const nextLng = Number(e.latlng.lng.toFixed(7));
                    marker.setLatLng([nextLat, nextLng]);
                    onLocationSelect({ latitude: nextLat, longitude: nextLng });
                });
            }

            return () => {
                clearTimeout(timer);
                map.remove();
                mapInstanceRef.current = null;
                markerRef.current = null;
            };
        }
    }, []);

    // Center map when city changes and no custom pin has been set yet
    useEffect(() => {
        if (mapInstanceRef.current && city && !hasCoordinates) {
            const cityCoord = getCaviteCoordinatesForCity(city);
            mapInstanceRef.current.setView([cityCoord.lat, cityCoord.lng], 14, { animate: true });
            if (markerRef.current) {
                markerRef.current.setLatLng([cityCoord.lat, cityCoord.lng]);
            }
        }
    }, [city]);

    // Update marker position when latitude/longitude props change externally
    useEffect(() => {
        if (mapInstanceRef.current && markerRef.current && hasCoordinates) {
            const currentPos = markerRef.current.getLatLng();
            const newLat = Number(latitude);
            const newLng = Number(longitude);
            if (Math.abs(currentPos.lat - newLat) > 0.0001 || Math.abs(currentPos.lng - newLng) > 0.0001) {
                markerRef.current.setLatLng([newLat, newLng]);
                mapInstanceRef.current.setView([newLat, newLng], 16, { animate: true });
            }
        }
    }, [latitude, longitude]);

    // Handle "Use My Current Location" via Browser Geolocation API
    const handleLocateMe = () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser.');
            return;
        }

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setIsLocating(false);
                const userLat = Number(position.coords.latitude.toFixed(7));
                const userLng = Number(position.coords.longitude.toFixed(7));

                if (mapInstanceRef.current && markerRef.current) {
                    markerRef.current.setLatLng([userLat, userLng]);
                    mapInstanceRef.current.setView([userLat, userLng], 17, { animate: true });
                }

                if (onLocationSelect) {
                    onLocationSelect({ latitude: userLat, longitude: userLng });
                }
            },
            (error) => {
                setIsLocating(false);
                console.warn('Geolocation lookup notice:', error.message);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    return (
        <div className={`rounded-xl border border-stone-200 bg-stone-50/50 p-3 ${className}`}>
            <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-clay-600 shrink-0" />
                    <span className="text-xs font-bold text-stone-800">Pin Delivery Location</span>
                    {hasCoordinates && (
                        <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                            Location Pinned
                        </span>
                    )}
                </div>

                {!readOnly && (
                    <button
                        type="button"
                        onClick={handleLocateMe}
                        disabled={isLocating}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900 active:scale-95 transition shadow-2xs disabled:opacity-50"
                    >
                        {isLocating ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-clay-600" />
                        ) : (
                            <Crosshair className="w-3.5 h-3.5 text-clay-600" />
                        )}
                        <span>{isLocating ? 'Locating...' : 'Use My GPS'}</span>
                    </button>
                )}
            </div>

            <p className="text-[11px] text-stone-500 mb-2">
                Tap anywhere or drag the pin to your exact doorstep to ensure accurate courier arrival.
            </p>

            <div
                ref={mapContainerRef}
                style={{ height }}
                className="w-full rounded-lg border border-stone-200 shadow-inner z-0 overflow-hidden"
            />

            {hasCoordinates && (
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-stone-500 font-mono">
                    <span>Lat: {Number(latitude).toFixed(6)}</span>
                    <span>Lng: {Number(longitude).toFixed(6)}</span>
                </div>
            )}
        </div>
    );
}
