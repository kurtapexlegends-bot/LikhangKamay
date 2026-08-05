import React from 'react';
import { X, Calculator, ShieldCheck } from 'lucide-react';

const money = (val) => new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
}).format(Number(val || 0));

export default function PayrollCalculationModal({ isOpen, onClose, employeeItem, breakdown }) {
    if (!isOpen || !employeeItem || !breakdown) return null;

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-stone-900/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-stone-200 px-5 py-3.5 bg-stone-50">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-200 text-stone-700">
                            <Calculator size={16} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-stone-900">{employeeItem.employee_name}</h3>
                            <p className="text-[11px] text-stone-500">{employeeItem.employee_role || 'Staff Member'} &bull; Formula Breakdown</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1.5 text-stone-400 hover:bg-stone-200/60 hover:text-stone-700 transition"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
                    {/* Rate Calculations */}
                    <div className="space-y-1.5">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Rate Formulas</h4>
                        <div className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-1">
                            <div className="flex justify-between py-2">
                                <span className="text-stone-500">Daily Formula:</span>
                                <span className="font-mono font-semibold text-stone-800">{breakdown.formulaText}</span>
                            </div>
                            <div className="flex justify-between py-2">
                                <span className="text-stone-500">Daily Rate:</span>
                                <span className="font-bold text-stone-900">{money(breakdown.dailyRate)}</span>
                            </div>
                            <div className="flex justify-between py-2">
                                <span className="text-stone-500">Hourly Rate (Daily / 8h):</span>
                                <span className="font-bold text-stone-900">{money(breakdown.hourlyRate)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Overtime Multipliers */}
                    <div className="space-y-1.5">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Overtime Premiums</h4>
                        <div className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-1">
                            <div className="flex justify-between py-2">
                                <span className="text-stone-500">Regular OT Rate (1.25x):</span>
                                <span className="font-semibold text-stone-800">{money(breakdown.regularOtRate)}/hr</span>
                            </div>
                            <div className="flex justify-between py-2">
                                <span className="text-stone-500">Rest Day OT Rate (1.69x):</span>
                                <span className="font-semibold text-stone-800">{money(breakdown.restDayOtRate)}/hr</span>
                            </div>
                            <div className="flex justify-between py-2">
                                <span className="text-stone-500">Holiday OT Rate (2.60x):</span>
                                <span className="font-semibold text-stone-800">{money(breakdown.holidayOtRate)}/hr</span>
                            </div>
                        </div>
                    </div>

                    {/* Line Totals Summary */}
                    <div className="space-y-1.5">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Earnings & Deductions Summary</h4>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-center">
                                <span className="text-[9px] text-stone-400 block font-bold uppercase">Base Salary</span>
                                <span className="font-bold text-stone-900 text-xs mt-0.5 block">{money(employeeItem.base_salary)}</span>
                            </div>
                            <div className="p-2.5 rounded-xl border border-emerald-200/80 bg-emerald-50/30 text-center">
                                <span className="text-[9px] text-emerald-600 block font-bold uppercase">Overtime Pay</span>
                                <span className="font-bold text-emerald-800 text-xs mt-0.5 block">+{money(breakdown.totalOtPay)}</span>
                            </div>
                            <div className="p-2.5 rounded-xl border border-rose-200/80 bg-rose-50/30 text-center">
                                <span className="text-[9px] text-rose-600 block font-bold uppercase">Deductions</span>
                                <span className="font-bold text-rose-800 text-xs mt-0.5 block">-{money((breakdown.absenceDeduction || 0) + (breakdown.undertimeDeduction || 0))}</span>
                            </div>
                        </div>
                    </div>

                    {/* Net Formula Result */}
                    <div className="flex items-center justify-between p-3 bg-stone-100 border border-stone-200 rounded-xl">
                        <span className="font-bold text-stone-700 uppercase tracking-wider text-[11px]">Net Calculated Wage</span>
                        <span className="font-bold text-sm text-stone-900">{money(employeeItem.net_pay || breakdown.net)}</span>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-3 bg-stone-50 border-t border-stone-200 flex justify-between items-center text-[11px] text-stone-500">
                    <span className="flex items-center gap-1">
                        <ShieldCheck size={14} className="text-stone-400" />
                        Verified Math Audit
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-1.5 bg-stone-900 text-white rounded-lg font-bold text-xs hover:bg-stone-800 transition"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
