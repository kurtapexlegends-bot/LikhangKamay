/* global route */
import React from 'react';
import { router } from '@inertiajs/react';
import { History, CheckCircle2, Users } from 'lucide-react';

export default function PolicyVersionHistory({ versions = [], onLoadIntoEditor }) {
    const handleActivate = (policyId) => {
        router.post(route('admin.policies.activate', policyId), {}, {
            preserveScroll: true,
        });
    };

    return (
        <section className="bg-white border border-stone-200/90 rounded-2xl shadow-2xs overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-stone-100 bg-stone-50/40">
                <div className="flex items-center gap-2">
                    <History size={14} className="text-clay-600 shrink-0" />
                    <h3 className="text-xs font-bold text-stone-900">Published Versions</h3>
                </div>
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600">
                    {versions.length}
                </span>
            </div>

            {versions.length === 0 ? (
                <p className="px-4 py-5 text-xs text-stone-500">No published versions recorded yet.</p>
            ) : (
                <div className="divide-y divide-stone-100 max-h-[380px] overflow-y-auto">
                    {versions.map((ver) => (
                        <div
                            key={ver.id}
                            className={`px-4 py-3 text-xs space-y-2 transition ${
                                ver.is_active ? 'bg-clay-50/30' : 'hover:bg-stone-50/50'
                            }`}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="font-mono font-bold text-stone-900">v{ver.version}</span>
                                    {ver.is_active && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                            <CheckCircle2 size={10} /> Active
                                        </span>
                                    )}
                                </div>
                                <span
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-500 shrink-0"
                                    title="Recorded user consents on this version"
                                >
                                    <Users size={11} /> {ver.consents_count}
                                </span>
                            </div>

                            <p className="text-[11px] text-stone-500">
                                {ver.published_at || 'Unpublished'}
                            </p>

                            <div className="flex items-center gap-2 pt-0.5">
                                <button
                                    type="button"
                                    onClick={() => onLoadIntoEditor(ver)}
                                    className="rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-bold text-stone-700 hover:bg-stone-50 transition cursor-pointer"
                                >
                                    Load Draft
                                </button>
                                {!ver.is_active && (
                                    <button
                                        type="button"
                                        onClick={() => handleActivate(ver.id)}
                                        className="rounded-lg bg-stone-900 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-stone-800 transition cursor-pointer"
                                    >
                                        Activate
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
