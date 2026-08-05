import React, { useState } from 'react';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import TextInput from '@/Components/TextInput';
import { Shield, Search } from 'lucide-react';
import {
    STAFF_ACCESS_EVENT_LABELS,
    formatRelativeAuditTime
} from '@/utils/hrHelpers';

export default function AccessAuditLog({ auditEntries = [] }) {
    const [search, setSearch] = useState('');
    const [eventFilter, setEventFilter] = useState('all');

    const filteredEntries = auditEntries.filter((audit) => {
        const matchesEvent = eventFilter === 'all' || audit.event === eventFilter;
        const q = search.toLowerCase();
        const matchesSearch = !search ||
            (audit.staff_user?.name && audit.staff_user.name.toLowerCase().includes(q)) ||
            (audit.actor?.name && audit.actor.name.toLowerCase().includes(q)) ||
            (audit.summary && audit.summary.toLowerCase().includes(q)) ||
            (audit.event && audit.event.toLowerCase().includes(q));

        return matchesEvent && matchesSearch;
    });

    return (
        <div className="overflow-hidden rounded-[1.25rem] border border-stone-200 bg-white shadow-sm flex flex-col min-h-[300px]">
            <div className="border-b border-stone-100 px-6 py-4 bg-[#FDFBF9]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400">Access Control</p>
                        <h3 className="mt-1 text-sm font-bold tracking-tight text-stone-900">Staff Access History</h3>
                        <p className="mt-1 text-[11px] font-medium text-stone-500">Track who changed staff login access, roles, and permissions.</p>
                    </div>

                    {/* Filter & Search Bar */}
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                            <TextInput
                                type="text"
                                placeholder="Search staff, actor, event..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 pr-3 py-1.5 text-xs bg-white border-stone-200 rounded-xl w-full sm:w-56"
                            />
                        </div>
                        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl">
                            {[
                                { key: 'all', label: 'All' },
                                { key: 'login_created', label: 'Created' },
                                { key: 'roles_updated', label: 'Roles' },
                                { key: 'suspended', label: 'Suspended' },
                                { key: 'restored', label: 'Restored' },
                            ].map((tab) => (
                                <button
                                    key={tab.key}
                                    onClick={() => setEventFilter(tab.key)}
                                    className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
                                        eventFilter === tab.key
                                            ? 'bg-white text-stone-900 shadow-xs'
                                            : 'text-stone-500 hover:text-stone-800'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <div className="divide-y divide-stone-100">
                {filteredEntries.length > 0 ? (
                    filteredEntries.map((audit) => (
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
        </div>
    );
}
