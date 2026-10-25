import React from 'react';

const money = (value) => new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
}).format(Number(value || 0));

export default function PayrollMetricStrip({ summary, totalAmount }) {
    const basePay = summary?.base_pay || 0;
    const overtime = summary?.overtime || 0;
    const deductions = summary?.deductions || 0;
    const netPay = totalAmount || summary?.net_pay || 0;

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-2xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Gross Base Pay</p>
                <p className="mt-1.5 text-lg font-bold text-stone-900 tracking-tight sm:text-xl">
                    {money(basePay)}
                </p>
                <p className="mt-1 text-[11px] text-stone-500 font-medium">Standard scheduled pay</p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-2xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Overtime Pay</p>
                <p className="mt-1.5 text-lg font-bold text-emerald-700 tracking-tight sm:text-xl">
                    +{money(overtime)}
                </p>
                <p className="mt-1 text-[11px] text-stone-500 font-medium">Regular, rest & holiday</p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-2xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Total Deductions</p>
                <p className="mt-1.5 text-lg font-bold text-rose-700 tracking-tight sm:text-xl">
                    {deductions > 0 ? `-${money(deductions)}` : '₱0.00'}
                </p>
                <p className="mt-1 text-[11px] text-stone-500 font-medium">Absences & undertime</p>
            </div>

            <div className="rounded-2xl border border-clay-200/80 bg-[#FCF7F2] p-4 shadow-2xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-clay-700">Net Pay Disbursed</p>
                <p className="mt-1.5 text-lg font-bold text-clay-900 tracking-tight sm:text-xl">
                    {money(netPay)}
                </p>
                <p className="mt-1 text-[11px] text-clay-600 font-medium">Final calculated total</p>
            </div>
        </div>
    );
}
