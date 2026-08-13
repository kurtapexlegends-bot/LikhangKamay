import React, { useState, useMemo } from 'react';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import CompactPagination from '@/Components/CompactPagination';
import FilterToolbarHeader from '@/Components/Seller/Shared/FilterToolbarHeader';
import { Shield } from 'lucide-react';
import {
    STAFF_ACCESS_EVENT_LABELS,
    formatRelativeAuditTime
} from '@/utils/hrHelpers';

export default function AccessAuditLog({
    activeTab,
    setActiveTab,
    pendingPayrollCount = 0,
    staffCount = 0,
    auditEntries = []
}) {
    const [search, setSearch] = useState('');
    const [eventFilter, setEventFilter] = useState('all');

    const activeFilterCount = eventFilter !== 'all' ? 1 : 0;

    const filteredEntries = useMemo(() => {
        return auditEntries.filter((audit) => {
            const matchesEvent = eventFilter === 'all' || audit.event === eventFilter;
            const q = search.toLowerCase();
            const matchesSearch = !search ||
                (audit.staff_user?.name && audit.staff_user.name.toLowerCase().includes(q)) ||
                (audit.actor?.name && audit.actor.name.toLowerCase().includes(q)) ||
                (audit.summary && audit.summary.toLowerCase().includes(q)) ||
                (audit.event && audit.event.toLowerCase().includes(q));

            return matchesEvent && matchesSearch;
        });
    }, [auditEntries, eventFilter, search]);

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);
    const paginatedEntries = filteredEntries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="rounded-3xl border border-stone-200/80 bg-white shadow-sm flex flex-col min-h-[300px] relative">
            <FilterToolbarHeader
                tabs={[
                    { key: 'directory', label: 'Directory', count: staffCount },
                    { key: 'payroll', label: 'Payroll History', count: pendingPayrollCount },
                    { key: 'access', label: 'Access History' },
                ]}
                activeTab={activeTab || 'access'}
                onTabChange={setActiveTab}
                searchQuery={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search staff, actor, event..."
                activeFiltersCount={activeFilterCount}
                filterPopoverTitle="Filter Event Type"
                filterPopoverFields={
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                            Event Type
                        </label>
                        <select
                            value={eventFilter}
                            onChange={(e) => setEventFilter(e.target.value)}
                            className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-800 outline-none focus:border-clay-500 bg-white"
                        >
                            <option value="all">All Event Types</option>
                            <option value="login_created">Login Created</option>
                            <option value="roles_updated">Roles & Permissions Updated</option>
                            <option value="suspended">Staff Suspended</option>
                            <option value="restored">Access Restored</option>
                            <option value="login_deleted">Account Deleted</option>
                        </select>
                    </div>
                }
                onApplyFilters={() => {}}
                onResetFilters={() => setEventFilter('all')}
                activeFilterTags={
                    eventFilter !== 'all'
                        ? [
                              {
                                  label: `Event: ${STAFF_ACCESS_EVENT_LABELS[eventFilter] || eventFilter}`,
                                  onRemove: () => setEventFilter('all'),
                              },
                          ]
                        : []
                }
                containerClassName="rounded-t-3xl border-x-0 border-t-0 border-b border-stone-200/80 shadow-none bg-stone-50/40"
            />
            <div className="divide-y divide-stone-100">
                {filteredEntries.length > 0 ? (
                    paginatedEntries.map((audit) => (
                        <div key={audit.id} className="flex flex-col gap-2 px-5 py-4 md:flex-row md:items-start md:justify-between">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-stone-600">
                                        {STAFF_ACCESS_EVENT_LABELS[audit.event] || 'Access Update'}
                                    </span>
                                    {audit.staff_user?.name && (
                                        <span className="text-[11px] font-bold text-stone-700">
                                            {audit.staff_user.name}
                                        </span>
                                    )}
                                </div>
                                <p className="mt-1 text-sm font-medium text-stone-900">{audit.summary}</p>
                                {audit.details?.changes?.length > 0 && (
                                    <p className="mt-1 text-[12px] text-stone-500">
                                        {audit.details.changes.join(' • ')}
                                    </p>
                                )}
                            </div>
                            <div className="text-[11px] font-medium text-stone-400 md:text-right">
                                <div>{audit.actor?.name || 'System'}</div>
                                <div>{formatRelativeAuditTime(audit.created_at)}</div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="p-6">
                        <WorkspaceEmptyState
                            icon={Shield}
                            title="No matching access changes"
                            description={search || eventFilter !== 'all'
                                ? 'No access history records match your search query or filter selection.'
                                : 'Staff login creation, permission updates, suspensions, and restorations will appear here once portal access starts changing.'}
                        />
                    </div>
                )}
            </div>

            {/* Pagination Component */}
            <CompactPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredEntries.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                itemLabel="access logs"
            />
        </div>
    );
}
