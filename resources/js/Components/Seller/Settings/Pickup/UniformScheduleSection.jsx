import React from 'react';
import { Calendar, Clock, Plus, Check } from 'lucide-react';
import SlotTable from './SlotTable';
import PickupPresets from './PickupPresets';

export default function UniformScheduleSection({
    daysOfWeek = [],
    operatingDays = [],
    onToggleDay,
    onSelectAllDays,
    onSelectWeekdays,
    timeSlots = [],
    onAddSlot,
    onUpdateSlot,
    onRemoveSlot,
    onApplyPreset,
    canEdit = true,
    isEnabled = true,
}) {
    return (
        <div className="space-y-5">
            {/* Operating Days Card */}
            <div className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h4 className="text-xs font-bold text-stone-900 tracking-tight flex items-center gap-1.5 uppercase">
                            <Calendar size={14} className="text-clay-600" />
                            Operating Pickup Days
                        </h4>
                        <p className="text-xs text-stone-500 font-medium mt-1">
                            Select the days of the week your craft studio accepts local customer pickups.
                        </p>
                    </div>

                    {canEdit && isEnabled && (
                        <div className="flex items-center gap-1.5 text-xs font-bold self-start sm:self-auto">
                            <button
                                type="button"
                                onClick={onSelectWeekdays}
                                className="px-2.5 py-1 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
                            >
                                Mon–Fri
                            </button>
                            <span className="text-stone-300">•</span>
                            <button
                                type="button"
                                onClick={onSelectAllDays}
                                className="px-2.5 py-1 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
                            >
                                All 7 Days
                            </button>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-7 gap-2 pt-1">
                    {daysOfWeek.map((day) => {
                        const active = operatingDays.includes(day.id);
                        return (
                            <button
                                key={day.id}
                                type="button"
                                onClick={() => onToggleDay(day.id)}
                                disabled={!canEdit || !isEnabled}
                                className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-2xl text-xs font-bold transition-all border ${
                                    active && isEnabled
                                        ? 'bg-clay-600 text-white border-clay-600 shadow-2xs'
                                        : 'bg-stone-50 text-stone-600 border-stone-200/80 hover:bg-stone-100 hover:text-stone-900'
                                } ${!canEdit || !isEnabled ? 'opacity-60 cursor-not-allowed' : 'active:scale-95'}`}
                            >
                                <span className="text-[11px] font-semibold sm:hidden">{day.label}</span>
                                <span className="hidden sm:inline text-xs">{day.full}</span>
                                {active && isEnabled && <Check size={12} className="mt-1" />}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Time Slot Windows Card */}
            <div className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
                    <div>
                        <h4 className="text-xs font-bold text-stone-900 tracking-tight flex items-center gap-1.5 uppercase">
                            <Clock size={14} className="text-clay-600" />
                            Pickup Time Windows
                        </h4>
                        <p className="text-xs text-stone-500 font-medium mt-1">
                            Set customer pickup slots and order caps. Applies across all selected days.
                        </p>
                    </div>

                    {canEdit && isEnabled && (
                        <button
                            type="button"
                            onClick={onAddSlot}
                            className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-clay-600 hover:bg-clay-700 text-white text-xs font-bold transition-all shadow-2xs active:scale-95 self-start sm:self-auto"
                        >
                            <Plus size={13} />
                            <span>Add Window</span>
                        </button>
                    )}
                </div>

                {/* Presets Toolbar */}
                <PickupPresets onApplyPreset={onApplyPreset} canEdit={canEdit} disabled={!isEnabled} />

                {/* Slot Table */}
                <SlotTable
                    slots={timeSlots}
                    onUpdateSlot={onUpdateSlot}
                    onRemoveSlot={onRemoveSlot}
                    canEdit={canEdit}
                    disabled={!isEnabled}
                    emptyMessage="No pickup windows defined. Click 'Add Window' or choose a preset above."
                />
            </div>
        </div>
    );
}
