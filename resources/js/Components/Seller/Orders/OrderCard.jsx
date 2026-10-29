import React, { useState } from "react";
import { Check, Clock, Printer, MessageCircle, MapPin, Route, Activity, X } from "lucide-react";
import BuyerAvatar from "@/Components/Seller/Orders/BuyerAvatar";
import OrderStatusBadge from "@/Components/Orders/OrderStatusBadge";
import PaymentStatusBadge from "@/Components/Orders/PaymentStatusBadge";
import OrderItemsList from "@/Components/Seller/Orders/OrderItemsList";
import OrderPricingCard from "@/Components/Seller/Orders/OrderPricingCard";
import OrderCourierTracking from "@/Components/Seller/Orders/OrderCourierTracking";
import OrderIssueBanner from "@/Components/Seller/Orders/OrderIssueBanner";
import FulfillmentActionGroup from "@/Components/Seller/Orders/FulfillmentActionGroup";
import OrderRoutePreview from "@/Components/Seller/Orders/OrderRoutePreview";
import Modal from "@/Components/Modal";
import { sellerIssueSummary, timelineSourceTone, formatTimelineStamp } from "@/utils/orderHelpers";

/**
 * Polished Variant 1: Clean Action Console
 * - Preserves authentic LikhangKamay order card architecture.
 * - Relocates "Recent Activity" from the crowded action column into a clean header event trigger with a dedicated timeline modal.
 * - Eliminates redundant "Order Completed" status boxes and duplicate packing slip links.
 * - Flattens the nested Customer & Logistics box into a seamless, modern strip.
 */
