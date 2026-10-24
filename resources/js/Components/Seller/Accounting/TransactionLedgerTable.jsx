import React, { useMemo } from 'react';
import { History, Eye, Users, Banknote, FileText } from 'lucide-react';
import SortableHeader from '@/Components/SortableHeader';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import CompactPagination from '@/Components/CompactPagination';
import { formatDate, formatShortMoney, statusTone, typeTone, reviewLabel } from '@/utils/accountingFormatters';

function TableSkeleton() {
    return (
        <tbody className="divide-y divide-gray-100 animate-pulse">
            {[1, 2, 3, 4].map((n) => (
                <tr key={n} className="h-16">
                    <td className="px-5 py-4 align-middle text-left"><div className="h-4 w-20 bg-stone-100 rounded" /></td>
                    <td className="px-5 py-4 align-middle text-center"><div className="h-6 w-24 bg-stone-100 rounded-lg mx-auto" /></td>
                    <td className="px-5 py-4 align-middle text-left"><div className="space-y-1.5"><div className="h-4 w-40 bg-stone-100 rounded" /><div className="h-3 w-28 bg-stone-100 rounded" /></div></td>
                    <td className="px-5 py-4 align-middle text-center"><div className="h-4 w-24 bg-stone-100 rounded mx-auto" /></td>
                    <td className="px-5 py-4 align-middle text-right"><div className="h-4 w-20 bg-stone-100 rounded ml-auto" /></td>
                    <td className="px-5 py-4 align-middle text-center"><div className="h-6 w-20 bg-stone-100 rounded-lg mx-auto" /></td>
                    <td className="px-5 py-4 align-middle text-center"><div className="h-8 w-16 bg-stone-100 rounded-xl mx-auto" /></td>
                </tr>
            ))}
        </tbody>
    );
}

