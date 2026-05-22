import React from "react";
import { Activity, Clock } from "lucide-react";
import { formatTimelineStamp, timelineSourceTone } from "@/utils/orderUtils";

const OrderTimeline = ({ timeline }) => {
    if (!timeline || timeline.length === 0) return null;

    const previewTimeline = timeline.slice(0, 4);

    return (
        <div className="rounded-xl border border-stone-200/80 bg-white p-3 shadow-sm transition-colors hover:border-clay-200 flex flex-col">
            <div className="mb-3 flex items-center justify-between gap-2 border-b border-stone-100 pb-2">
                <div className="flex items-center gap-1.5">
                    <Activity size={12} className="text-stone-400" />
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-stone-500">
                        Recent Activity
                    </p>
                </div>
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[9px] font-bold text-stone-500">
                    {timeline.length} events
                </span>
            </div>
            <div className="space-y-3 pl-1">
                {previewTimeline.map((entry, i) => (
                    <div key={entry.key || i} className="relative flex items-start gap-3">
                        {i !== previewTimeline.length - 1 && (
                            <div className="absolute left-[3px] top-[14px] bottom-[-14px] w-[2px] bg-stone-100" />
                        )}
                        <div className="relative mt-1 h-2 w-2 shrink-0 rounded-full bg-clay-500 ring-4 ring-white shadow-sm" />
                        <div className="min-w-0 flex-1 bg-stone-50/50 rounded-lg p-2 border border-stone-100/50">
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
                                <span>{formatTimelineStamp(entry.timestamp)}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default OrderTimeline;
