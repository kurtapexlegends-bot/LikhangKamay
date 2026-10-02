import React from 'react';
import { Trash2 } from 'lucide-react';

export default function SlotTable({
    slots = [],
    onUpdateSlot,
    onRemoveSlot,
    canEdit = true,
    disabled = false,
    emptyMessage = 'No pickup windows configured. Add a window to allow pickups.'
}) {
    if (!slots || slots.length === 0) {
        return (
            <div className="py-8 px-4 rounded-2xl bg-stone-50/60 border border-dashed border-stone-200 text-center">
                <p className="text-xs text-stone-500 font-medium">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-2xs">
            {/* Table Header */}
            <div className="hidden sm:grid sm:grid-cols-12 gap-3 px-4 py-2.5 bg-stone-50/70 border-b border-stone-100 text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                <div className="sm:col-span-4">Start Time</div>
                <div className="sm:col-span-4">End Time</div>
                <div className="sm:col-span-3">Max Orders</div>
                <div className="sm:col-span-1 text-right">Remove</div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-stone-100">
                {slots.map((slot, index) => (
                    <div
                        key={slot.id || index}
                        className="p-3.5 sm:px-4 sm:py-3 flex flex-col sm:grid sm:grid-cols-12 gap-2.5 sm:gap-3 items-stretch sm:items-center hover:bg-stone-50/40 transition-colors"
                    >
                        {/* Start Time */}
                        <div className="sm:col-span-4">
                            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block sm:hidden mb-1">
                                Start Time
                            </label>
                            <input
                                type="time"
                                value={slot.start_time || ''}
                                disabled={!canEdit || disabled}
                                onChange={(e) => onUpdateSlot(index, 'start_time', e.target.value)}
                                className="w-full text-xs font-semibold text-stone-800 rounded-xl border-stone-200 bg-white py-1.5 px-3 shadow-2xs focus:border-clay-500 focus:ring-clay-500 disabled:opacity-60"
                            />
                        </div>

                        {/* End Time */}
                        <div className="sm:col-span-4">
                            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block sm:hidden mb-1">
                                End Time
                            </label>
                            <input
                                type="time"
                                value={slot.end_time || ''}
                                disabled={!canEdit || disabled}
                                onChange={(e) => onUpdateSlot(index, 'end_time', e.target.value)}
                                className="w-full text-xs font-semibold text-stone-800 rounded-xl border-stone-200 bg-white py-1.5 px-3 shadow-2xs focus:border-clay-500 focus:ring-clay-500 disabled:opacity-60"
                            />
                        </div>

                        {/* Max Capacity */}
                        <div className="sm:col-span-3">
                            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block sm:hidden mb-1">
                                Max Orders
                            </label>
                            <div className="flex items-center gap-1.5">
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={slot.max_capacity ?? 5}
                                    disabled={!canEdit || disabled}
                                    onChange={(e) => onUpdateSlot(index, 'max_capacity', Math.max(1, Number(e.target.value) || 1))}
                                    className="w-full text-xs font-semibold text-stone-800 rounded-xl border-stone-200 bg-white py-1.5 px-3 shadow-2xs focus:border-clay-500 focus:ring-clay-500 disabled:opacity-60"
                                />
                                <span className="text-[11px] font-medium text-stone-400 shrink-0">cap</span>
                            </div>
                        </div>

                        {/* Action: Delete */}
                        <div className="sm:col-span-1 flex items-center justify-between sm:justify-end pt-1 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                            <span className="text-xs font-medium text-stone-600 sm:hidden">
                                {slot.label || `${slot.start_time} - ${slot.end_time}`}
                            </span>
                            {canEdit && !disabled && (
                                <button
                                    type="button"
                                    onClick={() => onRemoveSlot(index)}
                                    className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg hover:bg-stone-100 transition-colors"
                                    title="Remove Window"
                                    aria-label="Remove Window"
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
