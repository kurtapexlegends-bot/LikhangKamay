import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, ShieldAlert, ShieldCheck } from 'lucide-react';

// Fix Leaflet default marker icons for Vite build
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
});

export default function StaffGeofenceMap({
    workplaceLat,
    workplaceLng,
    radiusMeters = 100,
    staffLat = null,
    staffLng = null,
    distanceMeters = null,
    isWithin = true,
    locationName = 'Assigned Workplace',
    height = '200px',
}) {
    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const circleRef = useRef(null);
    const workplaceMarkerRef = useRef(null);
    const staffMarkerRef = useRef(null);

    const wpLat = Number(workplaceLat) || 14.5995;
    const wpLng = Number(workplaceLng) || 120.9842;
    const radius = Number(radiusMeters) || 100;
    const sLat = staffLat !== null ? Number(staffLat) : null;
    const sLng = staffLng !== null ? Number(staffLng) : null;

    useEffect(() => {
        if (!mapContainerRef.current) return;

        // Initialize Map
        if (!mapInstanceRef.current) {
            const map = L.map(mapContainerRef.current, {
                center: [wpLat, wpLng],
                zoom: 16,
                zoomControl: false,
                attributionControl: false,
                dragging: false,
                scrollWheelZoom: false,
                doubleClickZoom: false,
                touchZoom: false,
            });

            // OpenStreetMap Tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
            }).addTo(map);

            // Workplace Center Marker
            const wpMarker = L.marker([wpLat, wpLng], {
                title: locationName,
                interactive: false,
            }).addTo(map);

            // Geofence Radius Circle
            const circle = L.circle([wpLat, wpLng], {
                radius: radius,
                color: isWithin ? '#10b981' : '#f43f5e',
                fillColor: isWithin ? '#10b981' : '#f43f5e',
                fillOpacity: 0.18,
                weight: 2,
                dashArray: isWithin ? null : '6, 6',
            }).addTo(map);

            circleRef.current = circle;
            workplaceMarkerRef.current = wpMarker;
            mapInstanceRef.current = map;
        } else {
            // Update Map View
            const map = mapInstanceRef.current;
            map.setView([wpLat, wpLng]);

            if (circleRef.current) {
                circleRef.current.setLatLng([wpLat, wpLng]);
                circleRef.current.setRadius(radius);
                circleRef.current.setStyle({
                    color: isWithin ? '#10b981' : '#f43f5e',
                    fillColor: isWithin ? '#10b981' : '#f43f5e',
                    dashArray: isWithin ? null : '6, 6',
                });
            }

            if (workplaceMarkerRef.current) {
                workplaceMarkerRef.current.setLatLng([wpLat, wpLng]);
            }
        }

        // Add or Update Staff Marker
        if (sLat !== null && sLng !== null && mapInstanceRef.current) {
            const map = mapInstanceRef.current;

            // Custom Staff Pin Icon
            const staffIcon = L.divIcon({
                className: 'custom-staff-marker',
                html: `<div style="
                    background-color: ${isWithin ? '#10b981' : '#ef4444'};
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    border: 3px solid #ffffff;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                "></div>`,
                iconSize: [18, 18],
                iconAnchor: [9, 9],
            });

            if (!staffMarkerRef.current) {
                staffMarkerRef.current = L.marker([sLat, sLng], {
                    icon: staffIcon,
                    interactive: false,
                }).addTo(map);
            } else {
                staffMarkerRef.current.setLatLng([sLat, sLng]);
                staffMarkerRef.current.setIcon(staffIcon);
            }

            // Auto-fit map bounds to encompass workplace boundary and staff position
            const bounds = L.latLngBounds([
                [wpLat, wpLng],
                [sLat, sLng],
            ]);
            map.fitBounds(bounds.pad(0.3), { animate: false });
        }

        // Invalidate size to ensure proper tile rendering
        const timer = setTimeout(() => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.invalidateSize();
            }
        }, 150);

        return () => clearTimeout(timer);
    }, [wpLat, wpLng, radius, sLat, sLng, isWithin]);

    return (
        <div className="relative overflow-hidden rounded-2xl border border-stone-200/80 shadow-2xs">
            {/* Leaflet Map Canvas Container */}
            <div ref={mapContainerRef} style={{ height }} className="w-full bg-stone-100" />

            {/* Read-Only Non-Editable Badge */}
            <div className="absolute top-2.5 left-2.5 z-[400] bg-stone-950/80 backdrop-blur-md border border-white/10 text-white text-[9px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
                <MapPin size={11} className="text-amber-400" />
                <span>Geofence Visual Map (Read-Only)</span>
            </div>

            {/* Distance & Boundary Overlay Badge */}
            <div className={`absolute bottom-2.5 inset-x-2.5 z-[400] bg-white/95 backdrop-blur-md border p-2.5 rounded-xl shadow-md flex items-center justify-between gap-2 text-xs ${
                isWithin ? 'border-emerald-200 text-emerald-950' : 'border-rose-200 text-rose-950'
            }`}>
                <div className="flex items-center gap-2 min-w-0">
                    {isWithin ? (
                        <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                    ) : (
                        <ShieldAlert size={16} className="text-rose-600 shrink-0" />
                    )}
                    <div className="min-w-0">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-500 truncate">
                            {locationName}
                        </p>
                        <p className="text-xs font-black truncate">
                            {distanceMeters !== null ? `${distanceMeters}m from shop` : 'GPS Position Acquired'}
                            <span className="text-[10px] font-normal text-stone-500 ml-1">(Radius: {radius}m)</span>
                        </p>
                    </div>
                </div>

                <div className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                    isWithin ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
                }`}>
                    {isWithin ? 'In Range' : 'Out of Range'}
                </div>
            </div>
        </div>
    );
}
