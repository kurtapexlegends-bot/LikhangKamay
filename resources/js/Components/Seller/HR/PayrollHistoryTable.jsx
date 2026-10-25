import React, { useState, useMemo } from 'react';
import CompactPagination from '@/Components/CompactPagination';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import FilterToolbarHeader from '@/Components/Seller/Shared/FilterToolbarHeader';
import { Banknote, ChevronDown, FileSpreadsheet, ArrowUpRight } from 'lucide-react';
import { router } from '@inertiajs/react';
import {
    formatPeso,
    formatShortDateSafe
} from '@/utils/hrHelpers';

export default function PayrollHistoryTable({
    tabs,
    activeTab,
    setActiveTab,
    pendingPayrollCount = 0,
    staffCount = 0,
    payrolls = [],
    canEditHrRecords,
    deletePayroll,
    openPayrollModal,
}) {
    const resolvedTabs = useMemo(() => {
        if (tabs && tabs.length > 0) return tabs;
        return [
            { key: 'directory', label: 'Directory', count: staffCount },
            { key: 'payroll', label: 'Payroll History', count: pendingPayrollCount > 0 ? pendingPayrollCount : null },
            { key: 'access', label: 'Access History' },
        ];
    }, [tabs, staffCount, pendingPayrollCount]);

    const rawPayrolls = useMemo(() => {
        return Array.isArray(payrolls) ? payrolls : (payrolls?.data || []);
    }, [payrolls]);

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    // Collapsed by default - only expands when intentionally clicked
    const [expandedRowId, setExpandedRowId] = useState(null);

    const activeFilterCount = statusFilter !== 'all' ? 1 : 0;

    const filteredPayrolls = useMemo(() => {
        return rawPayrolls.filter((payroll) => {
            const matchesStatus = statusFilter === 'all' || (payroll.status && payroll.status.toLowerCase() === statusFilter.toLowerCase());
            const q = search.toLowerCase();
            const matchesSearch = !search || 
                (payroll.month && payroll.month.toLowerCase().includes(q)) ||
                (payroll.requester?.name && payroll.requester.name.toLowerCase().includes(q)) ||
                (payroll.status && payroll.status.toLowerCase().includes(q));

            return matchesStatus && matchesSearch;
        });
    }, [rawPayrolls, statusFilter, search]);

    return (
        <div className="rounded-3xl border border-stone-200/80 bg-white shadow-sm flex flex-col min-h-[400px] relative">
            <FilterToolbarHeader
                tabs={resolvedTabs}
                activeTab={activeTab || 'payroll'}
                onTabChange={setActiveTab}
                searchQuery={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search month, status, requester..."
                activeFiltersCount={activeFilterCount}
                filterPopoverTitle="Filter Payroll Status"
                filterPopoverFields={
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                            Payroll Status
                        </label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-800 outline-none focus:border-clay-500 bg-white cursor-pointer"
                        >
                            <option value="all">All Statuses</option>
                            <option value="pending">Pending Review</option>
                            <option value="paid">Paid Disbursed</option>
                            <option value="rejected">Declined</option>
                        </select>
                    </div>
                }
                onApplyFilters={() => {}}
                onResetFilters={() => setSearch('')}
                activeFilterTags={
                    statusFilter !== 'all'
                        ? [
                              {
                                  label: `Status: ${statusFilter}`,
                                  onRemove: () => setStatusFilter('all'),
                              },
                          ]
                        : []
                }
                extraActions={
                    canEditHrRecords && openPayrollModal && (
                        <button
                            type="button"
                            onClick={openPayrollModal}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-clay-700 px-3.5 h-[38px] min-h-[38px] text-xs font-bold text-white shadow-2xs transition hover:bg-clay-800 active:scale-95 shrink-0 cursor-pointer"
                        >
                            <Banknote size={14} />
                            <span className="hidden sm:inline">New Payroll Run</span>
                            <span className="sm:hidden">New</span>
                        </button>
                    )
                }
                containerClassName="rounded-t-3xl border-x-0 border-t-0 border-b border-stone-200/80 shadow-none bg-stone-50/40"
            />

            {/* Mobile View: Collapsible Card List */}
            <div className="flex-1 md:hidden">
                {filteredPayrolls.length > 0 ? (
                    <div className="divide-y divide-stone-100">
                        {filteredPayrolls.map((payroll) => {
                            const isExpanded = expandedRowId === payroll.id;
                            const isPaid = payroll.status === 'Paid';
                            const isRejected = payroll.status === 'Rejected';

                            return (
                                <div key={payroll.id} className="p-4 space-y-3">
                                    <div 
                                        onClick={() => setExpandedRowId(isExpanded ? null : payroll.id)}
                                        className="flex items-start justify-between gap-3 cursor-pointer select-none"
                                    >
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <p className="text-sm font-bold text-stone-900">{payroll.month}</p>
                                                <span className="text-[10px] text-stone-400">Ref: LK-PAY-{payroll.id.toString().padStart(4, '0')}</span>
                                            </div>
                                            <p className="mt-0.5 text-xs text-stone-500">
                                                Submitted {formatShortDateSafe(payroll.created_at)} by <span className="font-bold text-stone-700">{payroll.requester?.name || 'Shop Owner'}</span>
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                                isPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                isRejected ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                'bg-amber-50 text-amber-800 border-amber-200'
                                            }`}>
                                                {isRejected ? 'Declined' : payroll.status}
                                            </span>
                                            <ChevronDown size={14} className={`text-stone-400 transition-transform ${isExpanded ? 'rotate-180 text-clay-700' : ''}`} />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                                        <div className="rounded-xl border border-stone-150 bg-stone-50/70 p-2.5">
                                            <p className="text-stone-400 text-[10px] font-bold uppercase tracking-wider">Employees</p>
                                            <p className="mt-0.5 font-bold text-stone-900">{payroll.employee_count}</p>
                                        </div>
                                        <div className="rounded-xl border border-stone-150 bg-stone-50/70 p-2.5">
                                            <p className="text-stone-400 text-[10px] font-bold uppercase tracking-wider">Net Pay</p>
                                            <p className="mt-0.5 font-black text-stone-900">{formatPeso(payroll.total_amount)}</p>
                                        </div>
                                    </div>

                                    {/* Mobile In-Place Expanded Breakdown */}
                                    {isExpanded && (
                                        <div className="pt-2 border-t border-stone-100 space-y-2.5">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-bold text-stone-800">{payroll.month} Breakdown</span>
                                                <button
                                                    type="button"
                                                    onClick={() => router.get(route('hr.payroll.show', payroll.id))}
                                                    className="text-xs font-bold text-clay-700 hover:text-clay-900 flex items-center gap-1"
                                                >
                                                    View Details <ArrowUpRight size={12} />
                                                </button>
                                            </div>

                                            {payroll.items && payroll.items.length > 0 ? (
                                                <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl bg-stone-50/40 overflow-hidden text-xs">
                                                    {payroll.items.map((item) => (
                                                        <div key={item.id} className="p-2.5 flex items-center justify-between">
                                                            <div className="min-w-0">
                                                                <p className="font-bold text-stone-900 truncate">{item.employee?.name || `Employee #${item.employee_id}`}</p>
                                                                <p className="text-[10px] text-stone-500">{item.days_worked || 0} days worked</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="font-bold text-stone-900">{formatPeso(item.net_pay || item.base_salary)}</p>
                                                                <p className="text-[10px] text-emerald-700 font-medium">Net Pay</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-stone-500 italic bg-stone-50 p-2.5 rounded-xl border border-stone-150">
                                                    Batch recorded without itemized line details.
                                                </p>
                                            )}

                                            <div className="flex items-center justify-end gap-2 pt-1">
                                                {canEditHrRecords && ['Pending', 'Rejected'].includes(payroll.status) && (
                                                    <button
                                                        type="button"
                                                        onClick={() => deletePayroll(payroll.id)}
                                                        className="px-3 py-1.5 text-xs font-semibold text-stone-500 hover:text-rose-600 rounded-xl transition hover:bg-rose-50"
                                                    >
                                                        Cancel Draft
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => router.get(route('hr.payroll.show', payroll.id))}
                                                    className="px-3.5 py-1.5 text-xs font-bold text-white bg-clay-700 hover:bg-clay-800 rounded-xl transition"
                                                >
                                                    View Details
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="p-4">
                        <WorkspaceEmptyState
                            icon={Banknote}
                            title="No payroll records yet"
                            description={canEditHrRecords
                                ? 'Generate payroll after attendance and salary details are ready for the selected month.'
                                : 'Payroll history will appear here once submitted for review.'}
                            compact
                        />
                    </div>
                )}
            </div>

            {/* Desktop View: Multi-Tier Expandable Accounting Table */}
            <div className="hidden overflow-x-auto flex-1 md:block">
                <table className="w-full min-w-[780px] text-left text-xs">
                    <thead className="bg-[#FAF8F5] text-[10px] font-bold text-stone-500 uppercase tracking-wider border-b border-stone-200">
                        <tr>
                            <th className="px-5 py-3.5 w-10"></th>
                            <th className="px-4 py-3.5">Pay Period</th>
                            <th className="px-4 py-3.5 text-center">Employees</th>
                            <th className="px-4 py-3.5 text-right">Gross Pay</th>
                            <th className="px-4 py-3.5 text-right">Net Pay</th>
                            <th className="px-4 py-3.5 text-center">Status</th>
                            <th className="px-5 py-3.5 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                        {filteredPayrolls.length > 0 ? (
                            filteredPayrolls.map((payroll) => {
                                const isExpanded = expandedRowId === payroll.id;
                                const isPaid = payroll.status === 'Paid';
                                const isRejected = payroll.status === 'Rejected';

                                return (
                                    <React.Fragment key={payroll.id}>
                                        <tr
                                            onClick={() => setExpandedRowId(isExpanded ? null : payroll.id)}
                                            className={`hover:bg-stone-50/70 transition cursor-pointer select-none ${
                                                isExpanded ? 'bg-[#FCF7F2]/40' : ''
                                            }`}
                                        >
                                            <td className="px-5 py-4 text-stone-400">
                                                <ChevronDown
                                                    size={15}
                                                    className={`transition-transform duration-200 ${isExpanded ? 'rotate-180 text-clay-700' : ''}`}
                                                />
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="font-bold text-stone-900 text-sm">{payroll.month}</div>
                                                <div className="text-[11px] text-stone-400 mt-0.5">Ref: LK-PAY-{payroll.id.toString().padStart(4, '0')}</div>
                                                <div className="text-[11px] text-stone-500 mt-0.5">
                                                    Submitted {formatShortDateSafe(payroll.created_at)} by <span className="font-semibold text-stone-700">{payroll.requester?.name || 'Shop Owner'}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-center font-bold text-stone-700">
                                                {payroll.employee_count}
                                            </td>
                                            <td className="px-4 py-4 text-right font-medium text-stone-600">
                                                {formatPeso(payroll.total_amount)}
                                            </td>
                                            <td className="px-4 py-4 text-right font-black text-stone-900 text-sm">
                                                {formatPeso(payroll.total_amount)}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                                    isPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                    isRejected ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                    'bg-amber-50 text-amber-800 border-amber-200'
                                                }`}>
                                                    {isRejected ? 'Declined' : payroll.status}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <div className="inline-flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        type="button"
                                                        onClick={() => router.get(route('hr.payroll.show', payroll.id))}
                                                        className="inline-flex items-center gap-1 text-xs font-bold text-clay-700 hover:text-clay-900 transition px-2.5 py-1.5 rounded-lg hover:bg-stone-100"
                                                    >
                                                        <span>View Details</span>
                                                        <ArrowUpRight size={13} />
                                                    </button>
                                                    {canEditHrRecords && ['Pending', 'Rejected'].includes(payroll.status) && (
                                                        <button
                                                            type="button"
                                                            onClick={() => deletePayroll(payroll.id)}
                                                            className="text-stone-400 hover:text-rose-600 px-2 py-1 text-xs font-medium rounded-lg hover:bg-rose-50 transition"
                                                            title="Cancel Draft"
                                                        >
                                                            Cancel Draft
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>

                                        {/* Inline Nested Employee Breakdown */}
                                        {isExpanded && (
                                            <tr className="bg-[#FAF8F5]/60">
                                                <td colSpan="7" className="px-8 py-4 border-y border-stone-200/80">
                                                    <div className="space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <FileSpreadsheet size={15} className="text-clay-700" />
                                                                <h4 className="text-xs font-bold text-stone-900">
                                                                    {payroll.month} Breakdown
                                                                </h4>
                                                            </div>
                                                            <div className="text-[11px] font-medium text-stone-500 flex items-center gap-2">
                                                                {payroll.submitted_at && (
                                                                    <span>Submitted: {formatShortDateSafe(payroll.submitted_at)}</span>
                                                                )}
                                                                {payroll.rejection_reason && (
                                                                    <span className="text-rose-600 font-semibold">&bull; Reason: {payroll.rejection_reason}</span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Nested Employee Mini Table */}
                                                        {payroll.items && payroll.items.length > 0 ? (
                                                            <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-2xs">
                                                                <table className="w-full text-left text-[11px]">
                                                                    <thead className="bg-stone-50 border-b border-stone-150 text-[9px] font-bold text-stone-400 uppercase">
                                                                        <tr>
                                                                            <th className="px-4 py-2">Employee</th>
                                                                            <th className="px-3 py-2 text-right">Base Salary</th>
                                                                            <th className="px-3 py-2 text-center">Days Worked</th>
                                                                            <th className="px-3 py-2 text-right">Deductions</th>
                                                                            <th className="px-3 py-2 text-right">Overtime</th>
                                                                            <th className="px-3 py-2 text-right font-black">Net Pay</th>
                                                                            <th className="px-4 py-2 text-center">Status</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-stone-100">
                                                                        {payroll.items.map((item) => (
                                                                            <tr key={item.id} className="hover:bg-stone-50/50">
                                                                                <td className="px-4 py-2.5 font-bold text-stone-900">
                                                                                    {item.employee?.name || `Employee #${item.employee_id}`}
                                                                                    {item.employee?.role && (
                                                                                        <span className="text-[10px] font-normal text-stone-500 block">
                                                                                            {item.employee.role}
                                                                                        </span>
                                                                                    )}
                                                                                </td>
                                                                                <td className="px-3 py-2.5 text-right font-medium text-stone-600">
                                                                                    {formatPeso(item.base_salary)}
                                                                                </td>
                                                                                <td className="px-3 py-2.5 text-center font-bold text-stone-700">
                                                                                    {item.days_worked || 0}d
                                                                                </td>
                                                                                <td className="px-3 py-2.5 text-right font-medium text-rose-600">
                                                                                    {Number(item.deductions || 0) > 0 ? `-${formatPeso(item.deductions)}` : '₱0.00'}
                                                                                </td>
                                                                                <td className="px-3 py-2.5 text-right font-medium text-emerald-700">
                                                                                    {Number(item.overtime_pay || 0) > 0 ? `+${formatPeso(item.overtime_pay)}` : '₱0.00'}
                                                                                </td>
                                                                                <td className="px-3 py-2.5 text-right font-black text-stone-900">
                                                                                    {formatPeso(item.net_pay || item.base_salary)}
                                                                                </td>
                                                                                <td className="px-4 py-2.5 text-center">
                                                                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                                                                        isPaid ? 'bg-emerald-50 text-emerald-700' :
                                                                                        isRejected ? 'bg-rose-50 text-rose-700' :
                                                                                        'bg-amber-50 text-amber-800'
                                                                                    }`}>
                                                                                        {payroll.status}
                                                                                    </span>
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        ) : (
                                                            <div className="rounded-2xl border border-stone-200 bg-white p-4 text-center">
                                                                <p className="text-xs text-stone-500">
                                                                    Batch total of <strong className="text-stone-900">{formatPeso(payroll.total_amount)}</strong> allocated across <strong className="text-stone-900">{payroll.employee_count} employees</strong>.
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan="7" className="px-6 py-10 text-center">
                                    <WorkspaceEmptyState
                                        icon={Banknote}
                                        title="No payroll records yet"
                                        description={canEditHrRecords
                                            ? 'Generate payroll after attendance and salary details are ready for the selected month.'
                                            : 'Payroll history will appear here once submitted for review.'}
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
