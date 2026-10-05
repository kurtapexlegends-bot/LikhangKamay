import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import {
    History,
    X,
    Clock,
    User as UserIcon,
    Globe,
    ChevronDown,
    ChevronUp,
    Shield,
    FileText,
    ArrowRight,
    Loader2,
} from 'lucide-react';

export default function ActivityHistoryDrawer({
    isOpen = false,
    onClose,
    subjectType,
    subjectId,
    title = 'Activity History & Audit Trail',
    subtitle = 'Detailed chronological timeline of administrative and operational actions',
}) {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [expandedItemIds, setExpandedItemIds] = useState(new Set());

    useEffect(() => {
        if (!isOpen || !subjectType || !subjectId) return;

        let isMounted = true;

        const fetchHistory = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await window.axios.get(route('admin.operations.subject-history'), {
                    params: {
                        subject_type: subjectType,
                        subject_id: subjectId,
                    },
                });
                if (isMounted) {
                    setActivities(res.data?.activities || []);
                    setLoading(false);
                }
            } catch (err) {
                if (isMounted) {
                    console.error('Failed to load activity history', err);
                    setError('Unable to retrieve audit history for this record.');
                    setLoading(false);
                }
            }
        };

        fetchHistory();

        return () => {
            isMounted = false;
        };
    }, [isOpen, subjectType, subjectId]);

    const toggleExpand = (id) => {
        setExpandedItemIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const d = new Date(dateString);
        return d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs transition-opacity" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-hidden">
                    <div className="absolute inset-0 overflow-hidden">
                        <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
                            <Transition.Child
                                as={Fragment}
                                enter="transform transition ease-in-out duration-300"
                                enterFrom="translate-x-full"
                                enterTo="translate-x-0"
                                leave="transform transition ease-in-out duration-200"
                                leaveFrom="translate-x-0"
                                leaveTo="translate-x-full"
                            >
                                <Dialog.Panel className="pointer-events-auto w-screen max-w-md bg-white border-l border-stone-200 shadow-2xl flex flex-col">
                                    {/* Header */}
                                    <div className="p-5 border-b border-stone-100 bg-stone-50/70 flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-clay-100 text-clay-700 flex items-center justify-center shrink-0">
                                                <History size={18} />
                                            </div>
                                            <div>
                                                <Dialog.Title className="text-sm font-bold text-stone-900">
                                                    {title}
                                                </Dialog.Title>
                                                <p className="text-[11.5px] text-stone-500 font-medium mt-0.5">
                                                    {subtitle}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-200/60 transition"
                                            aria-label="Close drawer"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>

                                    {/* Body */}
                                    <div className="flex-1 overflow-y-auto p-5 space-y-4">
                                        {loading && (
                                            <div className="flex flex-col items-center justify-center py-16 text-stone-400">
                                                <Loader2 size={24} className="animate-spin text-clay-600 mb-2" />
                                                <span className="text-xs font-semibold">Loading audit trail...</span>
                                            </div>
                                        )}

                                        {error && (
                                            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                                                {error}
                                            </div>
                                        )}

                                        {!loading && !error && activities.length === 0 && (
                                            <div className="text-center py-16 text-stone-400">
                                                <FileText size={32} className="mx-auto mb-2 opacity-40" />
                                                <p className="text-xs font-bold text-stone-600">No activity recorded yet</p>
                                                <p className="text-[11px] text-stone-400 mt-1">
                                                    Events related to this item will be indexed here automatically.
                                                </p>
                                            </div>
                                        )}

                                        {!loading && !error && activities.length > 0 && (
                                            <div className="relative border-l border-stone-200 ml-3 space-y-6">
                                                {activities.map((item) => {
                                                    const isExpanded = expandedItemIds.has(item.id);
                                                    const diff = item.metadata?.diff || null;
                                                    const ip = item.metadata?.ip_address || null;
                                                    const hasDetails = diff && Object.keys(diff).length > 0;

                                                    return (
                                                        <div key={item.id} className="relative pl-6">
                                                            {/* Timeline dot */}
                                                            <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-white border-2 border-clay-600 shadow-2xs" />

                                                            <div className="bg-white border border-stone-200/80 rounded-xl p-3.5 shadow-2xs space-y-2">
                                                                {/* Action badge & timestamp */}
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-stone-100 text-stone-700 border border-stone-200/60">
                                                                        {item.action?.replace(/[._]/g, ' ')}
                                                                    </span>
                                                                    <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-stone-400">
                                                                        <Clock size={11} />
                                                                        {formatDate(item.created_at)}
                                                                    </span>
                                                                </div>

                                                                {/* Description */}
                                                                <p className="text-xs font-medium text-stone-800 leading-snug">
                                                                    {item.description}
                                                                </p>

                                                                {/* Actor & Telemetry */}
                                                                <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1 border-t border-stone-100">
                                                                    <span className="inline-flex items-center gap-1 font-semibold text-stone-700">
                                                                        <UserIcon size={12} className="text-stone-400" />
                                                                        {item.user?.name || 'System'}{' '}
                                                                        <span className="text-[10px] font-normal text-stone-400">
                                                                            ({item.user?.role || 'Service'})
                                                                        </span>
                                                                    </span>

                                                                    {ip && (
                                                                        <span className="inline-flex items-center gap-1 text-[10px] text-stone-400 font-mono">
                                                                            <Globe size={11} />
                                                                            {ip}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {/* Expandable diff toggle */}
                                                                {hasDetails && (
                                                                    <div>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => toggleExpand(item.id)}
                                                                            className="w-full mt-2 pt-1.5 border-t border-dashed border-stone-200/80 flex items-center justify-between text-[10.5px] font-bold text-clay-700 hover:text-clay-900 transition"
                                                                        >
                                                                            <span>Audit Details & Diff</span>
                                                                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                                                        </button>

                                                                        {isExpanded && (
                                                                            <div className="mt-2 p-2.5 rounded-lg bg-stone-50 border border-stone-200/70 text-[10.5px] space-y-1.5">
                                                                                {diff.before && diff.after ? (
                                                                                    <div className="space-y-1">
                                                                                        {Object.keys(diff.after).map((key) => (
                                                                                            <div key={key} className="flex items-center justify-between font-mono">
                                                                                                <span className="text-stone-500 font-bold">{key}:</span>
                                                                                                <div className="flex items-center gap-1 text-right">
                                                                                                    <span className="text-rose-600 line-through">
                                                                                                        {String(diff.before?.[key] ?? 'none')}
                                                                                                    </span>
                                                                                                    <ArrowRight size={10} className="text-stone-400" />
                                                                                                    <span className="text-emerald-700 font-bold">
                                                                                                        {String(diff.after[key])}
                                                                                                    </span>
                                                                                                </div>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                ) : (
                                                                                    <pre className="text-[10px] font-mono text-stone-600 overflow-x-auto whitespace-pre-wrap">
                                                                                        {JSON.stringify(diff, null, 2)}
                                                                                    </pre>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer */}
                                    <div className="p-3.5 border-t border-stone-100 bg-stone-50/50 flex items-center justify-between text-[11px] text-stone-500">
                                        <span className="flex items-center gap-1 font-medium">
                                            <Shield size={12} className="text-emerald-600" />
                                            Platform Audit Ledger
                                        </span>
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="px-3 py-1 rounded-md text-xs font-bold text-stone-700 bg-white border border-stone-200 hover:bg-stone-50 transition shadow-2xs"
                                        >
                                            Close
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
