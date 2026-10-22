/* global route */
import React, { useState, useMemo } from 'react';
import { router } from '@inertiajs/react';
import { Store, Clock, Layers, MapPin, Calendar, CheckCircle2, Save, Info } from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import UniformScheduleSection from './Pickup/UniformScheduleSection';
import DailyScheduleSection from './Pickup/DailyScheduleSection';
import PickupPreviewCard from './Pickup/PickupPreviewCard';

const DAYS_OF_WEEK = [
    { id: 1, label: 'Mon', full: 'Monday' },
    { id: 2, label: 'Tue', full: 'Tuesday' },
    { id: 3, label: 'Wed', full: 'Wednesday' },
    { id: 4, label: 'Thu', full: 'Thursday' },
    { id: 5, label: 'Fri', full: 'Friday' },
    { id: 6, label: 'Sat', full: 'Saturday' },
    { id: 7, label: 'Sun', full: 'Sunday' },
];

const formatTimeLabel = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const adjustedHours = hours % 12 || 12;
    return `${adjustedHours}:${minutes < 10 ? '0' : ''}${minutes} ${period}`;
};

export default function PickupScheduleSettings({ schedule, locations = [], canEdit = true }) {
    const { addToast } = useToast();

    const [isEnabled, setIsEnabled] = useState(schedule?.is_enabled ?? true);
    const [scheduleMode, setScheduleMode] = useState(schedule?.schedule_mode || 'uniform');
    const [activeDayId, setActiveDayId] = useState(1);
    const [operatingDays, setOperatingDays] = useState(
        Array.isArray(schedule?.operating_days) && schedule.operating_days.length > 0
            ? schedule.operating_days.map(Number)
            : [1, 2, 3, 4, 5, 6]
    );
    const [timeSlots, setTimeSlots] = useState(
        Array.isArray(schedule?.time_slots) && schedule.time_slots.length > 0
            ? schedule.time_slots
            : [
                  { id: 'slot_1', start_time: '09:00', end_time: '12:00', max_capacity: 5, label: '09:00 AM - 12:00 PM' },
                  { id: 'slot_2', start_time: '13:00', end_time: '17:00', max_capacity: 5, label: '01:00 PM - 05:00 PM' },
              ]
    );

    const initialDailySlots = () => {
        if (schedule?.daily_time_slots && typeof schedule.daily_time_slots === 'object' && Object.keys(schedule.daily_time_slots).length > 0) {
            return schedule.daily_time_slots;
        }
        const initial = {};
        const opDays = Array.isArray(schedule?.operating_days) ? schedule.operating_days.map(Number) : [1, 2, 3, 4, 5, 6];
        const defaultSlots = Array.isArray(schedule?.time_slots) && schedule.time_slots.length > 0
            ? schedule.time_slots
            : [
                  { id: 'slot_1', start_time: '09:00', end_time: '12:00', max_capacity: 5, label: '09:00 AM - 12:00 PM' },
                  { id: 'slot_2', start_time: '13:00', end_time: '17:00', max_capacity: 5, label: '01:00 PM - 05:00 PM' },
              ];
        DAYS_OF_WEEK.forEach((d) => {
            const isOpen = opDays.includes(d.id);
            initial[d.id] = {
                is_open: isOpen,
                slots: isOpen ? defaultSlots.map((s, idx) => ({ ...s, id: `slot_${d.id}_${idx}` })) : [],
            };
        });
        return initial;
    };
    const [dailyTimeSlots, setDailyTimeSlots] = useState(initialDailySlots);

    const [pickupLocationId, setPickupLocationId] = useState(schedule?.pickup_location_id || '');
    const [maxAdvanceDays, setMaxAdvanceDays] = useState(schedule?.max_advance_days ?? 30);
    const [isSaving, setIsSaving] = useState(false);

    const selectedLocation = locations.find((l) => String(l.id) === String(pickupLocationId));

    // Uniform Mode Handlers
    const toggleDay = (dayId) => {
        if (!canEdit) return;
        setOperatingDays((prev) =>
            prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId].sort((a, b) => a - b)
        );
    };

    const handleSelectAllDays = () => {
        if (!canEdit) return;
        setOperatingDays([1, 2, 3, 4, 5, 6, 7]);
    };

    const handleSelectWeekdays = () => {
        if (!canEdit) return;
        setOperatingDays([1, 2, 3, 4, 5]);
    };

    const addSlot = () => {
        if (!canEdit) return;
        const newId = `slot_${Date.now()}`;
        const defaultStart = '10:00';
        const defaultEnd = '14:00';
        const newSlot = {
            id: newId,
            start_time: defaultStart,
            end_time: defaultEnd,
            max_capacity: 5,
            label: `${formatTimeLabel(defaultStart)} - ${formatTimeLabel(defaultEnd)}`,
        };
        setTimeSlots((prev) => [...prev, newSlot]);
    };

    const updateSlot = (index, field, value) => {
        if (!canEdit) return;
        setTimeSlots((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            if (field === 'start_time' || field === 'end_time') {
                const start = field === 'start_time' ? value : next[index].start_time;
                const end = field === 'end_time' ? value : next[index].end_time;
                next[index].label = `${formatTimeLabel(start)} - ${formatTimeLabel(end)}`;
            }
            return next;
        });
    };

    const removeSlot = (index) => {
        if (!canEdit) return;
        if (timeSlots.length <= 1) {
            addToast('At least one pickup time window is required.', 'error');
            return;
        }
        setTimeSlots((prev) => prev.filter((_, i) => i !== index));
    };

    const handleApplyPreset = (presetSlots) => {
        if (!canEdit) return;
        const mapped = presetSlots.map((s, idx) => ({ ...s, id: `slot_preset_${Date.now()}_${idx}` }));
        setTimeSlots(mapped);
        addToast('Applied schedule preset.', 'success');
    };

    // Daily Mode Handlers
    const toggleDailyDayOpen = (dayId) => {
        if (!canEdit) return;
        setDailyTimeSlots((prev) => {
            const currentDay = prev[dayId] || { is_open: false, slots: [] };
            const nextIsOpen = !currentDay.is_open;
            let nextSlots = currentDay.slots || [];
            if (nextIsOpen && nextSlots.length === 0) {
                const seed = timeSlots.length > 0 ? timeSlots : [
                    { id: `slot_${dayId}_1`, start_time: '09:00', end_time: '17:00', max_capacity: 5, label: '09:00 AM - 05:00 PM' },
                ];
                nextSlots = seed.map((s, i) => ({ ...s, id: `slot_${dayId}_${Date.now()}_${i}` }));
            }
            return {
                ...prev,
                [dayId]: {
                    ...currentDay,
                    is_open: nextIsOpen,
                    slots: nextSlots,
                },
            };
        });
    };

    const addDailySlot = (dayId) => {
        if (!canEdit) return;
        const newId = `slot_${dayId}_${Date.now()}`;
        const defaultStart = '10:00';
        const defaultEnd = '14:00';
        const newSlot = {
            id: newId,
            start_time: defaultStart,
            end_time: defaultEnd,
            max_capacity: 5,
            label: `${formatTimeLabel(defaultStart)} - ${formatTimeLabel(defaultEnd)}`,
        };
        setDailyTimeSlots((prev) => {
            const current = prev[dayId] || { is_open: true, slots: [] };
            return {
                ...prev,
                [dayId]: {
                    ...current,
                    is_open: true,
                    slots: [...(current.slots || []), newSlot],
                },
            };
        });
    };

    const updateDailySlot = (dayId, slotIndex, field, value) => {
        if (!canEdit) return;
        setDailyTimeSlots((prev) => {
            const current = prev[dayId] || { is_open: true, slots: [] };
            const slots = [...(current.slots || [])];
            slots[slotIndex] = { ...slots[slotIndex], [field]: value };
            if (field === 'start_time' || field === 'end_time') {
                const start = field === 'start_time' ? value : slots[slotIndex].start_time;
                const end = field === 'end_time' ? value : slots[slotIndex].end_time;
                slots[slotIndex].label = `${formatTimeLabel(start)} - ${formatTimeLabel(end)}`;
            }
            return {
                ...prev,
                [dayId]: {
                    ...current,
                    slots,
                },
            };
        });
    };

    const removeDailySlot = (dayId, slotIndex) => {
        if (!canEdit) return;
        setDailyTimeSlots((prev) => {
            const current = prev[dayId] || { is_open: true, slots: [] };
            const slots = (current.slots || []).filter((_, idx) => idx !== slotIndex);
            return {
                ...prev,
                [dayId]: {
                    ...current,
                    slots,
                },
            };
        });
    };

    const copyDaySlotsToAllDays = (sourceDayId) => {
        if (!canEdit) return;
        const source = dailyTimeSlots[sourceDayId];
        const sourceSlots = source?.slots || [];
        if (sourceSlots.length === 0) {
            addToast('The selected day has no time windows to copy.', 'error');
            return;
        }
        setDailyTimeSlots((prev) => {
            const next = { ...prev };
            DAYS_OF_WEEK.forEach((d) => {
                next[d.id] = {
                    is_open: true,
                    slots: sourceSlots.map((s, idx) => ({ ...s, id: `slot_${d.id}_${Date.now()}_${idx}` })),
                };
            });
            return next;
        });
        const sourceName = DAYS_OF_WEEK.find((d) => d.id === sourceDayId)?.full || 'day';
        addToast(`Copied ${sourceName}'s pickup windows to all days.`, 'success');
    };

    const handleApplyDailyPreset = (dayId, presetSlots) => {
        if (!canEdit) return;
        const mapped = presetSlots.map((s, idx) => ({ ...s, id: `slot_${dayId}_preset_${Date.now()}_${idx}` }));
        setDailyTimeSlots((prev) => ({
            ...prev,
            [dayId]: {
                ...(prev[dayId] || {}),
                is_open: true,
                slots: mapped,
            },
        }));
        const dayName = DAYS_OF_WEEK.find((d) => d.id === dayId)?.full || 'day';
        addToast(`Applied preset to ${dayName}.`, 'success');
    };

    // Live Weekly Overview for Preview Card
    const weeklyOverview = useMemo(() => {
        return DAYS_OF_WEEK.map((day) => {
            if (scheduleMode === 'per_day') {
                const dayConfig = dailyTimeSlots[day.id] || { is_open: false, slots: [] };
                const isOpen = Boolean(dayConfig.is_open);
                const slots = dayConfig.slots || [];
                let hoursSummary = '';
                if (isOpen) {
                    if (slots.length === 1) {
                        hoursSummary = `${formatTimeLabel(slots[0].start_time)} - ${formatTimeLabel(slots[0].end_time)}`;
                    } else if (slots.length > 1) {
                        hoursSummary = `${slots.length} windows (${formatTimeLabel(slots[0].start_time)}…)`;
                    } else {
                        hoursSummary = 'No windows configured';
                    }
                }
                return {
                    id: day.id,
                    label: day.label,
                    full: day.full,
                    isOpen,
                    slotsCount: slots.length,
                    hoursSummary,
                };
            }

            const isOpen = operatingDays.includes(day.id);
            let hoursSummary = '';
            if (isOpen) {
                if (timeSlots.length === 1) {
                    hoursSummary = `${formatTimeLabel(timeSlots[0].start_time)} - ${formatTimeLabel(timeSlots[0].end_time)}`;
                } else if (timeSlots.length > 1) {
                    hoursSummary = `${timeSlots.length} windows (${formatTimeLabel(timeSlots[0].start_time)}…)`;
                } else {
                    hoursSummary = 'No windows configured';
                }
            }
            return {
                id: day.id,
                label: day.label,
                full: day.full,
                isOpen,
                slotsCount: isOpen ? timeSlots.length : 0,
                hoursSummary,
            };
        });
    }, [scheduleMode, operatingDays, timeSlots, dailyTimeSlots]);

    // Save Submission
    const handleSave = (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!canEdit) return;

        let effectiveOperatingDays = operatingDays;

        if (scheduleMode === 'per_day') {
            const openDayIds = DAYS_OF_WEEK.filter(
                (d) => dailyTimeSlots[d.id]?.is_open && (dailyTimeSlots[d.id]?.slots || []).length > 0
            ).map((d) => d.id);

            if (isEnabled && openDayIds.length === 0) {
                addToast('Please enable at least one operating day with pickup windows.', 'error');
                return;
            }

            for (const dayId of openDayIds) {
                const daySlots = dailyTimeSlots[dayId]?.slots || [];
                const dayName = DAYS_OF_WEEK.find((d) => d.id === dayId)?.full || `Day ${dayId}`;
                for (const slot of daySlots) {
                    if (slot.start_time >= slot.end_time) {
                        addToast(`${dayName}: Window "${slot.label || 'slot'}" must end after its start time.`, 'error');
                        return;
                    }
                }
            }
            effectiveOperatingDays = openDayIds;
        } else {
            if (isEnabled && operatingDays.length === 0) {
                addToast('Please select at least one operating day for store pickup.', 'error');
                return;
            }

            if (isEnabled && timeSlots.length === 0) {
                addToast('Please configure at least one pickup time window.', 'error');
                return;
            }

            for (const slot of timeSlots) {
                if (slot.start_time >= slot.end_time) {
                    addToast(`Window "${slot.label || 'slot'}" must end after its start time.`, 'error');
                    return;
                }
            }
        }

        setIsSaving(true);
        router.post(
            route('shop.settings.pickup-schedule'),
            {
                is_enabled: isEnabled,
                schedule_mode: scheduleMode,
                operating_days: effectiveOperatingDays,
                time_slots: timeSlots,
                daily_time_slots: scheduleMode === 'per_day' ? dailyTimeSlots : null,
                pickup_location_id: pickupLocationId ? Number(pickupLocationId) : null,
                max_advance_days: Number(maxAdvanceDays),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    addToast('Pickup schedule updated successfully.', 'success');
                    setIsSaving(false);
                },
                onError: (errors) => {
                    const firstMsg = Object.values(errors)[0] || 'Failed to update pickup schedule.';
                    addToast(firstMsg, 'error');
                    setIsSaving(false);
                },
                onFinish: () => setIsSaving(false),
            }
        );
    };

    return (
        <div className="space-y-6">
            {/* Top Navigation & Schedule Mode Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-stone-200/80 shadow-2xs">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-clay-50 text-clay-700 border border-clay-200/60 flex items-center justify-center shrink-0">
                        <Store size={20} />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-stone-900 tracking-tight">
                            Store Pickup &amp; Operating Hours
                        </h3>
                    </div>
                </div>

                {/* Mode Switcher Segmented Control */}
                <div className="inline-flex rounded-xl border border-stone-200/80 bg-stone-100/80 p-1 text-xs font-bold self-start sm:self-auto gap-1">
                    <button
                        type="button"
                        onClick={() => canEdit && setScheduleMode('uniform')}
                        disabled={!canEdit || !isEnabled}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition-all cursor-pointer ${
                            scheduleMode === 'uniform'
                                ? 'bg-white text-stone-900 shadow-2xs'
                                : 'text-stone-600 hover:text-stone-900'
                        } ${!canEdit || !isEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <Layers size={13} />
                        <span>Uniform Schedule</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => canEdit && setScheduleMode('per_day')}
                        disabled={!canEdit || !isEnabled}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition-all cursor-pointer ${
                            scheduleMode === 'per_day'
                                ? 'bg-clay-600 text-white shadow-2xs'
                                : 'text-stone-600 hover:text-stone-900'
                        } ${!canEdit || !isEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <Clock size={13} />
                        <span>Custom by Day</span>
                    </button>
                </div>
            </div>

            {/* 2-Column Responsive Workspace Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Main Setup Column (Left 8 Cols) */}
                <div className="lg:col-span-8 space-y-6">
                    {/* SECTION 1: SERVICE ACTIVATION & FULFILLMENT LOCATION */}
                    <div className="bg-white rounded-3xl border border-stone-200/80 p-5 sm:p-6 shadow-2xs space-y-5">
                        {/* Master Activation Switch */}
                        <div className="flex items-center justify-between gap-4 pb-4 border-b border-stone-100">
                            <div className="space-y-0.5">
                                <label className="text-sm font-bold text-stone-900 cursor-pointer" htmlFor="pickup-master-toggle">
                                    Local Store Pickup Service
                                </label>
                                <span className="text-xs text-stone-500 font-medium block">
                                    Allow nearby Cavite customers to pick up orders directly at your workshop
                                </span>
                            </div>

                            <button
                                type="button"
                                id="pickup-master-toggle"
                                role="switch"
                                aria-checked={isEnabled}
                                onClick={() => canEdit && setIsEnabled(!isEnabled)}
                                disabled={!canEdit}
                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                                    isEnabled ? 'bg-clay-600' : 'bg-stone-200'
                                } ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <span
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                        isEnabled ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                />
                            </button>
                        </div>

                        {/* Location & Advance Notice Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Fulfillment Location */}
                            <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-2">
                                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1.5" htmlFor="pickup-location-select">
                                    <MapPin size={12} className="text-clay-600" />
                                    Pickup Location Address
                                </label>
                                <select
                                    id="pickup-location-select"
                                    value={pickupLocationId || ''}
                                    onChange={(e) => setPickupLocationId(e.target.value)}
                                    disabled={!canEdit || !isEnabled}
                                    className="w-full text-xs font-bold text-stone-900 rounded-xl border-stone-300 bg-stone-50/50 py-2.5 px-3 shadow-2xs focus:border-clay-500 focus:ring-clay-500 disabled:opacity-50 min-h-[42px]"
                                >
                                    <option value="">Primary Studio / Workshop Address</option>
                                    {locations.map((loc) => (
                                        <option key={loc.id} value={loc.id}>
                                            {loc.name} {loc.address ? `— ${loc.address}` : ''}
                                        </option>
                                    ))}
                                </select>
                                {selectedLocation && (
                                    <p className="text-[11px] text-stone-500 truncate">
                                        {selectedLocation.address || selectedLocation.name}
                                    </p>
                                )}
                            </div>

                            {/* Advance Reservation Window */}
                            <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-2">
                                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1.5" htmlFor="max-advance-days-select">
                                    <Calendar size={12} className="text-clay-600" />
                                    Advance Reservation Window
                                </label>
                                <select
                                    id="max-advance-days-select"
                                    value={maxAdvanceDays}
                                    onChange={(e) => setMaxAdvanceDays(Number(e.target.value))}
                                    disabled={!canEdit || !isEnabled}
                                    className="w-full text-xs font-bold text-stone-900 rounded-xl border-stone-300 bg-stone-50/50 py-2.5 px-3 shadow-2xs focus:border-clay-500 focus:ring-clay-500 disabled:opacity-50 min-h-[42px]"
                                >
                                    <option value={7}>7 Days Ahead (1 Week)</option>
                                    <option value={14}>14 Days Ahead (2 Weeks)</option>
                                    <option value={30}>30 Days Ahead (1 Month)</option>
                                    <option value={60}>60 Days Ahead (2 Months)</option>
                                    <option value={90}>90 Days Ahead (3 Months)</option>
                                </select>
                                <span className="text-[10px] text-stone-500 block">
                                    Customers can book up to {maxAdvanceDays} days in advance
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: OPERATING DAYS & TIME WINDOWS */}
                    {scheduleMode === 'uniform' && (
                        <UniformScheduleSection
                            daysOfWeek={DAYS_OF_WEEK}
                            operatingDays={operatingDays}
                            onToggleDay={toggleDay}
                            onSelectAllDays={handleSelectAllDays}
                            onSelectWeekdays={handleSelectWeekdays}
                            timeSlots={timeSlots}
                            onAddSlot={addSlot}
                            onUpdateSlot={updateSlot}
                            onRemoveSlot={removeSlot}
                            onApplyPreset={handleApplyPreset}
                            canEdit={canEdit}
                            isEnabled={isEnabled}
                        />
                    )}

                    {scheduleMode === 'per_day' && (
                        <DailyScheduleSection
                            daysOfWeek={DAYS_OF_WEEK}
                            dailyTimeSlots={dailyTimeSlots}
                            activeDayId={activeDayId}
                            onSelectDayId={setActiveDayId}
                            onToggleDayOpen={toggleDailyDayOpen}
                            onCopyDaySlotsToAllDays={copyDaySlotsToAllDays}
                            onAddDailySlot={addDailySlot}
                            onUpdateDailySlot={updateDailySlot}
                            onRemoveDailySlot={removeDailySlot}
                            onApplyDailyPreset={handleApplyDailyPreset}
                            canEdit={canEdit}
                            isEnabled={isEnabled}
                        />
                    )}
                </div>

                {/* Right Column: Live Customer Preview & Weekly Schedule Overview */}
                <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-4">
                    <PickupPreviewCard
                        isEnabled={isEnabled}
                        selectedLocation={selectedLocation}
                        maxAdvanceDays={maxAdvanceDays}
                        weeklyOverview={weeklyOverview}
                    />
                </div>
            </div>

            {/* Bottom Sticky Action Bar */}
            {canEdit && (
                <div className="sticky bottom-4 z-20 flex items-center justify-between bg-white/95 backdrop-blur-md rounded-2xl border border-stone-200/90 px-5 py-3.5 shadow-lg">
                    <div className="flex items-center gap-2 text-xs text-stone-500 font-medium">
                        <Info size={14} className="text-stone-400 shrink-0" />
                        <span>Changes apply immediately to customer checkout reservations.</span>
                    </div>

                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-clay-700 hover:bg-clay-800 text-white text-xs font-bold transition shadow-xs disabled:opacity-50 min-h-[42px] cursor-pointer active:scale-95 shrink-0"
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
                                <CheckCircle2 size={15} />
                                <span>Save Changes</span>
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
