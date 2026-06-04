import React from 'react';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import { Shield } from 'lucide-react';
import {
    STAFF_ACCESS_EVENT_LABELS,
    formatRelativeAuditTime
} from '@/utils/hrHelpers';

export default function AccessAuditLog({ auditEntries = [] }) {
    const recentEntries = auditEntries.slice(0, 6);

    return (
        <div className="overflow-hidden rounded-[1.25rem] border border-stone-200 bg-white shadow-sm flex flex-col min-h-[300px]">
            <div className="border-b border-stone-100 px-6 py-4 bg-[#FDFBF9]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400">Access Control</p>
                        <h3 className="mt-1 text-sm font-bold tracking-tight text-stone-900">Staff access activity</h3>
                        <p className="mt-1 text-[11px] font-medium text-stone-500">Track who changed staff login access and when.</p>
                    </div>
                    <span className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-stone-600 shadow-sm">
                        Recent Admin Activity
                    </span>
                </div>
            </div>
            <div className="divide-y divide-stone-100">
                {recentEntries.length > 0 ? (
                    recentEntries.map((audit) => (
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
                            title="No access changes yet"
                            description="Staff login creation, permission updates, suspensions, and restorations will appear here once portal access starts changing."
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