export default function OrderCard({
    order,
    idx,
    canAccessMessages,
    canEditOrders,
    openChat,
    toggleOrderSelection,
    selectedOrderIds,
    initiateStatusUpdate,
    openShippingModal,
    openDispatchModal,
    createLalamoveDelivery,
    bookingOrderId,
    submitRefundApproval,
    openReplacementModal,
    returnActionKey,
    openDisputeModal,
    expandedTimelines,
    toggleTimelineExpansion,
    expandedCourierTrackings,
    toggleCourierTrackingExpansion,
    expandedPricingDetails,
    togglePricingDetailsExpansion,
    markAsPaidAction,
    replacementModal
}) {
    const [showRouteModal, setShowRouteModal] = useState(false);
    const [showTimelineModal, setShowTimelineModal] = useState(false);
    const issueSummary = sellerIssueSummary(order);
    const isSelected = selectedOrderIds.includes(order.id);
    const timelineCount = order.timeline?.length || 0;

    return (
        <div
            className={`group relative mb-3 rounded-2xl border p-3.5 pl-10 pr-3.5 sm:pl-12 sm:pr-4 sm:py-3.5 shadow-2xs transition-all hover:shadow-xs ${
                isSelected
                    ? "border-clay-300 ring-1 ring-clay-100 bg-clay-50/20"
                    : "border-stone-200/80 bg-white hover:border-stone-300"
            }`}
        >
            {/* Bulk Selection Checkbox */}
            <button
                type="button"
                onClick={() => toggleOrderSelection(order.id)}
                className="absolute left-0.5 top-2 z-10 flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-full transition-all active:scale-95 sm:left-3.5 sm:top-3.5 sm:h-7 sm:w-7 sm:min-h-0 sm:min-w-0 focus-visible:outline-none"
                aria-label={`Select order ${order.id}`}
                role="checkbox"
                aria-checked={isSelected}
            >
                <div
                    className={`flex h-5 w-5 items-center justify-center rounded-md border transition-all ${
                        isSelected
                            ? "border-clay-600 bg-clay-600 text-white shadow-2xs"
                            : "border-stone-300 bg-white text-stone-300 hover:border-clay-400"
                    }`}
                >
                    {isSelected && <Check size={12} strokeWidth={4} />}
                </div>
            </button>

            {/* Order Header: Order ID + Date + Activity Trigger + Badges */}
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-stone-100/90 pb-2.5">
                <div className="flex min-w-0 items-center gap-2.5 flex-wrap">
                    <div>
                        <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">
                            Order
                        </span>
                        <h3 className="font-bold text-stone-900 text-xs sm:text-sm leading-none mt-0.5 font-mono">
                            {order.id}
                        </h3>
                    </div>
                    <div className="hidden sm:block h-4 w-px bg-stone-200" />
                    <div className="flex items-center gap-1.5 text-stone-400">
                        <Clock size={11} />
                        <span className="text-[11px] font-medium text-stone-600">
                            {order.date}
                        </span>
                    </div>

                    {/* Integrated Activity History Pill (Replaces bulky accordion) */}
                    {timelineCount > 0 && (
                        <button
                            type="button"
                            onClick={() => setShowTimelineModal(true)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-stone-600 bg-stone-100 hover:bg-stone-200/80 rounded-md transition cursor-pointer"
                            title="Click to view full activity timeline"
                        >
                            <Activity size={10} className="text-stone-400" />
                            <span>{timelineCount} {timelineCount === 1 ? "event" : "events"}</span>
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    <PaymentStatusBadge
                        status={order.payment_status}
                        method={order.payment_method}
                    />
                    <OrderStatusBadge
                        status={order.status}
                    />
                </div>
            </div>

            {/* Seamless Customer & Delivery Information Bar (No bulky nested box) */}
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2.5 py-1.5 px-2 bg-stone-50/50 rounded-xl border border-stone-100">
                {/* Customer */}
                <div className="flex items-center gap-2 min-w-0">
                    <BuyerAvatar customerName={order.customer} avatarUrl={order.customer_avatar} />
                    <div className="min-w-0 flex items-center gap-1.5">
                        <span className="text-xs font-bold text-stone-850 truncate">{order.customer}</span>
                        {order.shipping_contact_phone && (
                            <span className="text-[10px] text-stone-400 font-medium hidden sm:inline">&bull; {order.shipping_contact_phone}</span>
                        )}
                    </div>
                    {canAccessMessages && (
                        <button
                            onClick={() => openChat(order.user_id)}
                            className="p-1 text-clay-600 hover:text-clay-800 bg-clay-50 hover:bg-clay-100 rounded-md transition"
                            title="Chat with customer"
                            type="button"
                        >
                            <MessageCircle size={12} />
                        </button>
                    )}
                </div>

                {/* Logistics */}
                <div className="flex items-center gap-2 text-[11px] min-w-0 flex-wrap">
                    {order.shipping_address && (
                        <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.shipping_address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 min-w-0 max-w-[280px] text-stone-600 hover:text-clay-700 transition"
                            title={`Open in Google Maps: ${order.shipping_address}`}
                        >
                            <MapPin size={11} className="text-stone-400 shrink-0" />
                            <span className="truncate font-medium">
                                {order.shipping_address}
                            </span>
                        </a>
                    )}
                    <span className="inline-flex rounded-md border border-stone-200 bg-white px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-stone-600 tracking-tight shadow-2xs">
                        {order.shipping_method}
                    </span>
                    {/* Only show in-app route estimation for active self-delivered orders without courier tracking */}
                    {order.shipping_method === "Delivery" && !order.delivery && !["Completed", "Cancelled", "Rejected"].includes(order.status) && (
                        <button
                            type="button"
                            onClick={() => setShowRouteModal(true)}
                            className="inline-flex items-center gap-1 bg-white border border-stone-200 hover:border-clay-300 rounded-md px-1.5 py-0.5 text-[9px] font-bold text-stone-700 hover:text-clay-800 transition shadow-2xs cursor-pointer"
                            title="Preview driving route to buyer"
                        >
                            <Route size={10} className="text-clay-600" /> Route Map
                        </button>
                    )}
                </div>
            </div>

            {/* Order Items + Dedicated Action Console */}
            <div className="flex flex-col gap-3 lg:flex-row">
                {/* Items */}
                <OrderItemsList order={order} />

                {/* Action Panel (Cleaned: No activity accordion pushing buttons down) */}
                <div className="border-t border-stone-100 pt-2.5 lg:w-60 lg:border-l lg:border-t-0 lg:pl-3 lg:pt-0 shrink-0 flex flex-col justify-between">
                    <OrderPricingCard
                        order={order}
                        expandedPricingDetails={expandedPricingDetails}
                        togglePricingDetailsExpansion={togglePricingDetailsExpansion}
                    />

                    <div className="space-y-1.5 mt-2">
                        <OrderCourierTracking
                            order={order}
                            expandedCourierTrackings={expandedCourierTrackings}
                            toggleCourierTrackingExpansion={toggleCourierTrackingExpansion}
                        />

                        <OrderIssueBanner
                            order={order}
                            issueSummary={issueSummary}
                        />

                        <FulfillmentActionGroup
                            order={order}
                            canAccessMessages={canAccessMessages}
                            canEditOrders={canEditOrders}
                            openChat={openChat}
                            initiateStatusUpdate={initiateStatusUpdate}
                            openShippingModal={openShippingModal}
                            openDispatchModal={openDispatchModal}
                            createLalamoveDelivery={createLalamoveDelivery}
                            bookingOrderId={bookingOrderId}
                            submitRefundApproval={submitRefundApproval}
                            openReplacementModal={openReplacementModal}
                            returnActionKey={returnActionKey}
                            openDisputeModal={openDisputeModal}
                            replacementModal={replacementModal}
                            markAsPaidAction={markAsPaidAction}
                        />
                    </div>
                </div>
            </div>

            {/* Route Map Modal */}
            {showRouteModal && (
                <OrderRoutePreview
                    order={order}
                    onClose={() => setShowRouteModal(false)}
                />
            )}

            {/* Dedicated Activity Timeline Modal */}
            <Modal show={showTimelineModal} onClose={() => setShowTimelineModal(false)} maxWidth="md">
                <div className="p-5">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
                        <div className="flex items-center gap-2">
                            <Activity size={16} className="text-clay-700" />
                            <h3 className="text-sm font-bold text-stone-900">Order Activity History</h3>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowTimelineModal(false)}
                            className="p-1 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                        {order.timeline?.map((entry, i) => (
                            <div key={entry.key || i} className="relative flex gap-3">
                                <div className="flex flex-col items-center shrink-0">
                                    <div className="h-2.5 w-2.5 rounded-full bg-clay-500 ring-4 ring-clay-100" style={{ marginTop: '5px' }} />
                                    {i !== order.timeline.length - 1 && (
                                        <div className="w-[1.5px] flex-1 bg-stone-200 my-1" />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1 bg-stone-50 rounded-xl p-3 border border-stone-100">
                                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                                        <p className="text-xs font-bold text-stone-850">{entry.label}</p>
                                        <span className={`inline-flex items-center justify-center rounded-md px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider ${timelineSourceTone(entry.source)}`}>
                                            {entry.source}
                                        </span>
                                    </div>
                                    {entry.description && (
                                        <p className="mt-1 text-[11px] leading-relaxed text-stone-600">
                                            {entry.description}
                                        </p>
                                    )}
                                    <div className="mt-1.5 flex items-center gap-1 text-[10px] text-stone-400 font-medium">
                                        <Clock size={10} />
                                        <span>{formatTimelineStamp(entry.timestamp)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>
        </div>
    );
}
