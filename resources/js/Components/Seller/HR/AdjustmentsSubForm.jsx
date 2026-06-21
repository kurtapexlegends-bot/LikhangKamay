import React from 'react';

export default function AdjustmentsSubForm({ item, index, updateItem }) {
    return (
        <div className="grid grid-cols-2 gap-4">
            {/* Time-Off Adjustments */}
            <div className="space-y-3 bg-stone-50/50 p-3.5 rounded-2xl border border-stone-150">
                <span className="text-[9px] font-bold text-stone-400 block uppercase tracking-wider">Leave & Absence Days</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                        <label className="text-[10px] font-bold text-red-650 block mb-1 uppercase tracking-wider">Unpaid Absences</label>
                        <input
                            type="number"
                            className="w-full rounded-xl border border-red-200 bg-white p-2 text-xs font-bold text-red-900 text-center shadow-none focus:border-red-500 focus:ring-red-500 min-h-[40px]"
                            value={item.absences_days ?? ''}
                            onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                            onChange={(e) => updateItem(index, 'absences_days', e.target.value === '' ? '' : parseFloat(e.target.value.replace(/-/g, "")))}
                            min="0" max="31" step="0.5"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-emerald-650 block mb-1 uppercase tracking-wider">Paid Leaves</label>
                        <input
                            type="number"
                            className="w-full rounded-xl border border-emerald-200 bg-white p-2 text-xs font-bold text-emerald-900 text-center shadow-none focus:border-emerald-500 focus:ring-emerald-500 min-h-[40px]"
                            value={item.paid_leave_days ?? ''}
                            onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                            onChange={(e) => updateItem(index, 'paid_leave_days', e.target.value === '' ? '' : parseFloat(e.target.value.replace(/-/g, "")))}
                            min="0" max="31" step="0.5"
                        />
                    </div>
                </div>
            </div>

            {/* Overtime & Undertime Adjustments */}
            <div className="space-y-3 bg-[#FCF7F2]/40 p-3.5 rounded-2xl border border-[#E7D8C9]/60">
                <span className="text-[9px] font-bold text-clay-600 block uppercase tracking-wider">Hourly Adjustments</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="col-span-1">
                        <label className="text-[10px] font-bold text-orange-650 block mb-1 uppercase tracking-wider truncate" title="Undertime Hours">Undertime</label>
                        <input
                            type="number"
                            className="w-full rounded-xl border border-orange-200 bg-white p-2 text-xs font-bold text-orange-900 text-center shadow-none focus:border-orange-500 focus:ring-orange-500 min-h-[40px]"
                            value={item.undertime_hours ?? ''}
                            onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                            onChange={(e) => updateItem(index, 'undertime_hours', e.target.value === '' ? '' : parseFloat(e.target.value.replace(/-/g, "")))}
                            min="0" step="0.5"
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
                        />
                    </div>
                </div>
                <p className="text-[8px] text-stone-500 mt-1">Hint: Enter hours as decimals (e.g. 1.5 = 1 hour 30 mins, 2.25 = 2 hours 15 mins)</p>
            </div>
        </div>
    );
}
