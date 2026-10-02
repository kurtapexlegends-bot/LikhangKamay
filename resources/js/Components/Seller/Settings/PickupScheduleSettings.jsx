/* global route */
import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { Clock, Calendar, MapPin, Plus, Trash2, Check, Save, Store } from 'lucide-react';
import { useToast } from '@/Components/ToastContext';

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
    const [pickupLocationId, setPickupLocationId] = useState(schedule?.pickup_location_id || '');
    const [maxAdvanceDays, setMaxAdvanceDays] = useState(schedule?.max_advance_days ?? 30);
    const [isSaving, setIsSaving] = useState(false);

    const toggleDay = (dayId) => {
        if (!canEdit) return;
        setOperatingDays((prev) =>
            prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId].sort((a, b) => a - b)
        );
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

    const handleSave = (e) => {
        e.preventDefault();
        if (!canEdit) return;

        if (isEnabled && operatingDays.length === 0) {
            addToast('Please select at least one operating day for store pickup.', 'error');
            return;
        }

        if (isEnabled && timeSlots.length === 0) {
            addToast('Please configure at least one pickup time window.', 'error');
            return;
        }

        // Validate time slots: start < end
        for (const slot of timeSlots) {
            if (slot.start_time >= slot.end_time) {
                addToast(`Window "${slot.label || 'slot'}" must end after its start time.`, 'error');
                return;
            }
        }

        setIsSaving(true);
        router.post(
            route('shop.settings.pickup-schedule'),
            {
                is_enabled: isEnabled,
                operating_days: operatingDays,
                time_slots: timeSlots,
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

    const selectedLocation = locations.find((l) => String(l.id) === String(pickupLocationId));

    return (
        <div className="bg-white rounded-3xl border border-stone-200/80 p-6 sm:p-8 shadow-xs space-y-6">
            {/* Header with Enable Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-100 pb-5">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-clay-50 text-clay-700 border border-clay-100">
                            <Store size={16} />
                        </div>
                        <h3 className="text-base font-black text-stone-900 tracking-tight">Store Pickup & Scheduling</h3>
                    </div>
                    <p className="text-xs text-stone-500 font-medium mt-1">
                        Control when buyers can pick up orders at your studio, set operating days, and cap pickup volume per window.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-stone-700">
                        {isEnabled ? 'Store Pickup Active' : 'Pickup Disabled'}
                    </span>
                    <button
                        type="button"
                        onClick={() => canEdit && setIsEnabled(!isEnabled)}
                        disabled={!canEdit}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
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
            </div>

            {/* Operating Days */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar size={14} className="text-clay-600" />
                        Available Pickup Days
                    </label>
                    <span className="text-[11px] text-stone-500">
                        {operatingDays.length} day{operatingDays.length === 1 ? '' : 's'} open for pickup
                    </span>
                </div>
                <p className="text-xs text-stone-500">
                    Buyers can only schedule orders on the days your studio is open for pickups.
                </p>

                <div className="grid grid-cols-7 gap-2 pt-1">
                    {DAYS_OF_WEEK.map((day) => {
                        const active = operatingDays.includes(day.id);
                        return (
                            <button
                                key={day.id}
                                type="button"
                                onClick={() => toggleDay(day.id)}
                                disabled={!canEdit || !isEnabled}
                                className={`flex flex-col items-center justify-center py-2.5 rounded-xl text-xs font-bold transition-all border ${
                                    active && isEnabled
                                        ? 'bg-clay-600 text-white border-clay-600 shadow-xs'
                                        : 'bg-stone-50 text-stone-600 border-stone-200/80 hover:bg-stone-100 hover:text-stone-900'
                                } ${!canEdit || !isEnabled ? 'opacity-60 cursor-not-allowed' : 'active:scale-95'}`}
                            >
                                <span className="text-[11px] font-medium opacity-80 sm:hidden">{day.label}</span>
                                <span className="hidden sm:inline text-xs">{day.full}</span>
                                {active && isEnabled && <Check size={12} className="mt-1" />}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Time Slot Windows */}
            <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Clock size={14} className="text-clay-600" />
                        Pickup Time Windows & Capacity
                    </label>
                    {canEdit && isEnabled && (
                        <button
                            type="button"
                            onClick={addSlot}
                            className="inline-flex items-center gap-1 text-xs font-bold text-clay-700 hover:text-clay-800 transition"
                        >
                            <Plus size={14} /> Add Window
                        </button>
                    )}
                </div>
                <p className="text-xs text-stone-500">
                    Set available time slots for buyers. When a window reaches its order cap for a given date, it is marked as full.
                </p>

                <div className="space-y-2.5 pt-1">
                    {timeSlots.map((slot, index) => (
                        <div
                            key={slot.id || index}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80"
                        >
                            <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3 items-center">
                                <div>
                                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
                                        Start Time
                                    </label>
                                    <input
                                        type="time"
                                        value={slot.start_time}
                                        disabled={!canEdit || !isEnabled}
                                        onChange={(e) => updateSlot(index, 'start_time', e.target.value)}
                                        className="w-full text-xs font-bold text-stone-800 rounded-lg border-stone-300 bg-white shadow-xs focus:border-clay-500 focus:ring-clay-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
                                        End Time
                                    </label>
                                    <input
                                        type="time"
                                        value={slot.end_time}
                                        disabled={!canEdit || !isEnabled}
                                        onChange={(e) => updateSlot(index, 'end_time', e.target.value)}
                                        className="w-full text-xs font-bold text-stone-800 rounded-lg border-stone-300 bg-white shadow-xs focus:border-clay-500 focus:ring-clay-500"
                                    />
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
                                        Max Pickups
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="50"
                                        value={slot.max_capacity}
                                        disabled={!canEdit || !isEnabled}
                                        onChange={(e) => updateSlot(index, 'max_capacity', Math.max(1, Number(e.target.value)))}
                                        className="w-full text-xs font-bold text-stone-800 rounded-lg border-stone-300 bg-white shadow-xs focus:border-clay-500 focus:ring-clay-500"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-200/60">
                                <span className="text-xs font-medium text-stone-600 sm:hidden">
                                    {slot.label} (Cap: {slot.max_capacity})
                                </span>
                                {canEdit && isEnabled && (
                                    <button
                                        type="button"
                                        onClick={() => removeSlot(index)}
                                        className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg hover:bg-white transition"
                                        title="Remove Window"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Advance Booking Window */}
            <div className="space-y-3 pt-2">
                <label className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar size={14} className="text-clay-600" />
                    Advance Reservation Window
                </label>
                <p className="text-xs text-stone-500">
                    How far ahead buyers can reserve their store pickup date.
                </p>
                <select
                    value={maxAdvanceDays}
                    onChange={(e) => setMaxAdvanceDays(Number(e.target.value))}
                    disabled={!canEdit || !isEnabled}
                    className="w-full text-xs font-bold text-stone-800 rounded-xl border-stone-300 bg-white shadow-xs focus:border-clay-500 focus:ring-clay-500"
                >
                    <option value={7}>7 Days (1 Week Ahead)</option>
                    <option value={14}>14 Days (2 Weeks Ahead)</option>
                    <option value={30}>30 Days (1 Month Ahead)</option>
                    <option value={60}>60 Days (2 Months Ahead)</option>
                    <option value={90}>90 Days (3 Months Ahead)</option>
                </select>
            </div>

            {/* Primary Pickup Location */}
            <div className="space-y-3 pt-2">
                <label className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin size={14} className="text-clay-600" />
                    Dedicated Pickup Location
                </label>
                <p className="text-xs text-stone-500">
                    Select which workshop or store location buyers should navigate to for their pickup.
                </p>

                <div className="space-y-2">
                    <select
                        value={pickupLocationId}
                        onChange={(e) => setPickupLocationId(e.target.value)}
                        disabled={!canEdit || !isEnabled}
                        className="w-full text-xs font-bold text-stone-800 rounded-xl border-stone-300 bg-white shadow-xs focus:border-clay-500 focus:ring-clay-500"
                    >
                        <option value="">Primary Shop / Studio Address (Default)</option>
                        {locations.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                                {loc.name} {loc.address ? `— ${loc.address}` : ''}
                            </option>
                        ))}
                    </select>

                    {selectedLocation && (
                        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-stone-50 border border-stone-200/70 text-xs text-stone-600">
                            <MapPin size={14} className="text-clay-600 shrink-0 mt-0.5" />
                            <div>
                                <span className="font-bold text-stone-800">{selectedLocation.name}</span>
                                {selectedLocation.address && <p className="text-stone-500 mt-0.5">{selectedLocation.address}</p>}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Action Bar */}
            {canEdit && (
                <div className="pt-4 flex justify-end">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-clay-600 hover:bg-clay-700 text-white text-xs font-bold transition-all shadow-xs active:scale-[0.98] disabled:opacity-60"
                    >
                        <Save size={14} />
                        {isSaving ? 'Saving Schedule...' : 'Save Pickup Schedule'}
                    </button>
                </div>
            )}
        </div>
    );
}
