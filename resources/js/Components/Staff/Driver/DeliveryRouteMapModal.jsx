import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Modal from '@/Components/Modal';
import { MapPin, Navigation, X, ExternalLink, Compass } from 'lucide-react';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
});

export default function DeliveryRouteMapModal({
    isOpen,
    onClose,
    delivery,
    shopName = "Studio",
}) {
    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);

    const destAddress = delivery?.destination?.address || 'Store Pickup';
    const destLat = Number(delivery?.destination?.latitude) || null;
    const destLng = Number(delivery?.destination?.longitude) || null;

    // Default fallback to Cavite / Metro Manila coordinates if not specified
    const targetLat = destLat || 14.3294;
    const targetLng = destLng || 120.9367;

    const encodedAddr = encodeURIComponent(destAddress);
    const googleMapsUrl = destLat && destLng
        ? `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`
        : `https://www.google.com/maps/dir/?api=1&destination=${encodedAddr}`;

    const wazeUrl = destLat && destLng
        ? `https://waze.com/ul?ll=${destLat},${destLng}&navigate=yes`
        : `https://waze.com/ul?q=${encodedAddr}`;

    useEffect(() => {
        if (!isOpen || !mapContainerRef.current) return;

        const timer = setTimeout(() => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }

            const map = L.map(mapContainerRef.current, {
                center: [targetLat, targetLng],
                zoom: 14,
                attributionControl: false,
            });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
            }).addTo(map);

            const marker = L.marker([targetLat, targetLng]).addTo(map);
            marker.bindPopup(`<b>Order #${delivery?.order_number || ''}</b><br/>${destAddress}`).openPopup();

            mapInstanceRef.current = map;
            map.invalidateSize();
        }, 150);

        return () => {
            clearTimeout(timer);
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [isOpen, targetLat, targetLng, delivery?.order_number, destAddress]);

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
                        className="text-stone-400 hover:text-stone-700 rounded-lg p-1 hover:bg-stone-100 transition"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Destination info */}
                <div className="rounded-xl bg-stone-50 p-3.5 border border-stone-200/80 mb-3 space-y-1.5">
                    <div className="flex items-start gap-2">
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
                    {destLat && destLng && (
                        <div className="text-[10px] font-mono text-stone-500 pl-6">
                            Coordinates: {destLat.toFixed(6)}, {destLng.toFixed(6)}
                        </div>
                    )}
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
                            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-bold text-white hover:bg-stone-800 transition shadow-2xs min-h-[38px]"
                        >
                            <Navigation size={13} className="text-clay-400" />
                            <span>Google Maps</span>
                            <ExternalLink size={12} className="text-stone-400" />
                        </a>
                        <a
                            href={wazeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-100 transition shadow-2xs min-h-[38px]"
                        >
                            <Navigation size={13} className="text-stone-500" />
                            <span>Waze</span>
                            <ExternalLink size={12} className="text-stone-400" />
                        </a>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
