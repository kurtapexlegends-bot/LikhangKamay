import React from "react";
import {
    AlertTriangle,
    LoaderCircle,
    Play,
    XCircle,
    CheckCircle2,
    PackageCheck,
    Truck,
    MapPin,
    MessageCircle,
    Printer
} from "lucide-react";
import {
    sellerDeliverySummary,
    isLalamoveManagedOrder,
    getBOMWarning
} from "@/utils/orderHelpers";

export default function FulfillmentActionGroup({
    order,
    canAccessMessages,
    canEditOrders,
    openChat,
    initiateStatusUpdate,
    openShippingModal,
    createLalamoveDelivery,
    bookingOrderId,
    submitRefundApproval,
    openReplacementModal,
    returnActionKey,
    openDisputeModal,
    replacementModal,
    markAsPaidAction
}) {
    const bomWarnings = getBOMWarning(order);
    const deliverySummary = sellerDeliverySummary(order);

    // Wrapper for sticky bottom layout on mobile for primary quick-actions
    const renderStickyActions = (children) => {
        return (
            <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-stone-100 p-3 -mx-4 -mb-4 rounded-b-2xl shadow-[0_-4px_12px_rgba(0,0,0,0.04)] z-20 md:relative md:bottom-auto md:bg-transparent md:border-t-0 md:p-0 md:mx-0 md:mb-0 md:rounded-none md:shadow-none">
                {children}
            </div>
        );
    };

    return (
        <div className="space-y-2">
            {deliverySummary && (
                <div className={`rounded-lg border px-2.5 py-2 text-left ${deliverySummary.tone}`}>
                    <p className="text-[11px] font-bold">
                        {deliverySummary.title}
                    </p>
                    <p className="mt-0.5 text-[9px] leading-snug opacity-90">
                        {deliverySummary.detail}
                    </p>
                </div>
            )}

            {order.status === "Pending" && renderStickyActions(
                <div className="space-y-2">
                    {canAccessMessages && (
                        <button
                            onClick={() => openChat(order.user_id)}
                            aria-label={`Open chat for order ${order.id}`}
                            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-bold text-gray-600 shadow-sm transition-all hover:bg-gray-50 active:scale-95 focus-visible:outline-none min-h-[44px]"
                            type="button"
                        >
                            <MessageCircle size={16} /> Discuss Shipping
                        </button>
                    )}
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                            disabled={!canEditOrders}
                            onClick={() => initiateStatusUpdate(order.id, "Rejected")}
                            className="flex-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-bold text-red-600 transition-all hover:bg-red-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px] flex items-center justify-center"
                            type="button"
                        >
                            <XCircle size={14} className="inline mr-1" /> Reject
                        </button>
                        <button
                            disabled={!canEditOrders}
                            onClick={() => initiateStatusUpdate(order.id, "Accepted")}
                            className="flex-1 rounded-lg bg-clay-600 px-3 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-clay-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px] flex items-center justify-center"
                            type="button"
                        >
                            <CheckCircle2 size={14} className="inline mr-1" /> Accept
                        </button>
                    </div>
                </div>
            )}

            {order.status === "Accepted" && renderStickyActions(
                <div className="space-y-3">
                    {bomWarnings.length > 0 && (
                        <div className="rounded-xl border border-rose-100 bg-rose-50 p-3">
                            <div className="flex gap-2 text-rose-700 font-bold text-[11px] mb-1.5">
                                <AlertTriangle size={14} className="shrink-0" />
                                <span>Supply Shortage Warning</span>
                            </div>
                            <ul className="space-y-1">
                                {bomWarnings.map((msg, i) => (
                                    <li key={i} className="text-[10px] text-rose-600 flex gap-2">
                                        <div className="mt-1 h-1 w-1 rounded-full bg-rose-400 shrink-0" />
                                        {msg}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <button
                        disabled={!canEditOrders || bomWarnings.length > 0}
                        onClick={() => initiateStatusUpdate(order.id, "Processing")}
                        className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-white shadow-lg transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px] ${
                            bomWarnings.length > 0 ? "bg-stone-400 shadow-stone-200" : "bg-indigo-600 shadow-indigo-200 hover:bg-indigo-700"
                        }`}
                        type="button"
                    >
                        <Play size={18} /> Start Production
                    </button>

                    <div className="h-px bg-stone-100 my-1" />

                    <button
                        disabled={!canEditOrders}
                        onClick={() => initiateStatusUpdate(order.id, "Rejected")}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-xs font-bold text-red-600 transition-all hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px]"
                        type="button"
                    >
                        <XCircle size={14} /> Reject Order
                    </button>
                </div>
            )}

            {order.status === "Processing" && renderStickyActions(
                <>
                    <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 text-center">
                        <div className="flex items-center justify-center gap-2 text-indigo-700 font-bold text-xs mb-1">
                            <LoaderCircle size={14} className="animate-spin" />
                            <span>Currently in Production</span>
                        </div>
                        <p className="text-[10px] text-indigo-600">
                            Materials have been deducted. Complete the item then dispatch.
                        </p>
                    </div>

                    {order.payment_method !== "COD" && order.payment_status !== "paid" ? (
                        <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-center">
                            <div className="flex items-center justify-center gap-2 text-red-600 font-bold text-xs mb-1">
                                <AlertTriangle size={14} />
                                <span>Payment Pending</span>
                            </div>
                            <p className="text-[10px] text-red-500 font-medium">
                                Wait for payment before shipping.
                            </p>
                        </div>
                    ) : order.shipping_method === "Pick Up" ? (
                        <button
                            disabled={!canEditOrders}
                            onClick={() => openShippingModal(order, "pickup-ready")}
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-200 transition-colors hover:bg-orange-600 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px]"
                            type="button"
                        >
                            <PackageCheck size={18} /> Mark as Ready for Pickup
                        </button>
                    ) : (
                        <div className="space-y-2.5">
                            <button
                                disabled={!canEditOrders}
                                onClick={() => openShippingModal(order, "ship")}
                                className="flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 shadow-sm transition-colors hover:bg-blue-100 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px]"
                                type="button"
                            >
                                <PackageCheck size={18} /> Dispatch Order
                            </button>
                            <button
                                onClick={() => createLalamoveDelivery(order.id)}
                                disabled={
                                    !canEditOrders ||
                                    !order.lalamove_booking_ready ||
                                    bookingOrderId === order.id
                                }
                                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-200 transition-colors hover:bg-blue-700 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 min-h-[44px]"
                                type="button"
                            >
                                {bookingOrderId === order.id ? (
                                    <>
                                        <LoaderCircle size={18} className="animate-spin" /> Creating Lalamove...
                                    </>
                                ) : (
                                    <>
                                        <Truck size={18} /> Use Lalamove
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </>
            )}

            {(order.status === "Shipped" || order.status === "Ready for Pickup") && renderStickyActions(
                <div className="space-y-2">
                    <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-2">
                        <Truck size={13} className="text-blue-400 shrink-0" />
                        <div className="min-w-0">
                            <p className="text-[11px] font-bold text-blue-700">
                                {order.status === "Ready for Pickup" ? "Ready for Pickup" : "Shipment in Progress"}
                            </p>
                            <p className="text-[9px] text-blue-500">
                                {order.status === "Ready for Pickup"
                                    ? "Confirm handover and mark the order as picked up once the buyer receives the items."
                                    : "Keep shipment proof visible, and upload final delivery proof when the parcel arrives."}
                            </p>
                        </div>
                    </div>
                    {!isLalamoveManagedOrder(order) && (
                        <button
                            disabled={!canEditOrders}
                            onClick={() => openShippingModal(order, "deliver")}
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-teal-200 transition-colors hover:bg-teal-700 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px]"
                            type="button"
                        >
                            <MapPin size={18} />
                            {order.status === "Ready for Pickup" ? "Mark as Picked Up" : "Mark as Delivered"}
                        </button>
                    )}
                </div>
            )}

            {order.status === "Delivered" && !order.replacement_in_progress && !isLalamoveManagedOrder(order) && renderStickyActions(
                <div className="space-y-2">
                    <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-2.5 py-2">
                        <CheckCircle2 size={13} className="text-green-500 shrink-0" />
                        <div className="min-w-0">
                            <p className="text-[11px] font-bold text-green-700">Delivered to Buyer</p>
                            <p className="text-[9px] text-green-600 font-medium">
                                Complete when buyer has confirmed.
                            </p>
                        </div>
                    </div>
                    <button
                        disabled={!canEditOrders}
                        onClick={() => initiateStatusUpdate(order.id, "Completed")}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-green-200 transition-colors hover:bg-green-700 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px]"
                        type="button"
                    >
                        <CheckCircle2 size={18} /> Complete Transaction
                    </button>
                </div>
            )}

            {order.status === "Delivered" && !order.replacement_in_progress && isLalamoveManagedOrder(order) && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2">
                    <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                    <div className="min-w-0">
                        <p className="text-[11px] font-bold text-emerald-700">Courier marked delivered</p>
                        <p className="text-[9px] text-emerald-600 font-medium">
                            Awaiting buyer receipt confirmation.
                        </p>
                    </div>
                </div>
            )}

            {order.status === "Delivered" && order.replacement_in_progress && (
                <div className="flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-2">
                    <PackageCheck size={13} className="text-teal-500 shrink-0" />
                    <div className="min-w-0">
                        <p className="text-[11px] font-bold text-teal-700">Waiting for Buyer Confirmation</p>
                        <p className="text-[9px] text-teal-600 font-medium">
                            Replacement unresolved until receipt.
                        </p>
                    </div>
                </div>
            )}

            {order.status === "Refund/Return" && renderStickyActions(
                <>
                    {canAccessMessages && (
                        <button
                            onClick={() => openChat(order.user_id)}
                            aria-label={`Open chat for order ${order.id}`}
                            className="w-full flex items-center justify-center gap-2 rounded-lg bg-clay-600 px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-clay-700 min-h-[44px] mb-2"
                            type="button"
                        >
                            <MessageCircle size={16} /> Negotiate
                        </button>
                    )}
                    <div className="flex flex-col gap-2">
                        {order.dispute ? (
                            order.dispute.status === "pending" ? (
                                <button
                                    disabled={!canEditOrders}
                                    onClick={() => openDisputeModal(order)}
                                    className="w-full px-4 py-2.5 bg-clay-600 text-white rounded-lg text-xs font-bold hover:bg-clay-700 transition shadow-md disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px] flex items-center justify-center"
                                    type="button"
                                >
                                    Respond to Dispute
                                </button>
                            ) : (
                                <div className="rounded-lg border border-stone-200 bg-stone-50 p-2.5 text-center">
                                    <p className="text-[11px] font-bold text-stone-600">
                                        Status: <span className="capitalize">{order.dispute.status.replace(/_/g, " ")}</span>
                                    </p>
                                </div>
                            )
                        ) : (
                            <>
                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <button
                                        onClick={() => submitRefundApproval(order.id)}
                                        disabled={
                                            !canEditOrders ||
                                            !!returnActionKey ||
                                            replacementModal?.processing
                                        }
                                        className="flex-1 px-2 py-2 border border-clay-300 text-clay-700 bg-white rounded-lg text-[10px] font-bold hover:bg-clay-50 transition shadow-sm disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px]"
                                        title="Refunds money without deducting stock"
                                        type="button"
                                    >
                                        {returnActionKey === `${order.id}:refund` ? "Refunding..." : "Approve (Refund)"}
                                    </button>
                                    <button
                                        onClick={() => openReplacementModal(order.id)}
                                        disabled={
                                            !canEditOrders ||
                                            !!returnActionKey ||
                                            replacementModal?.processing
                                        }
                                        className="flex-1 px-2 py-2 border border-clay-300 text-clay-700 bg-white rounded-lg text-[10px] font-bold hover:bg-clay-50 transition shadow-sm disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px]"
                                        title="Restarts shipping process to replace product"
                                        type="button"
                                    >
                                        Approve (Replace)
                                    </button>
                                </div>
                                <button
                                    disabled={!canEditOrders}
                                    onClick={() => initiateStatusUpdate(order.id, "Completed")}
                                    className="w-full px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-[10px] font-bold hover:bg-red-100 transition shadow-sm disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px]"
                                    type="button"
                                >
                                    Reject Return Request
                                </button>
                            </>
                        )}
                    </div>
                </>
            )}

            {order.status === "Completed" && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-2.5 py-2">
                        <CheckCircle2 size={13} className="text-green-500 shrink-0" />
                        <div className="min-w-0">
                            <p className="text-[11px] font-bold text-green-700">Order Completed</p>
                            <p className="text-[9px] text-green-600 font-medium">
                                Order completed successfully.
                            </p>
                        </div>
                    </div>
                    {/* View Receipt uses standard route helper inside inertia Link or direct a tag. Keep direct tag as desktop parity */}
                    <a
                        href={route("orders.receipt", order.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-green-600 transition-colors hover:text-green-700 focus-visible:outline-none min-h-[44px]"
                    >
                        <Printer size={16} /> View Receipt
                    </a>
                </div>
            )}

            {(order.status === "Cancelled" || order.status === "Rejected") && (
                <div className="flex items-center justify-center gap-1.5 rounded-lg bg-gray-50 border border-gray-100 px-2.5 py-2">
                    <XCircle size={12} className="text-gray-400" />
                    <p className="text-[11px] font-medium text-gray-500">
                        Order {order.status.toLowerCase()}
                    </p>
                </div>
            )}
        </div>
    );
}
