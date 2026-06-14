import React from 'react';
import CompactPagination from '@/Components/CompactPagination';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import { Banknote } from 'lucide-react';
import { router } from '@inertiajs/react';
import {
    formatPeso,
    formatShortDateSafe
} from '@/utils/hrHelpers';

export default function PayrollHistoryTable({
    payrolls = [],
    canEditHrRecords,
    deletePayroll
}) {
    const paginatedPayrolls = Array.isArray(payrolls) ? payrolls : (payrolls?.data || []);

    return (
        <div className="overflow-hidden rounded-[1.25rem] border border-stone-200 bg-white shadow-sm flex flex-col">
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-[#FDFBF9]">
                <h3 className="text-sm font-bold tracking-tight text-stone-900">Payroll Requests History</h3>
            </div>
            
            {/* Mobile View: Card List */}
            <div className="flex-1 md:hidden">
                {paginatedPayrolls.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                        {paginatedPayrolls.map((payroll) => (
                            <div key={payroll.id} className="p-4 space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-gray-900">{formatShortDateSafe(payroll.created_at)}</p>
                                        <p className="mt-0.5 text-xs text-gray-500">{payroll.month}</p>
                                        <p className="mt-1 text-[11px] text-gray-400">
                                            Requested by <span className="font-bold text-gray-600">{payroll.requester?.name || 'Seller owner'}</span>
                                        </p>
                                    </div>
                                    <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                        payroll.status === 'Paid' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                                        payroll.status === 'Rejected' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                                        'bg-[#F8EEE6] text-clay-700 border border-[#E7D8C9]'
                                    }`}>
                                        {payroll.status}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-[11px]">
                                    <div className="rounded-xl border border-gray-100 bg-stone-50/70 px-3 py-2">
                                        <p className="text-gray-400">Employees</p>
                                        <p className="mt-0.5 font-bold text-gray-800">{payroll.employee_count}</p>
                                    </div>
                                    <div className="rounded-xl border border-gray-100 bg-stone-50/70 px-3 py-2">
                                        <p className="text-gray-400">Total Amount</p>
                                        <p className="mt-0.5 font-bold text-gray-800">{formatPeso(payroll.total_amount)}</p>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-gray-100 bg-stone-50/70 px-3 py-2 text-[11px] text-stone-500">
                                    {payroll.submitted_at && (
                                        <p>Submitted to Accounting: <span className="font-medium text-stone-700">{formatShortDateSafe(payroll.submitted_at)}</span></p>
                                    )}
                                    {payroll.status !== 'Pending' && (
                                        <p className="mt-1">Last review: <span className="font-medium text-stone-700">{formatShortDateSafe(payroll.updated_at)}</span></p>
                                    )}
                                    <p className="mt-1">
                                        Reason: <span className={payroll.rejection_reason ? 'font-medium text-red-600' : 'font-medium text-stone-400'}>{payroll.rejection_reason || '-'}</span>
                                    </p>
                                </div>

                                <div className="flex justify-end gap-2">
                                    <button 
                                        onClick={() => router.get(route('hr.payroll.show', payroll.id))} 
                                        className="inline-flex items-center justify-center rounded-xl bg-clay-50/50 border border-clay-100 text-clay-700 hover:bg-clay-100 hover:text-clay-800 transition min-h-[44px] min-w-[100px]"
                                    >
                                        View Details
                                    </button>
                                    {canEditHrRecords && ['Pending', 'Rejected'].includes(payroll.status) && (
                                        <button 
                                            onClick={() => deletePayroll(payroll.id)} 
                                            className="inline-flex items-center justify-center rounded-xl bg-red-50 px-3 py-2 text-[11px] font-bold text-red-600 hover:bg-red-100 transition min-h-[44px] min-w-[110px]"
                                        >
                                            Delete Request
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-4">
                        <WorkspaceEmptyState
                            icon={Banknote}
                            title="No payroll requests yet"
                            description={canEditHrRecords
                                ? 'Generate payroll after attendance and salary details are ready for the selected month.'
                                : 'Payroll history will appear here once People & Payroll submits requests for finance review.'}
                            compact
                        />
                    </div>
                )}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden overflow-x-auto flex-1 md:block">
                <table className="w-full min-w-[860px] text-left">
                    <thead className="bg-[#FDFBF9] text-[9px] font-bold text-stone-400 uppercase tracking-widest border-b border-stone-100">
                        <tr>
                            <th className="px-6 py-3.5">Date</th>
                            <th className="px-5 py-3.5 text-center">Employees</th>
                            <th className="px-5 py-3.5 text-right">Total Amount</th>
                            <th className="px-5 py-3.5 text-center">Status</th>
                            <th className="px-5 py-3.5">Reason</th>
                            <th className="px-6 py-3.5 text-right w-44">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                        {paginatedPayrolls.length > 0 ? (
                            paginatedPayrolls.map((payroll) => (
                                <tr key={payroll.id} className="hover:bg-gray-50/50 transition duration-150 relative">
                                    <td className="px-5 py-4">
                                        <div className="font-bold text-gray-900 text-sm">{formatShortDateSafe(payroll.created_at)}</div>
                                        <div className="mt-1 text-xs text-gray-500">{payroll.month}</div>
                                        <div className="mt-1 text-xs text-gray-400">
                                            Requested by <span className="font-bold text-gray-600">{payroll.requester?.name || 'Seller owner'}</span>
                                        </div>
                                        <div className="mt-1 space-y-0.5 text-[11px] text-gray-400">
                                            {payroll.submitted_at && (
                                                <div>Submitted to Accounting: <span className="font-medium text-gray-500">{formatShortDateSafe(payroll.submitted_at)}</span></div>
                                            )}
                                            {payroll.status !== 'Pending' && (
                                                <div>Last review: <span className="font-medium text-gray-500">{formatShortDateSafe(payroll.updated_at)}</span></div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-center font-bold text-gray-600">
                                        {payroll.employee_count}
                                    </td>
                                    <td className="px-5 py-4 text-right font-bold text-gray-900">
                                        {formatPeso(payroll.total_amount)}
                                    </td>
                                    <td className="px-5 py-4 text-center">
                                        <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold ${
                                            payroll.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
                                            payroll.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                            'bg-[#F8EEE6] text-clay-700'
                                        }`}>
                                            {payroll.status}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className={`text-xs leading-relaxed ${
                                            payroll.rejection_reason ? 'text-red-600' : 'text-gray-400'
                                        }`}>
                                            {payroll.rejection_reason || '-'}
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => router.get(route('hr.payroll.show', payroll.id))}
                                                className="inline-flex items-center justify-center rounded-xl bg-clay-50/50 border border-clay-100/50 px-3 py-1.5 text-xs font-bold text-clay-700 hover:bg-clay-100 hover:text-clay-800 transition min-h-[36px]"
                                            >
                                                View
                                            </button>
                                            {canEditHrRecords && ['Pending', 'Rejected'].includes(payroll.status) && (
                                                <button 
                                                    onClick={() => deletePayroll(payroll.id)} 
                                                    className="inline-flex items-center justify-center rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-100 transition"
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="px-6 py-10 text-center">
                                    <WorkspaceEmptyState
                                        icon={Banknote}
                                        title="No payroll requests yet"
                                        description={canEditHrRecords
                                            ? 'Generate payroll after attendance and salary details are ready for the selected month.'
                                            : 'Payroll history will appear here once People & Payroll submits requests for finance review.'}
                                    />
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            {/* Pagination Component */}
            {payrolls.last_page > 1 && (
                <CompactPagination
                    currentPage={payrolls.current_page}
                    totalPages={payrolls.last_page}
                    totalItems={payrolls.total}
                    itemsPerPage={payrolls.per_page}
                    onPageChange={(page) => router.get(route('hr.index'), { page }, { preserveState: true, preserveScroll: true, replace: true })}
                    itemLabel="payrolls"
                />
            )}
        </div>
    );
}
