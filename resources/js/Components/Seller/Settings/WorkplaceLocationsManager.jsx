/* global route */
import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { MapPin, Plus, Trash2, Edit3, Mail } from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import LocationPickerMap from './LocationPickerMap';
import WorkplaceLocationModal from './WorkplaceLocationModal';

export default function WorkplaceLocationsManager({ locations = [], canEdit = true }) {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingLocation, setEditingLocation] = useState(null);
    const { addToast } = useToast();

    const openAddModal = () => {
        setEditingLocation(null);
        setIsAddModalOpen(true);
    };

    const openEditModal = (loc) => {
        setEditingLocation(loc);
        setIsAddModalOpen(true);
    };

    const closeModal = () => {
        setIsAddModalOpen(false);
        setEditingLocation(null);
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
                        <h3 className="text-base font-black text-stone-900 tracking-tight">Workplace & Store Locations</h3>
                    </div>
                    <p className="text-xs text-stone-500 font-medium mt-1">
                        Set store or workshop locations to verify where staff clock in.
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
                                    <h4 className="font-bold text-stone-900 text-sm flex items-center gap-1.5 flex-wrap">
                                        {loc.name}
                                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-wider">
                                            {loc.radius_meters}m Radius
                                        </span>
                                        {loc.enforce_strict_geofence ? (
                                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100 uppercase tracking-wider">
                                                Strict Block
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 uppercase tracking-wider">
                                                Soft Audit
                                            </span>
                                        )}
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

                            {/* Staff Verification Security Badge */}
                            <div className="flex items-center justify-between text-xs bg-emerald-50/80 border border-emerald-200/80 rounded-xl px-3 py-2">
                                <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                                    <Mail size={13} className="text-emerald-600" />
                                    Staff Clock-In Verification:
                                </span>
                                <span className="font-semibold text-[11px] text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200 shadow-2xs">
                                    Email Security Code Active
                                </span>
                            </div>

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
                    <p className="text-[11px] text-stone-400">Add your workshop or store location so staff can clock in on-site.</p>
                </div>
            )}

            {/* Add / Edit Location Modal via Headless UI Portal */}
            <WorkplaceLocationModal
                isOpen={isAddModalOpen}
                onClose={closeModal}
                editingLocation={editingLocation}
                canEdit={canEdit}
            />
        </div>
    );
}
