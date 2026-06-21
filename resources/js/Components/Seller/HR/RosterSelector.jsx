import React from 'react';
import { Sparkles, Eye } from 'lucide-react';
import { formatPeso } from '@/utils/hrHelpers';

export default function RosterSelector({
    items = [],
    updatePayrollItem,
    onSelectAll,
    onDeselectAll,
    onViewAttendanceLogs
}) {
    return (
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="rounded-2xl border border-[#E7D8C9] bg-[#FCF7F2] p-4 text-[11px] leading-relaxed text-clay-700 flex gap-3">
                <Sparkles className="shrink-0 mt-0.5 text-clay-600" size={16} />
                <div>
                    <span className="font-bold">Prefill Sync Active</span>: Absent days, undertime, and overtime are loaded automatically from linked staff work logs for the selected month. Verify the roster selection below to proceed.
                </div>
            </div>

            <div className="flex items-center justify-between border-b border-stone-150 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">Available Employees ({items.length})</h3>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={onSelectAll}
                        className="text-[10px] font-bold text-clay-650 hover:underline"
                    >
                        Select All
                    </button>
                    <span className="text-stone-300">|</span>
                    <button
                        type="button"
                        onClick={onDeselectAll}
                        className="text-[10px] font-bold text-stone-500 hover:underline"
                    >
                        Deselect All
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {items.map((item, index) => {
                    const isSelected = item.isSelected;
                    return (
                        <div
                            key={item.employee_id}
                            onClick={() => updatePayrollItem(index, 'isSelected', !isSelected)}
                            className={`flex items-start gap-4 p-4 rounded-2xl border transition-all duration-300 cursor-pointer select-none ${
                                isSelected
                                    ? 'border-clay-600 bg-[#FCF7F2]/50 shadow-[0_4px_12px_rgba(137,67,45,0.04)]'
                                    : 'border-stone-200 bg-white hover:border-stone-250 hover:bg-stone-50/50'
                            }`}
                        >
                            <input
                                type="checkbox"
                                className="mt-0.5 w-4 h-4 text-clay-600 rounded border-stone-300 focus:ring-clay-500 cursor-pointer pointer-events-none"
                                checked={isSelected}
                                readOnly
                            />
                            <div className="min-w-0 flex-1">
                                <h4 className="text-xs font-bold text-stone-900 truncate">{item.name}</h4>
                                <p className="text-[10px] font-bold text-stone-500 mt-0.5">{formatPeso(item.salary)}</p>
                                
                                <div className="mt-2.5 flex items-center justify-between w-full">
                                    {item.has_attendance_source ? (
                                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-1.5 py-0.5">
                                            Prefilled: {item.attendance_days_worked || 0}d worked
                                        </span>
                                    ) : (
                                        <span className="text-[9px] font-bold text-stone-500 bg-stone-50 border border-stone-150 rounded-md px-1.5 py-0.5">
                                            Manual Entry
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
                                        className="inline-flex items-center gap-1 text-[9px] font-bold text-clay-700 hover:text-clay-800 transition bg-clay-50 hover:bg-[#FCF7F2] border border-[#E7D8C9] rounded-md px-1.5 py-0.5"
                                        title="View attendance logs"
                                    >
                                        <Eye size={10} />
                                        Logs
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
