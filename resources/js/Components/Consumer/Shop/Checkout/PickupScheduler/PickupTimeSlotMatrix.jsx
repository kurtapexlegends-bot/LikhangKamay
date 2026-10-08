import React from 'react';
import { Clock, Check } from 'lucide-react';

export default function PickupTimeSlotMatrix({
    selectedDayObj,
    selectedSlot,
    handleSelectSlotOption,
}) {
    if (!selectedDayObj || !selectedDayObj.slots || selectedDayObj.slots.length === 0) {
        return null;
    }

    return (
        <div className="pt-3 border-t border-stone-100 space-y-2.5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
                    <Clock size={13} className="text-clay-600" />
                    <span>Available Time Slots for {selectedDayObj.formatted}</span>
                </div>
                {selectedSlot && (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        1 Slot Selected
                    </span>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {selectedDayObj.slots.map((slot) => {
                    const isSelected = selectedSlot === slot.label || selectedSlot === slot.id;
                    const isAvailable = slot.is_available;
                    const maxCap = Math.max(1, slot.max_capacity || 5);
                    const remaining = Math.max(0, slot.remaining_capacity ?? (maxCap - (slot.booked_count || 0)));
                    const percentFilled = Math.min(100, Math.round(((maxCap - remaining) / maxCap) * 100));
                    const isUrgent = remaining > 0 && remaining <= 2;

                    return (
                        <button
                            key={slot.id}
                            type="button"
                            disabled={!isAvailable}
                            onClick={() => handleSelectSlotOption(slot)}
                            className={`group relative text-left p-3 rounded-xl border transition-all duration-150 flex flex-col justify-between ${
                                isSelected
                                    ? 'border-clay-600 bg-clay-50/70 ring-2 ring-clay-600/20 shadow-xs'
                                    : isAvailable
                                    ? 'border-stone-200 bg-white hover:border-clay-300 hover:bg-stone-50/60'
                                    : 'border-stone-200/60 bg-stone-50/60 opacity-55 cursor-not-allowed'
                            }`}
                        >
                            <div className="flex items-center justify-between gap-2 mb-2">
                                <span className={`text-xs font-bold tracking-tight ${
                                    isSelected ? 'text-clay-950 font-extrabold' : isAvailable ? 'text-stone-900' : 'text-stone-400'
                                }`}>
                                    {slot.label}
                                </span>
                                <div
                                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                        isSelected
                                            ? 'border-clay-600 bg-clay-600 text-white'
                                            : isAvailable
                                            ? 'border-stone-300 bg-white group-hover:border-clay-400'
                                            : 'border-stone-200 bg-stone-100 text-transparent'
                                    }`}
                                >
                                    {isSelected && <Check size={10} strokeWidth={3} />}
                                </div>
                            </div>

                            {/* Capacity Progress Bar & Status */}
                            <div className="space-y-1.5 mt-auto">
                                <div className="flex items-center justify-between text-[10px]">
                                    <span className={`font-semibold ${
                                        isUrgent ? 'text-amber-700' : isAvailable ? 'text-stone-500' : 'text-stone-400'
                                    }`}>
                                        {slot.is_past ? 'Time Passed' : slot.is_full ? 'Fully Booked' : `${remaining} of ${maxCap} spots left`}
                                    </span>
                                    {isUrgent && isAvailable && (
                                        <span className="text-[9px] font-bold text-amber-700 bg-amber-100/70 px-1.5 py-0.5 rounded">
                                            Filling Fast
                                        </span>
                                    )}
                                </div>

                                {/* Visual Progress Bar */}
                                <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-300 ${
                                            !isAvailable
                                                ? 'bg-stone-300 w-full'
                                                : isUrgent
                                                ? 'bg-amber-500'
                                                : isSelected
                                                ? 'bg-clay-600'
                                                : 'bg-emerald-500'
                                        }`}
                                        style={{ width: !isAvailable ? '100%' : `${percentFilled}%` }}
                                    />
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
