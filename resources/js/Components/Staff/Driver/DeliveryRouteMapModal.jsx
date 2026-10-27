/* global route */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Modal from '@/Components/Modal';
import { MapPin, Navigation, X, ExternalLink, Compass, Radio } from 'lucide-react';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
});

function calculateHaversineKm(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
}

export default function DeliveryRouteMapModal({
    isOpen,
    onClose,
    delivery,
    shopName = "Studio",
}) {
    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const driverMarkerRef = useRef(null);
    const polylineRef = useRef(null);
    const lastBroadcastRef = useRef(0);

    const destAddress = delivery?.destination?.address || 'Store Pickup';
    const destLat = Number(delivery?.destination?.latitude) || null;
    const destLng = Number(delivery?.destination?.longitude) || null;

    // Default fallback to Cavite coordinates if not specified
    const targetLat = destLat || 14.3294;
    const targetLng = destLng || 120.9367;

    const initialDriverLat = Number(delivery?.telemetry?.latitude) || null;
    const initialDriverLng = Number(delivery?.telemetry?.longitude) || null;
    const [driverLocation, setDriverLocation] = useState(
        initialDriverLat && initialDriverLng ? { lat: initialDriverLat, lng: initialDriverLng } : null
    );
    const [currentSpeed, setCurrentSpeed] = useState(delivery?.telemetry?.speed_kph ?? null);

    const distanceKm = driverLocation
        ? calculateHaversineKm(driverLocation.lat, driverLocation.lng, targetLat, targetLng)
        : null;

    const encodedAddr = encodeURIComponent(destAddress);
    const googleMapsUrl = destLat && destLng
        ? `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`
        : `https://www.google.com/maps/dir/?api=1&destination=${encodedAddr}`;

    const wazeUrl = destLat && destLng
        ? `https://waze.com/ul?ll=${destLat},${destLng}&navigate=yes`
        : `https://waze.com/ul?q=${encodedAddr}`;

    const createDropoffIcon = useCallback(() => L.divIcon({
        className: 'custom-dropoff-marker',
        html: `
            <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
                <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
                    <div style="position: absolute; inset: 0; border-radius: 50%; background: rgba(5, 150, 105, 0.25); animation: ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                    <div style="position: relative; width: 30px; height: 30px; border-radius: 10px; background: #059669; color: white; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 3px 8px rgba(0,0,0,0.35); transform: rotate(-45deg);">
                        <div style="transform: rotate(45deg); display: flex; align-items: center; justify-content: center;">
                            <svg style="width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 2.2;" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        </div>
                    </div>
                    <div style="position: absolute; -bottom: 5px; width: 7px; height: 7px; background: #059669; border-radius: 50%; border: 1.5px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>
                </div>
            </div>
        `,
        iconSize: [34, 40],
        iconAnchor: [17, 36],
        popupAnchor: [0, -32],
    }), []);

    const getVehicleSvg = (type) => {
        const raw = String(type || '').toLowerCase();
        if (raw.includes('bike') || raw.includes('bicycle')) {
            return `<svg style="width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 2.2;" viewBox="0 0 24 24"><circle cx="18.5" cy="17.5" r="3.5"></circle><circle cx="5.5" cy="17.5" r="3.5"></circle><circle cx="15" cy="5" r="1"></circle><path d="M12 17.5V14l-3-3 4-3 2 3h2"></path></svg>`;
        }
        if (raw.includes('motor') || raw.includes('scooter')) {
            return `<svg style="width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 2.2;" viewBox="0 0 24 24"><path d="m18 14-1-3"></path><path d="m3 9 6 2a2 2 0 0 1 2-2h2a2 2 0 0 1 1.99 1.81"></path><path d="M8 17h3a1 1 0 0 0 1-1 6 6 0 0 1 6-6 1 1 0 0 0 1-1v-.75A5 5 0 0 0 17 5"></path><circle cx="19" cy="17" r="3"></circle><circle cx="5" cy="17" r="3"></circle></svg>`;
        }
        if (raw.includes('sedan') || raw.includes('car')) {
            return `<svg style="width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 2.2;" viewBox="0 0 24 24"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"></path><circle cx="7" cy="17" r="2"></circle><path d="M9 17h6"></path><circle cx="17" cy="17" r="2"></circle></svg>`;
        }
        return `<svg style="width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 2.2;" viewBox="0 0 24 24"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"></path><path d="M15 18H9"></path><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"></path><circle cx="17" cy="18" r="2"></circle><circle cx="7" cy="18" r="2"></circle></svg>`;
    };

    const vehicleType = delivery?.vehicle_type || 'Motorcycle';
    const createRiderIcon = useCallback(() => L.divIcon({
        className: 'custom-driver-pin',
        html: `
            <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;">
                <div style="position: absolute; inset: -4px; border-radius: 50%; border: 1.5px dashed rgba(16, 185, 129, 0.7); animation: spin 8s linear infinite;"></div>
                <div style="position: absolute; inset: 0; border-radius: 50%; background-color: rgba(16, 185, 129, 0.35); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                <div style="position: relative; width: 32px; height: 32px; border-radius: 50%; background-color: #0f172a; color: white; display: flex; align-items: center; justify-content: center; border: 2.5px solid #10b981; box-shadow: 0 3px 8px rgba(0,0,0,0.35); z-index: 2;">
                    ${getVehicleSvg(vehicleType)}
                </div>
            </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
    }), [vehicleType]);

    // Watch driver device GPS position while modal is open
    useEffect(() => {
        if (!isOpen || typeof window === 'undefined' || !navigator.geolocation) return;

        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const lat = Number(pos.coords.latitude.toFixed(6));
                const lng = Number(pos.coords.longitude.toFixed(6));
                setDriverLocation({ lat, lng });
                const speed = pos.coords.speed !== null && pos.coords.speed >= 0 ? Math.round(pos.coords.speed * 3.6) : null;
                if (speed !== null) {
                    setCurrentSpeed(speed);
                }

                // Broadcast live telemetry every 15s to backend so buyer and seller maps track live
                const now = Date.now();
                if (delivery?.id && (now - lastBroadcastRef.current >= 15000)) {
                    lastBroadcastRef.current = now;
                    axios.put(route('staff.deliveries.telemetry', delivery.id), {
                        latitude: lat,
                        longitude: lng,
                        speed_kph: speed,
                        heading: pos.coords.heading !== null && !isNaN(pos.coords.heading) ? Math.round(pos.coords.heading) : null,
                    }).catch(() => {
                        // Silently ignore transient network hiccups while on road
                    });
                }
            },
            () => {
                // Silently fallback if device GPS temporarily unavailable
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
        );

        return () => {
            navigator.geolocation.clearWatch(watchId);
        };
    }, [isOpen]);

    // Initialize Map DOM
    useEffect(() => {
        if (!isOpen || !mapContainerRef.current) return;

        const timer = setTimeout(() => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
                driverMarkerRef.current = null;
                polylineRef.current = null;
            }

            const map = L.map(mapContainerRef.current, {
                center: driverLocation ? [driverLocation.lat, driverLocation.lng] : [targetLat, targetLng],
                zoom: 14,
                attributionControl: false,
                zoomControl: false,
                scrollWheelZoom: false,
                zoomSnap: 0.25,
                zoomDelta: 0.5,
                wheelPxPerZoomLevel: 120,
                minZoom: 9,
                maxZoom: 18,
            });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
            }).addTo(map);

            // Dropoff Destination Marker (Custom Emerald Badge Icon)
            const destMarker = L.marker([targetLat, targetLng], { icon: createDropoffIcon() }).addTo(map);
            destMarker.bindPopup(`<b>Order #${delivery?.order_number || ''}</b><br/>${destAddress}`);

            const routePoints = [];

            // Live Driver Marker if location known
            if (driverLocation) {
                const driverMarker = L.marker([driverLocation.lat, driverLocation.lng], { icon: createRiderIcon() }).addTo(map);
                driverMarker.bindPopup(`<b>Your Live Location</b><br/>Speed: ${currentSpeed ? `${currentSpeed} km/h` : 'Stopped'}`);
                driverMarkerRef.current = driverMarker;
                routePoints.push([driverLocation.lat, driverLocation.lng]);
            }

            routePoints.push([targetLat, targetLng]);

            if (routePoints.length >= 2) {
                L.polyline(routePoints, {
                    color: '#ffffff',
                    weight: 6,
                    opacity: 0.85,
                    lineCap: 'round',
                    lineJoin: 'round',
                }).addTo(map);

                const polyline = L.polyline(routePoints, {
                    color: '#89432d',
                    weight: 3.5,
                    dashArray: '6, 8',
                    opacity: 0.95,
                    lineCap: 'round',
                    lineJoin: 'round',
                }).addTo(map);
                polylineRef.current = polyline;
                map.fitBounds(polyline.getBounds(), { padding: [35, 35], animate: false });
            }

            mapInstanceRef.current = map;
            map.invalidateSize();
        }, 150);

        return () => {
            clearTimeout(timer);
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
                driverMarkerRef.current = null;
                polylineRef.current = null;
            }
        };
    }, [isOpen, targetLat, targetLng, delivery?.order_number, destAddress, createRiderIcon, createDropoffIcon]);

    // Move driver marker on GPS tick without tearing down map
    useEffect(() => {
        if (!mapInstanceRef.current || !driverLocation) return;

        if (driverMarkerRef.current) {
            driverMarkerRef.current.setLatLng([driverLocation.lat, driverLocation.lng]);
            driverMarkerRef.current.setPopupContent(`<b>Your Live Location</b><br/>Speed: ${currentSpeed ? `${currentSpeed} km/h` : 'Stopped'}`);
        } else {
            const driverMarker = L.marker([driverLocation.lat, driverLocation.lng], { icon: createRiderIcon() }).addTo(mapInstanceRef.current);
            driverMarker.bindPopup(`<b>Your Live Location</b><br/>Speed: ${currentSpeed ? `${currentSpeed} km/h` : 'Stopped'}`);
            driverMarkerRef.current = driverMarker;
        }

        if (polylineRef.current) {
            polylineRef.current.setLatLngs([
                [driverLocation.lat, driverLocation.lng],
                [targetLat, targetLng]
            ]);
        }
    }, [driverLocation, currentSpeed, targetLat, targetLng, createRiderIcon]);

    if (!isOpen || !delivery) return null;

    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="2xl">
            <div className="p-5 sm:p-6 bg-white rounded-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-clay-100 text-clay-700">
                            <Compass size={18} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-stone-900">
                                Delivery Route &amp; Coordinates
                            </h3>
                            <p className="text-[11px] text-stone-500">
                                Order #{delivery.order_number} • {shopName}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-stone-400 hover:text-stone-700 rounded-xl p-2 hover:bg-stone-100 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                        aria-label="Close delivery route modal"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Destination info */}
                <div className="rounded-xl bg-stone-50 p-3.5 border border-stone-200/80 mb-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0 flex-1">
                            <MapPin size={15} className="text-clay-600 shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                                    Drop-off Destination
                                </p>
                                <p className="text-xs font-semibold text-stone-900 leading-relaxed">
                                    {destAddress}
                                </p>
                            </div>
                        </div>

                        {driverLocation && (
                            <div className="flex flex-col items-end shrink-0 gap-1">
                                <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                                    Live GPS
                                </span>
                                {distanceKm !== null && (
                                    <span className="text-[11px] font-mono font-bold text-stone-700">
                                        ~{distanceKm} km
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-stone-500 pl-6 border-t border-stone-200/60 pt-1.5">
                        <span>
                            {destLat && destLng ? `Coords: ${destLat.toFixed(5)}, ${destLng.toFixed(5)}` : 'Coordinates via Address'}
                        </span>
                        {currentSpeed !== null && currentSpeed > 0 && (
                            <span className="text-emerald-700 font-bold font-sans">
                                Speed: {currentSpeed} km/h
                            </span>
                        )}
                    </div>
                </div>

                {/* Leaflet Map Canvas */}
                <div className="relative rounded-2xl overflow-hidden border border-stone-200/90 shadow-2xs h-64 sm:h-80 bg-stone-100">
                    <div ref={mapContainerRef} className="h-full w-full z-0" />
                </div>

                {/* Navigation Links Footer */}
                <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-stone-100">
                    <span className="text-[11px] text-stone-500 font-medium">
                        Open in external navigation app:
                    </span>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <a
                            href={googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-stone-800 transition shadow-2xs min-h-[44px]"
                        >
                            <Navigation size={14} className="text-clay-400" />
                            <span>Google Maps</span>
                            <ExternalLink size={13} className="text-stone-400" />
                        </a>
                        <a
                            href={wazeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-100 transition shadow-2xs min-h-[44px]"
                        >
                            <Navigation size={14} className="text-stone-500" />
                            <span>Waze</span>
                            <ExternalLink size={13} className="text-stone-400" />
                        </a>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
