import React from 'react';
import { Banknote, CheckCircle2, Clock, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import { formatPeso } from '@/utils/hrHelpers';

export default function PayrollRunwayHeader({
    staff = [],
    monthLabel = 'Current Month',
    pendingPayrollCount = 0,
    openPayrollModal,
    canEditHrRecords
}) {
    const totalStaff = staff.length || 0;
    const totalMonthlyBase = staff.reduce((acc, curr) => acc + Number(curr.salary || 0), 0);
    const semiMonthlyGross = totalMonthlyBase / 2;
    const estimatedDeductions = semiMonthlyGross * 0.04;
    const estimatedNet = semiMonthlyGross - estimatedDeductions;

    const clockedInCount = staff.filter(emp => emp.attendance?.current_state === 'clocked_in' || emp.attendance?.open_session).length;

    return (
        <section
            aria-label="Payroll Settlement Runway"
            className="bg-white border border-stone-200/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5"
        >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-clay-700 bg-[#FCF7F2] px-2.5 py-0.5 rounded-full border border-[#E7D8C9]">
                            {monthLabel} Cutoff
                        </span>
                        <span className="text-xs text-stone-500 font-medium">
                            Disbursement Target: Semi-Monthly
                        </span>
                    </div>
                    <h2 className="text-xl font-bold text-stone-900 mt-1">Payroll Settlement Runway</h2>
                    <p className="text-xs text-stone-500 mt-0.5">
                        Cycle Gross: <span className="font-semibold text-stone-700">{formatPeso(semiMonthlyGross)}</span> • Est. Deductions: <span className="font-semibold text-rose-600">-{formatPeso(estimatedDeductions)}</span> • Net Payable: <span className="font-bold text-emerald-700">{formatPeso(estimatedNet)}</span>
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {canEditHrRecords && openPayrollModal && (
                        <button
                            type="button"
                            onClick={openPayrollModal}
                            className="bg-clay-600 hover:bg-clay-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-2xs min-h-[44px]"
                        >
                            <Banknote size={15} />
                            <span>Review & Disburse {formatPeso(estimatedNet)}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* 3-Step Guided Runway Indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {/* Step 1: Attendance Verification */}
                <div className="border border-emerald-200 bg-emerald-50/50 rounded-2xl p-3.5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                        <CheckCircle2 size={16} />
                    </div>
                    <div className="min-w-0">
                        <div className="text-xs font-bold text-emerald-950 truncate">1. Shift Validation</div>
                        <div className="text-[11px] text-emerald-700 font-semibold truncate">
                            {clockedInCount} active floor punches logged
                        </div>
                    </div>
                </div>

                {/* Step 2: Deductions & Overtime */}
                <div className="border border-amber-300 bg-amber-50/50 rounded-2xl p-3.5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-500 text-white font-black text-xs flex items-center justify-center shrink-0">
                        2
                    </div>
                    <div className="min-w-0">
                        <div className="text-xs font-bold text-amber-950 truncate">2. Deductions & OT</div>
                        <div className="text-[11px] text-amber-700 font-semibold truncate">
                            Automatic statutory tiering
                        </div>
                    </div>
                </div>

                {/* Step 3: Payout Disbursement */}
                <div className="border border-stone-200 bg-stone-50 rounded-2xl p-3.5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-stone-300 text-stone-700 font-black text-xs flex items-center justify-center shrink-0">
                        3
                    </div>
                    <div className="min-w-0">
                        <div className="text-xs font-bold text-stone-800 truncate">3. Payout Release</div>
                        <div className="text-[11px] text-stone-500 font-medium truncate">
                            {pendingPayrollCount > 0 ? `${pendingPayrollCount} draft pending` : 'Ready for generation'}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
