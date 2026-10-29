import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
    Truck, Phone, MessageSquare, 
    RefreshCw, Maximize2, Compass, ShieldCheck, X, Radio,
    Bike, Car, Motorbike, Route as RouteIcon, Check
} from 'lucide-react';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import LiveCourierRadarOverlay from './LiveCourierRadarOverlay';
import { copyToClipboard } from '@/utils/clipboard';
import { useToast } from '@/Components/ToastContext';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
});

// Vehicle Themes with matching brand colors, OSRM profiles, speeds, and vector SVGs
const VEHICLE_THEMES = {
    motorcycle: {
        type: 'Motorcycle',
        label: 'Motorcycle Express',
        color: '#89432d', // Clay terracotta
        profile: 'driving',
        avgSpeedKph: 25,
        iconSvg: `<svg style="width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 2.2;" viewBox="0 0 24 24"><path d="m18 14-1-3"></path><path d="m3 9 6 2a2 2 0 0 1 2-2h2a2 2 0 0 1 1.99 1.81"></path><path d="M8 17h3a1 1 0 0 0 1-1 6 6 0 0 1 6-6 1 1 0 0 0 1-1v-.75A5 5 0 0 0 17 5"></path><circle cx="19" cy="17" r="3"></circle><circle cx="5" cy="17" r="3"></circle></svg>`,
    },
    bicycle: {
        type: 'Bicycle',
        label: 'Bicycle Eco Courier',
        color: '#059669', // Emerald
        profile: 'bike',
        avgSpeedKph: 15,
        iconSvg: `<svg style="width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 2.2;" viewBox="0 0 24 24"><circle cx="18.5" cy="17.5" r="3.5"></circle><circle cx="5.5" cy="17.5" r="3.5"></circle><circle cx="15" cy="5" r="1"></circle><path d="M12 17.5V14l-3-3 4-3 2 3h2"></path></svg>`,
    },
    sedan: {
        type: 'Sedan',
        label: 'Car / Sedan Delivery',
        color: '#2563eb', // Royal Blue
        profile: 'driving',
        avgSpeedKph: 28,
        iconSvg: `<svg style="width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 2.2;" viewBox="0 0 24 24"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"></path><circle cx="7" cy="17" r="2"></circle><path d="M9 17h6"></path><circle cx="17" cy="17" r="2"></circle></svg>`,
    },
    truck: {
        type: 'Truck',
        label: 'Truck / Van Transport',
        color: '#4f46e5', // Indigo
        profile: 'driving',
        avgSpeedKph: 22,
        iconSvg: `<svg style="width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 2.2;" viewBox="0 0 24 24"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"></path><path d="M15 18H9"></path><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"></path><circle cx="17" cy="18" r="2"></circle><circle cx="7" cy="18" r="2"></circle></svg>`,
    },
};

function getVehicleConfig(type) {
    const raw = String(type || '').toLowerCase();
    if (raw.includes('bike') || raw.includes('bicycle')) return VEHICLE_THEMES.bicycle;
    if (raw.includes('motor') || raw.includes('scooter')) return VEHICLE_THEMES.motorcycle;
    if (raw.includes('truck') || raw.includes('van')) return VEHICLE_THEMES.truck;
    if (raw.includes('sedan') || raw.includes('car')) return VEHICLE_THEMES.sedan;
    return VEHICLE_THEMES.motorcycle;
}

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

