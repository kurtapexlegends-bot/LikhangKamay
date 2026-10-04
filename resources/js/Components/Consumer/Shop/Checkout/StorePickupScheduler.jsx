import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Calendar, Clock, MapPin, Store, Check, AlertCircle, Info, ExternalLink, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

export default function StorePickupScheduler({
    pickupConfig,
    selectedDate,
    selectedSlot,
    onSelectDate,
    onSelectSlot,
    error,
}) {
    const isEnabled = pickupConfig?.pickup_enabled ?? true;
    const location = pickupConfig?.location;
    const days = useMemo(() => pickupConfig?.days || [], [pickupConfig?.days]);
    const leadTimeDays = pickupConfig?.lead_time_days || 0;
    const earliestFormatted = pickupConfig?.earliest_formatted || 'Soon';

    const [isDateOpen, setIsDateOpen] = useState(false);
    const [isTimeOpen, setIsTimeOpen] = useState(false);

    const dateContainerRef = useRef(null);
    const timeContainerRef = useRef(null);

    // Extract distinct year-months from available days
    const distinctMonths = useMemo(() => {
        const map = new Map();
        for (const day of days) {
            const key = `${day.year}-${day.month}`;
            if (!map.has(key)) {
                map.set(key, {
                    key,
                    year: day.year,
                    month: day.month,
                    label: `${day.month_full || day.month_name} ${day.year}`,
                });
            }
        }
        return Array.from(map.values());
    }, [days]);

    // Active viewed month in calendar popup
    const [viewedMonthKey, setViewedMonthKey] = useState(null);

    const selectedDayObj = useMemo(() => days.find((d) => d.date === selectedDate), [days, selectedDate]);
    const defaultMonthKey = selectedDayObj ? `${selectedDayObj.year}-${selectedDayObj.month}` : distinctMonths[0]?.key;
    const currentMonthKey = (viewedMonthKey && distinctMonths.some((m) => m.key === viewedMonthKey))
        ? viewedMonthKey
        : defaultMonthKey;

    const activeMonthIndex = Math.max(0, distinctMonths.findIndex((m) => m.key === currentMonthKey));
    const activeMonth = distinctMonths[activeMonthIndex] || distinctMonths[0];

    // Compute calendar grid cells for activeMonth
    const calendarGrid = useMemo(() => {
        if (!activeMonth) return [];
        const { year, month } = activeMonth;
        // Day 1 of month: ISO day of week (1 = Monday, 7 = Sunday)
        const firstDayDate = new Date(year, month - 1, 1);
        let startDayOfWeek = firstDayDate.getDay(); // 0 is Sunday, 1 is Monday
        startDayOfWeek = startDayOfWeek === 0 ? 7 : startDayOfWeek; // ISO 1..7 (Mon=1, Sun=7)

        const daysInMonth = new Date(year, month, 0).getDate();
        const daysLookup = new Map();
        for (const d of days) {
            if (Number(d.year) === Number(year) && Number(d.month) === Number(month)) {
                daysLookup.set(Number(d.day_number), d);
            }
        }

        const cells = [];
        // Empty cells before start of month
        for (let i = 1; i < startDayOfWeek; i++) {
            cells.push({ type: 'empty', key: `empty-${i}` });
        }
        // Month days
        for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
            const dayData = daysLookup.get(dayNum) || null;
            cells.push({
                type: 'day',
                dayNum,
                dayData,
                key: `day-${dayNum}`,
            });
        }
        return cells;
    }, [activeMonth, days]);

    // Auto-select earliest selectable date and first available slot if none selected
    useEffect(() => {
        if (!isEnabled || days.length === 0) return;

        let targetDate = selectedDate;
        if (!targetDate || !days.some((d) => d.date === targetDate && d.is_selectable)) {
            const firstSelectable = days.find((d) => d.is_selectable);
            if (firstSelectable) {
                targetDate = firstSelectable.date;
                onSelectDate(targetDate);
            }
        }

        const currentDay = days.find((d) => d.date === targetDate);
        if (currentDay && currentDay.slots?.length > 0) {
            const hasValidCurrentSlot = currentDay.slots.some(
                (s) => (s.label === selectedSlot || s.id === selectedSlot) && s.is_available
            );
            if (!hasValidCurrentSlot) {
                const firstAvailableSlot = currentDay.slots.find((s) => s.is_available);
                if (firstAvailableSlot) {
                    onSelectSlot(firstAvailableSlot.label);
                }
            }
        }
    }, [days, isEnabled, selectedDate, selectedSlot, onSelectDate, onSelectSlot]);

    // Close popovers on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dateContainerRef.current && !dateContainerRef.current.contains(event.target)) {
                setIsDateOpen(false);
            }
            if (timeContainerRef.current && !timeContainerRef.current.contains(event.target)) {
                setIsTimeOpen(false);
            }
        };
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setIsDateOpen(false);
                setIsTimeOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const handleSelectDateFromCalendar = (day) => {
        if (!day || !day.is_selectable) return;
        onSelectDate(day.date);

        // Auto select first available slot for this newly selected day
        const availableSlot = day.slots?.find((s) => s.is_available);
        if (availableSlot) {
            onSelectSlot(availableSlot.label);
        } else {
            onSelectSlot('');
        }
        setIsDateOpen(false);
    };

    const handleSelectSlotOption = (slot) => {
        if (!slot || !slot.is_available) return;
        onSelectSlot(slot.label);
        setIsTimeOpen(false);
    };

    const handleMonthChange = (direction) => {
        const nextIdx = activeMonthIndex + direction;
        if (nextIdx < 0 || nextIdx >= distinctMonths.length) return;
        const targetMonth = distinctMonths[nextIdx];
        if (targetMonth) {
            setViewedMonthKey(targetMonth.key);
        }
    };

    if (!isEnabled) {
        return (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-800 flex items-start gap-2.5">
                <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                    <span className="font-bold block text-stone-900">Store Pickup Currently Unavailable</span>
                    <p className="mt-0.5 text-stone-600">
                        This artisan is currently only accepting standard delivery orders. Please select "Delivery" to proceed.
                    </p>
                </div>
            </div>
        );
    }

    const mapUrl = location?.latitude && location?.longitude
        ? `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
        : null;

    const activeSlotObj = selectedDayObj?.slots?.find(
        (s) => s.label === selectedSlot || s.id === selectedSlot
    );

    return (
        <div className="rounded-2xl border border-stone-200 bg-white p-3.5 sm:p-4 shadow-sm space-y-3">
            {/* Header: Title, Icon, Studio Info & Map */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-stone-100">
                <div className="flex items-center gap-2 text-stone-700">
                    <div className="rounded-lg bg-clay-50 p-1.5 text-clay-700 border border-clay-100">
                        <Store size={15} />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-stone-900">Store Pick Up Schedule</h2>
                    </div>
                </div>

                {/* Studio Location & Map Link */}
                <div className="flex items-center gap-1.5 text-xs text-stone-600 bg-stone-50/80 px-2.5 py-1 rounded-lg border border-stone-200/60 self-start sm:self-center">
                    <MapPin size={12} className="text-clay-600 shrink-0" />
                    <span className="font-semibold text-stone-800 truncate max-w-[170px] sm:max-w-[220px]">
                        {location?.name || pickupConfig?.shop_name || 'Artisan Workshop'}
                    </span>
                    {mapUrl && (
                        <a
                            href={mapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-bold text-clay-700 hover:text-clay-900 pl-1.5 border-l border-stone-200 shrink-0 transition"
                        >
                            <span>Map</span>
                            <ExternalLink size={9} />
                        </a>
                    )}
                </div>
            </div>

            {/* Preparation notice if items have lead time */}
            {leadTimeDays > 0 && (
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-amber-50/70 border border-amber-200/70 text-[11px] text-amber-900">
                    <Info size={13} className="text-amber-700 shrink-0" />
                    <span>
                        Includes made-to-order items ({leadTimeDays}d prep). Earliest pickup is <strong>{earliestFormatted}</strong>.
                    </span>
                </div>
            )}

            {/* Interactive Airbnb/Apple Booking Tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 relative">
                {/* Tile 1: Date Trigger */}
                <div ref={dateContainerRef} className="relative">
                    <button
                        type="button"
                        onClick={() => {
                            setIsDateOpen((prev) => !prev);
                            setIsTimeOpen(false);
                        }}
                        className={`w-full text-left p-2.5 sm:p-3 rounded-xl border transition-all duration-200 flex items-center justify-between ${
                            isDateOpen
                                ? 'border-clay-600 bg-clay-50/30 ring-2 ring-clay-600/10 shadow-2xs'
                                : 'border-stone-200 bg-stone-50/40 hover:bg-stone-50 hover:border-clay-300'
                        }`}
                    >
                        <div className="flex items-start gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-white border border-stone-200 flex items-center justify-center text-clay-700 shrink-0 mt-0.5 shadow-2xs">
                                <Calendar size={13} />
                            </div>
                            <div className="min-w-0">
                                <span className="block text-[9.5px] font-bold text-stone-400 uppercase tracking-wider">
                                    Pick Up Date
                                </span>
                                <span className="text-xs sm:text-[13px] font-bold text-stone-900 block truncate">
                                    {selectedDayObj ? selectedDayObj.formatted : 'Select a date'}
                                </span>
                                <span className="text-[9.5px] font-medium text-stone-500 block truncate">
                                    {selectedDayObj?.day_name} • {selectedDate === pickupConfig?.earliest_date ? 'Earliest Available' : 'Tap to change'}
                                </span>
                            </div>
                        </div>

                        <ChevronDown size={15} className={`text-stone-400 transition-transform duration-200 shrink-0 ml-2 ${isDateOpen ? 'rotate-180 text-clay-600' : ''}`} />
                    </button>

                    {/* Popover Calendar */}
                    {isDateOpen && (
                        <div className="absolute top-full left-0 mt-2 z-40 w-full sm:w-[310px] bg-white border border-stone-200 rounded-2xl shadow-xl p-3.5 animate-in fade-in zoom-in-95 duration-150">
                            {/* Month Switcher Header */}
                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-100">
                                <span className="text-xs font-bold text-stone-900">
                                    {activeMonth?.label || 'Select Date'}
                                </span>
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => handleMonthChange(-1)}
                                        disabled={activeMonthIndex <= 0}
                                        className="p-1 rounded-lg text-stone-600 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                                        aria-label="Previous month"
                                    >
                                        <ChevronLeft size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleMonthChange(1)}
                                        disabled={activeMonthIndex >= distinctMonths.length - 1}
                                        className="p-1 rounded-lg text-stone-600 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                                        aria-label="Next month"
                                    >
                                        <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Days of Week Row */}
                            <div className="grid grid-cols-7 text-center text-[10px] font-bold text-stone-400 mb-1">
                                <span>Mo</span>
                                <span>Tu</span>
                                <span>We</span>
                                <span>Th</span>
                                <span>Fr</span>
                                <span>Sa</span>
                                <span>Su</span>
                            </div>

                            {/* Days Grid */}
                            <div className="grid grid-cols-7 gap-1">
                                {calendarGrid.map((cell) => {
                                    if (cell.type === 'empty') {
                                        return <div key={cell.key} className="h-8 w-8" />;
                                    }

                                    const day = cell.dayData;
                                    const isSelectable = day && day.is_selectable;
                                    const isSelected = day && day.date === selectedDate;
                                    const totalRemaining = isSelectable
                                        ? (day.slots?.reduce((sum, s) => sum + (s.is_available ? s.remaining_capacity : 0), 0) || 0)
                                        : 0;
                                    const isAlmostFull = isSelectable && totalRemaining > 0 && totalRemaining <= 2;

                                    return (
                                        <button
                                            key={cell.key}
                                            type="button"
                                            disabled={!isSelectable}
                                            onClick={() => handleSelectDateFromCalendar(day)}
                                            className={`relative h-9 w-9 rounded-xl text-xs font-bold flex flex-col items-center justify-center transition-all ${
                                                isSelected
                                                    ? 'bg-clay-600 text-white shadow-xs'
                                                    : isSelectable
                                                    ? 'hover:bg-clay-50 hover:text-clay-800 text-stone-800 active:scale-95'
                                                    : 'text-stone-300 opacity-50 cursor-not-allowed'
                                            }`}
                                        >
                                            <span className="leading-none">{cell.dayNum}</span>
                                            {isSelectable && (
                                                <span
                                                    className={`mt-1 h-1 w-1 rounded-full ${
                                                        isSelected
                                                            ? 'bg-white'
                                                            : isAlmostFull
                                                            ? 'bg-amber-500'
                                                            : 'bg-emerald-500'
                                                    }`}
                                                />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="mt-3 pt-2.5 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2 text-[10px] text-stone-500">
                                <div className="flex items-center gap-3">
                                    <span className="flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        <span>Available</span>
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                        <span>Filling fast (≤2)</span>
                                    </span>
                                </div>
                                {pickupConfig?.earliest_formatted && (
                                    <span className="font-semibold text-clay-700">Earliest: {pickupConfig.earliest_formatted}</span>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Tile 2: Time Slot Trigger */}
                <div ref={timeContainerRef} className="relative">
                    <button
                        type="button"
                        onClick={() => {
                            setIsTimeOpen((prev) => !prev);
                            setIsDateOpen(false);
                        }}
                        disabled={!selectedDayObj || !selectedDayObj.slots || selectedDayObj.slots.length === 0}
                        className={`w-full text-left p-2.5 sm:p-3 rounded-xl border transition-all duration-200 flex items-center justify-between disabled:opacity-60 disabled:cursor-not-allowed ${
                            isTimeOpen
                                ? 'border-clay-600 bg-clay-50/30 ring-2 ring-clay-600/10 shadow-2xs'
                                : 'border-stone-200 bg-stone-50/40 hover:bg-stone-50 hover:border-clay-300'
                        }`}
                    >
                        <div className="flex items-start gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-white border border-stone-200 flex items-center justify-center text-clay-700 shrink-0 mt-0.5 shadow-2xs">
                                <Clock size={13} />
                            </div>
                            <div className="min-w-0">
                                <span className="block text-[9.5px] font-bold text-stone-400 uppercase tracking-wider">
                                    Time Window
                                </span>
                                <span className="text-xs sm:text-[13px] font-bold text-stone-900 block truncate">
                                    {selectedSlot || 'Select time slot'}
                                </span>
                                <span className="text-[9.5px] font-medium text-stone-500 block truncate">
                                    {activeSlotObj
                                        ? `${activeSlotObj.remaining_capacity} spot${activeSlotObj.remaining_capacity === 1 ? '' : 's'} available`
                                        : 'Tap to pick time'}
                                </span>
                            </div>
                        </div>

                        <ChevronDown size={14} className={`text-stone-400 transition-transform duration-200 shrink-0 ml-2 ${isTimeOpen ? 'rotate-180 text-clay-600' : ''}`} />
                    </button>

                    {/* Popover Time Slot List */}
                    {isTimeOpen && (
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
                    )}
                </div>
            </div>

            {/* Interactive Visual Time Slot Matrix */}
            {selectedDayObj && selectedDayObj.slots && selectedDayObj.slots.length > 0 && (
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
            )}

            {/* Error message */}
            {error && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
}
