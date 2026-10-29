import React, { useState } from "react";
import { Truck, ChevronDown, ChevronRight, ExternalLink, Hash, Clock, Map, X } from "lucide-react";
import { sellerCourierTrackingState, formatTimelineStamp } from "@/utils/orderHelpers";
import BuyerDeliveryTrackingMap from "@/Components/Consumer/Buyer/MyOrders/BuyerDeliveryTrackingMap";
import Modal from "@/Components/Modal";

export default function OrderCourierTracking({
    order,
    expandedCourierTrackings,
    toggleCourierTrackingExpansion
}) {
    const isReplacementExchange = order?.delivery?.flow_type === "replacement_exchange";

    if (
        !order?.delivery ||
        order.status === "Pending" ||
        (!isReplacementExchange && ["Cancelled", "Rejected"].includes(order.status))
    ) {
        return null;
    }

    const isExpanded = expandedCourierTrackings.has(order.id);
    const trackingState = sellerCourierTrackingState(order);
    const [showMapModal, setShowMapModal] = useState(false);

    return (
        <div className="rounded-xl border border-stone-200/80 bg-[#FCF7F2] p-2 shadow-2xs transition-colors hover:border-clay-300">
            <button
                type="button"
                onClick={() => toggleCourierTrackingExpansion(order.id)}
                className={`flex items-center justify-between gap-2 w-full cursor-pointer select-none p-2 rounded-xl hover:bg-clay-50/50 transition-colors text-left focus:outline-none min-h-[44px] ${
                    isExpanded ? "mb-1.5 border-b border-clay-100/60 pb-2" : ""
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
                        <div className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-bold shadow-2xs ${trackingState.tone}`}>
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
                <div className="space-y-2 mt-1 pt-1 border-t border-clay-100/30">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                            {order.delivery.flow_type === "replacement_exchange" && (
                                <span className="inline-flex rounded-md border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] font-bold tracking-tight text-teal-700 shadow-2xs animate-pulse">
                                    {order.delivery.flow_label}
                                </span>
                            )}
                            <div className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold shadow-2xs ${trackingState.tone}`}>
                                {trackingState.label}
                            </div>
                        </div>
                    </div>

                    <p className="text-[11px] leading-relaxed text-stone-600 font-medium">
                        {trackingState.detail}
                    </p>

                    {/* Action buttons: Live Map Modal Trigger + Lalamove Link */}
                    <div className="flex items-center gap-1.5 pt-1">
                        <button
                            type="button"
                            onClick={() => setShowMapModal(true)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-clay-300 bg-clay-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-clay-700 active:scale-95 transition shadow-2xs min-h-[36px] cursor-pointer"
                            title="Open full interactive live GPS tracking map"
                        >
                            <Map size={13} />
                            <span>Live Map</span>
                        </button>

                        {order.delivery.share_link && (
                            <a
                                href={order.delivery.share_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-50 hover:text-stone-900 shadow-2xs transition shrink-0 min-h-[36px]"
                            >
                                <span>Lalamove</span>
                                <ExternalLink size={11} className="text-stone-400" />
                            </a>
                        )}
                    </div>

                    {order.delivery.flow_type === "replacement_exchange" &&
                        order.delivery.route_legs?.length > 0 && (
                        <div className="my-2 flex flex-col gap-1 rounded-lg bg-white/60 p-2 border border-stone-100/50">
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
                        <div className="flex flex-wrap items-center justify-between gap-1 text-[9px] mt-2 pt-2 border-t border-stone-200/50 text-stone-500">
                            {order.delivery.external_order_id && (
                                <div className="flex items-center gap-1">
                                    <Hash size={10} className="text-stone-400" />
                                    <span className="font-bold">ID: {order.delivery.external_order_id}</span>
                                </div>
                            )}
                            {order.delivery.last_updated_at && (
                                <div className="flex items-center gap-1">
                                    <Clock size={10} className="text-stone-400" />
                                    <span>Sync: {formatTimelineStamp(order.delivery.last_updated_at)}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Dedicated Live Courier Tracking Modal */}
            {showMapModal && (
                <Modal show={showMapModal} onClose={() => setShowMapModal(false)} maxWidth="3xl">
                    <div className="p-4 sm:p-5">
                        <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-3">
                            <div className="flex items-center gap-2">
                                <Truck size={18} className="text-clay-700" />
                                <div>
                                    <h3 className="text-sm font-bold text-stone-900 leading-none">
                                        Live Courier Tracking
                                    </h3>
                                    <p className="text-[11px] text-stone-500 font-mono mt-0.5">
                                        Order {order.id} &bull; {trackingState.label}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowMapModal(false)}
                                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="overflow-hidden rounded-xl border border-stone-200">
                            <BuyerDeliveryTrackingMap order={order} delivery={order.delivery} role="seller" />
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
