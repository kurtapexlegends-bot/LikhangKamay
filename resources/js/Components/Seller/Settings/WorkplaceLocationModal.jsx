import React, { useState, useEffect, useRef } from 'react';
import { useForm } from '@inertiajs/react';
import { MapPin, Crosshair, X, Search, Loader2 } from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import Modal from '@/Components/Modal';
import InputError from '@/Components/InputError';
import LocationPickerMap from './LocationPickerMap';

export default function WorkplaceLocationModal({
    isOpen,
    onClose,
    editingLocation = null,
    canEdit = true,
}) {
    const [detectingGps, setDetectingGps] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchingAddress, setSearchingAddress] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isDebouncing, setIsDebouncing] = useState(false);
    const searchContainerRef = useRef(null);
    const { addToast } = useToast();

    const { data, setData, post, put, processing, errors, clearErrors, reset } = useForm({
        name: '',
        address: '',
        latitude: 14.5995,
        longitude: 120.9842,
        radius_meters: 100,
        enforce_strict_geofence: false,
    });

    useEffect(() => {
        if (isOpen) {
            if (editingLocation) {
                setData({
                    name: editingLocation.name,
                    address: editingLocation.address || '',
                    latitude: editingLocation.latitude,
                    longitude: editingLocation.longitude,
                    radius_meters: editingLocation.radius_meters || 100,
                    enforce_strict_geofence: Boolean(editingLocation.enforce_strict_geofence),
                });
                setSearchQuery(editingLocation.address || '');
            } else {
                reset();
                setSearchQuery('');
            }
            clearErrors();
        }
    }, [isOpen, editingLocation]);

    // Close suggestions dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Smart multi-fallback live search for Philippine addresses & lot/block numbers
    useEffect(() => {
        if (!searchQuery.trim() || searchQuery.length < 2) {
            setSearchResults([]);
            setShowSuggestions(false);
            return;
        }

        setIsDebouncing(true);
        const timer = setTimeout(async () => {
            try {
                // 1. Try exact user query
                let response = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&countrycodes=ph&addressdetails=1&limit=5&q=${encodeURIComponent(searchQuery)}`
                );
                let results = await response.json();

                // 2. If 0 results, strip block/lot/unit/phase/purok prefixes and numbers
                if (!results || results.length === 0) {
                    const cleaned = searchQuery
                        .replace(/\b(blk|block|lot|lt|phase|ph|purok|prk|unit|no|#)\s*\w+/gi, '')
                        .replace(/\s+/g, ' ')
                        .trim();

                    if (cleaned && cleaned !== searchQuery && cleaned.length >= 2) {
                        response = await fetch(
                            `https://nominatim.openstreetmap.org/search?format=json&countrycodes=ph&addressdetails=1&limit=5&q=${encodeURIComponent(cleaned)}`
                        );
                        results = await response.json();
                    }
                }

                // 3. If STILL 0 results, search key geographic terms
                if (!results || results.length === 0) {
                    const words = searchQuery
                        .replace(/[^\w\s]/gi, '')
                        .split(/\s+/)
                        .filter((w) => w.length > 2 && !/^\d+$/.test(w));
                    if (words.length >= 2) {
                        const fallbackQuery = words.slice(-2).join(' ');
                        response = await fetch(
                            `https://nominatim.openstreetmap.org/search?format=json&countrycodes=ph&addressdetails=1&limit=5&q=${encodeURIComponent(fallbackQuery)}`
                        );
                        results = await response.json();
                    }
                }

                setSearchResults(results || []);
                setShowSuggestions((results || []).length > 0);
            } catch (err) {
                console.error(err);
            } finally {
                setIsDebouncing(false);
            }
        }, 350);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleSelectSuggestion = (result) => {
        const lat = Number(parseFloat(result.lat).toFixed(8));
        const lng = Number(parseFloat(result.lon).toFixed(8));
        setData((prev) => ({
            ...prev,
            address: result.display_name,
            latitude: lat,
            longitude: lng,
        }));
        setShowSuggestions(false);
        setSearchQuery(result.display_name.split(',')[0]);
        addToast('Location pinpointed from search result.', 'success');
    };

    const detectGpsLocation = async () => {
        if (!navigator.geolocation) {
            addToast('Geolocation is not supported by your browser.', 'error');
            return;
        }

        setDetectingGps(true);
        const startTime = Date.now();

        const finishLoading = (action) => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, 1500 - elapsed);
            setTimeout(() => {
                setDetectingGps(false);
                if (action) action();
            }, remaining);
        };

        if (navigator.permissions && navigator.permissions.query) {
            try {
                const status = await navigator.permissions.query({ name: 'geolocation' });
                if (status.state === 'denied') {
                    finishLoading(() => {
                        addToast('Location access is blocked in browser settings. Please allow location access in your address bar.', 'error');
                    });
                    return;
                }
            } catch (e) {
                // Ignore permission query error
            }
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = Number(position.coords.latitude.toFixed(8));
                const lng = Number(position.coords.longitude.toFixed(8));
                finishLoading(() => {
                    setData((prev) => ({
                        ...prev,
                        latitude: lat,
                        longitude: lng,
                    }));
                    addToast('Store location detected!', 'success');
                });
            },
            () => {
                finishLoading();
            },
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
        );
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!canEdit) return;

        if (editingLocation) {
            put(route('shop.locations.update', { location: editingLocation.id }), {
                preserveScroll: true,
                onSuccess: () => {
                    addToast('Workplace location updated.', 'success');
                    onClose();
                },
                onError: () => {
                    addToast('Please check the highlighted fields.', 'error');
                },
            });
        } else {
            post(route('shop.locations.store'), {
                preserveScroll: true,
                onSuccess: () => {
                    addToast('Workplace location created.', 'success');
                    onClose();
                },
                onError: () => {
                    addToast('Please check the highlighted fields.', 'error');
                },
            });
        }
    };

    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="xl">
            <div className="p-6 space-y-5">
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <h3 className="text-base font-black text-stone-900">
                        {editingLocation ? 'Edit Workplace Location' : 'Add Workplace Location'}
                    </h3>
                    <button onClick={onClose} className="p-1 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition">
                        <X size={18} />
                    </button>
                </div>

                {/* Modal Form Body */}
                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">Location Name</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Main Artisan Workshop"
                            value={data.name}
                            onChange={(e) => {
                                setData('name', e.target.value);
                                if (errors.name) clearErrors('name');
                            }}
                            className={`w-full rounded-xl border px-3.5 py-2 text-xs font-medium text-stone-900 focus:ring-clay-500 ${
                                errors.name ? 'border-rose-300 bg-rose-50/50 focus:border-rose-500' : 'border-stone-200 focus:border-clay-500'
                            }`}
                        />
                        {errors.name && <InputError message={errors.name} className="mt-1.5" />}
                    </div>

                    {/* Search via Address Autocomplete & GPS */}
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-stone-700">Pinpoint Location</label>
                        <div className="flex gap-2">
                            <div ref={searchContainerRef} className="relative flex-1">
                                <input
                                    type="text"
                                    placeholder="Search city, barangay, landmark, or street..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        if (errors.address) clearErrors('address');
                                    }}
                                    onFocus={() => searchResults.length > 0 && setShowSuggestions(true)}
                                    className={`w-full rounded-xl border pl-8 pr-8 py-2 text-xs font-medium text-stone-900 focus:ring-clay-500 ${
                                        errors.address ? 'border-rose-300 bg-rose-50/50 focus:border-rose-500' : 'border-stone-200 focus:border-clay-500'
                                    }`}
                                />
                                <Search size={14} className="absolute left-2.5 top-2.5 text-stone-400 pointer-events-none" />
                                {isDebouncing && (
                                    <div className="absolute right-2.5 top-2.5">
                                        <Loader2 className="animate-spin text-clay-600" size={14} />
                                    </div>
                                )}

                                {/* Live Search Suggestions Dropdown */}
                                {showSuggestions && searchResults.length > 0 && (
                                    <div className="absolute left-0 right-0 top-full mt-1.5 z-[600] bg-white rounded-xl border border-stone-200 shadow-xl overflow-hidden max-h-60 overflow-y-auto animate-in fade-in duration-150">
                                        {searchResults.map((item, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => handleSelectSuggestion(item)}
                                                className="w-full text-left px-3.5 py-2.5 hover:bg-clay-50 border-b border-stone-100 last:border-0 flex items-start gap-2.5 transition text-xs group"
                                            >
                                                <MapPin size={14} className="text-clay-500 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-bold text-stone-800 truncate">
                                                        {item.display_name.split(',')[0]}
                                                    </p>
                                                    <p className="text-[10px] text-stone-500 truncate">
                                                        {item.display_name}
                                                    </p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <button
                                type="button"
                                disabled={detectingGps}
                                onClick={detectGpsLocation}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-clay-50 text-clay-700 hover:bg-clay-100 border border-clay-200 text-xs font-bold transition shrink-0"
                                title="Use My Current Location"
                            >
                                <Crosshair size={14} className={detectingGps ? "animate-spin text-clay-600" : ""} />
                                {detectingGps ? 'Locating...' : 'Use Current Location'}
                            </button>
                        </div>
                        {errors.address && <InputError message={errors.address} className="mt-1" />}
                    </div>

                    {/* Interactive Leaflet Map Visualizer with Locating Overlay */}
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                            Pin Location on Map
                        </label>
                        <LocationPickerMap
                            latitude={data.latitude}
                            longitude={data.longitude}
                            radiusMeters={data.radius_meters}
                            isLocating={detectingGps || searchingAddress}
                            onLocationSelect={({ latitude, longitude }) => {
                                setData((prev) => ({
                                    ...prev,
                                    latitude,
                                    longitude,
                                }));
                                if (errors.latitude || errors.longitude) {
                                    clearErrors('latitude', 'longitude');
                                }
                            }}
                            height="200px"
                        />
                        {(errors.latitude || errors.longitude) && (
                            <InputError message={errors.latitude || errors.longitude} className="mt-1" />
                        )}
                    </div>

                    {/* Radius Slider */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-bold text-stone-700">Allowed Clock-In Distance</label>
                            <span className="text-xs font-extrabold text-clay-700">{data.radius_meters} meters</span>
                        </div>
                        <input
                            type="range"
                            min="20"
                            max="1000"
                            step="10"
                            value={data.radius_meters}
                            onChange={(e) => {
                                setData('radius_meters', parseInt(e.target.value, 10));
                                if (errors.radius_meters) clearErrors('radius_meters');
                            }}
                            className="w-full accent-clay-600"
                        />
                        {errors.radius_meters && <InputError message={errors.radius_meters} className="mt-1" />}
                        <p className="text-[10px] text-stone-400 font-medium mt-1">
                            Staff can clock in within {data.radius_meters} meters of this store location.
                        </p>
                    </div>

                    {/* Strict Geofence Enforcement Toggle */}
                    <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 flex items-start gap-3">
                        <input
                            type="checkbox"
                            id="enforce_strict_geofence"
                            checked={data.enforce_strict_geofence}
                            onChange={(e) => setData('enforce_strict_geofence', e.target.checked)}
                            className="mt-0.5 rounded border-stone-300 text-clay-600 focus:ring-clay-500 w-4 h-4 cursor-pointer"
                        />
                        <label htmlFor="enforce_strict_geofence" className="text-xs cursor-pointer select-none">
                            <span className="font-extrabold text-stone-900 block">Require staff to be at store to clock in</span>
                            <span className="text-[11px] text-stone-500 font-medium leading-relaxed block mt-0.5">
                                When turned on, staff cannot clock in if they are outside the {data.radius_meters}m store area. When off, off-site clock-ins are flagged for manager approval.
                            </span>
                        </label>
                    </div>

                    {/* Modal Actions Footer */}
                    <div className="flex justify-end gap-2 border-t border-stone-100 pt-4 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-4 py-2 rounded-xl bg-clay-600 hover:bg-clay-700 text-white text-xs font-bold shadow-xs"
                        >
                            {editingLocation ? 'Save Changes' : 'Create Location'}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}
