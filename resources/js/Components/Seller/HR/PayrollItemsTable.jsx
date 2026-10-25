import React, { useState } from 'react';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';

const money = (value) => new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
}).format(Number(value || 0));

export const getBreakdown = (item) => {
    if (!item.meta) {
        const base = Number(item.base_salary || 0);
        const daily = base / 22;
        const hourly = daily / 8;
        return {
            dailyRate: daily,
            hourlyRate: hourly,
            formulaText: `₱${base.toLocaleString()} / 22 (Fallback)`,
            regularOtRate: hourly * 1.25,
            restDayOtRate: hourly * 1.69,
            holidayOtRate: hourly * 2.60,
            regularOtPay: Number(item.overtime_pay || 0),
            restDayOtPay: Number(item.rest_day_ot_pay || 0),
            holidayOtPay: Number(item.holiday_ot_pay || 0),
            totalOtPay: Number(item.overtime_pay || 0) + Number(item.rest_day_ot_pay || 0) + Number(item.holiday_ot_pay || 0),
            absenceDeduction: Number(item.absence_deduction || 0),
            undertimeDeduction: Number(item.undertime_deduction || 0),
            net: Number(item.net_pay || 0)
        };
    }

    const meta = item.meta;
    const dailyRate = Number(meta.daily_rate || 0);
    const hourlyRate = Number(meta.hourly_rate || 0);
    
    let formulaText = '';
    if (meta.factor_method === '261') {
        formulaText = `(₱${Number(item.base_salary).toLocaleString()} * 12) / 261`;
    } else if (meta.factor_method === '313') {
        formulaText = `(₱${Number(item.base_salary).toLocaleString()} * 12) / 313`;
    } else {
        formulaText = `₱${Number(item.base_salary).toLocaleString()} / ${meta.working_days || 22}`;
    }

    const regularOtRate = hourlyRate * Number(meta.overtime_multiplier || 1.25);
    const restDayOtRate = hourlyRate * Number(meta.rest_day_ot_multiplier || 1.69);
    const holidayOtRate = hourlyRate * Number(meta.holiday_ot_multiplier || 2.60);

    const regularOtPay = Number(item.overtime_pay || 0);
    const restDayOtPay = Number(item.rest_day_ot_pay || 0);
    const holidayOtPay = Number(item.holiday_ot_pay || 0);
    const totalOtPay = regularOtPay + restDayOtPay + holidayOtPay;

    const absenceDeduction = Number(item.absence_deduction || 0);
    const undertimeDeduction = Number(item.undertime_deduction || 0);

    return {
        dailyRate,
        hourlyRate,
        formulaText,
        regularOtRate,
        restDayOtRate,
        holidayOtRate,
        regularOtPay,
        restDayOtPay,
        holidayOtPay,
        totalOtPay,
        absenceDeduction,
        undertimeDeduction,
        net: Number(item.net_pay || 0)
    };
};

