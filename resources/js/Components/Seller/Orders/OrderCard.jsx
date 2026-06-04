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
            className={`group relative mb-4 rounded-2xl border p-4 pl-12 pr-4 shadow-sm transition-all hover:shadow-md sm:pl-16 sm:pr-6 sm:py-6 ${
                isSelected
                    ? "border-clay-300 ring-1 ring-clay-100 bg-clay-50/20"
                    : "border-stone-100 bg-white hover:border-stone-200"
            }`}
        >
            {/* Bulk Selection Checkbox */}
            <button
                type="button"
                onClick={() => toggleOrderSelection(order.id)}
                className="absolute left-1 top-3.5 z-10 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full transition-all sm:left-4 sm:top-6 sm:h-9 sm:w-9 focus-visible:outline-none"
                aria-label={`Select order ${order.id}`}
            >
                <div
                    className={`flex h-6 w-6 items-center justify-center rounded-lg border transition-all ${
                        isSelected
                            ? "border-clay-600 bg-clay-600 text-white shadow-sm"
                            : "border-stone-200 bg-white text-stone-300 opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                    }`}
                >
                    {isSelected && (
                        <Check size={14} strokeWidth={4} />
                    )}
                </div>
            </button>

            {/* Order Header */}
            <OrderHeader order={order} />

            {/* Customer & Logistics Summary Block */}
            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3.5 border-y border-stone-100/80 py-3 bg-stone-50/30 rounded-xl px-3 -mx-1">
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
            <div className="flex flex-col gap-4 lg:flex-row">
                {/* Items */}
                <OrderItemsList order={order} />

                {/* Action Panel */}
                <div className="border-t border-gray-100 pt-3 lg:w-64 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
                    <OrderPricingCard
                        order={order}
                        expandedPricingDetails={expandedPricingDetails}
                        togglePricingDetailsExpansion={togglePricingDetailsExpansion}
                    />

                    {/* Status-specific Actions */}
                    <div className="space-y-2">
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
