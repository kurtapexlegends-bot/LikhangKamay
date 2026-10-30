import React, { useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Crosshair, Loader2, Maximize2, Minimize2, Check, X, Compass, Info } from 'lucide-react';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import {
    getCaviteCoordinatesForCity,
    CAVITE_COMPONENT_CITIES,
    CAVITE_MUNICIPALITIES,
    normalizeCaviteAddressText
} from '@/lib/caviteAddresses';

// Ensure standard Leaflet marker icons resolve correctly in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
});

const getCityShortLabel = (cityName) => {
    if (normalizeCaviteAddressText(cityName).toLowerCase() === 'cavite city') {
        return 'Cavite City';
    }
    return cityName.replace(/\s+City$/i, '');
};

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
    const [isResolvingAddress, setIsResolvingAddress] = useState(false);
    const [isPrecisionOpen, setIsPrecisionOpen] = useState(false);

    const onLocationSelectRef = useRef(onLocationSelect);
    useEffect(() => {
        onLocationSelectRef.current = onLocationSelect;
    }, [onLocationSelect]);

    const abortControllerRef = useRef(null);

    const hasCoordinates = latitude !== null && longitude !== null && !isNaN(Number(latitude)) && !isNaN(Number(longitude));

    const performReverseGeocode = useCallback(async (lat, lng) => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setIsResolvingAddress(true);

        try {
            const url = typeof route === 'function' ? route('api.geocode.reverse') : '/api/geocode/reverse';
            const response = await axios.get(
                url,
                {
                    params: { latitude: lat, longitude: lng },
                    signal: controller.signal,
                }
            );

            setIsResolvingAddress(false);

            if (response?.data && onLocationSelectRef.current) {
                onLocationSelectRef.current({
                    latitude: lat,
                    longitude: lng,
                    addressDetails: response.data,
                });
            }
        } catch (err) {
            if (axios.isCancel(err) || err?.name === 'CanceledError') {
                return;
            }
            setIsResolvingAddress(false);
        }
    }, []);

    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);
    
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
                dragging: !readOnly && (!L.Browser.mobile || isPrecisionOpen),
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

            if (!readOnly) {
                marker.on('dragend', (e) => {
                    const coord = e.target.getLatLng();
                    const nextLat = Number(coord.lat.toFixed(7));
                    const nextLng = Number(coord.lng.toFixed(7));
                    if (onLocationSelectRef.current) {
                        onLocationSelectRef.current({ latitude: nextLat, longitude: nextLng });
                    }
                    performReverseGeocode(nextLat, nextLng);
                });

                map.on('click', (e) => {
                    const nextLat = Number(e.latlng.lat.toFixed(7));
                    const nextLng = Number(e.latlng.lng.toFixed(7));
                    marker.setLatLng([nextLat, nextLng]);
                    if (onLocationSelectRef.current) {
                        onLocationSelectRef.current({ latitude: nextLat, longitude: nextLng });
                    }
                    performReverseGeocode(nextLat, nextLng);
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

    // Handle Precision Mode Resizing & Dragging
    useEffect(() => {
        if (isPrecisionOpen) {
            document.body.style.overflow = 'hidden';
            if (mapInstanceRef.current) {
                mapInstanceRef.current.dragging.enable();
            }
        } else {
            document.body.style.overflow = '';
            if (mapInstanceRef.current && L.Browser.mobile && !readOnly) {
                mapInstanceRef.current.dragging.disable();
            }
        }

        const resizeTimer = setTimeout(() => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.invalidateSize();
            }
        }, 150);

        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isPrecisionOpen) {
                setIsPrecisionOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = '';
            clearTimeout(resizeTimer);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isPrecisionOpen, readOnly]);

    // Handle "Use My Current Location" via Browser Geolocation API
    const handleLocateMe = () => {
        if (!navigator.geolocation) {
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('app-toast', {
                    detail: {
                        type: 'warning',
                        message: 'Geolocation is not supported by your browser.',
                    }
                }));
            }
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

                if (onLocationSelectRef.current) {
                    onLocationSelectRef.current({ latitude: userLat, longitude: userLng });
                }
                performReverseGeocode(userLat, userLng);
            },
            (error) => {
                setIsLocating(false);
                const message = error.code === 1
                    ? 'Location access is blocked. Please click the lock icon in your browser address bar to allow location permissions.'
                    : 'Unable to detect your current location. Please check your device location settings or pin your location manually.';

                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('app-toast', {
                        detail: {
                            type: 'warning',
                            message,
                            duration: 5000,
                        }
                    }));
                }
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    // Jump to landmark / city center
    const handleJumpToCity = (targetCity) => {
        if (!targetCity) return;
        const coords = getCaviteCoordinatesForCity(targetCity);
        if (mapInstanceRef.current && markerRef.current) {
            mapInstanceRef.current.setView([coords.lat, coords.lng], 16, { animate: true });
            markerRef.current.setLatLng([coords.lat, coords.lng]);
            if (onLocationSelectRef.current) {
                onLocationSelectRef.current({ latitude: coords.lat, longitude: coords.lng });
            }
            performReverseGeocode(coords.lat, coords.lng);
        }
    };

    const locationNotice = isResolvingAddress
        ? 'Auto-detecting address and location...'
        : hasCoordinates
        ? `Coordinates set (${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)}). Drag pin to exact gate or entrance.`
        : `Tap map or drag pin to your exact building entrance or gate.`;

    return (
        <>
            {/* Modal Backdrop when Precision View is Active */}
            {isPrecisionOpen && (
                <div
                    className="fixed inset-0 !m-0 z-[150] bg-stone-900/60 backdrop-blur-xs transition-opacity duration-200"
                    onClick={() => setIsPrecisionOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Container: either inline card or centered high-z modal card */}
            <div
                className={`transition-all duration-200 ${
                    isPrecisionOpen
                        ? 'fixed inset-2 sm:inset-6 md:inset-8 !m-auto z-[160] max-w-3xl max-h-[92vh] bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 shadow-2xl flex flex-col border border-stone-200 overflow-y-auto space-y-3'
                        : `rounded-2xl border border-stone-200 bg-stone-50/50 p-3 sm:p-3.5 space-y-2.5 ${className}`
                }`}
                role={isPrecisionOpen ? 'dialog' : undefined}
                aria-modal={isPrecisionOpen ? 'true' : undefined}
                aria-label={isPrecisionOpen ? 'Doorstep Location Map' : undefined}
            >
                {/* Header (Different modes) */}
                {isPrecisionOpen ? (
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-stone-100">
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-stone-900">Doorstep Location Map</h3>
                                {isResolvingAddress ? (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-clay-50 px-2 py-0.5 text-[10px] font-bold text-clay-800 border border-clay-200">
                                        <Loader2 className="w-3 h-3 animate-spin text-clay-600" />
                                        Auto-filling...
                                    </span>
                                ) : (
                                    <span className="rounded-md bg-clay-50 px-2 py-0.5 text-[10px] font-bold text-clay-800 border border-clay-200">
                                        Courier Accuracy
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-stone-500 mt-0.5">
                                Zoom in and drag the pin directly onto your gate, lobby, or doorstep for courier delivery.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsPrecisionOpen(false)}
                            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition shrink-0"
                            aria-label="Close expanded map"
                        >
                            <X size={18} />
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-clay-600 shrink-0" />
                            <span className="text-xs font-bold text-stone-900">Pin Delivery Location</span>
                            {isResolvingAddress ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-clay-50 px-2 py-0.5 text-[10px] font-semibold text-clay-700 border border-clay-200">
                                    <Loader2 className="w-3 h-3 animate-spin text-clay-600" />
                                    Auto-filling...
                                </span>
                            ) : hasCoordinates ? (
                                <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                                    Pinned
                                </span>
                            ) : (
                                <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                                    Tap to Pin
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-1.5 ml-auto">
                            {!readOnly && (
                                <>
                                    <button
                                        type="button"
                                        onClick={handleLocateMe}
                                        disabled={isLocating}
                                        className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-2.5 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900 active:scale-95 transition shadow-2xs disabled:opacity-50 min-h-[30px]"
                                        title="Auto-detect current location"
                                    >
                                        {isLocating ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin text-clay-600" />
                                        ) : (
                                            <Crosshair className="w-3.5 h-3.5 text-clay-600" />
                                        )}
                                        <span>{isLocating ? 'Locating...' : 'My Location'}</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setIsPrecisionOpen(true)}
                                        className="inline-flex items-center gap-1.5 rounded-xl border border-clay-200 bg-clay-50/70 px-2.5 py-1 text-xs font-semibold text-clay-800 hover:bg-clay-100 hover:text-clay-950 active:scale-95 transition shadow-2xs min-h-[30px]"
                                        title="Open expanded map to zoom into your doorstep"
                                    >
                                        <Maximize2 className="w-3.5 h-3.5 text-clay-700" />
                                        <span>Expand Map</span>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Sub-bar / Controls in Precision Mode */}
                {isPrecisionOpen ? (
                    <div className="flex items-center justify-between gap-2 pb-1 w-full overflow-hidden">
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth min-w-0 flex-1 pr-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mr-1 flex items-center gap-1 shrink-0 select-none">
                                <Compass size={12} />
                                Jump:
                            </span>

                            {city && (
                                <button
                                    type="button"
                                    onClick={() => handleJumpToCity(city)}
                                    className="px-2.5 py-1 rounded-lg bg-clay-50 border border-clay-200 text-clay-800 text-xs font-semibold hover:bg-clay-100 transition active:scale-95 shrink-0 whitespace-nowrap"
                                >
                                    Center on {getCityShortLabel(city)}
                                </button>
                            )}

                            {CAVITE_COMPONENT_CITIES.filter(
                                (hub) => normalizeCaviteAddressText(hub).toLowerCase() !== normalizeCaviteAddressText(city || '').toLowerCase()
                            ).map((hub) => (
                                <button
                                    key={hub}
                                    type="button"
                                    onClick={() => handleJumpToCity(hub)}
                                    className="px-2 py-1 rounded-lg bg-stone-50 border border-stone-200 text-stone-700 text-xs font-medium hover:bg-stone-100 transition active:scale-95 shrink-0 whitespace-nowrap"
                                >
                                    {getCityShortLabel(hub)}
                                </button>
                            ))}

                            <select
                                onChange={(e) => {
                                    if (e.target.value) {
                                        handleJumpToCity(e.target.value);
                                        e.target.value = '';
                                    }
                                }}
                                defaultValue=""
                                className="px-2 py-1 rounded-lg bg-stone-50 border border-stone-200 text-stone-700 text-xs font-medium hover:bg-stone-100 transition cursor-pointer shrink-0 whitespace-nowrap"
                                title="Jump to other Cavite municipalities"
                            >
                                <option value="" disabled>More Towns...</option>
                                {CAVITE_MUNICIPALITIES.map((town) => (
                                    <option key={town} value={town}>
                                        {town}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="shrink-0 pl-1 border-l border-stone-200/60">
                            <button
                                type="button"
                                onClick={handleLocateMe}
                                disabled={isLocating}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900 active:scale-95 transition shadow-2xs disabled:opacity-50 whitespace-nowrap shrink-0 min-h-[30px]"
                                title="Auto-detect current location"
                            >
                                {isLocating ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-clay-600" />
                                ) : (
                                    <Crosshair className="w-3.5 h-3.5 text-clay-600" />
                                )}
                                <span>{isLocating ? 'Locating...' : 'My Location'}</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Delivery Hint Banner in Compact View */
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-stone-200/80 text-[11px] text-stone-600">
                        <Info size={13} className="text-clay-600 shrink-0" />
                        <span className="truncate">{locationNotice}</span>
                    </div>
                )}

                {/* The Map Node: PERSISTENT IN DOM, NEVER RE-MOUNTED */}
                <div
                    ref={mapContainerRef}
                    style={{ height: isPrecisionOpen ? '50vh' : height }}
                    className="w-full rounded-xl border border-stone-200 shadow-inner z-0 overflow-hidden min-h-[200px]"
                />

                {/* Footer in Precision Mode vs Compact Mode */}
                {isPrecisionOpen ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-stone-100 mt-auto">
                        <div className="text-xs text-stone-600">
                            {hasCoordinates ? (
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                    <span>
                                        Doorstep set at <strong className="font-mono text-stone-800">{Number(latitude).toFixed(6)}, {Number(longitude).toFixed(6)}</strong>
                                    </span>
                                </div>
                            ) : (
                                <span className="text-amber-700 font-medium">
                                    No pin placed yet. Tap anywhere on the map to set your doorstep.
                                </span>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsPrecisionOpen(false)}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-clay-600 hover:bg-clay-700 text-white text-xs font-bold transition shadow-xs active:scale-95"
                        >
                            <Check size={14} strokeWidth={2.5} />
                            <span>Confirm Doorstep Pin</span>
                        </button>
                    </div>
                ) : (
                    hasCoordinates && (
                        <div className="flex items-center justify-between text-[11px] text-stone-500 font-mono pt-0.5">
                            <span>Lat: {Number(latitude).toFixed(6)}</span>
                            <span>Lng: {Number(longitude).toFixed(6)}</span>
                        </div>
                    )
                )}
            </div>
        </>
    );
}

