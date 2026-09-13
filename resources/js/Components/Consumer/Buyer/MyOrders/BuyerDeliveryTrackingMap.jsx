import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
    Truck, Phone, MessageSquare, 
    RefreshCw, Maximize2, Compass, ShieldCheck, X 
} from 'lucide-react';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
});

// Calculate approximate Haversine distance in kilometers
function calculateHaversineKm(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371; // Earth radius in km
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

export default function BuyerDeliveryTrackingMap({ order, delivery }) {
    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const driverMarkerRef = useRef(null);
    const polylineRef = useRef(null);

    const [isFullScreen, setIsFullScreen] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState(null);

    // Initial Telemetry coordinates
    const [telemetry, setTelemetry] = useState({
        latitude: delivery?.current_latitude ?? null,
        longitude: delivery?.current_longitude ?? null,
        heading: delivery?.heading ?? null,
        speed_kph: delivery?.speed_kph ?? null,
        updated_at: delivery?.location_updated_at ?? null,
        driver_name: delivery?.driver_name ?? 'Studio Courier',
        driver_phone: delivery?.driver_phone ?? null,
        vehicle_type: delivery?.vehicle_type ?? 'Motorcycle',
        vehicle_plate_number: delivery?.vehicle_plate_number ?? null,
    });

    // Pickup & Dropoff Coordinates with resilient fallbacks
    const pickupLat = Number(delivery?.pickup_latitude) || 14.3369537;
    const pickupLng = Number(delivery?.pickup_longitude) || 120.9478355;

    const dropoffLat = Number(delivery?.dropoff_latitude || order?.shipping_latitude) || (pickupLat + 0.018);
    const dropoffLng = Number(delivery?.dropoff_longitude || order?.shipping_longitude) || (pickupLng + 0.018);

    const activeDriverLat = telemetry.latitude ? Number(telemetry.latitude) : null;
    const activeDriverLng = telemetry.longitude ? Number(telemetry.longitude) : null;

    // Remaining Distance Calculation
    const remainingKm = activeDriverLat && activeDriverLng
        ? calculateHaversineKm(activeDriverLat, activeDriverLng, dropoffLat, dropoffLng)
        : calculateHaversineKm(pickupLat, pickupLng, dropoffLat, dropoffLng);

    // Estimated minutes remaining (assumes ~25 km/h urban courier travel)
    const estimatedMinutes = remainingKm ? Math.max(3, Math.round((remainingKm / 25) * 60)) : null;

    // Fetch latest telemetry from endpoint
    const fetchLatestTelemetry = useCallback(async () => {
        if (!delivery?.id) return;
        try {
            setIsRefreshing(true);
            const response = await fetch(`/deliveries/${delivery.id}/telemetry`, {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data?.telemetry?.latitude && data?.telemetry?.longitude) {
                    setTelemetry(prev => ({
                        ...prev,
                        latitude: Number(data.telemetry.latitude),
                        longitude: Number(data.telemetry.longitude),
                        heading: data.telemetry.heading ? Number(data.telemetry.heading) : prev.heading,
                        speed_kph: data.telemetry.speed_kph !== null ? Number(data.telemetry.speed_kph) : prev.speed_kph,
                        updated_at: data.telemetry.updated_at || new Date().toISOString(),
                        driver_name: data.driver_name || prev.driver_name,
                        driver_phone: data.driver_phone || prev.driver_phone,
                        vehicle_type: data.vehicle_type || prev.vehicle_type,
                        vehicle_plate_number: data.vehicle_plate_number || prev.vehicle_plate_number,
                    }));
                    setLastSyncTime(new Date());
                }
            }
        } catch {
            // Silently handle telemetry polling interruption
        } finally {
            setIsRefreshing(false);
        }
    }, [delivery?.id]);

    // Polling effect when delivery is active in transit
    useEffect(() => {
        const isTransit = ['ON_GOING', 'PICKED_UP', 'IN_TRANSIT'].includes(String(delivery?.status || '').toUpperCase());
        if (!isTransit || !delivery?.id) return;

        // Poll every 12 seconds while viewing
        const interval = setInterval(() => {
            if (!document.hidden) {
                fetchLatestTelemetry();
            }
        }, 12000);

        return () => clearInterval(interval);
    }, [delivery?.status, delivery?.id, fetchLatestTelemetry]);

    // Initialize & Update Leaflet Map
    useEffect(() => {
        if (!mapContainerRef.current) return;

        // Destroy previous instance
        if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
        }

        const map = L.map(mapContainerRef.current, {
            center: activeDriverLat && activeDriverLng ? [activeDriverLat, activeDriverLng] : [pickupLat, pickupLng],
            zoom: 13,
            attributionControl: false,
            zoomControl: false,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
        }).addTo(map);

        // 1. Studio Pickup Marker (Earthy Terracotta)
        const pickupIcon = L.divIcon({
            className: 'custom-map-pin',
            html: `
                <div style="background-color: #89432d; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.3); border: 2px solid white;">
                    <svg style="width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2.5;" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                </div>
            `,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
        });

        const pickupMarker = L.marker([pickupLat, pickupLng], { icon: pickupIcon }).addTo(map);
        pickupMarker.bindPopup(`
            <div style="font-size: 11px; font-family: sans-serif; line-height: 1.4;">
                <b style="color: #89432d; text-transform: uppercase; font-size: 9px; letter-spacing: 0.05em;">Artisan Studio Origin</b><br/>
                <strong>${order.seller_name || 'Artisan Workshop'}</strong><br/>
                <span style="color: #78716c;">${order.seller_address || 'Studio Origin'}</span>
            </div>
        `);

        // 2. Buyer Destination Marker (Emerald / Blue)
        const dropoffIcon = L.divIcon({
            className: 'custom-map-pin',
            html: `
                <div style="background-color: #059669; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.3); border: 2px solid white;">
                    <svg style="width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2.5;" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
            `,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
        });

        const dropoffMarker = L.marker([dropoffLat, dropoffLng], { icon: dropoffIcon }).addTo(map);
        dropoffMarker.bindPopup(`
            <div style="font-size: 11px; font-family: sans-serif; line-height: 1.4;">
                <b style="color: #059669; text-transform: uppercase; font-size: 9px; letter-spacing: 0.05em;">Your Delivery Destination</b><br/>
                <strong>${order.shipping_recipient_name || 'Delivery Address'}</strong><br/>
                <span style="color: #78716c;">${order.shipping_address || 'Shipping Address'}</span>
            </div>
        `);

        // 3. Live Driver Marker (if coordinates available)
        const routePoints = [[pickupLat, pickupLng]];

        if (activeDriverLat && activeDriverLng) {
            routePoints.push([activeDriverLat, activeDriverLng]);

            const driverIcon = L.divIcon({
                className: 'custom-driver-pin',
                html: `
                    <div style="position: relative; width: 34px; height: 34px;">
                        <div style="position: absolute; inset: 0; border-radius: 50%; background-color: rgba(16, 185, 129, 0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                        <div style="position: relative; width: 34px; height: 34px; border-radius: 50%; background-color: #0f172a; color: white; display: flex; align-items: center; justify-content: center; border: 2.5px solid #10b981; box-shadow: 0 3px 8px rgba(0,0,0,0.35);">
                            <svg style="width: 17px; height: 17px; fill: none; stroke: currentColor; stroke-width: 2.2;" viewBox="0 0 24 24"><path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5a2 2 0 0 0-2 2v7h3m10 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0zm-10 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0z"/></svg>
                        </div>
                    </div>
                `,
                iconSize: [34, 34],
                iconAnchor: [17, 17],
            });

            const driverMarker = L.marker([activeDriverLat, activeDriverLng], { icon: driverIcon }).addTo(map);
            driverMarker.bindPopup(`
                <div style="font-size: 11px; font-family: sans-serif; line-height: 1.4;">
                    <b style="color: #10b981; text-transform: uppercase; font-size: 9px; letter-spacing: 0.05em;">Studio Courier Driver</b><br/>
                    <strong>${telemetry.driver_name}</strong><br/>
                    <span style="color: #78716c;">${telemetry.vehicle_plate_number ? 'Plate: ' + telemetry.vehicle_plate_number : telemetry.vehicle_type}</span><br/>
                    ${telemetry.speed_kph ? `<span style="display: inline-block; margin-top: 2px; background: #ecfdf5; color: #047857; font-weight: bold; padding: 1px 5px; border-radius: 4px;">Speed: ${Math.round(telemetry.speed_kph)} km/h</span>` : ''}
                </div>
            `);
            driverMarkerRef.current = driverMarker;
        }

        routePoints.push([dropoffLat, dropoffLng]);

        // 4. Connecting Route Polyline
        const polyline = L.polyline(routePoints, {
            color: '#89432d',
            weight: 3.5,
            dashArray: '6, 8',
            opacity: 0.85,
        }).addTo(map);

        polylineRef.current = polyline;

        // Auto-fit bounds with comfortable padding
        map.fitBounds(polyline.getBounds(), { padding: [35, 35] });

        mapInstanceRef.current = map;

        // Invalidate size once rendered to prevent blank tile artifacts
        setTimeout(() => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.invalidateSize();
            }
        }, 200);

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [pickupLat, pickupLng, dropoffLat, dropoffLng, activeDriverLat, activeDriverLng, order.seller_name, order.seller_address, order.shipping_recipient_name, order.shipping_address, telemetry.driver_name, telemetry.vehicle_plate_number, telemetry.vehicle_type, telemetry.speed_kph]);

    // Handle center map on route bounds
    const handleCenterMap = () => {
        if (mapInstanceRef.current && polylineRef.current) {
            mapInstanceRef.current.fitBounds(polylineRef.current.getBounds(), { padding: [35, 35] });
        }
    };

    // Invalidate map size on full screen toggle
    useEffect(() => {
        if (mapInstanceRef.current) {
            const timer = setTimeout(() => {
                mapInstanceRef.current.invalidateSize();
                if (polylineRef.current) {
                    mapInstanceRef.current.fitBounds(polylineRef.current.getBounds(), { padding: [40, 40] });
                }
            }, 180);
            return () => clearTimeout(timer);
        }
    }, [isFullScreen]);

    const mapContent = (
        <div className={`flex flex-col bg-white overflow-hidden transition-all ${
            isFullScreen 
                ? 'w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl border border-stone-300' 
                : 'w-full rounded-xl border border-stone-200/90 shadow-2xs'
        }`}>
            {/* Modal Header only shown in Full Screen */}
            {isFullScreen && (
                <div className="flex items-center justify-between gap-2 border-b border-stone-100 bg-stone-50/90 px-4 py-2.5">
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                        <span className="text-xs font-bold text-stone-800">
                            Live Delivery Tracking • Order #{order.order_number || ''}
                        </span>
                        {telemetry.speed_kph !== null && telemetry.speed_kph > 0 && (
                            <span className="rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-800">
                                {Math.round(telemetry.speed_kph)} km/h
                            </span>
                        )}
                        {lastSyncTime && (
                            <span className="hidden sm:inline text-[10px] text-stone-400">
                                • Synced {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={handleCenterMap}
                            className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2 py-1 text-[11px] font-bold text-stone-600 hover:bg-stone-100 transition"
                        >
                            <Compass size={12} className="text-clay-600" />
                            <span>Fit Route</span>
                        </button>
                        <button
                            type="button"
                            onClick={fetchLatestTelemetry}
                            disabled={isRefreshing}
                            className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2 py-1 text-[11px] font-bold text-stone-600 hover:bg-stone-100 transition"
                        >
                            <RefreshCw size={12} className={`text-stone-500 ${isRefreshing ? 'animate-spin text-clay-600' : ''}`} />
                            <span>{isRefreshing ? 'Syncing...' : 'Sync GPS'}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsFullScreen(false)}
                            className="inline-flex items-center justify-center h-7 w-7 rounded-lg border border-stone-200 bg-white text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition ml-1"
                            title="Close full screen"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>
            )}

            {/* Map Canvas with Floating Controls */}
            <div className={`relative w-full bg-stone-100 ${isFullScreen ? 'flex-1 min-h-0' : 'h-36 sm:h-44'}`}>
                <div 
                    ref={mapContainerRef} 
                    className="w-full h-full"
                />

                {/* Floating Controls in Compact Mode */}
                {!isFullScreen && (
                    <>
                        {/* Top-Left: Live Status Badge */}
                        <div className="absolute top-2 left-2 z-[500] flex items-center gap-1.5 rounded-lg bg-white/95 px-2 py-1 shadow-xs border border-stone-200/80 backdrop-blur-xs">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                            </span>
                            <span className="text-[10px] font-bold text-stone-800">
                                {activeDriverLat && activeDriverLng ? 'In Transit' : 'Route'}
                            </span>
                            {telemetry.speed_kph !== null && telemetry.speed_kph > 0 && (
                                <span className="rounded bg-emerald-50 border border-emerald-200/80 px-1 py-0.2 text-[9px] font-extrabold text-emerald-800">
                                    {Math.round(telemetry.speed_kph)} km/h
                                </span>
                            )}
                        </div>

                        {/* Top-Right: Compact Action Group */}
                        <div className="absolute top-2 right-2 z-[500] flex items-center gap-0.5 rounded-lg bg-white/95 p-0.5 shadow-xs border border-stone-200/80 backdrop-blur-xs">
                            <button
                                type="button"
                                onClick={handleCenterMap}
                                className="inline-flex items-center justify-center h-6 w-6 rounded text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition"
                                title="Center route"
                            >
                                <Compass size={12} className="text-clay-600" />
                            </button>
                            <button
                                type="button"
                                onClick={fetchLatestTelemetry}
                                disabled={isRefreshing}
                                className="inline-flex items-center justify-center h-6 w-6 rounded text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition"
                                title="Sync GPS"
                            >
                                <RefreshCw size={11} className={`text-stone-500 ${isRefreshing ? 'animate-spin text-clay-600' : ''}`} />
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsFullScreen(true)}
                                className="inline-flex items-center justify-center h-6 w-6 rounded text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition"
                                title="Expand to full screen"
                            >
                                <Maximize2 size={11} />
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Bottom Driver Strip */}
            <div className="flex items-center justify-between gap-2 border-t border-stone-100 bg-white px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-clay-50 border border-clay-200/80 text-clay-700">
                        <Truck size={13} />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5 truncate">
                            <p className="text-[11px] font-extrabold text-stone-900 truncate">
                                {telemetry.driver_name}
                            </p>
                            {telemetry.vehicle_plate_number && (
                                <span className="rounded bg-stone-100 px-1 py-0.2 text-[9px] font-mono font-bold text-stone-600">
                                    {telemetry.vehicle_plate_number}
                                </span>
                            )}
                        </div>
                        <p className="text-[10px] text-stone-500 truncate">
                            {remainingKm !== null ? `~${remainingKm} km away` : 'Calculating route...'}
                            {estimatedMinutes !== null ? ` • ~${estimatedMinutes} mins away` : ''}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    {telemetry.driver_phone ? (
                        <>
                            <a
                                href={`tel:${telemetry.driver_phone}`}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-2xs hover:bg-emerald-700 active:scale-95 transition min-h-[28px]"
                            >
                                <Phone size={10} /> Call Driver
                            </a>
                            <a
                                href={`sms:${telemetry.driver_phone}`}
                                className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 px-2 py-1 text-[10px] font-bold text-stone-700 hover:bg-stone-100 active:scale-95 transition min-h-[28px]"
                            >
                                <MessageSquare size={10} /> SMS
                            </a>
                        </>
                    ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-md">
                            <ShieldCheck size={11} className="text-emerald-600" />
                            <span>Verified</span>
                        </span>
                    )}
                </div>
            </div>
        </div>
    );

    if (isFullScreen) {
        return (
            <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
                {mapContent}
            </div>
        );
    }

    return (
        <div className="mt-2 relative">
            {mapContent}
        </div>
    );
}
