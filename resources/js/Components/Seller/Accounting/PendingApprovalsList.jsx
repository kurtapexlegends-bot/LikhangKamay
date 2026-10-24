import React, { useMemo } from 'react';
import { Users, FileText, Eye, CheckCircle } from 'lucide-react';
import SortableHeader from '@/Components/SortableHeader';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import CompactPagination from '@/Components/CompactPagination';
import { formatDate, formatRole, formatShortMoney, typeTone } from '@/utils/accountingFormatters';

function TableSkeleton() {
    return (
        <tbody className="divide-y divide-gray-100 animate-pulse">
            {[1, 2, 3].map((n) => (
                <tr key={n} className="h-16">
                    <td className="px-5 py-4 text-center align-middle"><div className="h-6 w-20 bg-stone-100 rounded-lg mx-auto" /></td>
                    <td className="px-5 py-4 text-left align-middle"><div className="space-y-1.5"><div className="h-4 w-36 bg-stone-100 rounded" /><div className="h-3 w-24 bg-stone-100 rounded" /></div></td>
                    <td className="px-5 py-4 text-left align-middle"><div className="space-y-1.5"><div className="h-4 w-28 bg-stone-100 rounded" /><div className="h-3 w-20 bg-stone-100 rounded" /></div></td>
                    <td className="px-5 py-4 text-center align-middle"><div className="h-4 w-24 bg-stone-100 rounded mx-auto" /></td>
                    <td className="px-5 py-4 text-right align-middle"><div className="h-4 w-20 bg-stone-100 rounded ml-auto" /></td>
                    <td className="px-5 py-4 text-center align-middle"><div className="h-6 w-24 bg-stone-100 rounded-lg mx-auto" /></td>
                    <td className="px-5 py-4 text-center align-middle"><div className="h-8 w-20 bg-stone-100 rounded-xl mx-auto" /></td>
                </tr>
            ))}
        </tbody>
    );
}

