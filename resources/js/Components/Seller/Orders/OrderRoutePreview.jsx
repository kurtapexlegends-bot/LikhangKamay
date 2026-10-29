import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, X, ExternalLink, Route, Compass, LoaderCircle, AlertCircle, Truck, Plus, Minus, Maximize2, Crosshair } from 'lucide-react';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
});

export default function OrderRoutePreview({
    isOpen = true,
    onClose,
    order,
    sellerCoordinates = null,
    sellerAddress = '',
}) {
    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const fetchedOrderIdRef = useRef(null);
    const isFetchingRef = useRef(false);
    const pickupMarkerRef = useRef(null);
    const dropoffMarkerRef = useRef(null);
    const polylineRef = useRef(null);

    const [isLoading, setIsLoading] = useState(false);
    const [routeData, setRouteData] = useState(null);
    const [fetchError, setFetchError] = useState(null);

    const orderId = order?.order_number || order?.id || order?.db_id || null;

    // Handle Escape key to close modal
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose?.();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (!isOpen || !orderId) {
            fetchedOrderIdRef.current = null;
            isFetchingRef.current = false;
            setRouteData(null);
            setFetchError(null);
            setIsLoading(false);
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
            if (mapContainerRef.current && mapContainerRef.current._leaflet_id) {
                delete mapContainerRef.current._leaflet_id;
            }
            return;
        }

        // Avoid re-fetching if data for this order was already resolved or is in-flight
        if (fetchedOrderIdRef.current === orderId || isFetchingRef.current) {
            return;
        }

        let isMounted = true;
        isFetchingRef.current = true;
        setIsLoading(true);
        setFetchError(null);

        axios.get(route('orders.route-preview', orderId))
            .then(response => {
                if (!isMounted) return;
                if (response.data && response.data.success) {
                    setRouteData(response.data);
                    fetchedOrderIdRef.current = orderId;
                } else {
                    setFetchError('Could not resolve route data');
                }
            })
            .catch(err => {
                if (!isMounted) return;
                console.error('Failed to resolve route preview:', err);
                setFetchError('Unable to load live coordinates');
            })
            .finally(() => {
                if (isMounted) {
                    setIsLoading(false);
                }
                isFetchingRef.current = false;
            });

        return () => {
            isMounted = false;
        };
    }, [isOpen, orderId]);

    // Active coordinates: prioritize server-verified Nominatim data, then fallback to props
    const pickupLat = routeData?.pickup?.lat
        || Number(sellerCoordinates?.lat || sellerCoordinates?.latitude)
        || 14.3294;
    const pickupLng = routeData?.pickup?.lng
        || Number(sellerCoordinates?.lng || sellerCoordinates?.longitude)
        || 120.9367;

    const dropoffLat = routeData?.dropoff?.lat
        || Number(order?.shipping_latitude)
        || (pickupLat + 0.015);
    const dropoffLng = routeData?.dropoff?.lng
        || Number(order?.shipping_longitude)
        || (pickupLng + 0.015);

    const pickupAddress = routeData?.pickup?.address || sellerAddress || 'Artisan Studio';
    const pickupLabel = routeData?.pickup?.label || 'Studio Pickup';

    const dropoffAddress = routeData?.dropoff?.address || order?.shipping_address || 'Delivery Address';
    const dropoffLabel = routeData?.dropoff?.label || order?.customer || 'Buyer Drop-off';

    const vehicle = routeData?.vehicle || null;
    const vehicleType = vehicle?.type || order?.recommended_vehicle || order?.delivery?.vehicle_type || 'Motorcycle';
    const vehicleLabel = vehicle?.label || vehicleType;

    const routeInfo = routeData?.route || null;
    const isRoadRouted = Boolean(routeInfo?.is_road_routed);
    const distanceKm = routeInfo?.distance_km ?? routeData?.distance_km ?? null;
    const durationMins = routeInfo?.duration_mins ?? routeData?.duration_mins ?? null;

    const routeCoordinates = useMemo(() => {
        if (routeInfo?.coordinates && routeInfo.coordinates.length > 0) {
            return routeInfo.coordinates;
        }
        return [[pickupLat, pickupLng], [dropoffLat, dropoffLng]];
    }, [routeInfo?.coordinates, pickupLat, pickupLng, dropoffLat, dropoffLng]);

    const isEstimated = routeData?.is_estimated ?? true;
    const displayOrderNumber = routeData?.order_number || order?.order_number || order?.id || '';

    // Custom Icon Generators matching LikhangKamay design system
    const createStudioIcon = useCallback(() => L.divIcon({
        className: 'custom-studio-marker',
        html: `
            <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; width: 120px; overflow: visible;">
                <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
                    <div style="position: absolute; inset: -3px; border-radius: 50%; background: rgba(137, 67, 45, 0.25); animation: ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                    <div style="position: relative; width: 32px; height: 32px; border-radius: 10px; background: #89432d; color: white; display: flex; align-items: center; justify-content: center; border: 2.5px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.35); transform: rotate(-45deg);">
                        <div style="transform: rotate(45deg); display: flex; align-items: center; justify-content: center;">
                            <svg style="width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2.2;" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                        </div>
                    </div>
                    <div style="position: absolute; -bottom: 5px; width: 7px; height: 7px; background: #89432d; border-radius: 50%; border: 1.5px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>
                </div>
                <div style="margin-top: 6px; background: #89432d; color: white; font-weight: 800; font-size: 9px; padding: 2px 7px; border-radius: 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.25); white-space: nowrap; border: 1px solid rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.04em;">
                    Studio Origin
                </div>
            </div>
        `,
        iconSize: [120, 60],
        iconAnchor: [60, 20],
        popupAnchor: [0, -22],
    }), []);

    const createDropoffIcon = useCallback(() => L.divIcon({
        className: 'custom-dropoff-marker',
        html: `
            <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; width: 120px; overflow: visible;">
                <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
                    <div style="position: absolute; inset: -3px; border-radius: 50%; background: rgba(5, 150, 105, 0.25); animation: ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                    <div style="position: relative; width: 32px; height: 32px; border-radius: 10px; background: #059669; color: white; display: flex; align-items: center; justify-content: center; border: 2.5px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.35); transform: rotate(-45deg);">
                        <div style="transform: rotate(45deg); display: flex; align-items: center; justify-content: center;">
                            <svg style="width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2.2;" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        </div>
                    </div>
                    <div style="position: absolute; -bottom: 5px; width: 7px; height: 7px; background: #059669; border-radius: 50%; border: 1.5px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>
                </div>
                <div style="margin-top: 6px; background: #059669; color: white; font-weight: 800; font-size: 9px; padding: 2px 7px; border-radius: 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.25); white-space: nowrap; border: 1px solid rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.04em;">
                    Buyer Destination
                </div>
            </div>
        `,
        iconSize: [120, 60],
        iconAnchor: [60, 20],
        popupAnchor: [0, -22],
    }), []);

    const createVehicleMarkerIcon = useCallback((vType, isDriver = false) => {
        const raw = String(vType || '').toLowerCase();
        const isBicycle = raw.includes('bike') || raw.includes('bicycle');
        const isMotorcycle = raw.includes('motor') || raw.includes('scooter');
        const isTruck = raw.includes('truck') || raw.includes('van');

        const svgIcon = isTruck
            ? `<svg style="width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 2.2;" viewBox="0 0 24 24"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"></path><path d="M15 18H9"></path><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"></path><circle cx="17" cy="18" r="2"></circle><circle cx="7" cy="18" r="2"></circle></svg>`
            : isMotorcycle
            ? `<svg style="width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 2.2;" viewBox="0 0 24 24"><path d="m18 14-1-3"></path><path d="m3 9 6 2a2 2 0 0 1 2-2h2a2 2 0 0 1 1.99 1.81"></path><path d="M8 17h3a1 1 0 0 0 1-1 6 6 0 0 1 6-6 1 1 0 0 0 1-1v-.75A5 5 0 0 0 17 5"></path><circle cx="19" cy="17" r="3"></circle><circle cx="5" cy="17" r="3"></circle></svg>`
            : isBicycle
            ? `<svg style="width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 2.2;" viewBox="0 0 24 24"><circle cx="18.5" cy="17.5" r="3.5"></circle><circle cx="5.5" cy="17.5" r="3.5"></circle><circle cx="15" cy="5" r="1"></circle><path d="M12 17.5V14l-3-3 4-3 2 3h2"></path></svg>`
            : `<svg style="width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 2.2;" viewBox="0 0 24 24"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"></path><circle cx="7" cy="17" r="2"></circle><path d="M9 17h6"></path><circle cx="17" cy="17" r="2"></circle></svg>`;

        const borderColor = isTruck ? '#4f46e5' : isBicycle ? '#059669' : '#89432d';
        const ringColor = isDriver ? borderColor : 'rgba(217, 119, 6, 0.6)';

        return L.divIcon({
            className: isDriver ? 'custom-driver-pin' : 'custom-vehicle-waypoint',
            html: `
                <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;">
                    <div style="position: absolute; inset: -4px; border-radius: 50%; border: 1.5px dashed ${ringColor}; opacity: 0.7; animation: spin 8s linear infinite;"></div>
                    ${isDriver ? `<div style="position: absolute; inset: 0; border-radius: 50%; background-color: ${borderColor}; opacity: 0.25; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>` : ''}
                    <div style="position: relative; width: 30px; height: 30px; border-radius: 50%; background-color: #0f172a; color: white; display: flex; align-items: center; justify-content: center; border: 2.5px solid ${borderColor}; box-shadow: 0 4px 10px rgba(0,0,0,0.35); z-index: 2;">
                        ${svgIcon}
                    </div>
                </div>
            `,
            iconSize: [36, 36],
            iconAnchor: [18, 18],
            popupAnchor: [0, -18],
        });
    }, []);

    useEffect(() => {
        if (!isOpen || !mapContainerRef.current) return;

        const timer = setTimeout(() => {
            if (!mapContainerRef.current) return;

            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
            if (mapContainerRef.current && mapContainerRef.current._leaflet_id) {
                delete mapContainerRef.current._leaflet_id;
            }

            const map = L.map(mapContainerRef.current, {
                center: [pickupLat, pickupLng],
                zoom: 12,
                minZoom: 9,
                maxZoom: 18,
                zoomSnap: 0.25,
                zoomDelta: 0.5,
                wheelPxPerZoomLevel: 120,
                scrollWheelZoom: false,
                doubleClickZoom: true,
                touchZoom: true,
                bounceAtZoomLimits: true,
                attributionControl: false,
                zoomControl: false,
            });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                minZoom: 8,
            }).addTo(map);

            // 1. Studio Pickup Marker (Custom badge icon)
            const pickupMarker = L.marker([pickupLat, pickupLng], { icon: createStudioIcon() }).addTo(map);
            pickupMarkerRef.current = pickupMarker;
            pickupMarker.bindPopup(`
                <div style="font-size: 11px; font-family: sans-serif; line-height: 1.4;">
                    <b style="color: #89432d; text-transform: uppercase; font-size: 9px; letter-spacing: 0.05em;">Studio Pickup</b><br/>
                    <strong>${pickupLabel}</strong><br/>
                    <span style="color: #78716c;">${pickupAddress}</span>
                </div>
            `);

            // 2. Buyer Dropoff Marker (Custom badge icon)
            const dropoffMarker = L.marker([dropoffLat, dropoffLng], { icon: createDropoffIcon() }).addTo(map);
            dropoffMarkerRef.current = dropoffMarker;
            dropoffMarker.bindPopup(`
                <div style="font-size: 11px; font-family: sans-serif; line-height: 1.4;">
                    <b style="color: #059669; text-transform: uppercase; font-size: 9px; letter-spacing: 0.05em;">Buyer Drop-off</b><br/>
                    <strong>${dropoffLabel}</strong><br/>
                    <span style="color: #78716c;">${dropoffAddress}</span>
                </div>
            `);

            // 3. Vehicle theme styling
            const isTruck = /truck|van/i.test(vehicleType);
            const isSedan = /sedan|car/i.test(vehicleType);
            const routeColor = isTruck ? '#4f46e5' : isSedan ? '#2563eb' : '#89432d';

            // Outer white casing for high visibility over all map terrain
            L.polyline(routeCoordinates, {
                color: '#ffffff',
                weight: 6,
                opacity: 0.85,
                lineCap: 'round',
                lineJoin: 'round',
            }).addTo(map);

            // Main vehicle-dependent road route line
            const polyline = L.polyline(routeCoordinates, {
                color: routeColor,
                weight: 4,
                dashArray: isRoadRouted ? null : '6, 8',
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round',
            }).addTo(map);
            polylineRef.current = polyline;

            // 4. Vehicle icon / Active Driver Marker along the route
            if (routeData?.driver?.lat && routeData?.driver?.lng) {
                const driverLat = Number(routeData.driver.lat);
                const driverLng = Number(routeData.driver.lng);
                const driverName = routeData.driver.driver_name || 'Studio Courier';
                const driverPlate = routeData.driver.vehicle_plate_number;
                const driverSpeed = routeData.driver.speed_kph ? Math.round(routeData.driver.speed_kph) : null;
                const driverMarker = L.marker([driverLat, driverLng], {
                    icon: createVehicleMarkerIcon(vehicleType, true),
                }).addTo(map);
                driverMarker.bindPopup(`
                    <div style="font-size: 11px; font-family: sans-serif; line-height: 1.4;">
                        <b style="color: ${routeColor}; text-transform: uppercase; font-size: 9px; letter-spacing: 0.05em;">Live Studio Courier</b><br/>
                        <strong>${driverName}</strong><br/>
                        <span style="color: #78716c;">${driverPlate ? 'Plate: ' + driverPlate : vehicleLabel}</span>
                        ${driverSpeed !== null && driverSpeed > 0 ? `<br/><span style="display: inline-block; margin-top: 2px; background: #ecfdf5; color: #047857; font-weight: bold; padding: 1px 5px; border-radius: 4px;">Speed: ${driverSpeed} km/h</span>` : ''}
                    </div>
                `);
            } else if (routeCoordinates.length >= 2) {
                const midIndex = Math.floor(routeCoordinates.length / 2);
                const midCoord = routeCoordinates[midIndex];
                if (midCoord && midCoord[0] && midCoord[1]) {
                    const vehicleMarker = L.marker([midCoord[0], midCoord[1]], { icon: createVehicleMarkerIcon(vehicleType, false) }).addTo(map);
                    vehicleMarker.bindPopup(`
                        <div style="font-size: 11px; font-family: sans-serif; line-height: 1.4;">
                            <b style="color: #d97706; text-transform: uppercase; font-size: 9px; letter-spacing: 0.05em;">Transport Mode</b><br/>
                            <strong>${vehicleLabel}</strong><br/>
                            <span style="color: #78716c;">Est. Route Duration: ~${durationMins || 25} mins (${distanceKm || '...'} km)</span>
                        </div>
                    `);
                }
            }

            if (polyline.getBounds().isValid()) {
                map.fitBounds(polyline.getBounds(), { padding: [40, 40], maxZoom: 15, animate: false });
            }
            map.invalidateSize();
            mapInstanceRef.current = map;
        }, 150);

        return () => {
            clearTimeout(timer);
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
            if (mapContainerRef.current && mapContainerRef.current._leaflet_id) {
                delete mapContainerRef.current._leaflet_id;
            }
        };
    }, [isOpen, pickupLat, pickupLng, dropoffLat, dropoffLng, pickupLabel, pickupAddress, dropoffLabel, dropoffAddress, routeCoordinates, vehicleType, vehicleLabel, isRoadRouted, distanceKm, durationMins, routeData?.driver, createStudioIcon, createDropoffIcon, createVehicleMarkerIcon]);

    const handleZoomIn = useCallback(() => {
        mapInstanceRef.current?.zoomIn();
    }, []);

    const handleZoomOut = useCallback(() => {
        mapInstanceRef.current?.zoomOut();
    }, []);

    const handleFitRoute = useCallback(() => {
        if (mapInstanceRef.current && polylineRef.current) {
            const bounds = polylineRef.current.getBounds();
            if (bounds.isValid()) {
                mapInstanceRef.current.fitBounds(bounds, {
                    padding: [40, 40],
                    maxZoom: 15,
                    animate: true,
                    duration: 0.5,
                });
            }
        }
    }, []);

    const handleFocusPickup = useCallback(() => {
        if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo([pickupLat, pickupLng], 16, { animate: true, duration: 0.7 });
            pickupMarkerRef.current?.openPopup();
        }
    }, [pickupLat, pickupLng]);

    const handleFocusDropoff = useCallback(() => {
        if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo([dropoffLat, dropoffLng], 16, { animate: true, duration: 0.7 });
            dropoffMarkerRef.current?.openPopup();
        }
    }, [dropoffLat, dropoffLng]);

    if (!isOpen) return null;

    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${pickupLat},${pickupLng}&destination=${dropoffLat},${dropoffLng}`;

    return (
        <div
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose?.();
                }
            }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
            <div className="relative w-full max-w-xl rounded-t-[2.5rem] sm:rounded-2xl bg-white p-5 shadow-2xl border-t sm:border border-stone-200 pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] sm:pb-5 max-h-[92vh] overflow-y-auto">
                <div className="sm:hidden w-full flex justify-center pb-3 -mt-1">
                    <div className="w-12 h-1.5 bg-stone-300 rounded-full" />
                </div>

                {/* Modal Header */}
                <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-clay-50 text-clay-700 shrink-0">
                            <Route size={18} />
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <h3 className="text-sm font-bold text-stone-900">
                                    Delivery Route Preview
                                </h3>
                                {isEstimated ? (
                                    <span className="inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 border border-amber-200">
                                        Town Centroid
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 border border-emerald-200">
                                        Verified Coordinates
                                    </span>
                                )}
                                {vehicleLabel && (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-1.5 py-0.5 text-[9px] font-bold text-stone-700 border border-stone-200">
                                        <Truck size={10} className="text-clay-600" />
                                        {vehicleLabel}
                                    </span>
                                )}
                            </div>
                            <p className="text-[11px] text-stone-500 font-medium">
                                Order #{displayOrderNumber}
                                {distanceKm !== null && ` • ${distanceKm} km via ${isRoadRouted ? 'Road' : 'Direct'}`}
                                {durationMins !== null && ` (~${durationMins} mins)`}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                        aria-label="Close route preview"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Map View / Loading State */}
                <div className="relative h-64 sm:h-72 w-full rounded-2xl border border-stone-200 overflow-hidden shadow-inner mb-4 z-0 bg-stone-100">
                    {isLoading && (
                        <div className="absolute inset-0 z-[1001] flex flex-col items-center justify-center bg-stone-50/85 backdrop-blur-xs gap-2 transition-opacity">
                            <LoaderCircle size={24} className="animate-spin text-clay-700" />
                            <p className="text-xs font-semibold text-stone-600">
                                Resolving delivery route via OpenStreetMap...
                            </p>
                        </div>
                    )}

                    {/* Floating Zoom & Route Controls (Grab / Google Maps Style) */}
                    <div className="absolute top-2.5 right-2.5 z-[1000] flex flex-col items-center bg-white/95 backdrop-blur-xs border border-stone-200/90 rounded-xl shadow-md overflow-hidden pointer-events-auto">
                        <button
                            type="button"
                            onClick={handleZoomIn}
                            className="w-11 h-11 sm:w-9 sm:h-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center text-stone-700 hover:bg-stone-100 hover:text-stone-900 border-b border-stone-100 transition active:scale-95 cursor-pointer"
                            title="Zoom In"
                            aria-label="Zoom In"
                        >
                            <Plus size={16} />
                        </button>
                        <button
                            type="button"
                            onClick={handleZoomOut}
                            className="w-11 h-11 sm:w-9 sm:h-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center text-stone-700 hover:bg-stone-100 hover:text-stone-900 border-b border-stone-100 transition active:scale-95 cursor-pointer"
                            title="Zoom Out"
                            aria-label="Zoom Out"
                        >
                            <Minus size={16} />
                        </button>
                        <button
                            type="button"
                            onClick={handleFitRoute}
                            className="w-11 h-11 sm:w-9 sm:h-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center text-stone-700 hover:bg-stone-100 hover:text-clay-800 transition active:scale-95 cursor-pointer"
                            title="Fit Entire Route"
                            aria-label="Fit Entire Route"
                        >
                            <Maximize2 size={14} />
                        </button>
                    </div>

                    <div ref={mapContainerRef} className="h-full w-full" />
                </div>

                {fetchError && (
                    <div className="mb-3 flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200/80 p-2.5 text-xs text-amber-800">
                        <AlertCircle size={14} className="shrink-0 text-amber-600" />
                        <span>Showing approximate town location. Full road routing is available via Google Maps or Lalamove.</span>
                    </div>
                )}

                {/* Stops Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    <div
                        onClick={handleFocusPickup}
                        className="group relative rounded-xl border border-stone-200 bg-stone-50/50 hover:bg-clay-50/30 hover:border-clay-300 p-3 transition cursor-pointer"
                        title="Click to view Studio on map"
                    >
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-clay-700 flex items-center gap-1">
                                <Compass size={11} /> 1. Studio Pickup
                            </span>
                            <span className="text-[9px] font-bold text-stone-400 group-hover:text-clay-700 flex items-center gap-0.5 transition">
                                <Crosshair size={10} /> Focus
                            </span>
                        </div>
                        <p className="text-xs font-semibold text-stone-800 line-clamp-2">
                            {pickupAddress}
                        </p>
                        <span className="mt-1 inline-block text-[10px] font-mono text-stone-500">
                            {pickupLat.toFixed(4)}, {pickupLng.toFixed(4)}
                        </span>
                    </div>

                    <div
                        onClick={handleFocusDropoff}
                        className="group relative rounded-xl border border-stone-200 bg-stone-50/50 hover:bg-emerald-50/30 hover:border-emerald-300 p-3 transition cursor-pointer"
                        title="Click to view Buyer Destination on map"
                    >
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                                <MapPin size={11} /> 2. Buyer Drop-off
                            </span>
                            <span className="text-[9px] font-bold text-stone-400 group-hover:text-emerald-700 flex items-center gap-0.5 transition">
                                <Crosshair size={10} /> Focus
                            </span>
                        </div>
                        <p className="text-xs font-semibold text-stone-800 line-clamp-2">
                            {dropoffAddress}
                        </p>
                        <span className="mt-1 inline-block text-[10px] font-mono text-emerald-700">
                            {dropoffLat.toFixed(4)}, {dropoffLng.toFixed(4)}
                        </span>
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-100">
                    <a
                        href={googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 transition shadow-2xs min-h-[44px]"
                    >
                        <ExternalLink size={13} />
                        Open in Google Maps
                    </a>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl bg-clay-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-clay-800 shadow-2xs min-h-[44px]"
                    >
                        Close Preview
                    </button>
                </div>
            </div>
        </div>
    );
}
