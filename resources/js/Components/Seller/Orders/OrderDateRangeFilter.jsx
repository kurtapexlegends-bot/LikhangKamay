import React from 'react';
import { Calendar } from 'lucide-react';
import DatePicker from '@/Components/DatePicker';

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

            <div className="grid grid-cols-2 gap-2">
                <DatePicker
                    prefix="From"
                    value={startDate}
                    onChange={setStartDate}
                    placeholder="Start date"
                    maxDate={endDate || undefined}
                />
                <DatePicker
                    prefix="To"
                    value={endDate}
                    onChange={setEndDate}
                    placeholder="End date"
                    minDate={startDate || undefined}
                    align="right"
                />
            </div>
        </div>
    );
}
