import React, { useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import { MapPin, Navigation, Crosshair, Plus, Trash2, Edit3, Shield, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import Modal from '@/Components/Modal';
import LocationPickerMap from './LocationPickerMap';

export default function WorkplaceLocationsManager({ locations = [], canEdit = true }) {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingLocation, setEditingLocation] = useState(null);
    const [detectingGps, setDetectingGps] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchingAddress, setSearchingAddress] = useState(false);
    const { addToast } = useToast();

    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: '',
        address: '',
        latitude: 14.5995,
        longitude: 120.9842,
        radius_meters: 100,
    });

    const openAddModal = () => {
        reset();
        setEditingLocation(null);
        setIsAddModalOpen(true);
    };

    const openEditModal = (loc) => {
        setEditingLocation(loc);
        setData({
            name: loc.name,
            address: loc.address || '',
            latitude: loc.latitude,
            longitude: loc.longitude,
            radius_meters: loc.radius_meters || 100,
        });
        setIsAddModalOpen(true);
    };

    const closeModal = () => {
        setIsAddModalOpen(false);
        setEditingLocation(null);
        reset();
    };

    const detectGpsLocation = async () => {
        if (!navigator.geolocation) {
            addToast('Geolocation is not supported by your browser.', 'error');
            return;
        }

        setDetectingGps(true);

        // Pre-check permission status if query API is supported
        if (navigator.permissions && navigator.permissions.query) {
            try {
                const status = await navigator.permissions.query({ name: 'geolocation' });
                if (status.state === 'denied') {
                    setDetectingGps(false);
                    addToast('Location access is blocked in browser settings. Please allow location access in your address bar.', 'error');
                    return;
                }
            } catch (e) {
                // Ignore permission query error
            }
        }

        // Strictly query hardware Wi-Fi / GPS triangulation
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = Number(position.coords.latitude.toFixed(8));
                const lng = Number(position.coords.longitude.toFixed(8));
                setData((prev) => ({
                    ...prev,
                    latitude: lat,
                    longitude: lng,
                }));
                setDetectingGps(false);
                addToast('Store location detected!', 'success');
            },
            () => {
                // Quietly hide loading overlay on error or timeout - NO error toast!
                setDetectingGps(false);
            },
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
        );
    };

    const searchAddressWithNominatim = async () => {
        if (!searchQuery.trim()) return;

        setSearchingAddress(true);
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
            );
            const results = await response.json();
            if (results && results.length > 0) {
                const first = results[0];
                setData((prev) => ({
                    ...prev,
                    address: first.display_name,
                    latitude: Number(parseFloat(first.lat).toFixed(8)),
                    longitude: Number(parseFloat(first.lon).toFixed(8)),
                }));
                addToast('Address coordinates resolved!', 'success');
            } else {
                addToast('Address not found. Please click the map to select coordinates.', 'error');
            }
        } catch (err) {
            console.error(err);
            addToast('Failed to resolve address location.', 'error');
        } finally {
            setSearchingAddress(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!canEdit) return;

        if (editingLocation) {
            put(route('shop.locations.update', { location: editingLocation.id }), {
                preserveScroll: true,
                onSuccess: () => {
                    addToast('Workplace location updated.', 'success');
                    closeModal();
                },
            });
        } else {
            post(route('shop.locations.store'), {
                preserveScroll: true,
                onSuccess: () => {
                    addToast('Workplace location created.', 'success');
                    closeModal();
                },
            });
        }
    };

    const handleDelete = (id) => {
        if (!canEdit) return;
        if (!window.confirm('Remove this workplace location? Staff assigned here will revert to remote/unassigned.')) return;

        router.delete(route('shop.locations.destroy', { location: id }), {
            preserveScroll: true,
            onSuccess: () => addToast('Location deleted.', 'success'),
        });
    };

    return (
        <div className="bg-white rounded-3xl border border-stone-200/80 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-100 pb-5">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-clay-50 text-clay-700 border border-clay-100">
                            <MapPin size={16} />
                        </div>
                        <h3 className="text-base font-black text-stone-900 tracking-tight">Workplace Geofence Locations</h3>
                    </div>
                    <p className="text-xs text-stone-500 font-medium mt-1">
                        Define physical store or workshop GPS perimeters for staff attendance clock-in enforcement.
                    </p>
                </div>

                {canEdit && (
                    <button
                        type="button"
                        onClick={openAddModal}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-clay-600 hover:bg-clay-700 text-white text-xs font-bold transition-all shadow-xs active:scale-[0.98]"
                    >
                        <Plus size={14} />
                        Add Location
                    </button>
                )}
            </div>

            {/* Location List Cards */}
            {locations.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {locations.map((loc) => (
                        <div
                            key={loc.id}
                            className="bg-stone-50/60 rounded-2xl border border-stone-200/80 p-4 shadow-xs flex flex-col justify-between space-y-3"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h4 className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
                                        {loc.name}
                                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-wider">
                                            {loc.radius_meters}m Radius
                                        </span>
                                    </h4>
                                    {loc.address && <p className="text-xs text-stone-500 font-medium mt-1 line-clamp-2">{loc.address}</p>}
                                </div>
                                {canEdit && (
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => openEditModal(loc)}
                                            className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-200/60 hover:text-stone-700 transition"
                                        >
                                            <Edit3 size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(loc.id)}
                                            className="p-1.5 rounded-lg text-stone-400 hover:bg-rose-50 hover:text-rose-600 transition"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Compact Read-Only Map Preview */}
                            <LocationPickerMap
                                latitude={loc.latitude}
                                longitude={loc.longitude}
                                radiusMeters={loc.radius_meters}
                                readOnly
                                height="150px"
                            />

                            <div className="flex items-center justify-between text-[11px] border-t border-stone-200/60 pt-2.5 text-stone-500 font-mono">
                                <span>Lat: {loc.latitude}</span>
                                <span>Lng: {loc.longitude}</span>
                                <span className="font-sans font-bold text-stone-700">{loc.employees_count || 0} Staff Assigned</span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-12 bg-stone-50/50 rounded-2xl border border-dashed border-stone-200 text-center space-y-2">
                    <MapPin size={24} className="mx-auto text-stone-300" />
                    <p className="text-xs font-bold text-stone-700">No workplace locations configured yet.</p>
                    <p className="text-[11px] text-stone-400">Add your workshop or store location to enforce physical clock-in perimeters.</p>
                </div>
            )}

            {/* Add / Edit Location Modal via Headless UI Portal */}
            <Modal show={isAddModalOpen} onClose={closeModal} maxWidth="xl">
                <div className="p-6 space-y-5">
                    {/* Modal Header */}
                    <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                        <h3 className="text-base font-black text-stone-900">
                            {editingLocation ? 'Edit Workplace Location' : 'Add Workplace Location'}
                        </h3>
                        <button onClick={closeModal} className="p-1 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition">
                            <X size={18} />
                        </button>
                    </div>

                    {/* Modal Form Body */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-stone-700 mb-1">Location Name</label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. Main Artisan Workshop"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                className="w-full rounded-xl border border-stone-200 px-3.5 py-2 text-xs font-medium text-stone-900 focus:border-clay-500 focus:ring-clay-500"
                            />
                        </div>

                        {/* Search via Address & GPS */}
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-stone-700">Pinpoint Location</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Search address or city..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="flex-1 rounded-xl border border-stone-200 px-3.5 py-2 text-xs font-medium text-stone-900 focus:border-clay-500 focus:ring-clay-500"
                                />
                                <button
                                    type="button"
                                    disabled={searchingAddress}
                                    onClick={searchAddressWithNominatim}
                                    className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition shrink-0"
                                >
                                    {searchingAddress ? 'Searching...' : 'Search'}
                                </button>
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
                        </div>

                        {/* Interactive Leaflet Map Visualizer with Locating Overlay */}
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                                Interactive Leaflet Map & Geofence Bounds
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
                                }}
                                height="200px"
                            />
                        </div>

                        {/* Lat/Lng Fields */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-bold uppercase text-stone-400 mb-1">Latitude</label>
                                <input
                                    type="number"
                                    step="any"
                                    required
                                    value={data.latitude}
                                    onChange={(e) => setData('latitude', parseFloat(e.target.value))}
                                    className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-mono text-stone-900"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold uppercase text-stone-400 mb-1">Longitude</label>
                                <input
                                    type="number"
                                    step="any"
                                    required
                                    value={data.longitude}
                                    onChange={(e) => setData('longitude', parseFloat(e.target.value))}
                                    className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-mono text-stone-900"
                                />
                            </div>
                        </div>

                        {/* Radius Slider */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-bold text-stone-700">Allowed Geofence Radius</label>
                                <span className="text-xs font-extrabold text-clay-700">{data.radius_meters} meters</span>
                            </div>
                            <input
                                type="range"
                                min="20"
                                max="1000"
                                step="10"
                                value={data.radius_meters}
                                onChange={(e) => setData('radius_meters', parseInt(e.target.value, 10))}
                                className="w-full accent-clay-600"
                            />
                            <p className="text-[10px] text-stone-400 font-medium mt-1">
                                Staff must be within {data.radius_meters} meters of this coordinate to clock in without an exception flag.
                            </p>
                        </div>

                        {/* Modal Actions Footer */}
                        <div className="flex justify-end gap-2 border-t border-stone-100 pt-4 shrink-0">
                            <button
                                type="button"
                                onClick={closeModal}
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
        </div>
    );
}
