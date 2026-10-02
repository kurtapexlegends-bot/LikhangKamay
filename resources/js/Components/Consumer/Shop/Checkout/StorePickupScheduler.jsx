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
            if (d.year === year && d.month === month) {
                daysLookup.set(d.day_number, d);
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
        <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 shadow-sm space-y-4">
            {/* Header: Title, Icon, Studio Info & Map */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-stone-100">
                <div className="flex items-center gap-3 text-stone-700">
                    <div className="rounded-xl bg-clay-50 p-2 text-clay-700 border border-clay-100">
                        <Store size={18} />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-stone-900">Store Pick Up Schedule</h2>
                        <p className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider">
                            Choose your visit date & time window
                        </p>
                    </div>
                </div>

                {/* Studio Location & Map Link */}
                <div className="flex items-center gap-2 text-xs text-stone-600 bg-stone-50/80 px-3 py-1.5 rounded-xl border border-stone-200/60 self-start sm:self-center">
                    <MapPin size={13} className="text-clay-600 shrink-0" />
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
                            <ExternalLink size={10} />
                        </a>
                    )}
                </div>
            </div>

            {/* Preparation notice if items have lead time */}
            {leadTimeDays > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50/70 border border-amber-200/70 text-xs text-amber-900">
                    <Info size={14} className="text-amber-700 shrink-0" />
                    <span>
                        Includes made-to-order items. Requires <strong>{leadTimeDays}d</strong> prep time. Earliest pickup is <strong>{earliestFormatted}</strong>.
                    </span>
                </div>
            )}

            {/* Interactive Airbnb/Apple Booking Tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative">
                {/* Tile 1: Date Trigger */}
                <div ref={dateContainerRef} className="relative">
                    <button
                        type="button"
                        onClick={() => {
                            setIsDateOpen((prev) => !prev);
                            setIsTimeOpen(false);
                        }}
                        className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 flex items-center justify-between ${
                            isDateOpen
                                ? 'border-clay-600 bg-clay-50/30 ring-4 ring-clay-600/5 shadow-sm'
                                : 'border-stone-200 bg-stone-50/40 hover:bg-stone-50 hover:border-clay-300'
                        }`}
                    >
                        <div className="flex items-start gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-white border border-stone-200 flex items-center justify-center text-clay-700 shrink-0 mt-0.5 shadow-2xs">
                                <Calendar size={15} />
                            </div>
                            <div className="min-w-0">
                                <span className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                                    Pick Up Date
                                </span>
                                <span className="text-xs sm:text-sm font-bold text-stone-900 block truncate">
                                    {selectedDayObj ? selectedDayObj.formatted : 'Select a date'}
                                </span>
                                <span className="text-[10px] font-medium text-stone-500 block truncate">
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

                                    return (
                                        <button
                                            key={cell.key}
                                            type="button"
                                            disabled={!isSelectable}
                                            onClick={() => handleSelectDateFromCalendar(day)}
                                            className={`h-8 w-8 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                                                isSelected
                                                    ? 'bg-clay-600 text-white shadow-xs'
                                                    : isSelectable
                                                    ? 'hover:bg-clay-50 hover:text-clay-800 text-stone-800 active:scale-90'
                                                    : 'text-stone-300 opacity-50 cursor-not-allowed'
                                            }`}
                                        >
                                            {cell.dayNum}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between text-[10px] text-stone-400">
                                <span>• Gray dates are unavailable/closed</span>
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
                        className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 flex items-center justify-between disabled:opacity-60 disabled:cursor-not-allowed ${
                            isTimeOpen
                                ? 'border-clay-600 bg-clay-50/30 ring-4 ring-clay-600/5 shadow-sm'
                                : 'border-stone-200 bg-stone-50/40 hover:bg-stone-50 hover:border-clay-300'
                        }`}
                    >
                        <div className="flex items-start gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-white border border-stone-200 flex items-center justify-center text-clay-700 shrink-0 mt-0.5 shadow-2xs">
                                <Clock size={15} />
                            </div>
                            <div className="min-w-0">
                                <span className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                                    Time Window
                                </span>
                                <span className="text-xs sm:text-sm font-bold text-stone-900 block truncate">
                                    {selectedSlot || 'Select time slot'}
                                </span>
                                <span className="text-[10px] font-medium text-stone-500 block truncate">
                                    {activeSlotObj
                                        ? `${activeSlotObj.remaining_capacity} spot${activeSlotObj.remaining_capacity === 1 ? '' : 's'} available`
                                        : 'Tap to pick time'}
                                </span>
                            </div>
                        </div>

                        <ChevronDown size={15} className={`text-stone-400 transition-transform duration-200 shrink-0 ml-2 ${isTimeOpen ? 'rotate-180 text-clay-600' : ''}`} />
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
