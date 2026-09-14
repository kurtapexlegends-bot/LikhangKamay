import React from 'react';
import { Calendar } from 'lucide-react';

export default function OrderDateRangeFilter({
    startDate = '',
    setStartDate,
    endDate = '',
    setEndDate,
    className = '',
}) {
    const applyPreset = (preset) => {
        const now = new Date();
        let start = '';
        let end = '';

        const formatDate = (d) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        if (preset === 'today') {
            start = formatDate(now);
            end = formatDate(now);
        } else if (preset === 'week') {
            const firstDay = new Date(now.setDate(now.getDate() - now.getDay()));
            start = formatDate(firstDay);
            end = formatDate(new Date());
        } else if (preset === 'month') {
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            start = formatDate(firstDay);
            end = formatDate(new Date());
        } else if (preset === 'clear') {
            start = '';
            end = '';
        }

        if (setStartDate) setStartDate(start);
        if (setEndDate) setEndDate(end);
    };

    return (
        <div className={`space-y-2 ${className}`}>
            <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500">
                    Order Placement Date Range
                </label>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => applyPreset('today')}
                        className="text-[10px] font-bold text-stone-500 hover:text-clay-700 px-1.5 py-0.5 rounded hover:bg-stone-100 transition"
                    >
                        Today
                    </button>
                    <button
                        type="button"
                        onClick={() => applyPreset('week')}
                        className="text-[10px] font-bold text-stone-500 hover:text-clay-700 px-1.5 py-0.5 rounded hover:bg-stone-100 transition"
                    >
                        This Week
                    </button>
                    <button
                        type="button"
                        onClick={() => applyPreset('month')}
                        className="text-[10px] font-bold text-stone-500 hover:text-clay-700 px-1.5 py-0.5 rounded hover:bg-stone-100 transition"
                    >
                        This Month
                    </button>
                </div>
            </div>

            <div className="flex items-center bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-clay-100 focus-within:border-clay-500 transition-all h-[42px]">
                <label className="flex flex-1 h-full items-center gap-2 px-3 hover:bg-stone-50 transition cursor-pointer min-h-[42px] min-w-0">
                    <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-stone-400 shrink-0">From</span>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="min-w-0 flex-1 bg-transparent text-xs font-bold text-stone-700 border-none outline-none focus:ring-0 p-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-50 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
                    />
                </label>
                <div className="h-full w-px bg-stone-200 shrink-0"></div>
                <label className="flex flex-1 h-full items-center gap-2 px-3 hover:bg-stone-50 transition cursor-pointer min-h-[42px] min-w-0">
                    <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-stone-400 shrink-0">To</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="min-w-0 flex-1 bg-transparent text-xs font-bold text-stone-700 border-none outline-none focus:ring-0 p-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-50 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
                    />
                </label>
            </div>
        </div>
    );
}
