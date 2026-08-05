import React, { useState } from 'react';
import { Users, CheckCircle2, AlertTriangle, Calculator } from 'lucide-react';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import {
    formatMoney,
    formatDate,
    formatRole
} from '@/utils/accountingFormatters';
import PayrollCalculationModal from '@/Components/Seller/HR/PayrollCalculationModal';

export default function PayrollReviewDetails({ item, inline = false }) {
    const [selectedAuditItem, setSelectedAuditItem] = useState(null);
    const isSufficient = Number(item?.fund_snapshot?.remaining_balance ?? 0) >= 0;

    const getBreakdown = (line) => {
        const base = Number(line.base_salary || 0);
        const daily = line.meta?.daily_rate ? Number(line.meta.daily_rate) : base / 22;
        const hourly = line.meta?.hourly_rate ? Number(line.meta.hourly_rate) : daily / 8;
        return {
            dailyRate: daily,
            hourlyRate: hourly,
            formulaText: line.meta?.factor_method ? `(${base.toLocaleString()} * 12) / ${line.meta.factor_method}` : `₱${base.toLocaleString()} / 22`,
            regularOtRate: hourly * Number(line.meta?.overtime_multiplier || 1.25),
            restDayOtRate: hourly * Number(line.meta?.rest_day_ot_multiplier || 1.69),
            holidayOtRate: hourly * Number(line.meta?.holiday_ot_multiplier || 2.60),
            regularOtPay: Number(line.overtime_pay || 0),
            totalOtPay: Number(line.overtime_pay || 0) + Number(line.rest_day_ot_pay || 0) + Number(line.holiday_ot_pay || 0),
            absenceDeduction: Number(line.absence_deduction || line.deductions || 0),
            undertimeDeduction: Number(line.undertime_deduction || 0),
            net: Number(line.net_pay || 0)
        };
    };

    return (
        <div className="space-y-4">
            {/* Executive Summary Header — 3 High-Level Metrics */}
            <div className="rounded-xl border border-stone-200 bg-white shadow-xs overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 bg-stone-50/80 border-b border-stone-200">
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-200 text-stone-700 font-bold text-xs">
                            <Users size={15} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-stone-900">{item.requester?.name || 'Seller Owner'}</p>
                            <p className="text-[11px] text-stone-500">
                                {formatRole(item.requester?.role)} &bull; Submitted {formatDate(item.created_at)}
                            </p>
                        </div>
                    </div>

                    <div>
                        {isSufficient ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                                <CheckCircle2 size={13} />
                                Sufficient Treasury Balance
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold">
                                <AlertTriangle size={13} />
                                Insufficient Treasury Funds
                            </span>
                        )}
                    </div>
                </div>

                {/* 3 Executive Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-stone-100 bg-white">
                    <div className="p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">1. Total Payroll Payout</p>
                        <p className="mt-1 text-lg font-bold text-stone-900">{formatMoney(item.amount)}</p>
                    </div>

                    <div className="p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">2. Staff Included</p>
                        <p className="mt-1 text-lg font-bold text-stone-900">{item.employee_count} Employees</p>
                    </div>

                    <div className="p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">3. Net Treasury Impact</p>
                        <p className={`mt-1 text-lg font-bold ${!isSufficient ? 'text-rose-600' : 'text-stone-900'}`}>
                            {formatMoney(item.fund_snapshot?.remaining_balance)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Employee Line Ledger Table */}
            <div className="rounded-xl border border-stone-200 bg-white shadow-xs overflow-hidden">
                <div className="px-5 py-3 border-b border-stone-200 bg-stone-50/50 flex items-center justify-between">
                    <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">Employee Line Ledger</h4>
                    {item.line_items?.length > 0 && (
                        <span className="text-[11px] font-bold text-stone-600 bg-white px-2.5 py-0.5 rounded border border-stone-200">
                            {item.line_items.length} Employees
                        </span>
                    )}
                </div>

                <div className="overflow-x-auto">
                    {!item.line_items || item.line_items.length === 0 ? (
                        <div className="py-8">
                            <WorkspaceEmptyState
                                compact
                                icon={Users}
                                title="No employees found"
                                description="This payroll request contains no line items."
                            />
                        </div>
                    ) : (
                        <table className="w-full min-w-[600px] text-left border-collapse">
                            <thead>
                                <tr className="border-b border-stone-200 text-[10px] font-bold uppercase tracking-wider text-stone-500 bg-stone-50/80">
                                    <th className="px-4 py-2.5 font-bold">Employee</th>
                                    <th className="px-4 py-2.5 text-right font-bold">Base Salary</th>
                                    <th className="px-4 py-2.5 text-right font-bold text-stone-600">Deductions</th>
                                    <th className="px-4 py-2.5 text-right font-bold text-stone-600">Overtime</th>
                                    <th className="px-4 py-2.5 text-right font-bold text-stone-900">Net Payout</th>
                                    <th className="px-4 py-2.5 text-center font-bold">Audit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                                {item.line_items.map((line) => (
                                    <tr key={line.id} className="text-xs font-medium text-stone-700 hover:bg-stone-50/70 transition">
                                        <td className="px-4 py-3 font-bold text-stone-900">
                                            {line.employee_name}
                                        </td>
                                        <td className="px-4 py-3 text-right text-stone-600">{formatMoney(line.base_salary)}</td>
                                        <td className="px-4 py-3 text-right text-stone-700 font-medium">
                                            {Number(line.deductions) > 0 ? `-${formatMoney(line.deductions)}` : formatMoney(0)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-stone-700 font-medium">
                                            {Number(line.overtime_pay) > 0 ? `+${formatMoney(line.overtime_pay)}` : formatMoney(0)}
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-stone-900 bg-stone-50/30">
                                            {formatMoney(line.net_pay)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedAuditItem(line)}
                                                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-stone-100 hover:bg-stone-200 text-[10px] font-bold text-stone-700 transition"
                                                title="View calculation formula audit"
                                            >
                                                <Calculator size={12} />
                                                Formula
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Audit Formula Modal */}
            {selectedAuditItem && (
                <PayrollCalculationModal
                    isOpen={Boolean(selectedAuditItem)}
                    onClose={() => setSelectedAuditItem(null)}
                    employeeItem={selectedAuditItem}
                    breakdown={getBreakdown(selectedAuditItem)}
                />
            )}
        </div>
    );
}
