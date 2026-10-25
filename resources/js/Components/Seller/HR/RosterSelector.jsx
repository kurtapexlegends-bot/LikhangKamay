import React, { useState, useMemo } from 'react';
import { Eye, CheckCircle2, Calendar } from 'lucide-react';
import { formatPeso } from '@/utils/hrHelpers';

export default function RosterSelector({
    items = [],
    updatePayrollItem,
    onSelectAll,
    onDeselectAll,
    onViewAttendanceLogs
}) {
    const [rosterFilter, setRosterFilter] = useState('all'); // 'all', 'device', 'schedule'

    const filteredItems = useMemo(() => {
        return items.filter((item) => {
            if (rosterFilter === 'device') return !!item.has_attendance_source;
            if (rosterFilter === 'schedule') return !item.has_attendance_source;
            return true;
        });
    }, [items, rosterFilter]);

    const selectedCount = items.filter(i => i.isSelected).length;
    const totalSelectedSalary = items
        .filter(i => i.isSelected)
        .reduce((sum, i) => sum + (Number(i.salary || 0) / 2), 0);

    return (
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Filter Pills & Select All Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-150 pb-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                        type="button"
                        onClick={() => setRosterFilter('all')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                            rosterFilter === 'all'
                                ? 'bg-clay-700 text-white shadow-2xs'
                                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                    >
                        All ({items.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setRosterFilter('device')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                            rosterFilter === 'device'
                                ? 'bg-clay-700 text-white shadow-2xs'
                                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                    >
                        Device Punched ({items.filter(i => i.has_attendance_source).length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setRosterFilter('schedule')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                            rosterFilter === 'schedule'
                                ? 'bg-clay-700 text-white shadow-2xs'
                                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                    >
                        Schedule-Based ({items.filter(i => !i.has_attendance_source).length})
                    </button>
                </div>

                <div className="flex items-center gap-3 text-xs">
                    <span className="text-stone-500 font-semibold">
                        Selected: <strong className="text-stone-900">{selectedCount}</strong> / {items.length} &bull; <strong className="text-clay-800">{formatPeso(totalSelectedSalary)}</strong> base
                    </span>
                    <span className="text-stone-300">|</span>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onSelectAll}
                            className="font-bold text-clay-700 hover:underline cursor-pointer"
                        >
                            Select All
                        </button>
                        <span className="text-stone-300">|</span>
                        <button
                            type="button"
                            onClick={onDeselectAll}
                            className="font-bold text-stone-500 hover:underline cursor-pointer"
                        >
                            Deselect All
                        </button>
                    </div>
                </div>
            </div>

            {/* Employee Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredItems.map((item) => {
                    const originalIndex = items.findIndex(i => i.employee_id === item.employee_id);
                    const isSelected = item.isSelected;
                    const semiMonthlyBase = Number(item.salary || 0) / 2;
                    const isDevicePunched = !!item.has_attendance_source;
                    const daysWorked = Number(item.attendance_days_worked || (isDevicePunched ? 0 : 11));

                    return (
                        <div
                            key={item.employee_id}
                            onClick={() => updatePayrollItem(originalIndex, 'isSelected', !isSelected)}
                            className={`p-4 rounded-3xl border-2 transition-all duration-200 active:scale-[0.99] cursor-pointer select-none space-y-3 ${
                                isSelected
                                    ? 'border-clay-650 bg-[#FCF7F2]/60 shadow-sm ring-2 ring-clay-650/10'
                                    : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/40'
                            }`}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <h4 className="text-xs font-bold text-stone-900 truncate">{item.name}</h4>
                                    <p className="text-[10px] font-bold text-clay-700 mt-0.5">
                                        Semi-Monthly: {formatPeso(semiMonthlyBase)}
                                    </p>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                    isSelected
                                        ? 'bg-clay-100 text-clay-800 border-clay-200'
                                        : 'bg-stone-100 text-stone-500 border-stone-200'
                                }`}>
                                    {isSelected ? 'Included' : 'Excluded'}
                                </span>
                            </div>

                            {/* 11-Day Shift Attendance Mini-Heatmap */}
                            <div className="bg-white/90 p-2.5 rounded-2xl border border-stone-200/80 space-y-1.5 shadow-2xs">
                                <div className="flex items-center justify-between text-[10px] font-semibold text-stone-500">
                                    <span>Attendance</span>
                                    <span className="font-bold text-stone-800">
                                        {isDevicePunched
                                            ? `${daysWorked} / 11 days (Logged)`
                                            : `${daysWorked} / 11 days (Scheduled)`}
                                    </span>
                                </div>
                                <div className="flex gap-1" title={isDevicePunched ? `${daysWorked} shifts logged` : `${daysWorked} scheduled shifts`}>
                                    {[...Array(11)].map((_, i) => (
                                        <div
                                            key={i}
                                            className={`flex-1 h-2 rounded-xs transition-colors ${
                                                i < daysWorked
                                                    ? isDevicePunched
                                                        ? 'bg-emerald-500'
                                                        : 'bg-clay-600'
                                                    : 'bg-stone-200'
                                            }`}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Source Tag & Timecard Action */}
                            <div className="flex items-center justify-between pt-1 border-t border-stone-150/70 text-[10px]">
                                {isDevicePunched ? (
                                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                        <CheckCircle2 size={10} />
                                        <span>Device Punched</span>
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 font-bold text-stone-700 bg-stone-100 px-2 py-0.5 rounded-full border border-stone-200">
                                        <Calendar size={10} />
                                        <span>Schedule-Based</span>
                                    </span>
                                )}

                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (onViewAttendanceLogs) {
                                            onViewAttendanceLogs(item.employee_id);
                                        }
                                    }}
                                    className="inline-flex items-center gap-1 font-bold text-clay-700 hover:text-clay-900 transition bg-clay-50 hover:bg-clay-100/70 px-2.5 py-1 rounded-lg border border-[#E7D8C9]"
                                >
                                    <Eye size={10} />
                                    <span>Timecard</span>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
