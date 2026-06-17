import React from 'react';
import { Link } from '@inertiajs/react';
import { ArrowUpRight } from 'lucide-react';
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

export default function AuditLogsList({ groupedEntries, onEntryClick }) {
    return (
        <div className="divide-y divide-stone-100">
            {groupedEntries.map((group) => (
                <div key={group.key}>
                    <div className="sticky top-0 z-10 border-b border-stone-100 bg-stone-50/90 px-6 py-2 backdrop-blur-sm">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-500">{group.label}</p>
                    </div>

                    <div className="divide-y divide-stone-100">
                        {group.entries.map((entry) => {
                            const meta = categoryMeta[entry.category] || categoryMeta.operations;
                            const Icon = meta.icon;
                            const statusClass = statusTone[entry.status] || 'bg-stone-100 text-stone-600 border-stone-200';
                            const severityClass = severityTone[entry.severity] || severityTone.info;

                            return (
                                <article
                                    key={entry.id}
                                    onClick={() => onEntryClick(entry)}
                                    className="group px-5 py-4 sm:px-8 hover:bg-stone-50/50 transition-colors cursor-pointer lg:cursor-default"
                                >
                                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                        <div className="flex min-w-0 gap-3 flex-1">
                                            <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-transform group-hover:scale-105 ${meta.iconWrap}`}>
                                                <Icon size={16} strokeWidth={2.5} />
                                            </div>

                                            <div className="min-w-0 flex-1">
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

                                                <div className="mt-1.5">
                                                    <h4 className="text-[13px] font-bold text-stone-900 leading-tight">
                                                        {entry.title}
                                                    </h4>
                                                    <p className="mt-1 text-[12px] font-medium text-stone-500 leading-tight">
                                                        {entry.summary}
                                                    </p>
                                                </div>

                                                <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                                                    <CompactMeta label="Logged" value={formatDateTime(entry.occurred_at)} />
                                                    <CompactMeta label="Actor" value={entry.actor_name || 'System'} />
                                                    <CompactMeta label="Actor Type" value={actorTypeLabel[entry.actor_type] || formatStatusLabel(entry.actor_type)} />
                                                    <CompactMeta label="Module" value={moduleLabel[entry.module] || formatStatusLabel(entry.module)} />
                                                    {entry.subject && <CompactMeta label="Subject" value={entry.subject} />}
                                                    {entry.reference && <CompactMeta label="Ref" value={entry.reference} />}
                                                    {entry.amount_label && <CompactMeta label="Amount" value={entry.amount_label} color="text-emerald-700" />}
                                                </div>

                                                {/* Desktop Only Details list */}
                                                {entry.detail_lines?.length ? (
                                                    <div className="hidden lg:block mt-2.5 rounded-xl border border-stone-100 bg-stone-50/50 px-3 py-2">
                                                        <ul className="space-y-1 text-[11px] font-medium text-stone-500">
                                                            {entry.detail_lines.map((line) => (
                                                                <li key={line} className="flex gap-1.5 items-center">
                                                                    <span className="h-0.5 w-2 rounded-full bg-stone-300 shrink-0" />
                                                                    <span className="truncate">{line}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                ) : null}

                                                {/* Desktop Only Diff Changes */}
                                                {(entry.before || entry.after) ? (
                                                    <div className="hidden lg:grid mt-3 gap-3 lg:grid-cols-2">
                                                        {entry.before ? <DiffBlock title="Before" values={entry.before} /> : <div />}
                                                        {entry.after ? <DiffBlock title="After" values={entry.after} /> : <div />}
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>

                                        {entry.target_url ? (
                                            <div className="hidden lg:block shrink-0">
                                                <Link
                                                    href={entry.target_url}
                                                    preserveScroll
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-stone-700 shadow-sm transition-all hover:border-stone-300 hover:bg-stone-50 hover:text-clay-700"
                                                >
                                                    {entry.target_label || 'View Record'}
                                                    <ArrowUpRight size={12} strokeWidth={2.8} />
                                                </Link>
                                            </div>
                                        ) : null}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}

function CompactMeta({ label, value, color = 'text-stone-700' }) {
    return (
        <div className="flex items-center gap-1.5 whitespace-nowrap bg-stone-50 px-2 py-1 rounded border border-stone-200">
            <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-stone-400">{label}</span>
            <span className={`text-[10px] font-bold ${color}`}>{value}</span>
        </div>
    );
}

function DiffBlock({ title, values }) {
    return (
        <div className="rounded-xl border border-stone-100 bg-stone-50/70 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-stone-400">{title}</p>
            <div className="mt-2 space-y-1">
                {Object.entries(values).map(([key, value]) => (
                    <div key={key} className="flex items-start gap-2 text-[11px]">
                        <span className="min-w-20 font-bold capitalize text-stone-500">{key}</span>
                        <span className="font-medium text-stone-700 break-all">{value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