export default function PendingApprovalsList({
    paginatedPending = [],
    totalPendingPages = 1,
    currentPage = 1,
    onPageChange,
    onReview,
    filteredCount = 0,
    searchTerm = '',
    entryTypeFilter = 'all',
    selectedId = null,
    selectedType = null,
    isLoading = false,
    isSearching = false,
    sortConfig = { key: 'date', direction: 'desc' },
    onSort = () => {}
}) {
    // Helper to calculate urgency priority weight for sorting
    const getUrgencyWeight = (item) => {
        if (item.type === 'stock_request' || item.type === 'procurement') {
            if (item.urgency_level === 'immediate') return 3;
            if (item.urgency_level === 'soon') return 2;
            return 1; // routine
        }
        // Payroll runs carry high priority
        return 2;
    };

    // Client-side sort on current paginated collection for instant feedback
    const sortedData = useMemo(() => {
        if (!paginatedPending || paginatedPending.length === 0) return [];
        if (!sortConfig.key) return paginatedPending;

        return [...paginatedPending].sort((a, b) => {
            let valA, valB;
            if (sortConfig.key === 'type') {
                valA = a.type || '';
                valB = b.type || '';
            } else if (sortConfig.key === 'detail') {
                valA = a.type === 'payroll' ? (a.month || '') : (a.supply?.name || '');
                valB = b.type === 'payroll' ? (b.month || '') : (b.supply?.name || '');
            } else if (sortConfig.key === 'requester') {
                valA = a.requester?.name || '';
                valB = b.requester?.name || '';
            } else if (sortConfig.key === 'date') {
                valA = new Date(a.created_at || 0).getTime();
                valB = new Date(b.created_at || 0).getTime();
            } else if (sortConfig.key === 'amount') {
                valA = Number(a.amount || 0);
                valB = Number(b.amount || 0);
            } else if (sortConfig.key === 'urgency' || sortConfig.key === 'status') {
                const weightA = getUrgencyWeight(a);
                const weightB = getUrgencyWeight(b);
                if (weightA !== weightB) {
                    return sortConfig.direction === 'asc' ? weightA - weightB : weightB - weightA;
                }
                // Tie-breaker: date descending
                return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
            } else {
                valA = a[sortConfig.key] || '';
                valB = b[sortConfig.key] || '';
            }

            if (typeof valA === 'string') {
                const cmp = valA.localeCompare(valB);
                return sortConfig.direction === 'asc' ? cmp : -cmp;
            }
            return sortConfig.direction === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
        });
    }, [paginatedPending, sortConfig]);

    return (
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xs">
            {/* Table Container */}
            <div className={`overflow-x-auto transition-opacity duration-200 ${isSearching ? 'opacity-50 pointer-events-none' : ''}`}>
                <table className="w-full min-w-[850px] text-left">
                    <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider select-none border-b border-gray-200">
                        <tr>
                            <SortableHeader
                                label="Type"
                                sortKey="type"
                                currentSort={sortConfig}
                                onSort={onSort}
                                align="center"
                            />
                            <SortableHeader
                                label="Item / Period"
                                sortKey="detail"
                                currentSort={sortConfig}
                                onSort={onSort}
                                align="left"
                            />
                            <SortableHeader
                                label="Requested By"
                                sortKey="requester"
                                currentSort={sortConfig}
                                onSort={onSort}
                                align="left"
                            />
                            <SortableHeader
                                label="Date"
                                sortKey="date"
                                currentSort={sortConfig}
                                onSort={onSort}
                                align="center"
                            />
                            <SortableHeader
                                label="Amount"
                                sortKey="amount"
                                currentSort={sortConfig}
                                onSort={onSort}
                                align="right"
                            />
                            <SortableHeader
                                label="Status / Urgency"
                                sortKey="urgency"
                                currentSort={sortConfig}
                                onSort={onSort}
                                align="center"
                            />
                            <th className="px-5 py-4 text-center align-middle whitespace-nowrap text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>

                    {isLoading ? (
                        <TableSkeleton />
                    ) : sortedData.length > 0 ? (
                        <tbody className="divide-y divide-gray-100 text-xs">
                            {sortedData.map((item) => {
                                const isSelected = selectedId === item.id && selectedType === item.type;
                                const isPayroll = item.type === 'payroll';

                                return (
                                    <tr
                                        key={`${item.type}-${item.id}`}
                                        className={`transition-colors ${
                                            isSelected
                                                ? 'bg-clay-50/40 border-l-4 border-l-clay-700'
                                                : 'hover:bg-gray-50/70 border-l-4 border-l-transparent'
                                        }`}
                                    >
                                        {/* Type Column (Centered badge) */}
                                        <td className="px-5 py-3.5 align-middle text-center whitespace-nowrap">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${typeTone(item.type)}`}>
                                                {isPayroll ? (
                                                    <Users size={13} strokeWidth={2.5} className="text-stone-600" />
                                                ) : (
                                                    <FileText size={13} strokeWidth={2.5} className="text-clay-700" />
                                                )}
                                                <span>{isPayroll ? 'Payroll' : 'Materials'}</span>
                                            </span>
                                        </td>

                                        {/* Item / Period Column (Left-aligned for readability) */}
                                        <td className="px-5 py-3.5 align-middle text-left">
                                            <p className="font-bold text-stone-900 leading-snug">
                                                {isPayroll ? `Payroll for ${item.month}` : item.supply?.name}
                                            </p>
                                            <p className="text-[11px] text-stone-500 mt-0.5 font-medium">
                                                {isPayroll
                                                    ? `${item.employee_count} Employees Included`
                                                    : `${item.quantity} ${item.supply?.unit || 'units'} requested${item.supply?.supplier ? ` • ${item.supply.supplier}` : ''}`}
                                            </p>
                                        </td>

                                        {/* Requested By Column (Left-aligned for readability) */}
                                        <td className="px-5 py-3.5 align-middle text-left whitespace-nowrap">
                                            <p className="font-bold text-stone-900">
                                                {item.requester?.name || 'Seller owner'}
                                            </p>
                                            <p className="text-[11px] text-stone-400 font-medium">
                                                {formatRole(item.requester?.role)}
                                            </p>
                                        </td>

                                        {/* Date Column (Centered) */}
                                        <td className="px-5 py-3.5 align-middle text-center whitespace-nowrap text-stone-600">
                                            <p className="font-medium">{formatDate(item.created_at)}</p>
                                            {item.needed_by_date && (
                                                <p className="text-[11px] text-stone-400 mt-0.5">
                                                    Needed: {formatDate(item.needed_by_date)}
                                                </p>
                                            )}
                                        </td>

                                        {/* Amount Column (Right-aligned for numeric precision) */}
                                        <td className="px-5 py-3.5 align-middle text-right whitespace-nowrap">
                                            <span className="font-black text-stone-900 text-sm">
                                                {formatShortMoney(item.amount)}
                                            </span>
                                        </td>

                                        {/* Status / Urgency Column (Centered) */}
                                        <td className="px-5 py-3.5 align-middle text-center whitespace-nowrap">
                                            {isPayroll ? (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                                                    Pending Review
                                                </span>
                                            ) : item.urgency_level === 'immediate' ? (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                                                    Urgent
                                                </span>
                                            ) : item.urgency_level === 'soon' ? (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                                                    Priority
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-stone-100 text-stone-700 border border-stone-200">
                                                    Routine
                                                </span>
                                            )}
                                        </td>

                                        {/* Actions Column (Centered) */}
                                        <td className="px-5 py-3.5 align-middle text-center whitespace-nowrap">
                                            <button
                                                type="button"
                                                onClick={() => onReview(item, 'pending')}
                                                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-clay-700 hover:bg-clay-800 text-white px-3.5 py-1.5 text-xs font-bold transition shadow-xs active:scale-95 min-h-[36px]"
                                            >
                                                <Eye size={13} strokeWidth={2.5} />
                                                <span>Review</span>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    ) : (
                        <tbody>
                            <tr>
                                <td colSpan={7} className="p-0">
                                    <WorkspaceEmptyState
                                        icon={CheckCircle}
                                        title="No pending approvals"
                                        description={
                                            searchTerm || entryTypeFilter !== 'all'
                                                ? 'Try another search or clear the active filter to review more requests.'
                                                : 'Payroll and material requests that still need finance review will appear here.'
                                        }
                                        actionLabel="Review Inventory"
                                        actionHref={route('procurement.index')}
                                        secondaryActionLabel="Open HR"
                                        secondaryActionHref={route('hr.index')}
                                    />
                                </td>
                            </tr>
                        </tbody>
                    )}
                </table>
            </div>

            {/* Pagination */}
            {totalPendingPages > 1 && (
                <div className="border-t border-stone-200 bg-[#FAF9F6] px-4 py-2">
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
