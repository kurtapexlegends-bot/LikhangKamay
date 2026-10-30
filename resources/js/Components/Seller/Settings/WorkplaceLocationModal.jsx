/* global route */
import React, { useState, useEffect, useRef } from 'react';
import { useForm } from '@inertiajs/react';
import {
    MapPin,
    Crosshair,
    X,
    Search,
    Loader2,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Sliders,
    Navigation,
} from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import Modal from '@/Components/Modal';
import InputError from '@/Components/InputError';
import LocationPickerMap from './LocationPickerMap';

const RADIUS_PRESETS = [
    { meters: 50, label: '50m', desc: 'Studio' },
    { meters: 100, label: '100m', desc: 'Workshop' },
    { meters: 250, label: '250m', desc: 'Compound' },
    { meters: 500, label: '500m', desc: 'Grounds' },
];

const CAVITE_HUBS = [
    { name: 'Imus', lat: 14.4296, lng: 120.9367 },
    { name: 'Bacoor', lat: 14.4624, lng: 120.9645 },
    { name: 'Dasmariñas', lat: 14.3294, lng: 120.9367 },
    { name: 'General Trias', lat: 14.3867, lng: 120.8812 },
    { name: 'Kawit', lat: 14.4444, lng: 120.9028 },
    { name: 'Tagaytay', lat: 14.1153, lng: 120.9621 },
];

