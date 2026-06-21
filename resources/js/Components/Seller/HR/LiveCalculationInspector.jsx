import React from 'react';
import { formatPeso, formatPrecisePeso } from '@/utils/hrHelpers';

export default function LiveCalculationInspector({ item, breakdown, settings }) {
    if (!item || !breakdown) return null;

    const methodLabel = settings.payroll_factor_method === '261' 
        ? '5-Day Factor' 
        : settings.payroll_factor_method === '313' 
        ? '6-Day Factor' 
        : `Custom divisor (${settings.payroll_working_days || 22}d)`;

    return (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
            <div className="border-b border-stone-100 pb-3 flex justify-between items-center">
                <div>
                    <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block">Reviewing Wages</span>
                    <span className="font-bold text-xs text-stone-900 block mt-0.5">{item.name}</span>
                </div>
                <span className="text-[9px] font-bold text-clay-700 bg-clay-50 border border-clay-100 px-2 py-0.5 rounded uppercase">
                    Live Audit
                </span>
            </div>

            {/* Calculations Info */}
            <div className="space-y-3">
                <div className="space-y-2">
                    <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Base Rates ({methodLabel})</span>
                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-100 text-[11px] space-y-1.5">
                        <div className="flex justify-between">
                            <span className="text-stone-500">Divisor Formula:</span>
                            <span className="font-mono text-stone-800">{breakdown.formulaText}</span>
                        </div>
                        <div className="flex justify-between border-b border-stone-200/40 pb-1.5 mb-1.5">
                            <span className="text-stone-500">Resolved Daily Rate:</span>
                            <span className="font-bold text-stone-900">{formatPrecisePeso(breakdown.dailyRate)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-stone-500">Hourly Rate Divisor:</span>
                            <span className="text-stone-850">Daily Rate / 8 hrs</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-stone-500">Resolved Hourly Rate:</span>
                            <span className="font-bold text-stone-900">{formatPrecisePeso(breakdown.hourlyRate)}</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Overtime Premiums (Multipliers)</span>
                    <div className="bg-[#FCF7F2]/70 p-3 rounded-xl border border-[#E7D8C9]/50 text-[11px] space-y-1.5">
                        <div className="flex justify-between">
                            <span className="text-stone-500">Regular OT Rate ({settings.overtime_multiplier || 1.25}x):</span>
                            <span className="font-semibold text-stone-800">{formatPrecisePeso(breakdown.regularOtRate)}/hr</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-stone-500">Rest Day OT Rate ({settings.rest_day_ot_multiplier || 1.69}x):</span>
                            <span className="font-semibold text-stone-800">{formatPrecisePeso(breakdown.restDayOtRate)}/hr</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-stone-500">Holiday OT Rate ({settings.holiday_ot_multiplier || 2.60}x):</span>
                            <span className="font-semibold text-stone-800">{formatPrecisePeso(breakdown.holidayOtRate)}/hr</span>
                        </div>
                    </div>
                </div>

                <div className="border-t border-stone-100 pt-3 space-y-2">
                    <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Calculation Summary</span>
                    <div className="space-y-2">
                        <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-150 flex justify-between items-center">
                            <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">Monthly Salary</span>
                            <span className="text-xs font-bold text-stone-700">{formatPeso(item.salary)}</span>
                        </div>
                        
                        <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100 flex justify-between items-start">
                            <div>
                                <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Overtime Pay</span>
                                <div className="text-[9px] text-stone-400 mt-0.5 space-y-0.5">
                                    {(Number(item.overtime_hours) || 0) > 0 && <div>Reg: {item.overtime_hours}h x {formatPrecisePeso(breakdown.regularOtRate)}</div>}
                                    {(Number(item.rest_day_ot_hours) || 0) > 0 && <div>Rest: {item.rest_day_ot_hours}h x {formatPrecisePeso(breakdown.restDayOtRate)}</div>}
                                    {(Number(item.holiday_ot_hours) || 0) > 0 && <div>Hol: {item.holiday_ot_hours}h x {formatPrecisePeso(breakdown.holidayOtRate)}</div>}
                                </div>
                            </div>
                            <span className="text-xs font-bold text-emerald-700 shrink-0">+{formatPrecisePeso(breakdown.totalOtPay)}</span>
                        </div>

                        <div className="bg-red-50/50 p-2.5 rounded-xl border border-red-100 flex justify-between items-start">
                            <div>
                                <span className="text-[10px] text-red-700 font-bold uppercase tracking-wider">Deductions</span>
                                <div className="text-[9px] text-stone-400 mt-0.5 space-y-0.5">
                                    {(Number(item.absences_days) || 0) > 0 && <div>Absence: {item.absences_days}d x {formatPrecisePeso(breakdown.dailyRate)}</div>}
                                    {(Number(item.undertime_hours) || 0) > 0 && <div>Undertime: {item.undertime_hours}h x {formatPrecisePeso(breakdown.hourlyRate)}</div>}
                                </div>
                            </div>
                            <span className="text-xs font-bold text-red-700 shrink-0">-{formatPrecisePeso(breakdown.absenceDeduction + breakdown.undertimeDeduction)}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-stone-900 text-white p-3 rounded-xl flex items-center justify-between shadow-sm">
                    <div>
                        <span className="text-[8px] font-bold text-stone-400 uppercase tracking-widest block">Estimated Net Salary</span>
                        <span className="text-[9px] text-stone-300 font-semibold block mt-0.5">Salary + OT - Deductions</span>
                    </div>
                    <span className="font-bold text-base text-clay-400 shrink-0">{formatPrecisePeso(breakdown.net)}</span>
                </div>
            </div>
        </div>
    );
}
