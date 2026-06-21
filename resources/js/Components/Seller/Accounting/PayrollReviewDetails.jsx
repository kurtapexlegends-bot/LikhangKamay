import React from 'react';
import { Users } from 'lucide-react';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import {
    formatMoney,
    formatDate,
    formatDateTime,
    formatRole
} from '@/utils/accountingFormatters';

export default function PayrollReviewDetails({ item, inline = false }) {
    return (
        <>
            {/* Financial summary metrics */}
            <div className="rounded-[1.5rem] bg-stone-900 text-white shadow-lg overflow-hidden relative">
                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-white/5 rounded-full blur-3xl pointer-events-none" />
                <div className="p-6 relative z-10">
                    <div className={`flex flex-col gap-6 ${inline ? 'w-full' : 'md:flex-row md:items-start md:justify-between'}`}>
                        {/* Requester Info */}
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Payroll Requester</p>
                            <div className="mt-2 flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center border border-white/5">
                                    <Users size={16} className="text-stone-300" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">{item.requester?.name || 'Seller owner'}</p>
                                    <p className="text-[11px] font-medium text-stone-400 mt-0.5">
                                        {formatRole(item.requester?.role)} &bull; Submitted {formatDate(item.created_at)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Prominent KPI Metrics */}
                        <div className={`flex gap-6 bg-white/5 rounded-2xl p-4 border border-white/10 shrink-0 ${inline ? 'w-full justify-between' : ''}`}>
                            <div className={inline ? 'flex-1' : ''}>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Total Disbursed</p>
                                <p className="mt-1 text-xl font-bold tracking-tight text-emerald-400 whitespace-nowrap">{formatMoney(item.amount)}</p>
                            </div>
                            <div className="w-px bg-white/10" />
                            <div className={inline ? 'flex-1 pl-4' : ''}>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Employees</p>
                                <p className="mt-1 text-xl font-bold tracking-tight text-white">{item.employee_count}</p>
                            </div>
                        </div>
                    </div>

                    {/* Treasury Check */}
                    <div className={`mt-6 pt-6 border-t border-white/10 grid gap-6 ${inline ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`}>
                        <div>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400">Current Balance</p>
                            <p className="mt-1 text-[15px] font-bold tracking-tight text-white whitespace-nowrap">{formatMoney(item.fund_snapshot?.available_balance)}</p>
                        </div>
                        <div>
                            <p className={`text-[9px] font-bold uppercase tracking-widest ${Number(item.fund_snapshot?.remaining_balance) < 0 ? 'text-red-400' : 'text-emerald-400'}`}>After Release</p>
                            <p className={`mt-1 text-[15px] font-bold tracking-tight whitespace-nowrap ${Number(item.fund_snapshot?.remaining_balance) < 0 ? 'text-red-400' : 'text-emerald-400'}`}>{formatMoney(item.fund_snapshot?.remaining_balance)}</p>
                        </div>
                        {item.activity?.last_reviewed_at && (
                            <div className={`col-span-2 ${inline ? 'col-span-2 border-t border-white/5 pt-4 mt-2' : 'md:col-span-1 md:text-right'}`}>
                                <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400">Reviewed Status</p>
                                <p className="mt-1 text-[11px] font-medium text-stone-300">{formatDateTime(item.activity.last_reviewed_at)}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Detailed employee line ledger breakdown */}
            <div className="rounded-[1.5rem] border border-stone-200 bg-white shadow-sm overflow-hidden mt-6">
                <div className="px-6 py-5 border-b border-stone-100 bg-[#FDFBF9]">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-stone-800">Detailed Ledger Breakdown</p>
                    <p className="mt-1 text-[12px] font-medium text-stone-500">Employee specific deductions and runtime pay</p>
                </div>

                <div className="overflow-x-auto">
                    {!item.line_items || item.line_items.length === 0 ? (
                        <div className="py-12">
                            <WorkspaceEmptyState
                                compact
                                icon={Users}
                                title="No employees found"
                                description="This payroll request contains no line items."
                            />
                        </div>
                    ) : (
                        <table className="w-full min-w-[500px] text-left border-collapse">
                            <thead>
                                <tr className="border-b border-stone-200 text-[10px] font-bold uppercase tracking-widest text-stone-500 bg-stone-50/50">
                                    <th className="px-4 py-4 sticky left-0 bg-stone-50/95 backdrop-blur z-10 border-r border-stone-100">Employee</th>
                                    <th className="px-3 py-4 text-right">Base Salary</th>
                                    <th className="px-3 py-4 text-right text-rose-500">Deductions</th>
                                    <th className="px-3 py-4 text-right text-emerald-600">OT Pay</th>
                                    <th className="px-4 py-4 text-right text-emerald-800 bg-emerald-50/30">Net Release</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                                {item.line_items.map((line) => (
                                    <tr
                                        key={line.id}
                                        className="text-[13px] font-medium text-stone-600 transition-all hover:bg-stone-50 group border-l-2 border-transparent hover:border-emerald-500"
                                    >
                                        <td className="px-4 py-4 font-bold text-stone-900 sticky left-0 bg-white group-hover:bg-stone-50 transition-colors z-10 border-r border-stone-100">
                                            {line.employee_name}
                                        </td>
                                        <td className="px-3 py-4 text-right whitespace-nowrap">{formatMoney(line.base_salary)}</td>
                                        <td className="px-3 py-4 text-right text-rose-600 font-semibold whitespace-nowrap">
                                            -{formatMoney(Number(line.absence_deduction) + Number(line.undertime_deduction))}
                                        </td>
                                        <td className="px-3 py-4 text-right text-emerald-600 font-semibold whitespace-nowrap">
                                            +{formatMoney(line.overtime_pay)}
                                        </td>
                                        <td className="px-4 py-4 text-right text-[14px] font-bold tracking-tight text-emerald-800 bg-emerald-50/30 whitespace-nowrap">
                                            {formatMoney(line.net_pay)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </>
    );
}
