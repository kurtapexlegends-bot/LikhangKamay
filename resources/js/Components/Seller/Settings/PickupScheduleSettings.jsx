/* global route */
import React, { useState, useMemo } from 'react';
import { router } from '@inertiajs/react';
import { Store, Clock, Layers } from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import UniformScheduleSection from './Pickup/UniformScheduleSection';
import DailyScheduleSection from './Pickup/DailyScheduleSection';
import PickupSidebar from './Pickup/PickupSidebar';

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

    // Live Weekly Overview for Sidebar
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
            {/* Top Workspace Header & Mode Switcher */}
            <div className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-clay-50 text-clay-700 border border-clay-200 shrink-0">
                            <Store size={20} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-stone-900 tracking-tight">Store Pickup & Operating Hours</h3>
                            <p className="text-xs text-stone-500 font-medium mt-0.5">
                                Configure customer pickup days, operating windows, and reservation rules.
                            </p>
                        </div>
                    </div>

                    {/* Mode Switcher Segmented Control */}
                    <div className="inline-flex rounded-2xl border border-stone-200/80 bg-stone-100/70 p-1 text-xs font-bold self-start sm:self-auto">
                        <button
                            type="button"
                            onClick={() => canEdit && setScheduleMode('uniform')}
                            disabled={!canEdit || !isEnabled}
                            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 transition-all ${
                                scheduleMode === 'uniform'
                                    ? 'bg-white text-stone-900 shadow-2xs font-extrabold'
                                    : 'text-stone-600 hover:text-stone-900'
                            } ${!canEdit || !isEnabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                            <Layers size={13} />
                            <span>Same hours every day</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => canEdit && setScheduleMode('per_day')}
                            disabled={!canEdit || !isEnabled}
                            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 transition-all ${
                                scheduleMode === 'per_day'
                                    ? 'bg-clay-600 text-white shadow-2xs font-extrabold'
                                    : 'text-stone-600 hover:text-stone-900'
                            } ${!canEdit || !isEnabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                            <Clock size={13} />
                            <span>Custom hours per day</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Responsive Two-Column Dashboard Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Main Schedule Workspace (Left) */}
                <div className="lg:col-span-8 space-y-5">
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

                {/* Sticky Right Sidebar (Right) */}
                <div className="lg:col-span-4 lg:sticky lg:top-20">
                    <PickupSidebar
                        isEnabled={isEnabled}
                        onToggleEnabled={() => canEdit && setIsEnabled(!isEnabled)}
                        locations={locations}
                        pickupLocationId={pickupLocationId}
                        onChangePickupLocationId={setPickupLocationId}
                        maxAdvanceDays={maxAdvanceDays}
                        onChangeMaxAdvanceDays={setMaxAdvanceDays}
                        weeklyOverview={weeklyOverview}
                        canEdit={canEdit}
                        isSaving={isSaving}
                        onSave={handleSave}
                    />
                </div>
            </div>
        </div>
    );
}