export default function BuyerDeliveryTrackingMap({ order, delivery, role = 'buyer' }) {
    const { addToast } = useToast() || {};
    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const driverMarkerRef = useRef(null);
    const waypointMarkerRef = useRef(null);
    const completedPolylineRef = useRef(null);
    const outerPolylineRef = useRef(null);
    const polylineRef = useRef(null);
    const telemetryFailuresRef = useRef(0);
    const [isTelemetryHalted, setIsTelemetryHalted] = useState(false);
    const [cameraViewMode, setCameraViewMode] = useState('route'); // 'route' | 'full'
    const hasInitialFitDoneRef = useRef(false);
    const MAX_TELEMETRY_FAILURES = 3;

    const [isFullScreen, setIsFullScreen] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState(null);
    const [showRadarHud, setShowRadarHud] = useState(false);
    const [routeData, setRouteData] = useState(null);
    const [isLoadingRoute, setIsLoadingRoute] = useState(false);
    const [copiedPhoneType, setCopiedPhoneType] = useState(null);

    // Initial Telemetry coordinates
    const [telemetry, setTelemetry] = useState({
        latitude: delivery?.current_latitude !== null && delivery?.current_latitude !== undefined ? Number(delivery.current_latitude) : null,
        longitude: delivery?.current_longitude !== null && delivery?.current_longitude !== undefined ? Number(delivery.current_longitude) : null,
        heading: delivery?.heading !== null && delivery?.heading !== undefined ? Number(delivery.heading) : null,
        speed_kph: delivery?.speed_kph !== null && delivery?.speed_kph !== undefined ? Number(delivery.speed_kph) : null,
        updated_at: delivery?.location_updated_at ?? null,
        driver_name: delivery?.driver_name || 'Studio Courier',
        driver_phone: delivery?.driver_phone ?? null,
        vehicle_type: delivery?.vehicle_type || 'Motorcycle',
        vehicle_plate_number: delivery?.vehicle_plate_number ?? null,
    });

    // Synchronize telemetry dynamically when parent Inertia props refresh
    useEffect(() => {
        if (!delivery) return;
        telemetryFailuresRef.current = 0;
        setIsTelemetryHalted(false);
        setTelemetry(prev => ({
            latitude: delivery.current_latitude !== null && delivery.current_latitude !== undefined ? Number(delivery.current_latitude) : prev.latitude,
            longitude: delivery.current_longitude !== null && delivery.current_longitude !== undefined ? Number(delivery.current_longitude) : prev.longitude,
            heading: delivery.heading !== null && delivery.heading !== undefined ? Number(delivery.heading) : prev.heading,
            speed_kph: delivery.speed_kph !== null && delivery.speed_kph !== undefined ? Number(delivery.speed_kph) : prev.speed_kph,
            updated_at: delivery.location_updated_at || prev.updated_at,
            driver_name: delivery.driver_name || prev.driver_name || 'Studio Courier',
            driver_phone: delivery.driver_phone !== undefined ? delivery.driver_phone : prev.driver_phone,
            vehicle_type: delivery.vehicle_type || prev.vehicle_type || 'Motorcycle',
            vehicle_plate_number: delivery.vehicle_plate_number !== undefined ? delivery.vehicle_plate_number : prev.vehicle_plate_number,
        }));
    }, [delivery]);

    // Active coordinates: prioritize verified server route data, then delivery/order props
    const pickupLat = routeData?.pickup?.lat
        || Number(delivery?.pickup_latitude)
        || Number(order?.artisan?.latitude)
        || 14.3294;
    const pickupLng = routeData?.pickup?.lng
        || Number(delivery?.pickup_longitude)
        || Number(order?.artisan?.longitude)
        || 120.9367;

    const dropoffLat = routeData?.dropoff?.lat
        || Number(delivery?.dropoff_latitude || order?.shipping_latitude)
        || (pickupLat + 0.018);
    const dropoffLng = routeData?.dropoff?.lng
        || Number(delivery?.dropoff_longitude || order?.shipping_longitude)
        || (pickupLng + 0.018);

    const activeDriverLat = telemetry.latitude ? Number(telemetry.latitude) : null;
    const activeDriverLng = telemetry.longitude ? Number(telemetry.longitude) : null;

    // Is delivery in-progress: if in-transit status or driver GPS coordinates exist
    const isDelivering = ['ON_GOING', 'PICKED_UP', 'IN_TRANSIT'].includes(String(delivery?.status || '').toUpperCase()) 
        || Boolean(activeDriverLat && activeDriverLng);

    // Active in-transit start: strictly from the vehicle's position to the buyer when delivering
    const startLat = isDelivering && activeDriverLat ? activeDriverLat : pickupLat;
    const startLng = isDelivering && activeDriverLng ? activeDriverLng : pickupLng;

    // Resolve vehicle configuration
    const vehicleConfig = useMemo(() => {
        return getVehicleConfig(telemetry.vehicle_type || routeData?.vehicle?.type || order?.recommended_vehicle || 'Motorcycle');
    }, [telemetry.vehicle_type, routeData?.vehicle?.type, order?.recommended_vehicle]);

    const routeInfo = routeData?.route || null;
    const isRoadRouted = Boolean(routeInfo?.is_road_routed);

    // Compute active route coordinates (Vehicle to Buyer when in transit)
    const routeCoordinates = useMemo(() => {
        if (routeInfo?.coordinates && routeInfo.coordinates.length > 0) {
            return routeInfo.coordinates;
        }
        return [[startLat, startLng], [dropoffLat, dropoffLng]];
    }, [routeInfo?.coordinates, startLat, startLng, dropoffLat, dropoffLng]);

    // Distance & Duration (Vehicle to Buyer remaining trip)
    const distanceKm = routeInfo?.distance_km ?? routeData?.distance_km ?? (
        calculateHaversineKm(startLat, startLng, dropoffLat, dropoffLng)
    );

    const estimatedMinutes = routeInfo?.duration_mins ?? routeData?.duration_mins ?? (
        distanceKm ? Math.max(1, Math.round((distanceKm / vehicleConfig.avgSpeedKph) * 60)) : null
    );

    // Fetch turn-by-turn road route (Dual-environment: server route preview first, client-side OSRM fallback with caching)
    const orderId = order?.order_number || order?.id || order?.db_id || null;

    useEffect(() => {
        if (!startLat || !startLng || !dropoffLat || !dropoffLng) return;

        let isMounted = true;
        setIsLoadingRoute(true);

        const vConfig = getVehicleConfig(telemetry.vehicle_type || order?.recommended_vehicle);
        const cacheKey = `lk_osrm_${vConfig.profile}_${startLat.toFixed(4)}_${startLng.toFixed(4)}_${dropoffLat.toFixed(4)}_${dropoffLng.toFixed(4)}`;

        const resolveRoute = async () => {
            // 1. Try server endpoint first (dual seller/buyer capability)
            try {
                let endpoint = null;
                const targetId = orderId || 'preview';
                if (role === 'seller') {
                    endpoint = typeof route === 'function' ? route('orders.route-preview', targetId) : `/seller/orders/${targetId}/route-preview`;
                } else {
                    endpoint = typeof route === 'function' ? route('my-orders.route-preview', targetId) : `/my-orders/${targetId}/route-preview`;
                }

                if (endpoint) {
                    const res = await axios.get(endpoint, { 
                        params: {
                            pickup_lat: pickupLat,
                            pickup_lng: pickupLng,
                            dropoff_lat: dropoffLat,
                            dropoff_lng: dropoffLng,
                            driver_lat: activeDriverLat,
                            driver_lng: activeDriverLng,
                            is_delivering: isDelivering ? 1 : 0,
                            vehicle_type: vConfig.type,
                        },
                        timeout: 5000 
                    });
                    if (isMounted && res.data?.success && res.data?.route?.coordinates?.length > 2) {
                        setRouteData(res.data);
                        if (res.data.driver) {
                            setTelemetry(prev => ({
                                ...prev,
                                latitude: res.data.driver.lat !== null && res.data.driver.lat !== undefined ? Number(res.data.driver.lat) : prev.latitude,
                                longitude: res.data.driver.lng !== null && res.data.driver.lng !== undefined ? Number(res.data.driver.lng) : prev.longitude,
                                driver_name: res.data.driver.driver_name || prev.driver_name,
                                driver_phone: res.data.driver.driver_phone || prev.driver_phone,
                                vehicle_type: res.data.driver.vehicle_type || prev.vehicle_type,
                                vehicle_plate_number: res.data.driver.vehicle_plate_number || prev.vehicle_plate_number,
                                heading: res.data.driver.heading !== null && res.data.driver.heading !== undefined ? Number(res.data.driver.heading) : prev.heading,
                                speed_kph: res.data.driver.speed_kph !== null && res.data.driver.speed_kph !== undefined ? Number(res.data.driver.speed_kph) : prev.speed_kph,
                            }));
                        }
                        setIsLoadingRoute(false);
                        return;
                    }
                }
            } catch {
                // API route fallback: continue to client-side OSRM fallback
            }

            // 2. Check localStorage cache
            try {
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (parsed?.is_road_routed && parsed?.coordinates?.length > 2 && isMounted) {
                        setRouteData({
                            success: true,
                            distance_km: parsed.distance_km,
                            duration_mins: parsed.duration_mins,
                            route: parsed,
                            vehicle: { type: vConfig.type, label: vConfig.label },
                        });
                        setIsLoadingRoute(false);
                        return;
                    }
                }
            } catch {
                // Ignore localStorage errors
            }

            // 3. Client-side OSRM road geometry (from Vehicle to Buyer)
            try {
                const osrmUrl = `https://router.project-osrm.org/route/v1/${vConfig.profile}/${startLng},${startLat};${dropoffLng},${dropoffLat}?overview=full&geometries=geojson`;
                const signal = typeof window !== 'undefined' && window.AbortSignal && typeof window.AbortSignal.timeout === 'function'
                    ? window.AbortSignal.timeout(4500)
                    : undefined;
                const osrmRes = await fetch(osrmUrl, { signal });
                if (osrmRes.ok) {
                    const data = await osrmRes.json();
                    if (data?.code === 'Ok' && data?.routes?.[0]?.geometry?.coordinates?.length > 0) {
                        const rawCoords = data.routes[0].geometry.coordinates;
                        const roadCoords = rawCoords.map(c => [Number(c[1]), Number(c[0])]);
                        const routeDistKm = Math.round((Number(data.routes[0].distance) / 1000) * 10) / 10;
                        const durationMins = Math.max(1, Math.round(Number(data.routes[0].duration) / 60));

                        const routePayload = {
                            coordinates: roadCoords,
                            distance_km: routeDistKm,
                            duration_mins: durationMins,
                            is_road_routed: true,
                        };

                        try {
                            localStorage.setItem(cacheKey, JSON.stringify(routePayload));
                        } catch {
                            // LocalStorage quota fallback
                        }

                        if (isMounted) {
                            setRouteData({
                                success: true,
                                distance_km: routeDistKm,
                                duration_mins: durationMins,
                                route: routePayload,
                                vehicle: { type: vConfig.type, label: vConfig.label },
                            });
                            setIsLoadingRoute(false);
                            return;
                        }
                    }
                }
            } catch {
                // OSRM network timeout or offline
            }

            // 4. Resilient straight-line fallback if offline
            if (isMounted) {
                const haversineDist = calculateHaversineKm(startLat, startLng, dropoffLat, dropoffLng);
                const haversineMins = haversineDist ? Math.max(1, Math.round((haversineDist / vConfig.avgSpeedKph) * 60)) : null;
                setRouteData({
                    success: false,
                    distance_km: haversineDist,
                    duration_mins: haversineMins,
                    route: {
                        coordinates: [[startLat, startLng], [dropoffLat, dropoffLng]],
                        distance_km: haversineDist,
                        duration_mins: haversineMins,
                        is_road_routed: false,
                    },
                    vehicle: { type: vConfig.type, label: vConfig.label },
                });
                setIsLoadingRoute(false);
            }
        };

        resolveRoute();

        return () => {
            isMounted = false;
        };
    }, [startLat, startLng, dropoffLat, dropoffLng, orderId, role, telemetry.vehicle_type, order?.recommended_vehicle, isDelivering, pickupLat, pickupLng, activeDriverLat, activeDriverLng]);

    // Fetch latest telemetry from endpoint with retry resilience
    const fetchLatestTelemetry = useCallback(async (isManual = false) => {
        if (!delivery?.id) return;
        // If polling was halted after consecutive failures, only allow manual sync to resume it
        if (isTelemetryHalted && !isManual) return;

        // Reset failure tracking on explicit manual sync request
        if (isManual) {
            telemetryFailuresRef.current = 0;
            setIsTelemetryHalted(false);
        }

        const ControllerClass = typeof window !== 'undefined' ? window.AbortController : null;
        const controller = ControllerClass ? new ControllerClass() : null;
        const timeoutId = setTimeout(() => controller?.abort(), 6000);

        try {
            setIsRefreshing(true);
            const response = await fetch(`/deliveries/${delivery.id}/telemetry`, {
                signal: controller?.signal,
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                }
            });
            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                // Reset failure counter on successful GPS retrieval
                telemetryFailuresRef.current = 0;
                setIsTelemetryHalted(false);

                if (data?.telemetry?.latitude && data?.telemetry?.longitude) {
                    setTelemetry(prev => ({
                        ...prev,
                        latitude: Number(data.telemetry.latitude),
                        longitude: Number(data.telemetry.longitude),
                        heading: data.telemetry.heading !== null && data.telemetry.heading !== undefined ? Number(data.telemetry.heading) : prev.heading,
                        speed_kph: data.telemetry.speed_kph !== null && data.telemetry.speed_kph !== undefined ? Number(data.telemetry.speed_kph) : prev.speed_kph,
                        updated_at: data.telemetry.updated_at || new Date().toISOString(),
                        driver_name: data.driver_name || prev.driver_name,
                        driver_phone: data.driver_phone || prev.driver_phone,
                        vehicle_type: data.vehicle_type || prev.vehicle_type,
                        vehicle_plate_number: data.vehicle_plate_number || prev.vehicle_plate_number,
                    }));
                    setLastSyncTime(new Date());
                }
            } else if (response.status === 404) {
                // Permanently halt polling if telemetry endpoint returns 404 (delivery finished or invalid)
                setIsTelemetryHalted(true);
                telemetryFailuresRef.current = MAX_TELEMETRY_FAILURES;
            } else {
                telemetryFailuresRef.current += 1;
                if (telemetryFailuresRef.current >= MAX_TELEMETRY_FAILURES) {
                    setIsTelemetryHalted(true);
                }
            }
        } catch {
            // Transient network failure (timeout / offline)
            telemetryFailuresRef.current += 1;
            if (telemetryFailuresRef.current >= MAX_TELEMETRY_FAILURES) {
                setIsTelemetryHalted(true);
            }
        } finally {
            clearTimeout(timeoutId);
            setIsRefreshing(false);
        }
    }, [delivery?.id, isTelemetryHalted]);

    // Polling effect when delivery is active in transit
    useEffect(() => {
        const isTransit = ['ON_GOING', 'PICKED_UP', 'IN_TRANSIT'].includes(String(delivery?.status || '').toUpperCase());
        if (!isTransit || !delivery?.id || isTelemetryHalted) return;

        // Poll every 12 seconds while viewing
        const interval = setInterval(() => {
            if (!document.hidden && !isTelemetryHalted) {
                fetchLatestTelemetry(false);
            }
        }, 12000);

        return () => clearInterval(interval);
    }, [delivery?.status, delivery?.id, fetchLatestTelemetry, isTelemetryHalted]);

    // Helpers for driver pin and popup
    const getDriverPopupHtml = useCallback((t, vConfig) => {
        const titleBadge = delivery?.provider === 'lalamove' ? 'Lalamove Courier' : (role === 'seller' ? 'Studio Courier' : 'Studio Courier Driver');
        return `
            <div style="font-size: 11px; font-family: sans-serif; line-height: 1.4;">
                <b style="color: ${vConfig.color}; text-transform: uppercase; font-size: 9px; letter-spacing: 0.05em;">${titleBadge}</b><br/>
                <strong>${t.driver_name || 'Studio Courier'}</strong><br/>
                <span style="color: #78716c;">${t.vehicle_plate_number ? 'Plate: ' + t.vehicle_plate_number : (t.vehicle_type || 'Courier')}</span><br/>
                ${t.speed_kph ? `<span style="display: inline-block; margin-top: 2px; background: #ecfdf5; color: #047857; font-weight: bold; padding: 1px 5px; border-radius: 4px;">Speed: ${Math.round(t.speed_kph)} km/h</span>` : ''}
            </div>
        `;
    }, [delivery?.provider, role]);

    const createDriverIcon = useCallback((vConfig, heading) => {
        const rotationStyle = heading !== null && heading !== undefined ? `transform: rotate(${heading}deg);` : '';
        return L.divIcon({
            className: 'custom-driver-pin',
            html: `
                <div style="position: relative; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center;">
                    <div style="position: absolute; inset: -4px; border-radius: 50%; border: 1.5px dashed ${vConfig.color}; opacity: 0.7; animation: spin 8s linear infinite;"></div>
                    <div style="position: absolute; inset: 0; border-radius: 50%; background-color: ${vConfig.color}; opacity: 0.25; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                    <div style="position: relative; width: 34px; height: 34px; border-radius: 50%; background-color: #0f172a; color: white; display: flex; align-items: center; justify-content: center; border: 2.5px solid ${vConfig.color}; box-shadow: 0 4px 10px rgba(0,0,0,0.35); z-index: 2;">
                        <div style="${rotationStyle} display: flex; align-items: center; justify-content: center;">
                            ${vConfig.iconSvg}
                        </div>
                    </div>
                </div>
            `,
            iconSize: [42, 42],
            iconAnchor: [21, 21],
            popupAnchor: [0, -22],
        });
    }, []);

    const createVehicleWaypointIcon = useCallback((vConfig) => L.divIcon({
        className: 'custom-vehicle-waypoint',
        html: `
            <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px;">
                <div style="position: absolute; inset: -3px; border-radius: 50%; border: 1.5px dashed ${vConfig.color}; opacity: 0.7; animation: spin 8s linear infinite;"></div>
                <div style="position: relative; width: 26px; height: 26px; border-radius: 50%; background-color: #0f172a; color: white; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 3px 8px rgba(0,0,0,0.3); z-index: 2;">
                    ${vConfig.iconSvg}
                </div>
            </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
    }), []);

    // Responsive fit bounds padding ensuring overlays (bottom radar HUD, top badges/buttons) never obscure markers or route
    const getFitPadding = useCallback(() => {
        if (!isFullScreen) {
            return {
                paddingTopLeft: [24, 48],
                paddingBottomRight: [24, showRadarHud ? 68 : 22],
                maxZoom: 15,
            };
        }
        return {
            paddingTopLeft: [showRadarHud ? 330 : 40, 60],
            paddingBottomRight: [40, 40],
            maxZoom: 15,
        };
    }, [isFullScreen, showRadarHud]);

    // 1. Initialize Map DOM
    useEffect(() => {
        if (!mapContainerRef.current) return;

        // Destroy previous instance
        if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
            driverMarkerRef.current = null;
            waypointMarkerRef.current = null;
            outerPolylineRef.current = null;
            polylineRef.current = null;
        }

        const map = L.map(mapContainerRef.current, {
            center: activeDriverLat && activeDriverLng ? [activeDriverLat, activeDriverLng] : [pickupLat, pickupLng],
            zoom: 13,
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

        // 1. Studio Pickup Marker (Earthy Terracotta Badge)
        const pickupIcon = L.divIcon({
            className: 'custom-studio-marker',
            html: `
                <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; width: 120px; overflow: visible;">
                    <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
                        <div style="position: absolute; inset: -3px; border-radius: 50%; background: rgba(137, 67, 45, 0.25); animation: ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                        <div style="position: relative; width: 30px; height: 30px; border-radius: 10px; background: #89432d; color: white; display: flex; align-items: center; justify-content: center; border: 2.5px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.35); transform: rotate(-45deg);">
                            <div style="transform: rotate(45deg); display: flex; align-items: center; justify-content: center;">
                                <svg style="width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 2.2;" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                            </div>
                        </div>
                        <div style="position: absolute; -bottom: 5px; width: 7px; height: 7px; background: #89432d; border-radius: 50%; border: 1.5px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>
                    </div>
                    <div style="margin-top: 5px; background: #89432d; color: white; font-weight: 800; font-size: 9px; padding: 1.5px 6px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.25); white-space: nowrap; border: 1px solid rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.04em;">
                        ${role === 'seller' ? 'Your Origin' : 'Studio Origin'}
                    </div>
                </div>
            `,
            iconSize: [120, 54],
            iconAnchor: [60, 18],
            popupAnchor: [0, -20],
        });

        const pickupMarker = L.marker([pickupLat, pickupLng], { icon: pickupIcon }).addTo(map);
        pickupMarker.bindPopup(`
            <div style="font-size: 11px; font-family: sans-serif; line-height: 1.4;">
                <b style="color: #89432d; text-transform: uppercase; font-size: 9px; letter-spacing: 0.05em;">${role === 'seller' ? 'Your Workshop Origin' : 'Artisan Studio Origin'}</b><br/>
                <strong>${order.seller_name || order.artisan?.shop_name || 'Artisan Workshop'}</strong><br/>
                <span style="color: #78716c;">${order.seller_address || order.artisan?.address || 'Studio Origin'}</span>
            </div>
        `);

        // 2. Buyer Destination Marker (Emerald Badge)
        const dropoffIcon = L.divIcon({
            className: 'custom-dropoff-marker',
            html: `
                <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; width: 120px; overflow: visible;">
                    <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
                        <div style="position: absolute; inset: -3px; border-radius: 50%; background: rgba(5, 150, 105, 0.25); animation: ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                        <div style="position: relative; width: 30px; height: 30px; border-radius: 10px; background: #059669; color: white; display: flex; align-items: center; justify-content: center; border: 2.5px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.35); transform: rotate(-45deg);">
                            <div style="transform: rotate(45deg); display: flex; align-items: center; justify-content: center;">
                                <svg style="width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 2.2;" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                            </div>
                        </div>
                        <div style="position: absolute; -bottom: 5px; width: 7px; height: 7px; background: #059669; border-radius: 50%; border: 1.5px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>
                    </div>
                    <div style="margin-top: 5px; background: #059669; color: white; font-weight: 800; font-size: 9px; padding: 1.5px 6px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.25); white-space: nowrap; border: 1px solid rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.04em;">
                        ${role === 'seller' ? 'Buyer Drop-off' : 'Destination'}
                    </div>
                </div>
            `,
            iconSize: [120, 54],
            iconAnchor: [60, 18],
            popupAnchor: [0, -20],
        });

        const dropoffMarker = L.marker([dropoffLat, dropoffLng], { icon: dropoffIcon }).addTo(map);
        dropoffMarker.bindPopup(`
            <div style="font-size: 11px; font-family: sans-serif; line-height: 1.4;">
                <b style="color: #059669; text-transform: uppercase; font-size: 9px; letter-spacing: 0.05em;">${role === 'seller' ? 'Customer Destination' : 'Your Delivery Destination'}</b><br/>
                <strong>${order.shipping_recipient_name || order.customer || 'Delivery Destination'}</strong><br/>
                <span style="color: #78716c;">${order.shipping_address || 'Shipping Address'}</span>
            </div>
        `);

        // 3. Polylines: Completed segment (Studio to Vehicle) + Active Delivery Route (Vehicle to Buyer)
        if (isDelivering && activeDriverLat && activeDriverLng && (Math.abs(pickupLat - activeDriverLat) > 0.001 || Math.abs(pickupLng - activeDriverLng) > 0.001)) {
            const completedPolyline = L.polyline([[pickupLat, pickupLng], [activeDriverLat, activeDriverLng]], {
                color: '#a8a29e',
                weight: 2.5,
                dashArray: '5, 8',
                opacity: 0.65,
                lineCap: 'round',
            }).addTo(map);
            completedPolylineRef.current = completedPolyline;
        }

        const outerPolyline = L.polyline(routeCoordinates, {
            color: '#ffffff',
            weight: 6,
            opacity: 0.85,
            smoothFactor: 0.1,
            lineCap: 'round',
            lineJoin: 'round',
        }).addTo(map);
        outerPolylineRef.current = outerPolyline;

        const polyline = L.polyline(routeCoordinates, {
            color: vehicleConfig.color,
            weight: 4.5,
            smoothFactor: 0.1,
            dashArray: isRoadRouted ? null : '6, 8',
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round',
        }).addTo(map);
        polylineRef.current = polyline;

        // 4. Driver Marker or Vehicle Waypoint
        if (activeDriverLat && activeDriverLng) {
            const driverMarker = L.marker([activeDriverLat, activeDriverLng], { 
                icon: createDriverIcon(vehicleConfig, telemetry.heading) 
            }).addTo(map);
            driverMarker.bindPopup(getDriverPopupHtml(telemetry, vehicleConfig));
            driverMarkerRef.current = driverMarker;
        } else if (routeCoordinates.length >= 2) {
            const midIndex = Math.floor(routeCoordinates.length / 2);
            const midCoord = routeCoordinates[midIndex];
            if (midCoord && midCoord[0] && midCoord[1]) {
                const waypointMarker = L.marker([midCoord[0], midCoord[1]], {
                    icon: createVehicleWaypointIcon(vehicleConfig)
                }).addTo(map);
                waypointMarker.bindPopup(`
                    <div style="font-size: 11px; font-family: sans-serif; line-height: 1.4;">
                        <b style="color: ${vehicleConfig.color}; text-transform: uppercase; font-size: 9px; letter-spacing: 0.05em;">Transport Mode</b><br/>
                        <strong>${vehicleConfig.label}</strong><br/>
                        <span style="color: #78716c;">Est. Route Duration: ~${estimatedMinutes || 25} mins (${distanceKm || '...'} km)</span>
                    </div>
                `);
                waypointMarkerRef.current = waypointMarker;
            }
        }

        // Auto-fit bounds with comfortable padding leaving space for HUD / top badges
        if (polyline.getBounds().isValid()) {
            map.fitBounds(polyline.getBounds(), {
                ...getFitPadding(),
                animate: false
            });
        }

        mapInstanceRef.current = map;

        const timer = setTimeout(() => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.invalidateSize();
            }
        }, 200);

        return () => {
            clearTimeout(timer);
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
                driverMarkerRef.current = null;
                waypointMarkerRef.current = null;
                completedPolylineRef.current = null;
                outerPolylineRef.current = null;
                polylineRef.current = null;
            }
        };
    }, [pickupLat, pickupLng, dropoffLat, dropoffLng, isDelivering, order?.seller_name, order?.artisan?.shop_name, order?.seller_address, order?.artisan?.address, order?.shipping_recipient_name, order?.customer, order?.shipping_address, role]);

    // 2. Telemetry & Route Updates: Update polylines, driver marker, and waypoints seamlessly without map teardown
    useEffect(() => {
        if (!mapInstanceRef.current) return;

        // Update polylines with latest route coordinates and vehicle styling
        if (polylineRef.current && outerPolylineRef.current) {
            polylineRef.current.setLatLngs(routeCoordinates);
            polylineRef.current.setStyle({
                color: vehicleConfig.color,
                dashArray: isRoadRouted ? null : '6, 8',
                smoothFactor: 0.1,
            });
            outerPolylineRef.current.setLatLngs(routeCoordinates);
            outerPolylineRef.current.setStyle({
                smoothFactor: 0.1,
            });
            // Frame bounds once upon initial road geometry resolution to avoid jarring snaps during live GPS polling
            if (isRoadRouted && !hasInitialFitDoneRef.current && polylineRef.current.getBounds().isValid()) {
                hasInitialFitDoneRef.current = true;
                mapInstanceRef.current.fitBounds(polylineRef.current.getBounds(), {
                    ...getFitPadding(),
                    animate: false
                });
            }
        }

        // Update completed studio-to-vehicle polyline
        if (completedPolylineRef.current && isDelivering && activeDriverLat && activeDriverLng) {
            completedPolylineRef.current.setLatLngs([[pickupLat, pickupLng], [activeDriverLat, activeDriverLng]]);
        }

        // Update or create active driver marker
        if (activeDriverLat && activeDriverLng) {
            const popupContent = getDriverPopupHtml(telemetry, vehicleConfig);

            if (driverMarkerRef.current) {
                driverMarkerRef.current.setLatLng([activeDriverLat, activeDriverLng]);
                driverMarkerRef.current.setIcon(createDriverIcon(vehicleConfig, telemetry.heading));
                driverMarkerRef.current.setPopupContent(popupContent);
            } else {
                const driverMarker = L.marker([activeDriverLat, activeDriverLng], { 
                    icon: createDriverIcon(vehicleConfig, telemetry.heading) 
                }).addTo(mapInstanceRef.current);
                driverMarker.bindPopup(popupContent);
                driverMarkerRef.current = driverMarker;
            }

            // Remove mid-waypoint if driver marker is active
            if (waypointMarkerRef.current) {
                waypointMarkerRef.current.remove();
                waypointMarkerRef.current = null;
            }
        } else if (routeCoordinates.length >= 2 && !driverMarkerRef.current) {
            const midIndex = Math.floor(routeCoordinates.length / 2);
            const midCoord = routeCoordinates[midIndex];
            if (midCoord && midCoord[0] && midCoord[1]) {
                if (waypointMarkerRef.current) {
                    waypointMarkerRef.current.setLatLng([midCoord[0], midCoord[1]]);
                    waypointMarkerRef.current.setIcon(createVehicleWaypointIcon(vehicleConfig));
                } else {
                    const waypointMarker = L.marker([midCoord[0], midCoord[1]], {
                        icon: createVehicleWaypointIcon(vehicleConfig)
                    }).addTo(mapInstanceRef.current);
                    waypointMarkerRef.current = waypointMarker;
                }
            }
        }
    }, [routeCoordinates, activeDriverLat, activeDriverLng, telemetry, vehicleConfig, isRoadRouted, getDriverPopupHtml, createDriverIcon, createVehicleWaypointIcon, getFitPadding, isDelivering, pickupLat, pickupLng]);

    // Helper to compute composite bounding box of Studio Origin, Courier, and Buyer Destination
    const getFullJourneyBounds = useCallback(() => {
        const points = [];
        if (pickupLat && pickupLng) points.push([pickupLat, pickupLng]);
        if (dropoffLat && dropoffLng) points.push([dropoffLat, dropoffLng]);
        if (activeDriverLat && activeDriverLng) points.push([activeDriverLat, activeDriverLng]);
        if (Array.isArray(routeCoordinates) && routeCoordinates.length > 0) {
            routeCoordinates.forEach(pt => {
                if (Array.isArray(pt) && pt.length >= 2 && !isNaN(pt[0]) && !isNaN(pt[1])) {
                    points.push([Number(pt[0]), Number(pt[1])]);
                }
            });
        }
        return points.length >= 2 ? L.latLngBounds(points) : null;
    }, [pickupLat, pickupLng, dropoffLat, dropoffLng, activeDriverLat, activeDriverLng, routeCoordinates]);

    // Handle center map on remaining active route bounds (Courier to Destination)
    const handleCenterMap = useCallback(() => {
        setCameraViewMode('route');
        if (mapInstanceRef.current && polylineRef.current && polylineRef.current.getBounds().isValid()) {
            mapInstanceRef.current.fitBounds(polylineRef.current.getBounds(), {
                ...getFitPadding(),
                animate: true,
            });
        }
    }, [getFitPadding]);

    // Fit entire journey (Studio Origin -> Live Courier -> Buyer Destination)
    const handleFitFullJourney = useCallback(() => {
        setCameraViewMode('full');
        if (!mapInstanceRef.current) return;
        const fullBounds = getFullJourneyBounds();
        if (fullBounds && fullBounds.isValid()) {
            mapInstanceRef.current.fitBounds(fullBounds, {
                ...getFitPadding(),
                animate: true,
            });
        }
    }, [getFullJourneyBounds, getFitPadding]);

    // Re-adjust view when radar HUD toggles to keep route and rider marker clear of overlay
    useEffect(() => {
        if (!mapInstanceRef.current) return;
        if (cameraViewMode === 'full') {
            const fullBounds = getFullJourneyBounds();
            if (fullBounds && fullBounds.isValid()) {
                mapInstanceRef.current.fitBounds(fullBounds, {
                    ...getFitPadding(),
                    animate: true,
                });
            }
        } else if (polylineRef.current && polylineRef.current.getBounds().isValid()) {
            mapInstanceRef.current.fitBounds(polylineRef.current.getBounds(), {
                ...getFitPadding(),
                animate: true,
            });
        }
    }, [showRadarHud, cameraViewMode, getFullJourneyBounds, getFitPadding]);

    // Invalidate map size on full screen toggle
    useEffect(() => {
        if (mapInstanceRef.current) {
            const timer = setTimeout(() => {
                mapInstanceRef.current.invalidateSize();
                if (cameraViewMode === 'full') {
                    const fullBounds = getFullJourneyBounds();
                    if (fullBounds && fullBounds.isValid()) {
                        mapInstanceRef.current.fitBounds(fullBounds, {
                            ...getFitPadding(),
                            animate: false,
                        });
                    }
                } else if (polylineRef.current && polylineRef.current.getBounds().isValid()) {
                    mapInstanceRef.current.fitBounds(polylineRef.current.getBounds(), {
                        ...getFitPadding(),
                        animate: false,
                    });
                }
            }, 180);
            return () => clearTimeout(timer);
        }
    }, [isFullScreen, cameraViewMode, getFullJourneyBounds, getFitPadding]);

    // Handle Phone / SMS click with desktop copy fallback & toast
    const handlePhoneAction = useCallback(async (e, phone, type = 'call') => {
        if (!phone) return;
        const isMobile = typeof window !== 'undefined' && (
            /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
            (navigator.maxTouchPoints > 0 && window.innerWidth <= 768)
        );
        if (!isMobile) {
            e.preventDefault();
            const ok = await copyToClipboard(phone);
            if (ok) {
                setCopiedPhoneType(type);
                if (addToast) addToast(`Copied driver number ${phone} to clipboard.`, 'success');
                setTimeout(() => setCopiedPhoneType(null), 2500);
            }
        }
    }, [addToast]);

    // Header & Bottom Vehicle Icon
    const VehicleBadgeIcon = useMemo(() => {
        const v = vehicleConfig.type.toLowerCase();
        if (v.includes('bike') || v.includes('bicycle')) return Bike;
        if (v.includes('motor') || v.includes('scooter')) return Motorbike;
        if (v.includes('sedan') || v.includes('car')) return Car;
        return Truck;
    }, [vehicleConfig.type]);

    const mapContent = (
        <div className={`flex flex-col bg-white overflow-hidden transition-all ${
            isFullScreen 
                ? 'w-full h-full sm:h-[88vh] sm:max-w-4xl sm:rounded-2xl sm:shadow-2xl sm:border border-stone-200' 
                : 'w-full rounded-xl border border-stone-200/90 shadow-2xs'
        }`}>
            {/* Modal Header only shown in Full Screen */}
            {isFullScreen && (
                <div className="flex items-center justify-between gap-2 border-b border-stone-100 bg-stone-50/95 px-3 sm:px-4 pt-[calc(env(safe-area-inset-top,0px)+0.6rem)] pb-2.5 sm:py-2.5 shrink-0">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                        <span className="relative flex h-2 w-2 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                        <span className="text-xs sm:text-sm font-extrabold text-stone-900 truncate">
                            Live Tracking • #{order.order_number || ''}
                        </span>
                        <span 
                            className="rounded px-1.5 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider shrink-0"
                            style={{ backgroundColor: vehicleConfig.color }}
                        >
                            {vehicleConfig.type}
                        </span>
                        {telemetry.speed_kph !== null && telemetry.speed_kph > 0 && (
                            <span className="hidden sm:inline-flex rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-800 shrink-0">
                                {Math.round(telemetry.speed_kph)} km/h
                            </span>
                        )}
                        {lastSyncTime && (
                            <span className="hidden md:inline text-[10px] text-stone-400 shrink-0">
                                • Synced {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <button
                            type="button"
                            onClick={() => setShowRadarHud(!showRadarHud)}
                            className={`inline-flex items-center justify-center gap-1.5 rounded-xl border h-11 w-11 min-h-[44px] min-w-[44px] sm:w-auto sm:px-3 text-xs font-bold transition cursor-pointer active:scale-95 ${
                                showRadarHud 
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' 
                                    : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-100'
                            }`}
                            title="Toggle Radar Telemetry"
                            aria-label="Toggle Radar Telemetry"
                        >
                            <Radio size={15} className={showRadarHud ? 'animate-pulse' : 'text-emerald-600'} />
                            <span className="hidden sm:inline">Radar</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleCenterMap}
                            className={`inline-flex items-center justify-center gap-1.5 rounded-xl border h-11 w-11 min-h-[44px] min-w-[44px] sm:w-auto sm:px-3 text-xs font-bold transition cursor-pointer active:scale-95 ${
                                cameraViewMode === 'route'
                                    ? 'bg-stone-100 text-stone-900 border-stone-300 shadow-2xs font-extrabold'
                                    : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-100'
                            }`}
                            title="Fit Active Route (Courier to Destination)"
                            aria-label="Fit Active Route"
                        >
                            <Compass size={15} className="text-clay-600" />
                            <span className="hidden sm:inline">Fit Route</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleFitFullJourney}
                            className={`inline-flex items-center justify-center gap-1.5 rounded-xl border h-11 w-11 min-h-[44px] min-w-[44px] sm:w-auto sm:px-3 text-xs font-bold transition cursor-pointer active:scale-95 ${
                                cameraViewMode === 'full'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs font-extrabold'
                                    : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-100'
                            }`}
                            title="Fit Entire Journey (Studio Origin, Courier, Destination)"
                            aria-label="Fit Entire Journey"
                        >
                            <RouteIcon size={15} className="text-emerald-600" />
                            <span className="hidden sm:inline">Full Journey</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => fetchLatestTelemetry(true)}
                            disabled={isRefreshing}
                            className={`inline-flex items-center justify-center gap-1.5 rounded-xl border h-11 w-11 min-h-[44px] min-w-[44px] sm:w-auto sm:px-3 text-xs font-bold transition cursor-pointer active:scale-95 ${
                                isTelemetryHalted 
                                    ? 'border-amber-300 bg-amber-50/80 text-amber-800' 
                                    : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-100'
                            }`}
                            title={isTelemetryHalted ? 'GPS Link paused after retries. Click to resume' : 'Sync GPS'}
                            aria-label="Sync GPS"
                        >
                            <RefreshCw size={14} className={`${isRefreshing ? 'animate-spin text-clay-600' : (isTelemetryHalted ? 'text-amber-600' : 'text-stone-500')}`} />
                            <span className="hidden sm:inline">{isRefreshing ? 'Syncing...' : (isTelemetryHalted ? 'Resume GPS' : 'Sync GPS')}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsFullScreen(false)}
                            className="inline-flex items-center justify-center h-11 w-11 rounded-xl border border-stone-200 bg-white text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition ml-0.5 cursor-pointer min-h-[44px] min-w-[44px] active:scale-95"
                            title="Close full screen"
                            aria-label="Close full screen"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>
            )}

            {/* Map Canvas with Floating Controls */}
            <div className={`relative w-full bg-stone-100 ${isFullScreen ? 'flex-1 min-h-0' : 'h-60 sm:h-72'}`}>
                <div 
                    ref={mapContainerRef} 
                    className="w-full h-full"
                />

                {/* Floating Controls in Compact Mode */}
                {!isFullScreen && (
                    <>
                        {/* Top-Left: Live Road Route & Speed Badge */}
                        <div className="absolute top-2 left-2 z-[500] flex items-center gap-1.5 rounded-lg bg-white/95 px-2 sm:px-2.5 py-1 shadow-xs border border-stone-200/80 backdrop-blur-xs select-none max-w-[calc(100%-175px)] sm:max-w-xs overflow-hidden">
                            <span className="relative flex h-2 w-2 shrink-0">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isTelemetryHalted ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                                <span className={`relative inline-flex rounded-full h-2 w-2 ${isTelemetryHalted ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                            </span>
                            <span className="text-[10px] font-bold text-stone-800 truncate">
                                {isRoadRouted ? `${vehicleConfig.type} Route` : (activeDriverLat ? 'In Transit' : 'Route')}
                            </span>
                            {distanceKm !== null && (
                                <span className="text-[10px] font-semibold text-stone-500 shrink-0">
                                    • {distanceKm} km
                                </span>
                            )}
                            {estimatedMinutes !== null && (
                                <span className="hidden sm:inline-flex rounded bg-stone-100 border border-stone-200 px-1 py-0.2 text-[9px] font-bold text-stone-700 shrink-0">
                                    ~{estimatedMinutes}m
                                </span>
                            )}
                            {telemetry.speed_kph !== null && telemetry.speed_kph > 0 && !isTelemetryHalted && (
                                <span className="hidden sm:inline-flex rounded bg-emerald-50 border border-emerald-200/80 px-1 py-0.2 text-[9px] font-extrabold text-emerald-800 shrink-0">
                                    {Math.round(telemetry.speed_kph)} km/h
                                </span>
                            )}
                            {isTelemetryHalted && (
                                <span className="text-[9px] font-bold text-amber-600 shrink-0">
                                    • Paused
                                </span>
                            )}
                            {isLoadingRoute && (
                                <RefreshCw size={9} className="animate-spin text-stone-400 ml-0.5 shrink-0" />
                            )}
                        </div>

                        {/* Top-Right: Compact Action Group */}
                        <div className="absolute top-2 right-2 z-[1000] flex items-center gap-0.5 sm:gap-1 rounded-xl bg-white/95 p-0.5 sm:p-1 shadow-xs border border-stone-200/80 backdrop-blur-xs select-none">
                            <button
                                type="button"
                                onClick={() => setShowRadarHud(!showRadarHud)}
                                className={`inline-flex items-center justify-center h-7.5 w-7.5 min-h-[30px] min-w-[30px] sm:h-7 sm:w-7 rounded-lg transition cursor-pointer ${
                                    showRadarHud ? 'bg-emerald-600 text-white shadow-2xs' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                                }`}
                                title="Toggle Radar Telemetry"
                                aria-label="Toggle Radar Telemetry"
                            >
                                <Radio size={13} className={showRadarHud ? 'animate-pulse' : ''} />
                            </button>
                            <button
                                type="button"
                                onClick={handleCenterMap}
                                className={`inline-flex items-center justify-center h-7.5 w-7.5 min-h-[30px] min-w-[30px] sm:h-7 sm:w-7 rounded-lg transition cursor-pointer ${
                                    cameraViewMode === 'route' ? 'bg-stone-100 text-stone-900 font-bold border border-stone-200/80' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                                }`}
                                title="Fit active route (Courier to Destination)"
                                aria-label="Fit active route"
                            >
                                <Compass size={14} className="text-clay-600" />
                            </button>
                            <button
                                type="button"
                                onClick={handleFitFullJourney}
                                className={`inline-flex items-center justify-center h-7.5 w-7.5 min-h-[30px] min-w-[30px] sm:h-7 sm:w-7 rounded-lg transition cursor-pointer ${
                                    cameraViewMode === 'full' ? 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-300/80' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                                }`}
                                title="Fit entire journey (origin to destination)"
                                aria-label="Fit entire journey"
                            >
                                <RouteIcon size={13} className="text-emerald-600" />
                            </button>
                            <button
                                type="button"
                                onClick={() => fetchLatestTelemetry(true)}
                                disabled={isRefreshing}
                                className={`inline-flex items-center justify-center h-7.5 w-7.5 min-h-[30px] min-w-[30px] sm:h-7 sm:w-7 rounded-lg transition cursor-pointer ${
                                    isTelemetryHalted ? 'text-amber-600 bg-amber-50 border border-amber-200' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                                }`}
                                title={isTelemetryHalted ? 'GPS link paused. Tap to sync' : 'Sync GPS'}
                                aria-label="Sync GPS"
                            >
                                <RefreshCw size={12} className={isRefreshing ? 'animate-spin text-clay-600' : (isTelemetryHalted ? 'text-amber-600' : 'text-stone-500')} />
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsFullScreen(true)}
                                className="inline-flex items-center justify-center h-7.5 w-7.5 min-h-[30px] min-w-[30px] sm:h-7 sm:w-7 rounded-lg text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition cursor-pointer"
                                title="Expand to full screen"
                                aria-label="Expand to full screen"
                            >
                                <Maximize2 size={13} />
                            </button>
                        </div>
                    </>
                )}

                {/* Live Courier Telemetry Radar Overlay */}
                <LiveCourierRadarOverlay
                    isOpen={showRadarHud}
                    onClose={() => setShowRadarHud(false)}
                    telemetry={telemetry}
                    remainingKm={distanceKm}
                    estimatedMinutes={estimatedMinutes}
                    isFullScreen={isFullScreen}
                />
            </div>

            {/* Bottom Driver Strip */}
            <div className={`flex items-center justify-between gap-2 border-t border-stone-100 bg-white px-3 sm:px-4 shrink-0 ${
                isFullScreen 
                    ? 'py-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] sm:pb-3 shadow-lg' 
                    : 'py-2'
            }`}>
                <div className="flex items-center gap-2.5 min-w-0">
                    <div 
                        className={`shrink-0 flex items-center justify-center rounded-xl border text-white shadow-2xs ${
                            isFullScreen ? 'h-9 w-9' : 'h-7 w-7'
                        }`}
                        style={{ backgroundColor: vehicleConfig.color, borderColor: vehicleConfig.color }}
                    >
                        <VehicleBadgeIcon size={isFullScreen ? 16 : 13} />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5 truncate">
                            <p className={`font-extrabold text-stone-900 truncate ${isFullScreen ? 'text-xs sm:text-sm' : 'text-[11px]'}`}>
                                {telemetry.driver_name}
                            </p>
                            <span 
                                className="rounded px-1.5 py-0.2 text-[9px] font-bold text-white uppercase tracking-wider"
                                style={{ backgroundColor: vehicleConfig.color }}
                            >
                                {vehicleConfig.type}
                            </span>
                            {telemetry.vehicle_plate_number && (
                                <span className="rounded bg-stone-100 px-1 py-0.2 text-[9px] font-mono font-bold text-stone-600">
                                    {telemetry.vehicle_plate_number}
                                </span>
                            )}
                        </div>
                        <p className={`text-stone-500 truncate ${isFullScreen ? 'text-[11px]' : 'text-[10px]'}`}>
                            {distanceKm !== null ? `~${distanceKm} km away` : 'Calculating road route...'}
                            {estimatedMinutes !== null ? ` • ~${estimatedMinutes} mins away` : ''}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    {telemetry.driver_phone ? (
                        <>
                            <a
                                href={`tel:${telemetry.driver_phone}`}
                                onClick={(e) => handlePhoneAction(e, telemetry.driver_phone, 'call')}
                                className={`inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-white font-extrabold shadow-2xs hover:bg-emerald-700 active:scale-95 transition cursor-pointer ${
                                    isFullScreen ? 'min-h-[44px] px-3.5 sm:px-4 py-2 text-xs' : 'min-h-[36px] sm:min-h-[32px] px-2.5 sm:px-3 py-1.5 text-[10px]'
                                }`}
                                title="Call driver or copy phone number on desktop"
                            >
                                {copiedPhoneType === 'call' ? (
                                    <>
                                        <Check size={isFullScreen ? 14 : 11} className="text-white" />
                                        <span>Copied!</span>
                                    </>
                                ) : (
                                    <>
                                        <Phone size={isFullScreen ? 14 : 11} />
                                        <span>Call</span>
                                        <span className="hidden sm:inline"> Driver</span>
                                    </>
                                )}
                            </a>
                            <a
                                href={`sms:${telemetry.driver_phone}`}
                                onClick={(e) => handlePhoneAction(e, telemetry.driver_phone, 'sms')}
                                className={`inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 text-stone-700 font-extrabold hover:bg-stone-100 active:scale-95 transition cursor-pointer ${
                                    isFullScreen ? 'min-h-[44px] px-3.5 sm:px-4 py-2 text-xs' : 'min-h-[36px] sm:min-h-[32px] px-2.5 sm:px-3 py-1.5 text-[10px]'
                                }`}
                                title="SMS driver or copy phone number on desktop"
                            >
                                {copiedPhoneType === 'sms' ? (
                                    <>
                                        <Check size={isFullScreen ? 14 : 11} className="text-emerald-600" />
                                        <span>Copied!</span>
                                    </>
                                ) : (
                                    <>
                                        <MessageSquare size={isFullScreen ? 14 : 11} />
                                        <span>SMS</span>
                                    </>
                                )}
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
            <div className="fixed inset-0 z-[99999] bg-stone-900/60 sm:backdrop-blur-xs flex sm:items-center sm:justify-center sm:p-4 animate-in fade-in duration-200">
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
