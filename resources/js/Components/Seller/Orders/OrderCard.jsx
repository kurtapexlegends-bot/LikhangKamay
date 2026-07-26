import React from "react";
import { Check } from "lucide-react";
import OrderHeader from "@/Components/Seller/Orders/OrderHeader";
import CustomerDetailCard from "@/Components/Seller/Orders/CustomerDetailCard";
import OrderLogistics from "@/Components/Seller/Orders/OrderLogistics";
import OrderItemsList from "@/Components/Seller/Orders/OrderItemsList";
import OrderPricingCard from "@/Components/Seller/Orders/OrderPricingCard";
import OrderCourierTracking from "@/Components/Seller/Orders/OrderCourierTracking";
import DeliveryTimeline from "@/Components/Seller/Orders/DeliveryTimeline";
import OrderIssueBanner from "@/Components/Seller/Orders/OrderIssueBanner";
import FulfillmentActionGroup from "@/Components/Seller/Orders/FulfillmentActionGroup";
import { sellerIssueSummary } from "@/utils/orderHelpers";

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
    const issueSummary = sellerIssueSummary(order);
    const isSelected = selectedOrderIds.includes(order.id);

    return (
        <div
            className={`group relative mb-3 rounded-2xl border p-3.5 pl-10 pr-3.5 sm:pl-12 sm:pr-4 sm:py-3.5 shadow-2xs transition-all hover:shadow-xs ${
                isSelected
                    ? "border-clay-300 ring-1 ring-clay-100 bg-clay-50/20"
                    : "border-stone-200/70 bg-white hover:border-stone-300"
            }`}
        >
            {/* Bulk Selection Checkbox */}
            <button
                type="button"
                onClick={() => toggleOrderSelection(order.id)}
                className="absolute left-1 top-2.5 z-10 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition-all sm:left-3.5 sm:top-3.5 sm:h-7 sm:w-7 focus-visible:outline-none"
                aria-label={`Select order ${order.id}`}
                role="checkbox"
                aria-checked={isSelected}
            >
                <div
                    className={`flex h-5 w-5 items-center justify-center rounded-md border transition-all ${
                        isSelected
                            ? "border-clay-600 bg-clay-600 text-white shadow-2xs"
                            : "border-stone-200 bg-white text-stone-300 opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                    }`}
                >
                    {isSelected && (
                        <Check size={12} strokeWidth={4} />
                    )}
                </div>
            </button>

            {/* Order Header */}
            <OrderHeader order={order} />

            {/* Customer & Logistics Summary Block */}
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2.5 py-1.5 px-2.5 bg-stone-50/60 rounded-xl border border-stone-100/80">
                <CustomerDetailCard
                    order={order}
                    canAccessMessages={canAccessMessages}
                    openChat={openChat}
                />
                <OrderLogistics
                    order={order}
                    canEditOrders={canEditOrders}
                    markAsPaidAction={markAsPaidAction}
                />
            </div>

            {/* Order Items + Actions */}
            <div className="flex flex-col gap-3 lg:flex-row">
                {/* Items */}
                <OrderItemsList order={order} />

                {/* Action Panel */}
                <div className="border-t border-stone-100 pt-2.5 lg:w-60 lg:border-l lg:border-t-0 lg:pl-3 lg:pt-0 shrink-0">
                    <OrderPricingCard
                        order={order}
                        expandedPricingDetails={expandedPricingDetails}
                        togglePricingDetailsExpansion={togglePricingDetailsExpansion}
                    />

                    {/* Status-specific Actions */}
                    <div className="space-y-1.5">
                        <OrderCourierTracking
                            order={order}
                            expandedCourierTrackings={expandedCourierTrackings}
                            toggleCourierTrackingExpansion={toggleCourierTrackingExpansion}
                        />

                        <DeliveryTimeline
                            order={order}
                            expandedTimelines={expandedTimelines}
                            toggleTimelineExpansion={toggleTimelineExpansion}
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
        </div>
    );
}
