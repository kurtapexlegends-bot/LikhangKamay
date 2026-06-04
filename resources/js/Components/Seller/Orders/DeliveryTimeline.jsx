import React from "react";
import { Activity, ChevronDown, ChevronRight, Clock } from "lucide-react";
import { timelineSourceTone, formatTimelineStamp } from "@/utils/orderHelpers";

export default function DeliveryTimeline({
    order,
    expandedTimelines,
    toggleTimelineExpansion
}) {
    if (!order.timeline || order.timeline.length === 0) return null;

    const isExpanded = expandedTimelines.has(order.id);

    return (
        <div className="rounded-xl border border-stone-200/80 bg-white p-2 shadow-sm transition-colors hover:border-clay-200 flex flex-col">
            <button
                type="button"
                onClick={() => toggleTimelineExpansion(order.id)}
                className="flex items-center justify-between gap-2 cursor-pointer select-none hover:bg-stone-50/50 p-2.5 rounded-xl transition-colors text-left w-full min-h-[44px] focus-visible:outline-none"
            >
                <div className="flex items-center gap-1.5">
                    <Activity size={12} className="text-stone-400" />
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-stone-500">
                        Recent Activity
                    </p>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[9px] font-bold text-stone-500">
                        {order.timeline.length} events
                    </span>
                    {isExpanded ? (
                        <ChevronDown size={12} className="text-stone-400" />
                    ) : (
                        <ChevronRight size={12} className="text-stone-400" />
                    )}
                </div>
            </button>
            {isExpanded && (
                <div className="space-y-3 pl-1 mt-3 border-t border-stone-100 pt-3">
                    {order.timeline.slice(0, 4).map((entry, i) => (
                        <div key={entry.key || i} className="relative flex gap-3">
                            <div className="flex flex-col items-center shrink-0">
                                <div className="h-2 w-2 rounded-full bg-clay-500 ring-4 ring-white shadow-sm" style={{ marginTop: '6px' }} />
                                {i !== order.timeline.slice(0, 4).length - 1 && (
                                    <div className="w-[1.5px] flex-1 bg-stone-200 my-1" />
                                )}
                            </div>
                            <div className="min-w-0 flex-1 bg-stone-50/50 rounded-xl p-2.5 border border-stone-100/50">
                                <div className="flex flex-wrap items-center justify-between gap-1.5">
                                    <p className="text-[11px] font-bold text-stone-800">
                                        {entry.label}
                                    </p>
                                    <span
                                        className={`inline-flex items-center justify-center rounded-md px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider shadow-sm ${timelineSourceTone(entry.source)}`}
                                    >
                                        {entry.source}
                                    </span>
                                </div>
                                {entry.description && (
                                    <p className="mt-1 text-[10px] leading-relaxed text-stone-600">
                                        {entry.description}
                                    </p>
                                )}
                                <div className="mt-1.5 flex items-center gap-1 text-[9px] font-medium text-stone-400">
                                    <Clock size={10} />
                                    <span>
                                        {formatTimelineStamp(entry.timestamp)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
