import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

/**
 * Helper to parse a "YYYY-MM-DD" string into local Date without UTC offset drift.
 */
function parseLocalDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    const [y, m, d] = parts.map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
}

/**
 * Format local Date to "YYYY-MM-DD" string.
 */
function formatToYMD(date) {
    if (!date) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const POPOVER_WIDTH = 296;
const POPOVER_HEIGHT = 320;

export default function DatePicker({
    value = '',
    onChange,
    minDate = null,
    maxDate = null,
    placeholder = 'Select date',
    prefix = null,
    id,
    name,
    disabled = false,
    className = '',
    align = 'left',
    hasError = false,
}) {
    const triggerRef = useRef(null);
    const popoverRef = useRef(null);
    const [isOpen, setIsOpen] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0, openUpwards: false });

    const selectedDate = useMemo(() => parseLocalDate(value), [value]);
    const minParsed = useMemo(() => parseLocalDate(minDate), [minDate]);
    const maxParsed = useMemo(() => parseLocalDate(maxDate), [maxDate]);

    // Track active month/year in view
    const [viewDate, setViewDate] = useState(() => {
        if (selectedDate) return new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        if (minParsed) return new Date(minParsed.getFullYear(), minParsed.getMonth(), 1);
        const today = new Date();
        return new Date(today.getFullYear(), today.getMonth(), 1);
    });

    useEffect(() => {
        if (selectedDate && !isOpen) {
            setViewDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
        }
    }, [selectedDate, isOpen]);

    // Position calculation with screen boundaries and flip logic
    const updatePosition = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;

        // Auto flip upwards if space below is tighter than popover height
        const openUpwards = spaceBelow < (POPOVER_HEIGHT + 12) && spaceAbove > spaceBelow;

        let top = openUpwards ? rect.top - POPOVER_HEIGHT - 6 : rect.bottom + 6;
        let left = align === 'right' ? rect.right - POPOVER_WIDTH : rect.left;

        // Viewport bounds safety
        if (left < 8) left = 8;
        if (left + POPOVER_WIDTH > window.innerWidth - 8) {
            left = window.innerWidth - POPOVER_WIDTH - 8;
        }
        if (top < 8) top = 8;

        setCoords({ top, left, openUpwards });
    }, [align]);

    useEffect(() => {
        if (!isOpen) return;

        updatePosition();

        const handleScroll = (e) => {
            if (popoverRef.current && popoverRef.current.contains(e.target)) return;
            updatePosition();
        };

        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', handleScroll, true);

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [isOpen, updatePosition]);

    // Click outside and escape handling
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event) => {
            const isClickInTrigger = triggerRef.current && triggerRef.current.contains(event.target);
            const isClickInPopover = popoverRef.current && popoverRef.current.contains(event.target);
            if (!isClickInTrigger && !isClickInPopover) {
                setIsOpen(false);
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    const viewYear = viewDate.getFullYear();
    const viewMonth = viewDate.getMonth();

    const handlePrevMonth = () => {
        setViewDate(new Date(viewYear, viewMonth - 1, 1));
    };

    const handleNextMonth = () => {
        setViewDate(new Date(viewYear, viewMonth + 1, 1));
    };

    const isPrevDisabled = useMemo(() => {
        if (!minParsed) return false;
        const lastDayOfPrevMonth = new Date(viewYear, viewMonth, 0);
        return lastDayOfPrevMonth < minParsed;
    }, [minParsed, viewYear, viewMonth]);

    const isNextDisabled = useMemo(() => {
        if (!maxParsed) return false;
        const firstDayOfNextMonth = new Date(viewYear, viewMonth + 1, 1);
        return firstDayOfNextMonth > maxParsed;
    }, [maxParsed, viewYear, viewMonth]);

    // Compute calendar cells
    const calendarCells = useMemo(() => {
        const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
        const startDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

        const cells = [];
        for (let i = 0; i < startDayOfWeek; i++) {
            cells.push({ key: `blank-${i}`, type: 'empty' });
        }

        const todayYMD = formatToYMD(new Date());
        const selectedYMD = formatToYMD(selectedDate);

        for (let day = 1; day <= daysInMonth; day++) {
            const cellDate = new Date(viewYear, viewMonth, day);
            const ymd = formatToYMD(cellDate);

            const isBeforeMin = minParsed && cellDate < new Date(minParsed.getFullYear(), minParsed.getMonth(), minParsed.getDate());
            const isAfterMax = maxParsed && cellDate > new Date(maxParsed.getFullYear(), maxParsed.getMonth(), maxParsed.getDate());
            const isDisabled = Boolean(isBeforeMin || isAfterMax);

            cells.push({
                key: `day-${ymd}`,
                type: 'day',
                dayNum: day,
                ymd,
                isToday: ymd === todayYMD,
                isSelected: ymd === selectedYMD,
                isDisabled,
            });
        }

        return cells;
    }, [viewYear, viewMonth, selectedDate, minParsed, maxParsed]);

    const handleSelectDay = (ymd) => {
        if (onChange) {
            onChange(ymd);
        }
        setIsOpen(false);
    };

    const handleClear = (e) => {
        e.stopPropagation();
        if (onChange) {
            onChange('');
        }
    };

    const handleTodayClick = () => {
        const today = new Date();
        const todayYMD = formatToYMD(today);
        if (minParsed && today < new Date(minParsed.getFullYear(), minParsed.getMonth(), minParsed.getDate())) return;
        if (maxParsed && today > new Date(maxParsed.getFullYear(), maxParsed.getMonth(), maxParsed.getDate())) return;

        setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
        if (onChange) {
            onChange(todayYMD);
        }
        setIsOpen(false);
    };

    const formattedDisplayValue = useMemo(() => {
        if (!selectedDate) return '';
        return selectedDate.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }, [selectedDate]);

    const toggleOpen = () => {
        if (disabled) return;
        if (!isOpen) {
            updatePosition();
        }
        setIsOpen((prev) => !prev);
    };

    return (
        <div className="relative inline-block w-full">
            {/* Input Trigger Button */}
            <button
                ref={triggerRef}
                type="button"
                id={id}
                name={name}
                disabled={disabled}
                onClick={toggleOpen}
                className={`w-full bg-white border rounded-xl px-3 py-2 text-xs font-semibold text-left transition shadow-2xs flex items-center justify-between gap-2 min-h-[38px] ${
                    hasError 
                        ? 'border-rose-300 ring-1 ring-rose-300' 
                        : isOpen 
                        ? 'border-clay-500 ring-2 ring-clay-500/10' 
                        : 'border-stone-200 hover:border-stone-300'
                } ${disabled ? 'opacity-50 cursor-not-allowed bg-stone-50' : 'cursor-pointer'} ${className}`}
                aria-haspopup="dialog"
                aria-expanded={isOpen}
            >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    {prefix ? (
                        <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-stone-400 shrink-0">
                            {prefix}
                        </span>
                    ) : (
                        <CalendarIcon size={14} className="text-stone-400 shrink-0" />
                    )}
                    <span className={`truncate ${formattedDisplayValue ? 'text-stone-800 font-bold' : 'text-stone-400 font-medium'}`}>
                        {formattedDisplayValue || placeholder}
                    </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    {formattedDisplayValue && !disabled && (
                        <span
                            role="button"
                            tabIndex={0}
                            onClick={handleClear}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleClear(e); }}
                            className="p-1 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100 transition"
                            title="Clear date"
                        >
                            <X size={12} />
                        </span>
                    )}
                </div>
            </button>

            {/* Floating Portal Calendar Popover - Immune to Modal/Sheet overflow clipping */}
            {isOpen && !disabled && typeof document !== 'undefined' && createPortal(
                <div
                    ref={popoverRef}
                    style={{
                        position: 'fixed',
                        top: `${coords.top}px`,
                        left: `${coords.left}px`,
                        width: `${POPOVER_WIDTH}px`,
                        zIndex: 9999,
                    }}
                    className="bg-white border border-stone-200/90 rounded-2xl shadow-2xl p-3 animate-in fade-in zoom-in-95 duration-150 select-none"
                    role="dialog"
                    aria-modal="true"
                >
                    {/* Header: Month & Year Switcher */}
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-100">
                        <span className="text-xs font-extrabold text-stone-900">
                            {MONTH_NAMES[viewMonth]} {viewYear}
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={handlePrevMonth}
                                disabled={isPrevDisabled}
                                className="p-1 rounded-lg text-stone-600 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                                aria-label="Previous month"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <button
                                type="button"
                                onClick={handleNextMonth}
                                disabled={isNextDisabled}
                                className="p-1 rounded-lg text-stone-600 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                                aria-label="Next month"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Weekday Labels */}
                    <div className="grid grid-cols-7 text-center text-[10px] font-bold text-stone-400 mb-1">
                        {WEEKDAYS.map((wd) => (
                            <span key={wd} className="py-0.5">{wd}</span>
                        ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {calendarCells.map((cell) => {
                            if (cell.type === 'empty') {
                                return <div key={cell.key} className="h-8 w-8" />;
                            }

                            return (
                                <button
                                    key={cell.key}
                                    type="button"
                                    disabled={cell.isDisabled}
                                    onClick={() => handleSelectDay(cell.ymd)}
                                    className={`relative h-8 w-8 rounded-xl text-xs font-bold flex items-center justify-center transition-all ${
                                        cell.isSelected
                                            ? 'bg-clay-600 text-white shadow-2xs font-black'
                                            : cell.isDisabled
                                            ? 'text-stone-300 opacity-40 cursor-not-allowed'
                                            : cell.isToday
                                            ? 'text-clay-700 bg-clay-50/70 border border-clay-200/80 hover:bg-clay-100 font-extrabold'
                                            : 'text-stone-700 hover:bg-stone-100 active:scale-95'
                                    }`}
                                >
                                    <span>{cell.dayNum}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Quick Action Shortcuts Footer */}
                    <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center justify-between text-[11px]">
                        <button
                            type="button"
                            onClick={() => {
                                if (onChange) onChange('');
                                setIsOpen(false);
                            }}
                            className="font-bold text-stone-400 hover:text-stone-700 px-1 py-0.5 rounded transition"
                        >
                            Clear
                        </button>
                        <button
                            type="button"
                            onClick={handleTodayClick}
                            className="font-bold text-clay-700 hover:text-clay-900 px-1 py-0.5 rounded transition"
                        >
                            Today
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
