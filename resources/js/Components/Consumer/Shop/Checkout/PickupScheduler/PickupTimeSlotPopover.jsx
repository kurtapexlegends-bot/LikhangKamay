import React from 'react';
import { Check } from 'lucide-react';

export default function PickupTimeSlotPopover({
    isTimeOpen,
    selectedDayObj,
    selectedSlot,
    handleSelectSlotOption,
}) {
    if (!isTimeOpen) return null;

    return (
        <div className="absolute top-full right-0 mt-2 z-40 w-full sm:w-[280px] bg-white border border-stone-200 rounded-2xl shadow-xl p-2.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
            <span className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider px-2 py-1">
                Available Windows for {selectedDayObj?.formatted}
            </span>

            {selectedDayObj?.slots?.map((slot) => {
                const isSelected = selectedSlot === slot.label || selectedSlot === slot.id;
                const isAvailable = slot.is_available;

                return (
                    <button
                        key={slot.id}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => handleSelectSlotOption(slot)}
                        className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                            isSelected
                                ? 'bg-clay-50/80 border-clay-500 text-clay-900 font-bold'
                                : isAvailable
                                ? 'bg-white border-transparent hover:bg-stone-50 text-stone-700'
                                : 'bg-stone-50 border-transparent text-stone-400 opacity-60 cursor-not-allowed'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <div
                                className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                                    isSelected
                                        ? 'border-clay-600 bg-clay-600 text-white'
                                        : 'border-stone-300 bg-white'
                                }`}
                            >
                                {isSelected && <Check size={9} />}
                            </div>
                            <span>{slot.label}</span>
                        </div>

                        <span className="text-[10px] font-medium text-stone-400">
                            {slot.is_past ? 'Passed' : slot.is_full ? 'Full' : `${slot.remaining_capacity} left`}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
