import React from 'react';
import { History, Users, Banknote, FileText, Eye } from 'lucide-react';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import CompactPagination from '@/Components/CompactPagination';
import { formatDate, formatShortMoney, statusTone, typeTone, reviewLabel } from '@/utils/accountingFormatters';

function ListSkeleton() {
    return (
        <div className="divide-y divide-stone-100 animate-pulse">
            {[1, 2, 3].map((n) => (
                <div key={n} className="px-6 py-5 flex items-center justify-between gap-4">
                    <div className="flex items-start gap-4 w-2/3">
                        <div className="h-10 w-10 bg-stone-100 rounded-xl shrink-0" />
                        <div className="space-y-2 w-full">
                            <div className="h-3 bg-stone-100 rounded w-1/4" />
                            <div className="h-4 bg-stone-100 rounded w-3/4" />
                            <div className="h-3 bg-stone-100 rounded w-1/2" />
                        </div>
                    </div>
                    <div className="w-24 h-9 bg-stone-100 rounded-xl shrink-0" />
                </div>
            ))}
        </div>
    );
}

export default function TransactionLedgerTable({
    paginatedHistory,
    totalHistoryPages,
    currentPage,
    onPageChange,
    onView,
    filteredCount,
    searchTerm,
    entryTypeFilter,
    selectedId = null,
    selectedType = null,
    isLoading = false
}) {
    return (
        <div className="overflow-hidden rounded-[1.25rem] border border-stone-200 bg-white shadow-sm">
            {/* Header */}
            <div className="border-b border-stone-100 bg-[#FDFBF9] px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <History className="text-stone-400" size={18} strokeWidth={2.5} />
                    <h3 className="text-sm font-bold tracking-tight text-stone-900">Transaction Ledger</h3>
                </div>
            </div>

            {/* Body */}
            <div className="divide-y divide-stone-100">
                {isLoading ? (
                    <ListSkeleton />
                ) : paginatedHistory.length > 0 ? (
                    paginatedHistory.map((item) => {
                        const isApproved = ['paid', 'completed', 'accounting_approved', 'ordered', 'received', 'partially_received'].includes(String(item.status).toLowerCase());
                        const isSelected = selectedId === item.id && selectedType === item.type;

                        return (
                            <div
                                key={`${item.type}-${item.id}`}
                                className={`group px-6 py-4 transition-all lg:flex lg:items-center lg:justify-between lg:gap-4 border-l-4 ${
                                    isSelected
                                        ? 'bg-clay-50/20 border-l-clay-650'
                                        : 'hover:bg-stone-50/50 border-l-transparent'
                                }`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-transform group-hover:scale-105 ${
                                        item.type === 'payroll'
                                            ? 'border-stone-200 bg-stone-50 text-stone-500'
                                            : item.type === 'sale'
                                            ? 'border-teal-200 bg-teal-50 text-teal-600'
                                            : 'border-clay-200 bg-[#FCF7F2] text-clay-600'
                                    }`}>
                                        {item.type === 'payroll' ? (
                                            <Users size={18} strokeWidth={2.5} />
                                        ) : item.type === 'sale' ? (
                                            <Banknote size={18} strokeWidth={2.5} />
                                        ) : (
                                            <FileText size={18} strokeWidth={2.5} />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${typeTone(item.type)}`}>
                                                {item.type === 'payroll' ? 'Finance Review' : item.type === 'sale' ? 'Sale Payout' : 'Inventory Ops'}
                                            </span>
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                                                #{item.order_number || item.id} &bull; {formatDate(item.activity?.requested_at || item.created_at)}
                                            </span>
                                            <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${statusTone(item.status)}`}>
                                                {String(item.status).replace(/_/g, ' ')}
                                            </span>
                                        </div>
                                        
                                        <h4 className="mt-1.5 text-[14px] font-bold leading-tight text-stone-900">
                                            {item.type === 'payroll' ? `Payroll for ${item.month}` : item.type === 'sale' ? `Order Settlement` : item.supply?.name}
                                        </h4>
                                        
                                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-stone-500">
                                            <span>
                                                {item.type === 'sale' ? 'Customer' : 'Requested by'}{' '}
                                                <strong className="font-bold text-stone-700">{item.requester?.name || 'Unknown'}</strong>
                                            </span>
                                            <span className="h-1 w-1 rounded-full bg-stone-300" />
                                            <span>
                                                {item.type === 'payroll' ? `${item.employee_count} Employees` : item.type === 'sale' ? `Sales Revenue` : `${item.quantity} ${item.supply?.unit || ''}`}
                                            </span>
                                            {item.activity?.last_reviewed_at && (
                                                <>
                                                    <span className="h-1 w-1 rounded-full bg-stone-300" />
                                                    <span>
                                                        {item.type === 'sale' ? 'Settled' : reviewLabel(item.status)} {formatDate(item.activity.last_reviewed_at)}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                        
                                        {item.rejection_reason && (
                                            <p className="mt-2 text-[11px] font-medium text-red-650">Note: {item.rejection_reason}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-4 flex flex-col gap-3 sm:mt-0 sm:flex-row sm:items-center sm:justify-end lg:self-auto min-w-[200px]">
                                    <div className="text-left sm:text-right">
                                        <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400">
                                            {item.type === 'sale' ? 'Net Payout' : 'Action Amount'}
                                        </p>
                                        <p className={`text-lg font-bold tracking-tight ${item.type === 'sale' ? 'text-emerald-600' : 'text-stone-900'}`}>
                                            {isApproved && item.type !== 'sale' ? '- ' : item.type === 'sale' ? '+ ' : ''}
                                            {formatShortMoney(item.amount)}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => onView(item, 'history')}
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-clay-200/80 bg-[#FCF8F5] px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-clay-700 shadow-sm hover:bg-clay-100 hover:text-clay-800 hover:scale-[1.01] active:scale-98 transition-all sm:w-auto min-h-[44px]"
                                    >
                                        <Eye size={14} strokeWidth={2.5} /> View
                                    </button>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <WorkspaceEmptyState
                        compact
                        icon={History}
                        title="No transaction history yet"
                        description={
                            searchTerm || entryTypeFilter !== 'all'
                                ? 'Try another search or clear the active filter to review more ledger history.'
                                : 'Approved or rejected payroll and inventory releases will be recorded in this ledger.'
                        }
                    />
                )}
            </div>

            {/* Pagination */}
            {totalHistoryPages > 1 && (
                <div className="border-t border-stone-100 bg-[#FDFBF9]">
                    <CompactPagination
                        currentPage={currentPage}
                        totalPages={totalHistoryPages}
                        totalItems={filteredCount}
                        itemsPerPage={10}
                        itemLabel="entries"
                        onPageChange={onPageChange}
                    />
                </div>
            )}
        </div>
    );
}
