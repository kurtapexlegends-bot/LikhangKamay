import React from 'react';
import SlideOverDrawer from '@/Components/SlideOverDrawer';
import {
    categoryMeta,
    severityTone,
    statusTone,
    actorTypeLabel,
    moduleLabel,
    formatDateTime,
    formatRelative,
    formatStatusLabel
} from '@/utils/auditLogHelpers';
import { ArrowUpRight } from 'lucide-react';
import { Link } from '@inertiajs/react';

export default function LogDetailsModal({ isOpen, onClose, entry }) {
    if (!entry) return null;

    const meta = categoryMeta[entry.category] || categoryMeta.operations;
    const statusClass = statusTone[entry.status] || 'bg-stone-100 text-stone-600 border-stone-200';
    const severityClass = severityTone[entry.severity] || severityTone.info;

    return (
        <SlideOverDrawer
            show={isOpen}
            onClose={onClose}
            title="Event Details"
            position="bottom"
            widthClass="max-w-xl"
        >
            <div className="space-y-6 pb-6">
                {/* Badges Row */}
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${meta.chip}`}>
                        {meta.label}
                    </span>
                    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${severityClass}`}>
                        {formatStatusLabel(entry.severity)}
                    </span>
                    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${statusClass}`}>
                        {formatStatusLabel(entry.status)}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">
                        {formatRelative(entry.occurred_at)}
                    </span>
                </div>

                {/* Event Heading */}
                <div>
                    <h3 className="text-base font-bold text-stone-900 leading-tight">
                        {entry.title}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-stone-500 leading-relaxed">
                        {entry.summary}
                    </p>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <CompactMeta label="Logged At" value={formatDateTime(entry.occurred_at)} />
                    <CompactMeta label="Actor" value={entry.actor_name || 'System'} />
                    <CompactMeta label="Actor Type" value={actorTypeLabel[entry.actor_type] || formatStatusLabel(entry.actor_type)} />
                    <CompactMeta label="Module" value={moduleLabel[entry.module] || formatStatusLabel(entry.module)} />
                    {entry.subject && <CompactMeta label="Subject" value={entry.subject} />}
                    {entry.reference && <CompactMeta label="Reference" value={entry.reference} />}
                    {entry.amount_label && <CompactMeta label="Amount" value={entry.amount_label} color="text-emerald-700" />}
                </div>

                {/* Detailed lines */}
                {entry.detail_lines?.length ? (
                    <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4">
                        <h4 className="text-[10px] font-bold uppercase tracking-[0.16em] text-stone-400 mb-2.5">Activity Notes</h4>
                        <ul className="space-y-2 text-xs font-medium text-stone-600">
                            {entry.detail_lines.map((line, idx) => (
                                <li key={idx} className="flex gap-2 items-start">
                                    <span className="h-1.5 w-1.5 rounded-full bg-stone-300 shrink-0 mt-1.5" />
                                    <span>{line}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : null}

                {/* Diffs Block */}
                {(entry.before || entry.after) && (
                    <div className="grid gap-3 sm:grid-cols-2">
                        {entry.before ? <DiffBlock title="Changes Before" values={entry.before} /> : <div />}
                        {entry.after ? <DiffBlock title="Changes After" values={entry.after} /> : <div />}
                    </div>
                )}

                {/* Target URL action button */}
                {entry.target_url && (
                    <div className="pt-2 border-t border-stone-100">
                        <Link
                            href={entry.target_url}
                            className="w-full flex items-center justify-center gap-2 rounded-xl bg-clay-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-clay-200 transition hover:bg-clay-700 min-h-[44px]"
                            onClick={onClose}
                        >
                            {entry.target_label || 'View Record'}
                            <ArrowUpRight size={14} strokeWidth={2.8} />
                        </Link>
                    </div>
                )}
            </div>
        </SlideOverDrawer>
    );
}

function CompactMeta({ label, value, color = 'text-stone-700' }) {
    return (
        <div className="flex items-center justify-between whitespace-nowrap bg-stone-50 px-3 py-2 rounded-xl border border-stone-200/60 min-h-[44px]">
            <span className="text-[9px] font-black uppercase tracking-[0.16em] text-stone-400">{label}</span>
            <span className={`text-xs font-bold ${color}`}>{value}</span>
        </div>
    );
}

function DiffBlock({ title, values }) {
    return (
        <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-stone-400 border-b border-stone-100 pb-2 mb-2.5">{title}</p>
            <div className="space-y-2">
                {Object.entries(values).map(([key, value]) => (
                    <div key={key} className="flex flex-col text-xs gap-0.5">
                        <span className="font-bold capitalize text-stone-400 text-[10px]">{key}</span>
                        <span className="font-medium text-stone-700 break-all">{value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
