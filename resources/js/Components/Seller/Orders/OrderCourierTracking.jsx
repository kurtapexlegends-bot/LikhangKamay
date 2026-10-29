import React, { useState } from "react";
import { Truck, ExternalLink, Map, X } from "lucide-react";
import { sellerCourierTrackingState } from "@/utils/orderHelpers";
import BuyerDeliveryTrackingMap from "@/Components/Consumer/Buyer/MyOrders/BuyerDeliveryTrackingMap";
import Modal from "@/Components/Modal";

/**
 * Minimalist & Straightforward Courier Tracking
 * - Clean, non-intrusive 1-row status strip.
 * - Single-click trigger to open full interactive GPS tracking map in a modal.
 * - Zero nested accordion clutter, zero text clipping.
 */
export default function OrderCourierTracking({ order }) {
    const isReplacementExchange = order?.delivery?.flow_type === "replacement_exchange";

    if (
        !order?.delivery ||
        order.status === "Pending" ||
        (!isReplacementExchange && ["Cancelled", "Rejected"].includes(order.status))
    ) {
        return null;
    }

    const trackingState = sellerCourierTrackingState(order);
    const [showMapModal, setShowMapModal] = useState(false);

    return (
        <>
            <div className="flex items-center justify-between gap-1.5 rounded-xl bg-stone-50/80 px-2 py-1.5 border border-stone-200/70 shadow-2xs">
                <div className="flex items-center gap-1.5 shrink-0">
                    <Truck size={13} className="text-clay-600 shrink-0" />
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 ${trackingState.tone}`}>
                        {trackingState.label}
                    </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    <button
                        type="button"
                        onClick={() => setShowMapModal(true)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[10.5px] font-bold text-clay-700 bg-white border border-stone-200 rounded-md hover:bg-clay-50 hover:border-clay-300 transition shadow-2xs cursor-pointer"
                        title="View live GPS courier tracking map"
                    >
                        <Map size={10} className="text-clay-600" />
                        <span>Live Map</span>
                    </button>

                    {order.delivery.share_link && (
                        <a
                            href={order.delivery.share_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-stone-400 hover:text-stone-700 bg-white border border-stone-200 rounded-md transition shadow-2xs"
                            title="Open in Lalamove"
                        >
                            <ExternalLink size={10} />
                        </a>
                    )}
                </div>
            </div>

            {/* Full-Fidelity Interactive Tracking Modal */}
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
        </>
    );
}
