import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Calendar, Clock, MapPin, Store, AlertCircle, Info, ExternalLink, ChevronDown } from 'lucide-react';
import PickupCalendarPopover from './PickupScheduler/PickupCalendarPopover';
import PickupTimeSlotPopover from './PickupScheduler/PickupTimeSlotPopover';
import PickupTimeSlotMatrix from './PickupScheduler/PickupTimeSlotMatrix';

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
        const firstDayDate = new Date(year, month - 1, 1);
        let startDayOfWeek = firstDayDate.getDay();
        startDayOfWeek = startDayOfWeek === 0 ? 7 : startDayOfWeek;

        const daysInMonth = new Date(year, month, 0).getDate();
        const daysLookup = new Map();
        for (const d of days) {
            if (Number(d.year) === Number(year) && Number(d.month) === Number(month)) {
                daysLookup.set(Number(d.day_number), d);
            }
        }

        const cells = [];
        for (let i = 1; i < startDayOfWeek; i++) {
            cells.push({ type: 'empty', key: `empty-${i}` });
        }
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

            {/* Interactive Booking Tiles */}
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
                    <PickupCalendarPopover
                        isDateOpen={isDateOpen}
                        activeMonth={activeMonth}
                        handleMonthChange={handleMonthChange}
                        activeMonthIndex={activeMonthIndex}
                        distinctMonths={distinctMonths}
                        calendarGrid={calendarGrid}
                        selectedDate={selectedDate}
                        handleSelectDateFromCalendar={handleSelectDateFromCalendar}
                        pickupConfig={pickupConfig}
                    />
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
                    <PickupTimeSlotPopover
                        isTimeOpen={isTimeOpen}
                        selectedDayObj={selectedDayObj}
                        selectedSlot={selectedSlot}
                        handleSelectSlotOption={handleSelectSlotOption}
                    />
                </div>
            </div>

            {/* Interactive Visual Time Slot Matrix */}
            <PickupTimeSlotMatrix
                selectedDayObj={selectedDayObj}
                selectedSlot={selectedSlot}
                handleSelectSlotOption={handleSelectSlotOption}
            />

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
