import React, { useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, X, ExternalLink, Route, Compass, LoaderCircle, AlertCircle } from 'lucide-react';
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
    isOpen,
    onClose,
    order,
    sellerCoordinates = null,
    sellerAddress = '',
}) {
    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);

    const [isLoading, setIsLoading] = useState(false);
    const [routeData, setRouteData] = useState(null);
    const [fetchError, setFetchError] = useState(null);

    const fetchRouteData = useCallback(async () => {
        if (!order) return;
        setIsLoading(true);
        setFetchError(null);

        const orderId = order.order_number || order.id || order.db_id;
        try {
            const response = await axios.get(route('orders.route-preview', orderId));
            if (response.data && response.data.success) {
                setRouteData(response.data);
            } else {
                setFetchError('Could not resolve route data');
            }
        } catch (err) {
            console.error('Failed to resolve route preview via Nominatim:', err);
            setFetchError('Unable to load live coordinates');
        } finally {
            setIsLoading(false);
        }
    }, [order]);

    useEffect(() => {
        if (isOpen) {
            fetchRouteData();
        } else {
            setRouteData(null);
            setFetchError(null);
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        }
    }, [isOpen, fetchRouteData]);

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

    const distanceKm = routeData?.distance_km !== undefined
        ? routeData.distance_km
        : null;

    const isEstimated = routeData?.is_estimated ?? true;
    const displayOrderNumber = routeData?.order_number || order?.order_number || order?.id || '';

    useEffect(() => {
        if (!isOpen || !mapContainerRef.current || isLoading) return;

        const timer = setTimeout(() => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }

            const map = L.map(mapContainerRef.current, {
                center: [pickupLat, pickupLng],
                zoom: 12,
                attributionControl: false,
            });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
            }).addTo(map);

            // Pickup Marker
            const pickupMarker = L.marker([pickupLat, pickupLng]).addTo(map);
            pickupMarker.bindPopup(`<b>${pickupLabel}</b><br/><span style="font-size:11px;color:#555">${pickupAddress}</span>`).openPopup();

            // Dropoff Marker
            const dropoffMarker = L.marker([dropoffLat, dropoffLng]).addTo(map);
            dropoffMarker.bindPopup(`<b>${dropoffLabel}</b><br/><span style="font-size:11px;color:#555">${dropoffAddress}</span>`);

            // Direct route polyline connecting the two stops
            const latlngs = [
                [pickupLat, pickupLng],
                [dropoffLat, dropoffLng],
            ];
            const polyline = L.polyline(latlngs, {
                color: '#89432d',
                weight: 3,
                dashArray: '6, 8',
                opacity: 0.85,
            }).addTo(map);

            map.fitBounds(polyline.getBounds(), { padding: [50, 50], maxZoom: 14 });
            mapInstanceRef.current = map;
        }, 150);

        return () => {
            clearTimeout(timer);
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [isOpen, isLoading, pickupLat, pickupLng, dropoffLat, dropoffLng, pickupLabel, pickupAddress, dropoffLabel, dropoffAddress]);

    if (!isOpen) return null;

    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${pickupLat},${pickupLng}&destination=${dropoffLat},${dropoffLng}`;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
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
                            <div className="flex items-center gap-2">
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
                            </div>
                            <p className="text-[11px] text-stone-500 font-medium">
                                Order #{displayOrderNumber}
                                {distanceKm !== null && ` • Approx. ${distanceKm} km direct`}
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
                <div className="relative h-64 w-full rounded-xl border border-stone-200 overflow-hidden shadow-inner mb-4 z-0 bg-stone-100">
                    {isLoading ? (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-stone-50/90 gap-2">
                            <LoaderCircle size={24} className="animate-spin text-clay-700" />
                            <p className="text-xs font-semibold text-stone-600">
                                Resolving delivery coordinates via OpenStreetMap...
                            </p>
                        </div>
                    ) : (
                        <div ref={mapContainerRef} className="h-full w-full" />
                    )}
                </div>

                {fetchError && (
                    <div className="mb-3 flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200/80 p-2.5 text-xs text-amber-800">
                        <AlertCircle size={14} className="shrink-0 text-amber-600" />
                        <span>Showing approximate town location. Full road routing is available via Google Maps or Lalamove.</span>
                    </div>
                )}

                {/* Stops Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-clay-700 flex items-center gap-1 mb-1">
                            <Compass size={11} /> 1. Studio Pickup
                        </span>
                        <p className="text-xs font-semibold text-stone-800 line-clamp-2">
                            {pickupAddress}
                        </p>
                        <span className="mt-1 inline-block text-[10px] font-mono text-stone-500">
                            {pickupLat.toFixed(4)}, {pickupLng.toFixed(4)}
                        </span>
                    </div>

                    <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1 mb-1">
                            <MapPin size={11} /> 2. Buyer Drop-off
                        </span>
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