export default function TransactionLedgerTable({
    paginatedHistory = [],
    totalHistoryPages = 1,
    currentPage = 1,
    onPageChange,
    onView,
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
    // Client-side sort on current paginated collection for instant feedback
    const sortedData = useMemo(() => {
        if (!paginatedHistory || paginatedHistory.length === 0) return [];
        if (!sortConfig.key) return paginatedHistory;

        return [...paginatedHistory].sort((a, b) => {
            let valA, valB;
            if (sortConfig.key === 'ref') {
                valA = String(a.order_number || a.id || '');
                valB = String(b.order_number || b.id || '');
            } else if (sortConfig.key === 'category') {
                valA = a.type || '';
                valB = b.type || '';
            } else if (sortConfig.key === 'desc') {
                valA = a.type === 'payroll' ? (a.month || '') : a.type === 'sale' ? (a.order_number || '') : (a.supply?.name || a.detail_name || '');
                valB = b.type === 'payroll' ? (b.month || '') : b.type === 'sale' ? (b.order_number || '') : (b.supply?.name || b.detail_name || '');
            } else if (sortConfig.key === 'date') {
                valA = new Date(a.activity?.last_reviewed_at || a.activity?.requested_at || a.created_at || 0).getTime();
                valB = new Date(b.activity?.last_reviewed_at || b.activity?.requested_at || b.created_at || 0).getTime();
            } else if (sortConfig.key === 'amount') {
                valA = Number(a.amount || 0);
                valB = Number(b.amount || 0);
            } else if (sortConfig.key === 'status') {
                valA = a.status || '';
                valB = b.status || '';
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
    }, [paginatedHistory, sortConfig]);

    return (
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xs">
            {/* Table Container */}
            <div className={`overflow-x-auto transition-opacity duration-200 ${isSearching ? 'opacity-50 pointer-events-none' : ''}`}>
                <table className="w-full min-w-[850px] text-left">
                    <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider select-none border-b border-gray-200">
                        <tr>
                            <SortableHeader
                                label="Ref / Order #"
                                sortKey="ref"
                                currentSort={sortConfig}
                                onSort={onSort}
                                align="left"
                            />
                            <SortableHeader
                                label="Category"
                                sortKey="category"
                                currentSort={sortConfig}
                                onSort={onSort}
                                align="center"
                            />
                            <SortableHeader
                                label="Description"
                                sortKey="desc"
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
                            <th className="px-5 py-4 text-center align-middle whitespace-nowrap text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
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
                                const isApproved = ['paid', 'completed', 'accounting_approved', 'ordered', 'received', 'partially_received'].includes(String(item.status).toLowerCase());
                                const isSelected = selectedId === item.id && selectedType === item.type;
                                const isSale = item.type === 'sale';
                                const isPayout = item.type === 'payout';
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
                                        {/* Ref / Order # */}
                                        <td className="px-5 py-3.5 align-middle text-left whitespace-nowrap font-bold text-stone-900">
                                            {item.order_number ? `#${item.order_number}` : `#${item.id}`}
                                        </td>

                                        {/* Category Column (Centered) */}
                                        <td className="px-5 py-3.5 align-middle text-center whitespace-nowrap">
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${typeTone(item.type)}`}>
                                                {isPayroll ? (
                                                    <Users size={12} strokeWidth={2.5} className="text-stone-600" />
                                                ) : isSale || isPayout ? (
                                                    <Banknote size={12} strokeWidth={2.5} className={isSale ? "text-teal-600" : "text-blue-600"} />
                                                ) : (
                                                    <FileText size={12} strokeWidth={2.5} className="text-clay-700" />
                                                )}
                                                <span>
                                                    {isPayroll
                                                        ? 'Payroll'
                                                        : isSale
                                                        ? 'Sale'
                                                        : isPayout
                                                        ? 'Payout'
                                                        : 'Supply'}
                                                </span>
                                            </span>
                                        </td>

                                        {/* Description Column (Left-aligned) */}
                                        <td className="px-5 py-3.5 align-middle text-left">
                                            <p className="font-bold text-stone-900 leading-snug">
                                                {isPayroll
                                                    ? `Payroll for ${item.month}`
                                                    : isSale
                                                    ? `Customer Order #${item.order_number || item.id}`
                                                    : isPayout
                                                    ? `Earnings Transfer (${item.detail_name || 'GCash'})`
                                                    : item.supply?.name}
                                            </p>
                                            <p className="text-[11px] text-stone-500 mt-0.5 font-medium">
                                                {isSale
                                                    ? `Customer: ${item.requester?.name || 'Guest'}`
                                                    : isPayout
                                                    ? `Ref: ${item.detail_category || 'Direct Transfer'}`
                                                    : `Requested by ${item.requester?.name || 'Unknown'}`}
                                            </p>
                                            {item.rejection_reason && (
                                                <p className="text-[11px] font-medium text-rose-700 mt-0.5">
                                                    Note: {item.rejection_reason}
                                                </p>
                                            )}
                                        </td>

                                        {/* Date Column (Centered) */}
                                        <td className="px-5 py-3.5 align-middle text-center whitespace-nowrap text-stone-600 font-medium">
                                            {formatDate(item.activity?.last_reviewed_at || item.activity?.requested_at || item.created_at)}
                                        </td>

                                        {/* Amount Column (Right-aligned) */}
                                        <td className="px-5 py-3.5 align-middle text-right whitespace-nowrap">
                                            <span className={`font-black text-sm ${
                                                isSale
                                                    ? 'text-emerald-700'
                                                    : isPayout
                                                    ? 'text-stone-900'
                                                    : isApproved
                                                    ? 'text-stone-700'
                                                    : 'text-stone-900'
                                            }`}>
                                                {isSale
                                                    ? `+ ${formatShortMoney(item.amount)}`
                                                    : isApproved && !isPayout
                                                    ? `- ${formatShortMoney(item.amount)}`
                                                    : formatShortMoney(item.amount)}
                                            </span>
                                        </td>

                                        {/* Status Column (Centered) */}
                                        <td className="px-5 py-3.5 align-middle text-center whitespace-nowrap">
                                            <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${statusTone(item.status)}`}>
                                                {isPayout ? 'Transferred' : String(item.status).replace(/_/g, ' ')}
                                            </span>
                                        </td>

                                        {/* Actions Column (Centered) */}
                                        <td className="px-5 py-3.5 align-middle text-center whitespace-nowrap">
                                            <button
                                                type="button"
                                                onClick={() => onView(item, 'history')}
                                                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 px-3.5 py-1.5 text-xs font-bold transition shadow-2xs active:scale-95 min-h-[36px]"
                                            >
                                                <Eye size={13} strokeWidth={2.5} />
                                                <span>Audit</span>
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
                                        compact
                                        icon={History}
                                        title="No transaction history yet"
                                        description={
                                            searchTerm || entryTypeFilter !== 'all'
                                                ? 'Try another search or clear the active filter to review more ledger history.'
                                                : undefined
                                        }
                                    />
                                </td>
                            </tr>
                        </tbody>
                    )}
                </table>
            </div>

            {/* Pagination */}
            {totalHistoryPages > 1 && (
                <div className="border-t border-stone-200 bg-[#FAF9F6] px-4 py-2">
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
