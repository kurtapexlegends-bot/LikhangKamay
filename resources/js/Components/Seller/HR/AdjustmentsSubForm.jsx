import React from 'react';

export default function AdjustmentsSubForm({ item, index, updateItem }) {
    const handleAdd = (field, amount) => {
        const currentVal = Number(item[field] || 0);
        const nextVal = Math.max(0, Math.round((currentVal + amount) * 10) / 10);
        updateItem(index, field, nextVal);
    };

    return (
        <div className="space-y-3.5">
            {/* Quick Adjustment Action Chips (Option 2 Pattern) */}
            <div className="bg-[#FCF7F2]/60 p-3 rounded-2xl border border-[#E7D8C9] space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-clay-700">Quick Adjustments</span>
                    <span className="text-[10px] text-stone-500 font-medium">One-tap cycle increments</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    <button
                        type="button"
                        onClick={() => handleAdd('overtime_hours', 1)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-[#E7D8C9] text-clay-800 text-[11px] font-bold hover:bg-clay-50 active:scale-95 transition cursor-pointer shadow-2xs"
                    >
                        +1h Reg OT
                    </button>
                    <button
                        type="button"
                        onClick={() => handleAdd('overtime_hours', 2)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-[#E7D8C9] text-clay-800 text-[11px] font-bold hover:bg-clay-50 active:scale-95 transition cursor-pointer shadow-2xs"
                    >
                        +2h Reg OT
                    </button>
                    <button
                        type="button"
                        onClick={() => handleAdd('absences_days', 0.5)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-rose-200 text-rose-700 text-[11px] font-bold hover:bg-rose-50 active:scale-95 transition cursor-pointer shadow-2xs"
                    >
                        +0.5d Absence
                    </button>
                    <button
                        type="button"
                        onClick={() => handleAdd('paid_leave_days', 1)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-emerald-700 text-[11px] font-bold hover:bg-emerald-50 active:scale-95 transition cursor-pointer shadow-2xs"
                    >
                        +1d Leave
                    </button>
                    <button
                        type="button"
                        onClick={() => handleAdd('undertime_hours', 0.5)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-amber-800 text-[11px] font-bold hover:bg-amber-50 active:scale-95 transition cursor-pointer shadow-2xs"
                    >
                        +0.5h Undertime
                    </button>
                </div>
            </div>

            {/* Direct Input Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Time-Off Adjustments */}
                <div className="space-y-2.5 bg-stone-50/60 p-3.5 rounded-2xl border border-stone-200/80">
                    <span className="text-[10px] font-bold text-stone-500 block uppercase tracking-wider">Leave & Absence Days</span>
                    <div className="grid grid-cols-2 gap-2.5">
                        <div>
                            <label className="text-[10px] font-bold text-rose-700 block mb-1 uppercase tracking-wider">Unpaid Absences</label>
                            <input
                                type="number"
                                className="w-full rounded-xl border border-rose-200 bg-white p-2 text-xs font-bold text-rose-900 text-center shadow-none focus:border-rose-500 focus:ring-rose-500 min-h-[40px]"
                                value={item.absences_days ?? ''}
                                onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                                onChange={(e) => updateItem(index, 'absences_days', e.target.value === '' ? '' : parseFloat(e.target.value.replace(/-/g, "")))}
                                min="0" max="31" step="0.5"
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-emerald-700 block mb-1 uppercase tracking-wider">Paid Leaves</label>
                            <input
                                type="number"
                                className="w-full rounded-xl border border-emerald-200 bg-white p-2 text-xs font-bold text-emerald-900 text-center shadow-none focus:border-emerald-500 focus:ring-emerald-500 min-h-[40px]"
                                value={item.paid_leave_days ?? ''}
                                onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                                onChange={(e) => updateItem(index, 'paid_leave_days', e.target.value === '' ? '' : parseFloat(e.target.value.replace(/-/g, "")))}
                                min="0" max="31" step="0.5"
                                placeholder="0"
                            />
                        </div>
                    </div>
                </div>

                {/* Overtime & Undertime Adjustments */}
                <div className="space-y-2.5 bg-stone-50/60 p-3.5 rounded-2xl border border-stone-200/80">
                    <span className="text-[10px] font-bold text-stone-500 block uppercase tracking-wider">Hourly Adjustments</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div>
                            <label className="text-[10px] font-bold text-amber-800 block mb-1 uppercase tracking-wider truncate" title="Undertime Hours">Undertime</label>
                            <input
                                type="number"
                                className="w-full rounded-xl border border-amber-200 bg-white p-2 text-xs font-bold text-amber-950 text-center shadow-none focus:border-amber-500 focus:ring-amber-500 min-h-[40px]"
                                value={item.undertime_hours ?? ''}
                                onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                                onChange={(e) => updateItem(index, 'undertime_hours', e.target.value === '' ? '' : parseFloat(e.target.value.replace(/-/g, "")))}
                                min="0" step="0.5"
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-clay-700 block mb-1 uppercase tracking-wider truncate" title="Regular OT Hours">Reg OT</label>
                            <input
                                type="number"
                                className="w-full rounded-xl border border-[#E7D8C9] bg-white p-2 text-xs font-bold text-clay-950 text-center shadow-none focus:border-clay-500 focus:ring-clay-500 min-h-[40px]"
                                value={item.overtime_hours ?? ''}
                                onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                                onChange={(e) => updateItem(index, 'overtime_hours', e.target.value === '' ? '' : parseFloat(e.target.value.replace(/-/g, "")))}
                                min="0" step="0.5"
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-clay-700 block mb-1 uppercase tracking-wider truncate" title="Rest Day OT Hours">Rest OT</label>
                            <input
                                type="number"
                                className="w-full rounded-xl border border-[#E7D8C9] bg-white p-2 text-xs font-bold text-clay-950 text-center shadow-none focus:border-clay-500 focus:ring-clay-500 min-h-[40px]"
                                value={item.rest_day_ot_hours ?? ''}
                                onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                                onChange={(e) => updateItem(index, 'rest_day_ot_hours', e.target.value === '' ? '' : parseFloat(e.target.value.replace(/-/g, "")))}
                                min="0" step="0.5"
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-clay-700 block mb-1 uppercase tracking-wider truncate" title="Holiday OT Hours">Hol OT</label>
                            <input
                                type="number"
                                className="w-full rounded-xl border border-[#E7D8C9] bg-white p-2 text-xs font-bold text-clay-950 text-center shadow-none focus:border-clay-500 focus:ring-clay-500 min-h-[40px]"
                                value={item.holiday_ot_hours ?? ''}
                                onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                                onChange={(e) => updateItem(index, 'holiday_ot_hours', e.target.value === '' ? '' : parseFloat(e.target.value.replace(/-/g, "")))}
                                min="0" step="0.5"
                                placeholder="0"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
