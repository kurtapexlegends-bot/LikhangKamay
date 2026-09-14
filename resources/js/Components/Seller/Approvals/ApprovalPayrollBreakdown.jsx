import React from 'react';

const formatMoney = (amount) => {
    if (amount === undefined || amount === null || isNaN(amount)) return '₱0.00';
    return `₱${Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function ApprovalPayrollBreakdown({ payload = {} }) {
    const lineItems = payload.breakdown || payload.line_items || payload.employees || [];

    return (
        <div className="space-y-5">
            {/* Financial Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block mb-1">
                        Total Net Payout
                    </span>
                    <span className="text-lg font-black text-emerald-900">
                        {formatMoney(payload.total_payout || payload.net_total || 0)}
                    </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1">
                        Total Employees
                    </span>
                    <span className="text-lg font-bold text-stone-900">
                        {payload.staff_count || payload.employee_count || lineItems.length || 0} Employees
                    </span>
                </div>

                <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1">
                        Pay Period
                    </span>
                    <span className="text-sm font-bold text-stone-800">
                        {payload.period || payload.month || 'Current Cycle'}
                    </span>
                </div>
            </div>

            {/* Itemized Employee Table */}
            <div>
                <div className="flex items-center justify-between mb-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600">
                        Itemized Employee Breakdown
                    </h4>
                    <span className="text-[11px] text-stone-400 font-medium">
                        {lineItems.length} Record{lineItems.length === 1 ? '' : 's'}
                    </span>
                </div>

                {lineItems.length > 0 ? (
                    <div className="rounded-2xl border border-stone-200 overflow-hidden divide-y divide-stone-100">
                        {lineItems.map((emp, idx) => (
                            <div key={idx} className="p-3.5 bg-white hover:bg-stone-50/60 transition-colors">
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="w-6 h-6 rounded-full bg-clay-100 text-clay-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                                            {idx + 1}
                                        </span>
                                        <span className="text-xs font-bold text-stone-900 truncate">
                                            {emp.name || emp.employee_name || `Employee #${idx + 1}`}
                                        </span>
                                        {emp.role && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 font-medium">
                                                {emp.role}
                                            </span>
                                        )}
                                    </div>

                                    <span className="text-xs font-black text-emerald-800 shrink-0">
                                        {formatMoney(emp.net_pay || emp.salary || emp.amount || 0)}
                                    </span>
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-[11px] text-stone-500 pt-1 border-t border-stone-100/80">
                                    <div>
                                        <span className="text-stone-400 block text-[9px] uppercase">Base Pay</span>
                                        <span>{formatMoney(emp.base_salary || emp.daily_rate || 0)}</span>
                                    </div>
                                    <div>
                                        <span className="text-stone-400 block text-[9px] uppercase">Deductions</span>
                                        <span className="text-rose-600 font-medium">{formatMoney(emp.deductions || emp.undertime || 0)}</span>
                                    </div>
                                    <div>
                                        <span className="text-stone-400 block text-[9px] uppercase">Payout Method</span>
                                        <span className="font-medium text-stone-700">{emp.payment_method || 'Bank Transfer'}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 text-xs text-stone-500 text-center">
                        Standard batch summary submitted without line-item array.
                    </div>
                )}
            </div>
        </div>
    );
}
