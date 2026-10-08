import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function PickupCalendarPopover({
    isDateOpen,
    activeMonth,
    handleMonthChange,
    activeMonthIndex,
    distinctMonths = [],
    calendarGrid = [],
    selectedDate,
    handleSelectDateFromCalendar,
    pickupConfig,
}) {
    if (!isDateOpen) return null;

    return (
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
    );
}
