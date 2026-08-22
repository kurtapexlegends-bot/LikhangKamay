import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, X, ExternalLink, Route, Compass } from 'lucide-react';
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

    const buyerLat = Number(order?.shipping_latitude) || null;
    const buyerLng = Number(order?.shipping_longitude) || null;

    const pickupLat = Number(sellerCoordinates?.lat || sellerCoordinates?.latitude) || 14.3294;
    const pickupLng = Number(sellerCoordinates?.lng || sellerCoordinates?.longitude) || 120.9367;

    const dropoffLat = buyerLat || (pickupLat + 0.015);
    const dropoffLng = buyerLng || (pickupLng + 0.015);

    useEffect(() => {
        if (!isOpen || !mapContainerRef.current) return;

        const timer = setTimeout(() => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }

            const map = L.map(mapContainerRef.current, {
                center: [pickupLat, pickupLng],
                zoom: 13,
                attributionControl: false,
            });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
            }).addTo(map);

            // Pickup Marker (Artisan Studio - Red/Clay)
            const pickupMarker = L.marker([pickupLat, pickupLng]).addTo(map);
            pickupMarker.bindPopup(`<b>Studio Pickup</b><br/>${sellerAddress || 'Artisan Studio'}`).openPopup();

            // Dropoff Marker (Buyer Destination - Blue/Green)
            const dropoffMarker = L.marker([dropoffLat, dropoffLng]).addTo(map);
            dropoffMarker.bindPopup(`<b>Buyer Drop-off</b><br/>${order?.shipping_address || 'Delivery Address'}`);

            // Polyline route line connecting the two stops
            const latlngs = [
                [pickupLat, pickupLng],
                [dropoffLat, dropoffLng],
            ];
            const polyline = L.polyline(latlngs, {
                color: '#89432d',
                weight: 3,
                dashArray: '6, 8',
                opacity: 0.8,
            }).addTo(map);

            // Fit map bounds to show both pins
            map.fitBounds(polyline.getBounds(), { padding: [40, 40] });

            mapInstanceRef.current = map;
        }, 150);

        return () => {
            clearTimeout(timer);
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [isOpen, pickupLat, pickupLng, dropoffLat, dropoffLng]);

    if (!isOpen) return null;

    // Approximate distance in km using Haversine
    const getApproximateKm = () => {
        const R = 6371;
        const dLat = ((dropoffLat - pickupLat) * Math.PI) / 180;
        const dLon = ((dropoffLng - pickupLng) * Math.PI) / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((pickupLat * Math.PI) / 180) *
                Math.cos((dropoffLat * Math.PI) / 180) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return (R * c).toFixed(1);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="relative w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl border border-stone-200">
                {/* Modal Header */}
                <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-clay-50 text-clay-700">
                            <Route size={16} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-stone-900">
                                Delivery Route Preview
                            </h3>
                            <p className="text-[11px] text-stone-500 font-medium">
                                Order #{order?.order_number} • Approx. {getApproximateKm()} km direct
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Map View */}
                <div
                    ref={mapContainerRef}
                    className="h-64 w-full rounded-xl border border-stone-200 overflow-hidden shadow-inner mb-4 z-0"
                />

                {/* Stops Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-clay-700 flex items-center gap-1 mb-1">
                            <Compass size={11} /> 1. Studio Pickup
                        </span>
                        <p className="text-xs font-semibold text-stone-800 line-clamp-2">
                            {sellerAddress || 'Artisan Studio Location'}
                        </p>
                    </div>

                    <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1 mb-1">
                            <MapPin size={11} /> 2. Buyer Drop-off
                        </span>
                        <p className="text-xs font-semibold text-stone-800 line-clamp-2">
                            {order?.shipping_address || 'Delivery Address'}
                        </p>
                        {buyerLat && buyerLng && (
                            <span className="mt-1 inline-block text-[10px] font-mono text-emerald-600 font-medium">
                                Pinned: {buyerLat.toFixed(5)}, {buyerLng.toFixed(5)}
                            </span>
                        )}
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl bg-clay-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-clay-700 shadow-sm"
                    >
                        Close Preview
                    </button>
                </div>
            </div>
        </div>
    );
}
