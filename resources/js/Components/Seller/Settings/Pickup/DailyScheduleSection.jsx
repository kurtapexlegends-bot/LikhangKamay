import React from 'react';
import { Calendar, Clock, Plus, Copy } from 'lucide-react';
import SlotTable from './SlotTable';
import PickupPresets from './PickupPresets';

export default function DailyScheduleSection({
    daysOfWeek = [],
    dailyTimeSlots = {},
    activeDayId = 1,
    onSelectDayId,
    onToggleDayOpen,
    onCopyDaySlotsToAllDays,
    onAddDailySlot,
    onUpdateDailySlot,
    onRemoveDailySlot,
    onApplyDailyPreset,
    canEdit = true,
    isEnabled = true,
}) {
    const activeDay = daysOfWeek.find((d) => d.id === activeDayId) || daysOfWeek[0];
    const dayConfig = dailyTimeSlots[activeDayId] || { is_open: false, slots: [] };
    const isOpen = Boolean(dayConfig.is_open);
    const slots = dayConfig.slots || [];

    return (
        <div className="space-y-5">
            {/* Day Selector Pill Bar */}
            <div className="rounded-3xl border border-stone-200/80 bg-white p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-900 uppercase tracking-tight flex items-center gap-1.5">
                        <Calendar size={14} className="text-clay-600" />
                        Select Day of Week
                    </span>
                    <span className="text-xs font-semibold text-stone-500">
                        {daysOfWeek.filter((d) => dailyTimeSlots[d.id]?.is_open).length} of 7 days open
                    </span>
                </div>

                <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                    {daysOfWeek.map((day) => {
                        const isSelected = activeDayId === day.id;
                        const config = dailyTimeSlots[day.id] || { is_open: false, slots: [] };
                        const open = Boolean(config.is_open);
                        const count = (config.slots || []).length;

                        return (
                            <button
                                key={day.id}
                                type="button"
                                onClick={() => onSelectDayId(day.id)}
                                disabled={!isEnabled}
                                className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-2xl text-xs font-bold transition-all border ${
                                    isSelected
                                        ? 'bg-clay-600 text-white border-clay-600 shadow-2xs'
                                        : 'bg-stone-50 text-stone-700 border-stone-200/80 hover:bg-stone-100 hover:text-stone-900'
                                } ${!isEnabled ? 'opacity-60 cursor-not-allowed' : 'active:scale-95'}`}
                            >
                                <span className="text-[11px] sm:hidden">{day.label}</span>
                                <span className="hidden sm:inline text-xs">{day.full}</span>
                                <span
                                    className={`mt-1 text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                                        isSelected
                                            ? 'bg-clay-700/90 text-white'
                                            : open
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                            : 'bg-stone-200/70 text-stone-500'
                                    }`}
                                >
                                    {open ? `${count} win` : 'Closed'}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Active Day Detail Card */}
            <div className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-xs space-y-4">
                {/* Active Day Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-stone-100 border border-stone-200/80 flex items-center justify-center text-stone-800 font-black text-xs">
                            {activeDay?.label}
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-stone-900 tracking-tight uppercase">
                                {activeDay?.full} Pickup Windows
                            </h4>
                            <p className="text-xs text-stone-500 font-medium mt-0.5">
                                {isOpen
                                    ? `${slots.length} pickup window${slots.length === 1 ? '' : 's'} scheduled`
                                    : 'Studio is closed for customer pickups on this day'}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Open / Closed Toggle Button */}
                        <button
                            type="button"
                            onClick={() => onToggleDayOpen(activeDayId)}
                            disabled={!canEdit || !isEnabled}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border active:scale-95 ${
                                isOpen
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                    : 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200'
                            } ${!canEdit || !isEnabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                            {isOpen ? 'Open for Pickup' : 'Mark as Closed'}
                        </button>

                        {isOpen && canEdit && isEnabled && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => onCopyDaySlotsToAllDays(activeDayId)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-stone-200 text-stone-700 hover:text-clay-700 hover:border-clay-300 text-xs font-bold transition-all shadow-2xs active:scale-95"
                                    title="Copy this day's windows to Monday through Sunday"
                                >
                                    <Copy size={13} />
                                    <span className="hidden sm:inline">Copy to all days</span>
                                    <span className="sm:hidden">Copy</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => onAddDailySlot(activeDayId)}
                                    className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-clay-600 hover:bg-clay-700 text-white text-xs font-bold transition-all shadow-2xs active:scale-95"
                                >
                                    <Plus size={13} />
                                    <span>Add Window</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {!isOpen ? (
                    <div className="py-10 px-4 rounded-2xl bg-stone-50/60 border border-dashed border-stone-200 text-center space-y-2">
                        <p className="text-xs text-stone-500 font-medium">
                            Store pickup is marked as <strong className="text-stone-700">closed</strong> on {activeDay?.full}s. Buyers cannot select this date at checkout.
                        </p>
                        {canEdit && isEnabled && (
                            <button
                                type="button"
                                onClick={() => onToggleDayOpen(activeDayId)}
                                className="text-xs font-bold text-clay-700 hover:text-clay-800 transition-colors underline underline-offset-2"
                            >
                                Open {activeDay?.full} for customer pickup
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <PickupPresets
                            onApplyPreset={(presetSlots) => onApplyDailyPreset(activeDayId, presetSlots)}
                            canEdit={canEdit}
                            disabled={!isEnabled}
                        />

                        <SlotTable
                            slots={slots}
                            onUpdateSlot={(index, field, value) => onUpdateDailySlot(activeDayId, index, field, value)}
                            onRemoveSlot={(index) => onRemoveDailySlot(activeDayId, index)}
                            canEdit={canEdit}
                            disabled={!isEnabled}
                            emptyMessage={`No pickup windows for ${activeDay?.full}. Add a window or select a preset.`}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
