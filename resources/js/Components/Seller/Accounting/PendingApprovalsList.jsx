import React from 'react';
import { Users, FileText, Eye, AlertCircle, CheckCircle } from 'lucide-react';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import CompactPagination from '@/Components/CompactPagination';
import { formatDate, formatRole, formatShortMoney, typeTone } from '@/utils/accountingFormatters';

export default function PendingApprovalsList({
    paginatedPending,
    totalPendingPages,
    currentPage,
    onPageChange,
    onReview,
    filteredCount,
    searchTerm,
    entryTypeFilter
}) {
    return (
        <div className="overflow-hidden rounded-[1.25rem] border border-stone-200 bg-white shadow-sm">
            {/* Table/List Header */}
            <div className="flex items-center justify-between border-b border-stone-100 bg-[#FDFBF9] px-6 py-4">
                <div className="flex items-center gap-3">
                    <AlertCircle className="text-stone-400" size={18} strokeWidth={2.5} />
                    <h3 className="text-sm font-bold tracking-tight text-stone-900">Pending Review</h3>
                </div>
            </div>

            {/* List Body */}
            <div className="divide-y divide-stone-100">
                {paginatedPending.length > 0 ? (
                    paginatedPending.map((item) => (
                        <div
                            key={`${item.type}-${item.id}`}
                            className="group px-6 py-4 transition-colors hover:bg-stone-50/50 lg:flex lg:items-center lg:justify-between lg:gap-4"
                        >
                            <div className="flex items-start gap-4">
                                <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-transform group-hover:scale-105 ${
                                    item.type === 'payroll'
                                        ? 'border-stone-200 bg-stone-50 text-stone-500'
                                        : 'border-clay-200 bg-[#FCF7F2] text-clay-600'
                                }`}>
                                    {item.type === 'payroll' ? (
                                        <Users size={18} strokeWidth={2.5} />
                                    ) : (
                                        <FileText size={18} strokeWidth={2.5} />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${typeTone(item.type)}`}>
                                            {item.type === 'payroll' ? 'People & Payroll' : 'Inventory'}
                                        </span>
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                                            #{item.id} &bull; {formatDate(item.created_at)}
                                        </span>
                                    </div>
                                    
                                    <h4 className="mt-1.5 text-[14px] font-bold leading-tight text-stone-900">
                                        {item.type === 'payroll' ? `Payroll for ${item.month}` : item.supply?.name}
                                    </h4>
                                    
                                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-stone-500">
                                        <span>
                                            Requested by <strong className="font-bold text-stone-700">{item.requester?.name || 'Seller owner'}</strong>
                                            <span className="text-stone-400 ml-1">({formatRole(item.requester?.role)})</span>
                                        </span>
                                        <span className="h-1 w-1 rounded-full bg-stone-300" />
                                        <span>
                                            {item.type === 'payroll' ? `${item.employee_count} Employees` : `${item.quantity} ${item.supply?.unit || ''}`}
                                        </span>
                                        {item.activity?.submitted_at && (
                                            <>
                                                <span className="h-1 w-1 rounded-full bg-stone-300" />
                                                <span>Submitted {formatDate(item.activity.submitted_at)}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 flex flex-col gap-3 sm:mt-0 sm:flex-row sm:items-center sm:justify-end lg:self-auto min-w-[200px]">
                                <div className="text-left sm:text-right">
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400">Amount Due</p>
                                    <p className="text-lg font-bold tracking-tight text-stone-900">{formatShortMoney(item.amount)}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onReview(item, 'pending')}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-clay-600 px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-clay-700 hover:scale-[1.02] active:scale-95 transition-all shadow-md shadow-clay-600/15 sm:w-auto min-h-[44px]"
                                >
                                    <Eye size={14} strokeWidth={2.5} /> Review
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <WorkspaceEmptyState
                        icon={CheckCircle}
                        title="No pending approvals"
                        description={
                            searchTerm || entryTypeFilter !== 'all'
                                ? 'Try another search or clear the active filter to review more requests.'
                                : 'Payroll and inventory requests that still need finance review will appear here.'
                        }
                        actionLabel="Review Inventory"
                        actionHref={route('procurement.index')}
                        secondaryActionLabel="Open HR"
                        secondaryActionHref={route('hr.index')}
                    />
                )}
            </div>

            {/* Pagination */}
            {totalPendingPages > 1 && (
                <div className="border-t border-stone-100 bg-[#FDFBF9]">
                    <CompactPagination
                        currentPage={currentPage}
                        totalPages={totalPendingPages}
                        totalItems={filteredCount}
                        itemsPerPage={10}
                        itemLabel="requests"
                        onPageChange={onPageChange}
                    />
                </div>
            )}
        </div>
    );
}