export default function WorkplaceLocationModal({
    isOpen,
    onClose,
    editingLocation = null,
    canEdit = true,
}) {
    const [detectingGps, setDetectingGps] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isDebouncing, setIsDebouncing] = useState(false);
    const [showCoordinatesPanel, setShowCoordinatesPanel] = useState(false);
    const searchContainerRef = useRef(null);
    const { addToast } = useToast();

    // Default coordinates center around Cavite (Imus/Bacoor hub)
    const { data, setData, post, put, processing, errors, clearErrors, reset } = useForm({
        name: '',
        address: '',
        latitude: 14.4296,
        longitude: 120.9367,
        radius_meters: 100,
        enforce_strict_geofence: false,
    });

    useEffect(() => {
        if (isOpen) {
            if (editingLocation) {
                setData({
                    name: editingLocation.name || '',
                    address: editingLocation.address || '',
                    latitude: Number(editingLocation.latitude) || 14.4296,
                    longitude: Number(editingLocation.longitude) || 120.9367,
                    radius_meters: Number(editingLocation.radius_meters) || 100,
                    enforce_strict_geofence: Boolean(editingLocation.enforce_strict_geofence),
                });
                setSearchQuery(editingLocation.address || '');
            } else {
                reset();
                setData({
                    name: '',
                    address: '',
                    latitude: 14.4296,
                    longitude: 120.9367,
                    radius_meters: 100,
                    enforce_strict_geofence: false,
                });
                setSearchQuery('');
            }
            clearErrors();
            setShowCoordinatesPanel(false);
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

    // Nominatim geocoding search for Philippine addresses
    useEffect(() => {
        if (!searchQuery.trim() || searchQuery.length < 2) {
            setSearchResults([]);
            setShowSuggestions(false);
            return;
        }

        setIsDebouncing(true);
        const timer = setTimeout(async () => {
            try {
                let response = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&countrycodes=ph&addressdetails=1&limit=5&q=${encodeURIComponent(searchQuery)}`
                );
                let results = await response.json();

                // Fallback: strip block/lot/phase prefixes if 0 results
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

                // Fallback: search key geographic terms
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
            } catch {
                // Silently handle network interruptions
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
        if (errors.latitude || errors.longitude || errors.address) {
            clearErrors('latitude', 'longitude', 'address');
        }
        addToast('Location pinpointed from address.', 'success');
    };

    const handleSelectCaviteHub = (hub) => {
        setData((prev) => ({
            ...prev,
            latitude: hub.lat,
            longitude: hub.lng,
        }));
        if (errors.latitude || errors.longitude) {
            clearErrors('latitude', 'longitude');
        }
        addToast(`Centered map on ${hub.name}, Cavite.`, 'info');
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
            const remaining = Math.max(0, 1000 - elapsed);
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
                        addToast('Location access is blocked. Allow permissions via the browser lock icon.', 'error');
                    });
                    return;
                }
            } catch {
                // Permission query not supported in all browsers
            }
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = Number(position.coords.latitude.toFixed(8));
                const lng = Number(position.coords.longitude.toFixed(8));

                let resolvedAddress = null;
                try {
                    const url = typeof route === 'function' ? route('api.geocode.reverse') : '/api/geocode/reverse';
                    const res = await (window.axios ? window.axios.get(url, { params: { latitude: lat, longitude: lng } }) : fetch(`${url}?latitude=${lat}&longitude=${lng}`).then(r => r.json()));
                    const payload = res?.data || res;
                    if (payload && (payload.display_name || payload.street_address || payload.city)) {
                        resolvedAddress = payload.display_name || [payload.street_address, payload.barangay, payload.city, payload.province].filter(Boolean).join(', ');
                    }
                } catch {
                    // Ignore reverse geocode failure and preserve coordinate capture
                }

                finishLoading(() => {
                    setData((prev) => ({
                        ...prev,
                        latitude: lat,
                        longitude: lng,
                        ...(resolvedAddress ? { address: resolvedAddress } : {}),
                    }));
                    if (resolvedAddress) {
                        setSearchQuery(resolvedAddress.split(',')[0]);
                    }
                    if (errors.latitude || errors.longitude || (resolvedAddress && errors.address)) {
                        clearErrors('latitude', 'longitude', 'address');
                    }
                    addToast(resolvedAddress ? 'Current location and address captured.' : 'Current location captured.', 'success');
                });
            },
            (err) => {
                finishLoading(() => {
                    if (err?.code === 1) {
                        addToast('Location access blocked. Please allow permissions in your address bar.', 'error');
                    } else {
                        addToast('Unable to detect location. Tap map to pinpoint manually.', 'error');
                    }
                });
            },
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
        );
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!canEdit) return;

        if (!data.name.trim()) {
            addToast('Please enter a location name.', 'error');
            return;
        }

        if (editingLocation) {
            put(route('shop.locations.update', { location: editingLocation.id }), {
                preserveScroll: true,
                onSuccess: () => {
                    addToast('Workplace location updated.', 'success');
                    onClose();
                },
                onError: () => {
                    addToast('Please review the highlighted fields.', 'error');
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
                    addToast('Please review the highlighted fields.', 'error');
                },
            });
        }
    };

    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="4xl">
            <div className="flex flex-col max-h-[92vh] overflow-hidden bg-white rounded-3xl">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200/80 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-clay-50 text-clay-700 border border-clay-200/60 flex items-center justify-center shrink-0">
                            <MapPin size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-stone-900 tracking-tight">
                                    {editingLocation ? 'Edit Workplace Location' : 'Add Workplace Location'}
                                </h3>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-stone-600 bg-stone-100 border border-stone-200">
                                    {editingLocation ? `ID: LOC-${editingLocation.id}` : 'Cavite Workshop'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
                        aria-label="Close modal"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Form Body - Split Workspace */}
                <form id="workplace-location-form" onSubmit={handleSubmit} noValidate className="flex-1 overflow-y-auto p-5 sm:p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* Left Configuration Column (7 cols) */}
                        <div className="lg:col-span-7 space-y-5">
                            {/* Location Identity Card */}
                            <div className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-2xs space-y-4">
                                <div>
                                    <label htmlFor="location-name-input" className="block text-xs font-bold text-stone-700 mb-1">
                                        Workshop or Store Name <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        id="location-name-input"
                                        type="text"
                                        required
                                        placeholder="e.g. Kawit Artisan Workshop"
                                        value={data.name}
                                        onChange={(e) => {
                                            setData('name', e.target.value);
                                            if (errors.name) clearErrors('name');
                                        }}
                                        className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-bold text-stone-900 shadow-2xs focus:border-clay-500 focus:ring-clay-500 min-h-[42px] ${
                                            errors.name ? 'border-rose-300 bg-rose-50/50' : 'border-stone-300'
                                        }`}
                                    />
                                    {errors.name && <InputError message={errors.name} className="mt-1" />}
                                </div>

                                {/* Address Autocomplete & GPS Trigger */}
                                <div className="space-y-2">
                                    <label htmlFor="location-search-input" className="block text-xs font-bold text-stone-700">
                                        Address or Landmark
                                    </label>
                                    <div className="flex gap-2">
                                        <div ref={searchContainerRef} className="relative flex-1">
                                            <input
                                                id="location-search-input"
                                                type="text"
                                                placeholder="Search street, barangay, or landmark..."
                                                value={searchQuery}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') e.preventDefault();
                                                }}
                                                onChange={(e) => {
                                                    setSearchQuery(e.target.value);
                                                    if (errors.address) clearErrors('address');
                                                }}
                                                onFocus={() => searchResults.length > 0 && setShowSuggestions(true)}
                                                className={`w-full rounded-xl border pl-8 pr-8 py-2.5 text-xs font-medium text-stone-900 shadow-2xs focus:border-clay-500 focus:ring-clay-500 min-h-[42px] ${
                                                    errors.address ? 'border-rose-300 bg-rose-50/50' : 'border-stone-300'
                                                }`}
                                            />
                                            <Search size={14} className="absolute left-2.5 top-3.5 text-stone-400 pointer-events-none" />
                                            {isDebouncing && (
                                                <div className="absolute right-2.5 top-3.5">
                                                    <Loader2 className="animate-spin text-clay-600" size={14} />
                                                </div>
                                            )}
                                            {!isDebouncing && searchQuery && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSearchQuery('');
                                                        setSearchResults([]);
                                                        setShowSuggestions(false);
                                                    }}
                                                    className="absolute right-2.5 top-3 text-stone-400 hover:text-stone-700"
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}

                                            {/* Live Autocomplete Dropdown */}
                                            {showSuggestions && searchResults.length > 0 && (
                                                <div className="absolute left-0 right-0 top-full mt-1.5 z-[600] bg-white rounded-xl border border-stone-200 shadow-xl overflow-hidden max-h-56 overflow-y-auto">
                                                    {searchResults.map((item, idx) => (
                                                        <button
                                                            key={idx}
                                                            type="button"
                                                            onClick={() => handleSelectSuggestion(item)}
                                                            className="w-full text-left px-3.5 py-2.5 hover:bg-clay-50 border-b border-stone-100 last:border-0 flex items-start gap-2.5 transition text-xs cursor-pointer"
                                                        >
                                                            <MapPin size={14} className="text-clay-600 mt-0.5 shrink-0" />
                                                            <div className="min-w-0 flex-1">
                                                                <p className="font-bold text-stone-900 truncate">
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
                                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300/80 text-xs font-bold transition shrink-0 min-h-[42px] cursor-pointer disabled:opacity-50"
                                            title="Use current location"
                                        >
                                            <Crosshair size={14} className={detectingGps ? 'animate-spin text-clay-600' : 'text-stone-600'} />
                                            <span className="hidden sm:inline">{detectingGps ? 'Locating...' : 'My Location'}</span>
                                        </button>
                                    </div>
                                    {errors.address && <InputError message={errors.address} className="mt-1" />}
                                </div>

                                {/* Cavite Hub Quick-Centers */}
                                <div className="pt-1">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                                            Cavite Quick Center
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {CAVITE_HUBS.map((hub) => (
                                            <button
                                                key={hub.name}
                                                type="button"
                                                onClick={() => handleSelectCaviteHub(hub)}
                                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-stone-100 text-stone-700 hover:bg-clay-100 hover:text-clay-800 border border-stone-200/80 transition cursor-pointer"
                                            >
                                                {hub.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Clock-In Geofence Perimeter Card */}
                            <div className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-2xs space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Sliders size={15} className="text-clay-600" />
                                        <label htmlFor="radius-slider" className="text-xs font-bold text-stone-800">
                                            Allowed Clock-In Radius
                                        </label>
                                    </div>
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-clay-50 text-clay-700 border border-clay-200">
                                        {data.radius_meters} meters
                                    </span>
                                </div>

                                {/* Preset Radius Buttons */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {RADIUS_PRESETS.map((preset) => {
                                        const isSelected = Number(data.radius_meters) === preset.meters;
                                        return (
                                            <button
                                                key={preset.meters}
                                                type="button"
                                                onClick={() => {
                                                    setData('radius_meters', preset.meters);
                                                    if (errors.radius_meters) clearErrors('radius_meters');
                                                }}
                                                className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition cursor-pointer ${
                                                    isSelected
                                                        ? 'bg-clay-600 border-clay-600 text-white shadow-xs'
                                                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                                                }`}
                                            >
                                                <span className="text-xs font-bold">{preset.label}</span>
                                                <span className={`text-[10px] ${isSelected ? 'text-clay-100' : 'text-stone-400'}`}>
                                                    {preset.desc}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Continuous Slider */}
                                <div className="space-y-1">
                                    <input
                                        id="radius-slider"
                                        type="range"
                                        min="20"
                                        max="1000"
                                        step="10"
                                        value={data.radius_meters}
                                        onChange={(e) => {
                                            setData('radius_meters', parseInt(e.target.value, 10));
                                            if (errors.radius_meters) clearErrors('radius_meters');
                                        }}
                                        className="w-full accent-clay-600 cursor-pointer"
                                    />
                                    <div className="flex justify-between text-[10px] text-stone-400 font-mono">
                                        <span>20m (Tight)</span>
                                        <span>500m</span>
                                        <span>1000m (Broad)</span>
                                    </div>
                                    {errors.radius_meters && <InputError message={errors.radius_meters} className="mt-1" />}
                                </div>

                                {/* Boundary Enforcement Switch Card */}
                                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 flex items-start justify-between gap-4">
                                    <div className="space-y-0.5">
                                        <label htmlFor="strict-geofence-switch" className="text-xs font-bold text-stone-900 block cursor-pointer">
                                            Enforce Strict Clock-In Boundary
                                        </label>
                                        <p className="text-[11px] text-stone-500 font-medium leading-relaxed">
                                            {data.enforce_strict_geofence
                                                ? `Staff must be within ${data.radius_meters}m to clock in. Off-site attempts are blocked.`
                                                : `Off-site clock-ins are permitted but flagged for manager review.`}
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        id="strict-geofence-switch"
                                        role="switch"
                                        aria-checked={data.enforce_strict_geofence}
                                        onClick={() => setData('enforce_strict_geofence', !data.enforce_strict_geofence)}
                                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                                            data.enforce_strict_geofence ? 'bg-clay-600' : 'bg-stone-300'
                                        }`}
                                    >
                                        <span
                                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                                data.enforce_strict_geofence ? 'translate-x-5' : 'translate-x-0'
                                            }`}
                                        />
                                    </button>
                                </div>
                            </div>

                            {/* Fine-Tune Exact GPS Coordinates (Collapsible) */}
                            <div className="rounded-2xl border border-stone-200/80 bg-white overflow-hidden shadow-2xs">
                                <button
                                    type="button"
                                    onClick={() => setShowCoordinatesPanel(!showCoordinatesPanel)}
                                    className="w-full flex items-center justify-between p-3.5 text-xs font-bold text-stone-700 hover:bg-stone-50 transition cursor-pointer"
                                >
                                    <span className="flex items-center gap-2">
                                        <Navigation size={13} className="text-clay-600" />
                                        Exact Coordinates ({Number(data.latitude).toFixed(5)}, {Number(data.longitude).toFixed(5)})
                                    </span>
                                    {showCoordinatesPanel ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                </button>

                                {showCoordinatesPanel && (
                                    <div className="p-4 pt-1 border-t border-stone-100 bg-stone-50/50 space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                                                    Latitude
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.000001"
                                                    value={data.latitude}
                                                    onChange={(e) => setData('latitude', parseFloat(e.target.value) || 0)}
                                                    className="w-full text-xs font-mono font-bold rounded-xl border-stone-300 bg-white py-1.5 px-2.5 focus:border-clay-500 focus:ring-clay-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                                                    Longitude
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.000001"
                                                    value={data.longitude}
                                                    onChange={(e) => setData('longitude', parseFloat(e.target.value) || 0)}
                                                    className="w-full text-xs font-mono font-bold rounded-xl border-stone-300 bg-white py-1.5 px-2.5 focus:border-clay-500 focus:ring-clay-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Map Visualizer Column (5 cols) */}
                        <div className="lg:col-span-5 flex flex-col space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                                    <MapPin size={12} className="text-clay-600" />
                                    Map Pin &amp; Perimeter
                                </span>
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                    Interactive
                                </span>
                            </div>

                            {/* Leaflet Map Frame */}
                            <div className="relative rounded-2xl overflow-hidden border border-stone-200/90 shadow-2xs h-[320px] sm:h-[360px] lg:h-[460px] bg-stone-100">
                                <LocationPickerMap
                                    latitude={data.latitude}
                                    longitude={data.longitude}
                                    radiusMeters={data.radius_meters}
                                    isLocating={detectingGps}
                                    height="100%"
                                    className="w-full h-full"
                                    onLocationSelect={async ({ latitude, longitude }) => {
                                        setData((prev) => ({
                                            ...prev,
                                            latitude,
                                            longitude,
                                        }));
                                        if (errors.latitude || errors.longitude) {
                                            clearErrors('latitude', 'longitude');
                                        }

                                        try {
                                            const url = typeof route === 'function' ? route('api.geocode.reverse') : '/api/geocode/reverse';
                                            const res = await (window.axios ? window.axios.get(url, { params: { latitude, longitude } }) : fetch(`${url}?latitude=${latitude}&longitude=${longitude}`).then(r => r.json()));
                                            const payload = res?.data || res;
                                            if (payload && (payload.display_name || payload.street_address || payload.city)) {
                                                const resolvedAddress = payload.display_name || [payload.street_address, payload.barangay, payload.city, payload.province].filter(Boolean).join(', ');
                                                if (resolvedAddress) {
                                                    setData((prev) => ({
                                                        ...prev,
                                                        address: resolvedAddress,
                                                    }));
                                                    setSearchQuery(resolvedAddress.split(',')[0]);
                                                    if (errors.address) {
                                                        clearErrors('address');
                                                    }
                                                }
                                            }
                                        } catch {
                                            // Silently ignore reverse geocode error
                                        }
                                    }}
                                />

                                {/* Map Top Floating Guidance */}
                                <div className="absolute top-2.5 left-2.5 right-2.5 z-[400] pointer-events-none">
                                    <div className="bg-white/95 backdrop-blur-xs rounded-xl border border-stone-200/90 px-3 py-1.5 shadow-xs flex items-center justify-between text-[11px] font-semibold text-stone-700">
                                        <span>Tap map or drag pin to position entrance</span>
                                        <span className="font-bold text-clay-700">{data.radius_meters}m radius</span>
                                    </div>
                                </div>
                            </div>
                            {(errors.latitude || errors.longitude) && (
                                <InputError message={errors.latitude || errors.longitude} className="mt-1" />
                            )}
                        </div>
                    </div>
                </form>

                {/* Sticky Action Footer */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3.5 border-t border-stone-200/80 bg-stone-50/70 shrink-0">
                    <div className="flex items-center gap-2 text-xs text-stone-500 font-medium truncate self-start sm:self-auto">
                        <span className="font-bold text-stone-800 truncate">
                            {data.name || 'Unnamed Workplace'}
                        </span>
                        <span>•</span>
                        <span>{data.radius_meters}m boundary</span>
                        <span>•</span>
                        <span className={data.enforce_strict_geofence ? 'text-rose-600 font-bold' : 'text-stone-600'}>
                            {data.enforce_strict_geofence ? 'Strict On-Site' : 'Soft Audit'}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl bg-white border border-stone-200 text-stone-700 text-xs font-bold hover:bg-stone-50 transition cursor-pointer min-h-[42px]"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="workplace-location-form"
                            disabled={processing || !canEdit}
                            className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-clay-700 hover:bg-clay-800 text-white text-xs font-bold transition shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer min-h-[42px]"
                        >
                            {processing ? (
                                <>
                                    <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                    </svg>
                                    <span>Saving...</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 size={15} />
                                    <span>{editingLocation ? 'Save Changes' : 'Create Location'}</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