export default function PayrollItemsTable({ items = [], onViewPayslip }) {
    const [expandedRows, setExpandedRows] = useState({});

    const toggleRow = (id) => {
        setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
    };

    if (items.length === 0) {
        return (
            <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center text-xs text-stone-500">
                No employees included in this payroll run.
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-stone-200 bg-white shadow-2xs overflow-hidden">
            <div className="border-b border-stone-150 bg-[#FAF8F5] px-5 py-3.5 flex items-center justify-between">
                <div>
                    <h2 className="text-sm font-bold text-stone-900">Employee Breakdown</h2>
                    <p className="text-xs text-stone-500">{items.length} line item{items.length === 1 ? '' : 's'}</p>
                </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                    <thead>
                        <tr className="border-b border-stone-200/80 bg-stone-50/60 text-[10px] font-bold uppercase tracking-wider text-stone-500">
                            <th className="py-3 px-5">Employee</th>
                            <th className="py-3 px-5">Base Salary</th>
                            <th className="py-3 px-5">Attendance</th>
                            <th className="py-3 px-5">Overtime</th>
                            <th className="py-3 px-5">Deductions</th>
                            <th className="py-3 px-5">Net Pay</th>
                            <th className="py-3 px-5 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                        {items.map((item) => {
                            const breakdown = getBreakdown(item);
                            const isExpanded = !!expandedRows[item.id];
                            const totalDeductions = breakdown.absenceDeduction + breakdown.undertimeDeduction;
                            const initials = (item.employee_name || 'E')
                                .split(' ')
                                .map(n => n[0])
                                .slice(0, 2)
                                .join('')
                                .toUpperCase();

                            return (
                                <React.Fragment key={item.id}>
                                    <tr className={`hover:bg-stone-50/60 transition ${isExpanded ? 'bg-stone-50/40' : ''}`}>
                                        <td className="py-3.5 px-5">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-clay-50 text-[11px] font-bold text-clay-800 border border-clay-200/60">
                                                    {initials}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-stone-900 text-xs truncate">{item.employee_name}</p>
                                                    {item.employee_role && (
                                                        <p className="text-[11px] text-stone-500 truncate">{item.employee_role}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-5 font-semibold text-stone-900">
                                            {money(item.base_salary)}
                                        </td>
                                        <td className="py-3.5 px-5 text-stone-700">
                                            <div>{item.days_worked || 11}d worked</div>
                                            {Number(item.absences_days || 0) > 0 && (
                                                <div className="text-[10px] text-rose-600 font-medium">
                                                    {item.absences_days}d absence
                                                </div>
                                            )}
                                            {Number(item.paid_leave_days || 0) > 0 && (
                                                <div className="text-[10px] text-emerald-600 font-medium">
                                                    {item.paid_leave_days}d paid leave
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-5">
                                            {breakdown.totalOtPay > 0 ? (
                                                <div>
                                                    <span className="font-bold text-emerald-700">+{money(breakdown.totalOtPay)}</span>
                                                    <div className="text-[10px] text-stone-500">
                                                        {item.overtime_hours > 0 && `${item.overtime_hours}h Reg`}
                                                        {item.rest_day_ot_hours > 0 && ` • ${item.rest_day_ot_hours}h Rest`}
                                                        {item.holiday_ot_hours > 0 && ` • ${item.holiday_ot_hours}h Hol`}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-stone-400">&mdash;</span>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-5">
                                            {totalDeductions > 0 ? (
                                                <div>
                                                    <span className="font-bold text-rose-700">-{money(totalDeductions)}</span>
                                                    <div className="text-[10px] text-stone-500">
                                                        {breakdown.absenceDeduction > 0 && `Abs: ${money(breakdown.absenceDeduction)}`}
                                                        {breakdown.undertimeDeduction > 0 && ` • Und: ${money(breakdown.undertimeDeduction)}`}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-stone-400">&mdash;</span>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-5 font-bold text-stone-900 text-sm">
                                            {money(item.net_pay)}
                                        </td>
                                        <td className="py-3.5 px-5 text-right">
                                            <div className="inline-flex items-center gap-1.5 justify-end">
                                                <button
                                                    type="button"
                                                    onClick={() => onViewPayslip(item)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-[11px] font-bold text-stone-700 transition shadow-2xs cursor-pointer min-h-[32px]"
                                                >
                                                    <FileText size={12} className="text-clay-600" />
                                                    Payslip
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleRow(item.id)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-[11px] font-bold text-stone-600 transition cursor-pointer min-h-[32px]"
                                                >
                                                    {isExpanded ? (
                                                        <>
                                                            <ChevronUp size={12} />
                                                            Hide
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ChevronDown size={12} />
                                                            Audit
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>

                                    {/* Expanded Formula Audit Drawer */}
                                    {isExpanded && (
                                        <tr className="bg-stone-50/50">
                                            <td colSpan={7} className="p-4 border-b border-stone-200">
                                                <div className="rounded-xl border border-stone-200 bg-white p-4 max-w-3xl space-y-3 shadow-2xs">
                                                    <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                                                        <h4 className="font-bold text-stone-900 text-xs">
                                                            Calculation Formula Audit &bull; {item.employee_name}
                                                        </h4>
                                                        <span className="text-[10px] font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                                                            Audited
                                                        </span>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                                        <div className="space-y-1.5">
                                                            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Base Rates</p>
                                                            <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-150 space-y-1 text-[11px]">
                                                                <div className="flex justify-between">
                                                                    <span className="text-stone-500">Daily Formula:</span>
                                                                    <span className="font-mono font-semibold text-stone-800">{breakdown.formulaText}</span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span className="text-stone-500">Daily Rate:</span>
                                                                    <span className="font-bold text-stone-900">{money(breakdown.dailyRate)}</span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span className="text-stone-500">Hourly Rate:</span>
                                                                    <span className="font-bold text-stone-900">{money(breakdown.hourlyRate)}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-1.5">
                                                            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Overtime Multipliers</p>
                                                            <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-150 space-y-1 text-[11px]">
                                                                <div className="flex justify-between">
                                                                    <span className="text-stone-500">Regular OT (1.25x):</span>
                                                                    <span className="font-semibold text-stone-800">{money(breakdown.regularOtRate)}/hr</span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span className="text-stone-500">Rest Day OT (1.69x):</span>
                                                                    <span className="font-semibold text-stone-800">{money(breakdown.restDayOtRate)}/hr</span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span className="text-stone-500">Holiday OT (2.60x):</span>
                                                                    <span className="font-semibold text-stone-800">{money(breakdown.holidayOtRate)}/hr</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between bg-stone-100/70 border border-stone-200/80 p-3 rounded-xl text-xs">
                                                        <div className="flex items-center gap-4 text-stone-600">
                                                            <span>Base: <strong className="text-stone-900">{money(item.base_salary)}</strong></span>
                                                            <span>+ OT: <strong className="text-emerald-700">+{money(breakdown.totalOtPay)}</strong></span>
                                                            <span>- Deductions: <strong className="text-rose-700">-{money(totalDeductions)}</strong></span>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-[10px] uppercase font-bold text-stone-400 mr-2">Net Pay:</span>
                                                            <span className="font-bold text-sm text-stone-900">{money(item.net_pay)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card List View (< lg) */}
            <div className="block lg:hidden divide-y divide-stone-100 p-3 bg-stone-50/30">
                {items.map((item) => {
                    const breakdown = getBreakdown(item);
                    const isExpanded = !!expandedRows[item.id];
                    const totalDeductions = breakdown.absenceDeduction + breakdown.undertimeDeduction;

                    return (
                        <div key={item.id} className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-2xs space-y-3 mb-3 last:mb-0">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <h4 className="font-bold text-stone-900 text-sm">{item.employee_name}</h4>
                                    {item.employee_role && (
                                        <p className="text-xs text-stone-500">{item.employee_role}</p>
                                    )}
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] text-stone-400 uppercase font-bold block">Net Pay</span>
                                    <span className="text-base font-bold text-stone-900">{money(item.net_pay)}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-stone-100">
                                <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-150">
                                    <span className="text-[10px] text-stone-400 font-bold uppercase block">Base Salary</span>
                                    <span className="font-bold text-stone-800">{money(item.base_salary)}</span>
                                </div>
                                <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-150">
                                    <span className="text-[10px] text-stone-400 font-bold uppercase block">Attendance</span>
                                    <span className="font-bold text-stone-800">{item.days_worked || 11}d worked</span>
                                </div>
                                <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-150">
                                    <span className="text-[10px] text-stone-400 font-bold uppercase block">Overtime</span>
                                    <span className="font-bold text-emerald-700">+{money(breakdown.totalOtPay)}</span>
                                </div>
                                <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-150">
                                    <span className="text-[10px] text-stone-400 font-bold uppercase block">Deductions</span>
                                    <span className="font-bold text-rose-700">-{money(totalDeductions)}</span>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => onViewPayslip(item)}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-clay-50 hover:bg-clay-100 border border-clay-200/60 text-xs font-bold text-clay-700 transition min-h-[40px] cursor-pointer"
                                >
                                    <FileText size={13} />
                                    Payslip
                                </button>
                                <button
                                    type="button"
                                    onClick={() => toggleRow(item.id)}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-xs font-bold text-stone-700 transition min-h-[40px] cursor-pointer"
                                >
                                    {isExpanded ? (
                                        <>
                                            <ChevronUp size={13} />
                                            Hide
                                        </>
                                    ) : (
                                        <>
                                            <ChevronDown size={13} />
                                            Audit Formula
                                        </>
                                    )}
                                </button>
                            </div>

                            {isExpanded && (
                                <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-3 text-xs space-y-2 mt-2">
                                    <p className="text-[10px] font-bold uppercase text-stone-400">Formula Details</p>
                                    <div className="space-y-1 text-[11px]">
                                        <div className="flex justify-between">
                                            <span className="text-stone-500">Daily Formula:</span>
                                            <span className="font-mono font-semibold">{breakdown.formulaText}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-stone-500">Daily Rate:</span>
                                            <span className="font-bold">{money(breakdown.dailyRate)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-stone-500">Hourly Rate:</span>
                                            <span className="font-bold">{money(breakdown.hourlyRate)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-stone-500">Reg OT:</span>
                                            <span>{money(breakdown.regularOtRate)}/hr</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
