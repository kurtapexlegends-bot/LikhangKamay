import React from 'react';
import { Store, MapPin, Calendar, Clock, Save } from 'lucide-react';

export default function PickupSidebar({
    isEnabled,
    onToggleEnabled,
    locations = [],
    pickupLocationId,
    onChangePickupLocationId,
    maxAdvanceDays,
    onChangeMaxAdvanceDays,
    weeklyOverview = [],
    canEdit = true,
    isSaving = false,
    onSave,
}) {
    const selectedLocation = locations.find((l) => String(l.id) === String(pickupLocationId));

    return (
        <aside className="space-y-5">
            {/* Service Status & Rules Card */}
            <div className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-xs space-y-5">
                {/* Master Toggle */}
                <div className="flex items-center justify-between gap-3 border-b border-stone-100 pb-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-2xl flex items-center justify-center border transition-colors ${
                            isEnabled 
                                ? 'bg-clay-50 text-clay-700 border-clay-200' 
                                : 'bg-stone-100 text-stone-400 border-stone-200'
                        }`}>
                            <Store size={18} />
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-stone-900 tracking-tight uppercase">Store Pickup</h4>
                            <p className="text-xs font-medium text-stone-500">
                                {isEnabled ? 'Accepting local pickups' : 'Pickup currently disabled'}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onToggleEnabled}
                        disabled={!canEdit}
                        role="switch"
                        aria-checked={isEnabled}
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
                            isEnabled ? 'bg-clay-600' : 'bg-stone-300'
                        } ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                        <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                isEnabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                        />
                    </button>
                </div>

                {/* Dedicated Location */}
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin size={13} className="text-clay-600" />
                        Pickup Location
                    </label>
                    <select
                        value={pickupLocationId || ''}
                        onChange={(e) => onChangePickupLocationId(e.target.value)}
                        disabled={!canEdit || !isEnabled}
                        className="w-full text-xs font-semibold text-stone-800 rounded-xl border-stone-300 bg-white py-2 px-3 shadow-2xs focus:border-clay-500 focus:ring-clay-500 disabled:opacity-60"
                    >
                        <option value="">Primary Shop / Studio Address</option>
                        {locations.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                                {loc.name} {loc.address ? `— ${loc.address}` : ''}
                            </option>
                        ))}
                    </select>

                    {selectedLocation && (
                        <div className="mt-2 flex items-start gap-2 p-2.5 rounded-xl bg-stone-50 border border-stone-200/70 text-xs text-stone-600">
                            <MapPin size={13} className="text-clay-600 shrink-0 mt-0.5" />
                            <div className="min-w-0">
                                <span className="font-bold text-stone-800 block truncate">{selectedLocation.name}</span>
                                {selectedLocation.address && <p className="text-stone-500 line-clamp-2 mt-0.5">{selectedLocation.address}</p>}
                            </div>
                        </div>
                    )}
                </div>

                {/* Advance Reservation */}
                <div className="space-y-1.5 pt-1 border-t border-stone-100">
                    <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5 pt-2">
                        <Calendar size={13} className="text-clay-600" />
                        Advance Reservation Window
                    </label>
                    <select
                        value={maxAdvanceDays}
                        onChange={(e) => onChangeMaxAdvanceDays(Number(e.target.value))}
                        disabled={!canEdit || !isEnabled}
                        className="w-full text-xs font-semibold text-stone-800 rounded-xl border-stone-300 bg-white py-2 px-3 shadow-2xs focus:border-clay-500 focus:ring-clay-500 disabled:opacity-60"
                    >
                        <option value={7}>7 Days Ahead (1 Week)</option>
                        <option value={14}>14 Days Ahead (2 Weeks)</option>
                        <option value={30}>30 Days Ahead (1 Month)</option>
                        <option value={60}>60 Days Ahead (2 Months)</option>
                        <option value={90}>90 Days Ahead (3 Months)</option>
                    </select>
                    <p className="text-[11px] text-stone-400">
                        How far ahead customers can reserve a pickup slot.
                    </p>
                </div>
            </div>

            {/* Live Weekly Schedule At-a-Glance */}
            <div className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Clock size={13} className="text-clay-600" />
                        Weekly Overview
                    </h4>
                    <span className="text-xs font-semibold text-stone-500">
                        {weeklyOverview.filter((d) => d.isOpen).length} Days Open
                    </span>
                </div>

                <div className="divide-y divide-stone-100 text-xs">
                    {weeklyOverview.map((day) => (
                        <div key={day.id} className="py-2 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <span className="font-bold text-stone-800 w-8 shrink-0">{day.label}</span>
                                {day.isOpen ? (
                                    <span className="text-xs text-stone-600 truncate">
                                        {day.hoursSummary || 'Open'}
                                    </span>
                                ) : (
                                    <span className="text-xs text-stone-400 italic">Closed</span>
                                )}
                            </div>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                                day.isOpen
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                    : 'bg-stone-100 text-stone-400'
                            }`}>
                                {day.isOpen ? `${day.slotsCount} win` : 'Closed'}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Save Action Card */}
            {canEdit && (
                <div className="pt-1">
                    <button
                        type="button"
                        onClick={onSave}
                        disabled={isSaving}
                        className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-2xl bg-clay-600 hover:bg-clay-700 active:scale-[0.98] text-white text-xs font-bold transition-all shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <>
                                <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                </svg>
                                <span>Saving Schedule...</span>
                            </>
                        ) : (
                            <>
                                <Save size={14} />
                                <span>Save Pickup Schedule</span>
                            </>
                        )}
                    </button>
                </div>
            )}
        </aside>
    );
}
