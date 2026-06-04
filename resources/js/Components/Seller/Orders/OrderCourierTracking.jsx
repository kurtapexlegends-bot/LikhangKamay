import React from "react";
import { Truck, ChevronDown, ChevronRight, ExternalLink, Hash, Clock } from "lucide-react";
import { sellerCourierTrackingState, formatTimelineStamp } from "@/utils/orderHelpers";

export default function OrderCourierTracking({
    order,
    expandedCourierTrackings,
    toggleCourierTrackingExpansion
}) {
    if (!order.delivery) return null;

    const isExpanded = expandedCourierTrackings.has(order.id);
    const trackingState = sellerCourierTrackingState(order);

    return (
        <div className="rounded-xl border border-stone-200/80 bg-[#FCF7F2] p-2 shadow-sm transition-colors hover:border-clay-300">
            <button
                type="button"
                onClick={() => toggleCourierTrackingExpansion(order.id)}
                className={`flex items-center justify-between gap-2 w-full cursor-pointer select-none p-2 rounded-xl hover:bg-clay-50/50 transition-colors text-left focus:outline-none min-h-[44px] ${
                    isExpanded ? "mb-2 border-b border-clay-100 pb-2" : ""
                }`}
            >
                <div className="flex items-center gap-1.5">
                    <Truck size={12} className="text-clay-600" />
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-clay-700">
                        Courier Tracking
                    </p>
                </div>
                <div className="flex items-center gap-1.5">
                    {!isExpanded && (
                        <div className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-bold shadow-sm ${trackingState.tone}`}>
                            {trackingState.label}
                        </div>
                    )}
                    {isExpanded ? (
                        <ChevronDown size={12} className="text-clay-500" />
                    ) : (
                        <ChevronRight size={12} className="text-clay-500" />
                    )}
                </div>
            </button>
            {isExpanded && (
                <div className="space-y-2 mt-1 pt-1.5 border-t border-clay-100/30">
                    <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                            {order.delivery.flow_type === "replacement_exchange" && (
                                <span className="inline-flex rounded-md border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] font-bold tracking-tight text-teal-700 shadow-sm animate-pulse">
                                    {order.delivery.flow_label}
                                </span>
                            )}
                            <div className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold shadow-sm ${trackingState.tone}`}>
                                {trackingState.label}
                            </div>
                        </div>
                        {order.delivery.share_link && (
                            <a
                                href={order.delivery.share_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-1 rounded-md border border-clay-200 bg-white px-2 py-1 text-[10px] font-bold text-clay-700 hover:bg-clay-50 hover:text-clay-800 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all shrink-0 min-h-[44px]"
                            >
                                Live Track <ExternalLink size={10} />
                            </a>
                        )}
                    </div>

                    <p className="text-[11px] leading-relaxed text-stone-600 mb-2.5 font-medium">
                        {trackingState.detail}
                    </p>

                    {order.delivery.flow_type === "replacement_exchange" &&
                        order.delivery.route_legs?.length > 0 && (
                        <div className="mb-2.5 flex flex-col gap-1 rounded-lg bg-white/60 p-2 border border-stone-100/50">
                            {order.delivery.route_legs.map((leg) => (
                                <div
                                    key={`${leg.label}-${leg.from}-${leg.to}`}
                                    className="flex items-start gap-2"
                                >
                                    <div className="mt-1 h-1 w-1 shrink-0 rounded-full bg-teal-400" />
                                    <p className="text-[10px] text-stone-700 font-medium">
                                        <span className="font-bold text-teal-800">
                                            {leg.label}:
                                        </span>{" "}
                                        {leg.from}{" "}
                                        <span className="mx-0.5 text-stone-400">→</span>{" "}
                                        {leg.to}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}

                    {(order.delivery.external_order_id || order.delivery.last_updated_at) && (
                        <div className="flex flex-wrap gap-1.5 mt-2 pt-2.5 border-t border-stone-200/50">
                            {order.delivery.external_order_id && (
                                <div className="flex items-center gap-1 px-1.5 text-[9px]">
                                    <Hash size={10} className="text-stone-400" />
                                    <span className="font-bold text-stone-600">
                                        ID: {order.delivery.external_order_id}
                                    </span>
                                </div>
                            )}
                            {order.delivery.last_updated_at && (
                                <div className="flex items-center gap-1 px-1.5 text-[9px]">
                                    <Clock size={10} className="text-stone-400" />
                                    <span className="font-bold text-stone-600">
                                        Sync: {formatTimelineStamp(order.delivery.last_updated_at)}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
