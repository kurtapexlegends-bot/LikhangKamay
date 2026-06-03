import React from "react";
import { Link } from "@inertiajs/react";
import { motion } from "framer-motion";
import OrderStatusBadge from "@/Components/Orders/OrderStatusBadge";
import PaymentStatusBadge from "@/Components/Orders/PaymentStatusBadge";
import {
    Clock,
    User,
    MessageCircle,
    DollarSign,
    Hash,
    PackageCheck,
    MapPin,
    Truck,
    ChevronDown,
    ChevronRight,
    AlertTriangle,
    XCircle,
    CheckCircle2,
    LoaderCircle,
    Play,
    Printer,
    RotateCcw,
    ExternalLink,
    Camera as CameraIcon,
    Activity,
    Check
} from "lucide-react";

// --- HELPERS ---
const humanizeAddressType = (value) => {
    if (!value) return null;
    return String(value)
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
};

const isLalamoveManagedOrder = (order) =>
    order?.shipping_method === "Delivery" &&
    !!order?.delivery?.external_order_id;

const lalamoveStatusConfig = (status) => {
    const normalized = String(status || "").toUpperCase();

    const configs = {
        ASSIGNING_DRIVER: {
            label: "Assigning Driver",
            tone: "border-sky-200 bg-sky-50 text-sky-700",
            detail: "Lalamove is looking for a courier.",
        },
        ON_GOING: {
            label: "On Going",
            tone: "border-sky-200 bg-sky-50 text-sky-700",
            detail: "Courier is actively handling the order.",
        },
        PICKED_UP: {
            label: "Picked Up",
            tone: "border-blue-200 bg-blue-50 text-blue-700",
            detail: "Package has already been picked up.",
        },
        COMPLETED: {
            label: "Completed",
            tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
            detail: "Courier marked the delivery as completed.",
        },
        CANCELED: {
            label: "Canceled",
            tone: "border-red-200 bg-red-50 text-red-700",
            detail: "Courier canceled the delivery.",
        },
        REJECTED: {
            label: "Rejected",
            tone: "border-red-200 bg-red-50 text-red-700",
            detail: "Lalamove rejected the delivery request.",
        },
        EXPIRED: {
            label: "Expired",
            tone: "border-amber-200 bg-amber-50 text-amber-700",
            detail: "The booking expired before courier completion.",
        },
    };

    return (
        configs[normalized] || {
            label: normalized || "Pending",
            tone: "border-gray-200 bg-gray-50 text-gray-700",
            detail: "Waiting for courier updates.",
        }
    );
};

const sellerCourierTrackingState = (order) => {
    const base = lalamoveStatusConfig(order?.delivery?.status);
    const isReplacementExchange =
        order?.delivery?.flow_type === "replacement_exchange";

    if (
        String(order?.delivery?.status || "").toUpperCase() === "COMPLETED" &&
        order?.status === "Delivered"
    ) {
        return {
            ...base,
            label: isReplacementExchange
                ? "Exchange Completed"
                : "Awaiting Buyer",
            tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
            detail: isReplacementExchange
                ? "Courier completed the replacement exchange. Waiting for the buyer to confirm receipt of the replacement item."
                : "Courier completed delivery. Waiting for the buyer to confirm receipt.",
        };
    }

    if (
        String(order?.delivery?.status || "").toUpperCase() === "COMPLETED" &&
        order?.status === "Completed"
    ) {
        return {
            ...base,
            label: isReplacementExchange
                ? "Exchange Resolved"
                : "Buyer Confirmed",
            tone: "border-green-200 bg-green-50 text-green-700",
            detail: isReplacementExchange
                ? "Courier completed the replacement exchange and the buyer already confirmed receipt."
                : "Courier completed delivery and the buyer already confirmed receipt.",
        };
    }

    if (isReplacementExchange) {
        return {
            ...base,
            detail: "Replacement exchange is in progress. Courier will deliver the replacement and return the rejected item to the seller.",
        };
    }

    return base;
};

const formatTimelineStamp = (value) => {
    if (!value) return "No timestamp";

    try {
        return new Intl.DateTimeFormat("en-PH", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
        }).format(new Date(value));
    } catch {
        return value;
    }
};

const timelineSourceTone = (source) => {
    if (source === "courier") {
        return "border-sky-200 bg-sky-50 text-sky-700";
    }

    if (source === "status") {
        return "border-stone-200 bg-stone-100 text-stone-600";
    }

    return "border-clay-200 bg-clay-50 text-clay-700";
};

const sellerProofLabel = (order) => {
    if (!order?.proof_of_delivery) return null;

    if (order.shipping_method === "Pick Up") {
        return ["Delivered", "Completed"].includes(order.status)
            ? "Pickup Handover Proof"
            : "Pickup Readiness Proof";
    }

    return ["Delivered", "Completed"].includes(order.status)
        ? "Delivery Proof"
        : "Shipment Proof";
};

const sellerDeliverySummary = (order) => {
    if (order.shipping_method === "Pick Up") {
        if (order.status === "Accepted") {
            return {
                tone: "border-orange-200 bg-orange-50 text-orange-700",
                title: "Prepare for pickup",
                detail: "Upload a readiness photo before the buyer is notified for pickup.",
            };
        }

        return null;
    }

    if (isLalamoveManagedOrder(order)) {
        return null;
    }

    if (order.status === "Accepted") {
        return {
            tone: "border-blue-200 bg-blue-50 text-blue-700",
            title: "Choose a delivery path",
            detail: "Manual shipping needs shipment proof. Lalamove will handle courier status updates automatically.",
        };
    }

    if (order.status === "Delivered") {
        return {
            tone: "border-teal-200 bg-teal-50 text-teal-700",
            title: "Delivered, waiting for buyer confirmation",
            detail: "The buyer can now confirm receipt. Keep delivery proof available in case of disputes.",
        };
    }

    return null;
};

const sellerIssueSummary = (order) => {
    if (order.status === "Refund/Return") {
        const dispute = order.dispute;
        const reason = dispute ? dispute.reason : (order.return_reason || "No reason provided.");
        const proofPhotos = dispute ? dispute.proof_photos : (order.return_proof_image ? [order.return_proof_image] : []);
        return {
            tone: "border-orange-200 bg-orange-50",
            badgeTone: "border-orange-200 bg-white text-orange-700",
            icon: RotateCcw,
            title: dispute && dispute.status !== "pending"
                ? `Dispute status: ${dispute.status.replace(/_/g, " ").toUpperCase()}`
                : "Return pending decision",
            detail: dispute
                ? "Review the buyer proof, coordinate in chat if needed, then respond to the dispute claim."
                : "Review the buyer proof, coordinate in chat if needed, then refund, replace, or reject the request.",
            timestampLabel: null,
            timestampValue: null,
            infoLabel: "Reason",
            infoValue: reason,
            proofPhotos: proofPhotos,
            proofHref: !dispute && order.return_proof_image ? order.return_proof_image : null,
            proofLabel: "View Buyer Proof",
        };
    }

    if (order.replacement_in_progress) {
        return {
            tone: "border-teal-200 bg-teal-50",
            badgeTone: "border-teal-200 bg-white text-teal-700",
            icon: PackageCheck,
            title: "Replacement approved",
            detail:
                order.delivery?.flow_type === "replacement_exchange"
                    ? "Courier is handling the exchange. Wait for buyer confirmation before treating the case as closed."
                    : "Keep the replacement moving and wait for the buyer to confirm receipt to close the issue.",
            timestampLabel: "Approved",
            timestampValue: order.replacement_started_at,
            infoLabel: "Resolution",
            infoValue: order.replacement_resolution_description || null,
            proofHref: null,
            proofLabel: null,
        };
    }

    if ((order.replacement_resolved_at || order.status === "Replaced") && order.status !== "Completed") {
        return {
            tone: "border-emerald-200 bg-emerald-50",
            badgeTone: "border-emerald-200 bg-white text-emerald-700",
            icon: CheckCircle2,
            title: "Replacement completed",
            detail: "The buyer already confirmed receipt of the replacement item and the issue is resolved.",
            timestampLabel: "Resolved",
            timestampValue: order.replacement_resolved_at,
            infoLabel: "Resolution",
            infoValue: order.replacement_resolution_description || null,
            proofHref: null,
            proofLabel: null,
        };
    }

    if (order.status === "Refunded" || order.payment_status === "refunded") {
        const dispute = order.dispute;
        const proofPhotos = dispute ? dispute.proof_photos : (order.return_proof_image ? [order.return_proof_image] : []);
        return {
            tone: "border-purple-200 bg-purple-50",
            badgeTone: "border-purple-200 bg-white text-purple-700",
            icon: CreditCard,
            title: "Refund completed",
            detail: "The refund is already processed for this order. The return case is closed unless a new issue is opened.",
            timestampLabel: null,
            timestampValue: null,
            infoLabel: dispute ? "Reason" : null,
            infoValue: dispute ? dispute.reason : null,
            proofPhotos: proofPhotos,
            proofHref: !dispute && order.return_proof_image ? order.return_proof_image : null,
            proofLabel: "View Buyer Proof",
        };
    }

    return null;
};

const getBOMWarning = (order) => {
    const issues = [];
    order.items.forEach((item) => {
        if (item.production_method === "manufactured" && item.recipes) {
            item.recipes.forEach((recipe) => {
                const totalNeeded = recipe.quantity_required * item.qty;
                if (recipe.supply_quantity < totalNeeded) {
                    issues.push(
                        `${recipe.supply_name}: Need ${totalNeeded} ${recipe.supply_unit}, have ${recipe.supply_quantity} ${recipe.supply_unit}`,
                    );
                }
            });
        }
    });
    return issues;
};

const BuyerAvatar = ({ customerName, avatarUrl }) => {
    const [hasError, setHasError] = React.useState(false);
    
    if (avatarUrl && !hasError) {
        return (
            <img
                src={avatarUrl}
                alt={customerName}
                className="h-8 w-8 shrink-0 rounded-full object-cover border border-stone-200 shadow-sm"
                onError={() => setHasError(true)}
            />
        );
    }
    
    return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-clay-50 border border-clay-100 text-clay-700 font-bold text-xs uppercase shadow-sm">
            {customerName ? customerName.slice(0, 2) : "??"}
        </div>
    );
};

// --- COMPONENT ---
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
    const bomWarnings = getBOMWarning(order);

    return (
        <div
            className={`group relative mb-4 rounded-2xl border p-4 pl-12 pr-4 shadow-sm transition-all hover:shadow-md sm:pl-16 sm:pr-6 sm:py-6 ${
                selectedOrderIds.includes(order.id)
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
                        selectedOrderIds.includes(order.id)
                            ? "border-clay-600 bg-clay-600 text-white shadow-sm"
                            : "border-stone-200 bg-white text-stone-300 opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                    }`}
                >
                    {selectedOrderIds.includes(order.id) && (
                        <Check size={14} strokeWidth={4} />
                    )}
                </div>
            </button>

            {/* Order Header */}
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <div>
                        <span className="text-[10px] text-gray-400 uppercase tracking-wide">
                            Order
                        </span>
                        <h3 className="font-bold text-gray-900 text-sm">
                            {order.id}
                        </h3>
                    </div>
                    <div className="hidden sm:block h-6 w-px bg-stone-200" />
                    <div className="flex items-center gap-1.5 text-gray-400">
                        <Clock size={12} />
                        <span className="text-xs font-medium">
                            {order.date}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <PaymentStatusBadge
                        status={order.payment_status}
                        method={order.payment_method}
                    />
                    <OrderStatusBadge
                        status={order.status}
                    />
                </div>
            </div>

            {/* Customer & Logistics Summary Block */}
            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3.5 border-y border-stone-100/80 py-3 bg-stone-50/30 rounded-xl px-3 -mx-1">
                {/* Customer Column */}
                <div className="space-y-2">
                    <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block">Customer Info</span>
                    <div className="flex items-center gap-2.5">
                        <BuyerAvatar customerName={order.customer} avatarUrl={order.customer_avatar} />
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-stone-800 truncate">{order.customer}</p>
                            {order.shipping_contact_phone && (
                                <p className="text-[10px] text-stone-400 font-bold mt-0.5">{order.shipping_contact_phone}</p>
                            )}
                        </div>
                        {canAccessMessages && (
                            <button
                                onClick={() => openChat(order.user_id)}
                                className="p-2 text-stone-400 hover:text-clay-600 hover:bg-clay-50 rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center border border-stone-200/80 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.02)] active:scale-95"
                                title="Chat with customer"
                                type="button"
                            >
                                <MessageCircle size={13} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Logistics Column */}
                <div className="space-y-2">
                    <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block">Logistics & Route</span>
                    <div className="text-[11px] text-stone-650 font-medium space-y-1.5">
                        {order.shipping_address && (
                            <div className="flex items-start gap-1.5">
                                <MapPin size={12} className="text-stone-400 mt-0.5 shrink-0" />
                                <span className="line-clamp-1 text-stone-500" title={order.shipping_address}>{order.shipping_address}</span>
                            </div>
                        )}
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex rounded-md border border-stone-200 bg-white px-2 py-0.5 text-[9px] font-extrabold uppercase text-stone-600 tracking-tight shadow-sm">
                                {order.shipping_method}
                            </span>
                            {order.tracking_number && (
                                <span className="inline-flex items-center gap-1 bg-sky-50 border border-sky-100 rounded-md px-2 py-0.5 text-[9px] font-extrabold text-sky-700 tracking-tight shadow-sm">
                                    <Hash size={10} /> {order.tracking_number}
                                </span>
                            )}
                            {order.proof_of_delivery && (
                                <a
                                    href={order.proof_of_delivery}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-stone-600 hover:bg-stone-105 transition shadow-sm min-h-[44px] sm:min-h-[28px]"
                                >
                                    <PackageCheck size={10} /> {sellerProofLabel(order)}
                                </a>
                            )}
                            {order.payment_status === "pending" &&
                                order.payment_method === "COD" &&
                                ["Pending", "Accepted", "Shipped", "Ready for Pickup", "Delivered"].includes(order.status) && (
                                    <button
                                        disabled={!canEditOrders}
                                        onClick={() => markAsPaidAction(order.id)}
                                        className="inline-flex items-center justify-center gap-1 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-green-700 hover:bg-green-105 transition shadow-sm min-h-[44px] sm:min-h-[28px]"
                                    >
                                        <DollarSign size={10} /> Mark as Paid
                                    </button>
                                )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Order Items + Actions */}
            <div className="flex flex-col gap-4 lg:flex-row">
                {/* Items */}
                <div className="flex-1 space-y-2">
                    {order.items.map((item, idx) => (
                        <div
                            key={`${order.id}-${item.name}-${idx}`}
                            className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-2.5"
                        >
                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                                <img
                                    key={`${order.id}-${item.name}-${idx}-img`}
                                    src={
                                        item.img.startsWith("http") || item.img.startsWith("/storage") || item.img.startsWith("/images")
                                            ? item.img
                                            : `/storage/${item.img}`
                                    }
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        e.target.src = "/images/no-image.png";
                                    }}
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="truncate text-[13px] font-semibold text-gray-900">
                                    {item.name}
                                </p>
                                <p className="text-[11px] text-gray-500">
                                    Variant: {item.variant} / Qty {item.qty}
                                </p>
                            </div>
                            <div className="text-[13px] font-semibold text-gray-700">
                                PHP {Number(item.price).toLocaleString()}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Action Panel */}
                <div className="border-t border-gray-100 pt-3 lg:w-64 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
                    <div className="mb-4 rounded-xl border border-stone-200 bg-white p-2 shadow-sm">
                        <button
                            type="button"
                            onClick={() => togglePricingDetailsExpansion(order.id)}
                            className={`flex items-center justify-between w-full cursor-pointer select-none p-2 rounded-xl hover:bg-stone-50 transition-colors text-left ${
                                expandedPricingDetails.has(order.id) ? "border-b border-stone-100 pb-2 mb-2" : ""
                            }`}
                        >
                            <div>
                                <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">
                                    Buyer Total
                                </p>
                                <p className="text-sm font-bold text-stone-800">
                                    PHP {order.total}
                                </p>
                            </div>
                            <div className="flex items-center gap-1.5 text-right">
                                <div>
                                    <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">
                                        Your Net
                                    </p>
                                    <p className="text-sm font-bold text-emerald-600">
                                        PHP {Number(order.seller_net_amount).toLocaleString(undefined, {
                                            minimumFractionDigits: 2
                                        })}
                                    </p>
                                </div>
                                {expandedPricingDetails.has(order.id) ? (
                                    <ChevronDown size={12} className="text-stone-400 self-end mb-1" />
                                ) : (
                                    <ChevronRight size={12} className="text-stone-400 self-end mb-1" />
                                )}
                            </div>
                        </button>

                        {expandedPricingDetails.has(order.id) && (
                            <div className="space-y-1.5 text-[10px] mt-2 px-1">
                                <div className="flex justify-between text-stone-500 border-b border-stone-50 pb-1 mb-1">
                                    <span>Merchandise:</span>
                                    <span className="font-semibold text-stone-700">
                                        {Number(order.merchandise_subtotal).toLocaleString(undefined, {
                                            minimumFractionDigits: 2
                                        })}
                                    </span>
                                </div>
                                <div className="flex justify-between text-stone-400 pt-0.5">
                                    <span>Shipping (Paid by Buyer):</span>
                                    <span className="font-medium text-stone-600">
                                        {Number(order.shipping_fee_amount).toLocaleString(undefined, {
                                            minimumFractionDigits: 2
                                        })}
                                    </span>
                                </div>
                                <div className="flex justify-between text-stone-400">
                                    <span>Platform Fee (Paid by Buyer):</span>
                                    <span className="font-medium text-stone-600">
                                        {Number(order.convenience_fee_amount).toLocaleString(undefined, {
                                            minimumFractionDigits: 2
                                        })}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Status-specific Actions */}
                    <div className="space-y-2">
                        {sellerDeliverySummary(order) && (
                            <div className={`rounded-lg border px-2.5 py-2 text-left ${sellerDeliverySummary(order).tone}`}>
                                <p className="text-[11px] font-bold">
                                    {sellerDeliverySummary(order).title}
                                </p>
                                <p className="mt-0.5 text-[9px] leading-snug opacity-90">
                                    {sellerDeliverySummary(order).detail}
                                </p>
                            </div>
                        )}

                        {order.delivery && (
                            <div className="rounded-xl border border-stone-200/80 bg-[#FCF7F2] p-2 shadow-sm transition-colors hover:border-clay-300">
                                <button
                                    type="button"
                                    onClick={() => toggleCourierTrackingExpansion(order.id)}
                                    className={`flex items-center justify-between gap-2 w-full cursor-pointer select-none p-2 rounded-xl hover:bg-clay-50/50 transition-colors text-left ${
                                        expandedCourierTrackings.has(order.id) ? "mb-2 border-b border-clay-100 pb-2" : ""
                                    }`}
                                >
                                    <div className="flex items-center gap-1.5">
                                        <Truck size={12} className="text-clay-600" />
                                        <p className="text-[10px] font-extrabold uppercase tracking-wide text-clay-700">
                                            Courier Tracking
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        {!expandedCourierTrackings.has(order.id) && (
                                            <div className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-bold shadow-sm ${sellerCourierTrackingState(order).tone}`}>
                                                {sellerCourierTrackingState(order).label}
                                            </div>
                                        )}
                                        {expandedCourierTrackings.has(order.id) ? (
                                            <ChevronDown size={12} className="text-clay-500" />
                                        ) : (
                                            <ChevronRight size={12} className="text-clay-500" />
                                        )}
                                    </div>
                                </button>
                                {expandedCourierTrackings.has(order.id) && (
                                    <div className="space-y-2 mt-1 pt-1.5 border-t border-clay-100/30">
                                        <div className="flex items-center justify-between gap-3 mb-2">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                {order.delivery.flow_type === "replacement_exchange" && (
                                                    <span className="inline-flex rounded-md border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] font-bold tracking-tight text-teal-700 shadow-sm animate-pulse">
                                                        {order.delivery.flow_label}
                                                    </span>
                                                )}
                                                <div className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold shadow-sm ${sellerCourierTrackingState(order).tone}`}>
                                                    {sellerCourierTrackingState(order).label}
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
                                            {sellerCourierTrackingState(order).detail}
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
                        )}


                        {order.timeline?.length > 0 && (
                            <div className="rounded-xl border border-stone-200/80 bg-white p-2 shadow-sm transition-colors hover:border-clay-200 flex flex-col">
                                <button
                                    type="button"
                                    onClick={() => toggleTimelineExpansion(order.id)}
                                    className="flex items-center justify-between gap-2 cursor-pointer select-none hover:bg-stone-50/50 p-2.5 rounded-xl transition-colors text-left w-full min-h-[44px] focus-visible:outline-none"
                                >
                                    <div className="flex items-center gap-1.5">
                                        <Activity
                                            size={12}
                                            className="text-stone-400"
                                        />
                                        <p className="text-[10px] font-extrabold uppercase tracking-wide text-stone-500">
                                            Recent Activity
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[9px] font-bold text-stone-500">
                                            {order.timeline.length} events
                                        </span>
                                        {expandedTimelines.has(order.id) ? (
                                            <ChevronDown size={12} className="text-stone-400" />
                                        ) : (
                                            <ChevronRight size={12} className="text-stone-400" />
                                        )}
                                    </div>
                                </button>
                                {expandedTimelines.has(order.id) && (
                                    <div className="space-y-3 pl-1 mt-3 border-t border-stone-100 pt-3">
                                        {order.timeline.slice(0, 4).map((entry, i) => (
                                            <div
                                                key={entry.key || i}
                                                className="relative flex gap-3"
                                            >
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
                        )}

                        {issueSummary && (
                            <div className={`rounded-xl border p-3.5 text-left shadow-sm ${issueSummary.tone}`}>
                                <div className="flex items-start gap-2">
                                    <issueSummary.icon className="mt-0.5 shrink-0" size={16} />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <span className={`inline-flex rounded border px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${issueSummary.badgeTone}`}>
                                                {issueSummary.title}
                                            </span>
                                            {issueSummary.timestampValue && (
                                                <span className="text-[10px] font-medium text-stone-400">
                                                    {issueSummary.timestampLabel}{" "}
                                                    {formatTimelineStamp(issueSummary.timestampValue)}
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-1 text-[11px] leading-relaxed text-stone-600 font-medium">
                                            {issueSummary.detail}
                                        </p>
                                        {issueSummary.infoValue && (
                                            <div className="mt-2.5 border-t border-stone-200/40 pt-2 text-[10px]">
                                                <span className="font-bold uppercase tracking-wider text-stone-400 block mb-0.5">
                                                    {issueSummary.infoLabel}
                                                </span>
                                                <p className="font-medium text-stone-700 italic">
                                                    "{issueSummary.infoValue}"
                                                </p>
                                            </div>
                                        )}
                                        {issueSummary.proofPhotos && issueSummary.proofPhotos.length > 0 && (
                                            <div className="mt-3">
                                                <span className="font-bold uppercase tracking-wider text-stone-400 text-[10px] block mb-1">
                                                    Buyer Proof Photos
                                                </span>
                                                <div className="flex flex-wrap gap-1.5 overflow-x-auto py-1">
                                                    {issueSummary.proofPhotos.map((photo, i) => (
                                                        <a
                                                            key={`${order.id}-dispute-proof-${i}`}
                                                            href={photo.startsWith("http") || photo.startsWith("/storage") ? photo : `/storage/${photo}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-stone-200 hover:border-stone-400 transition"
                                                        >
                                                            <img
                                                                key={`${order.id}-dispute-proof-img-${i}`}
                                                                src={photo.startsWith("http") || photo.startsWith("/storage") ? photo : `/storage/${photo}`}
                                                                alt={`Dispute proof ${i + 1}`}
                                                                className="h-full w-full object-cover"
                                                                onError={(e) => {
                                                                    e.target.src = "/images/no-image.png";
                                                                }}
                                                            />
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {issueSummary.proofHref && (
                                            <a
                                                href={issueSummary.proofHref}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-2.5 inline-flex items-center justify-center gap-1 rounded-full border border-white/80 bg-white/80 px-2 py-1 text-[9px] font-bold text-stone-700 hover:bg-white min-h-[44px]"
                                            >
                                                <CameraIcon size={10} />
                                                {issueSummary.proofLabel}
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {order.status === "Pending" && (
                            <div className="space-y-2">
                                {canAccessMessages && (
                                    <button
                                        onClick={() => openChat(order.user_id)}
                                        aria-label={`Open chat for order ${order.id}`}
                                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-bold text-gray-600 shadow-sm transition-all hover:bg-gray-50 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/20 min-h-[44px]"
                                    >
                                        <MessageCircle size={16} /> Discuss Shipping
                                    </button>
                                )}
                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <button
                                        disabled={!canEditOrders}
                                        onClick={() => initiateStatusUpdate(order.id, "Rejected")}
                                        className="flex-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-bold text-red-600 transition-all hover:bg-red-100 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/20 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px] flex items-center justify-center"
                                    >
                                        <XCircle size={14} className="inline mr-1" /> Reject
                                    </button>
                                    <button
                                        disabled={!canEditOrders}
                                        onClick={() => initiateStatusUpdate(order.id, "Accepted")}
                                        className="flex-1 rounded-lg bg-clay-600 px-3 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-clay-700 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/30 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px] flex items-center justify-center"
                                    >
                                        <CheckCircle2 size={14} className="inline mr-1" /> Accept
                                    </button>
                                </div>
                            </div>
                        )}

                        {order.status === "Accepted" && (
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
                                >
                                    <Play size={18} /> Start Production
                                </button>

                                <div className="h-px bg-stone-100 my-1" />

                                <button
                                    disabled={!canEditOrders}
                                    onClick={() => initiateStatusUpdate(order.id, "Rejected")}
                                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-xs font-bold text-red-600 transition-all hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px]"
                                >
                                    <XCircle size={14} /> Reject Order
                                </button>
                            </div>
                        )}

                        {order.status === "Processing" && (
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
                                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-200 transition-colors hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/30 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px]"
                                    >
                                        <PackageCheck size={18} /> Mark as Ready for Pickup
                                    </button>
                                ) : (
                                    <div className="space-y-2.5">
                                        <button
                                            disabled={!canEditOrders}
                                            onClick={() => openShippingModal(order, "ship")}
                                            className="flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 shadow-sm transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px]"
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
                                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-200 transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60 min-h-[44px]"
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

                        {(order.status === "Shipped" || order.status === "Ready for Pickup") && (
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
                                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-teal-200 transition-colors hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px]"
                                    >
                                        <MapPin size={18} />
                                        {order.status === "Ready for Pickup" ? "Mark as Picked Up" : "Mark as Delivered"}
                                    </button>
                                )}
                            </div>
                        )}

                        {order.status === "Delivered" && !order.replacement_in_progress && !isLalamoveManagedOrder(order) && (
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
                                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-green-200 transition-colors hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/20 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px]"
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

                        {order.status === "Refund/Return" && (
                            <>
                                {canAccessMessages && (
                                    <button
                                        onClick={() => openChat(order.user_id)}
                                        aria-label={`Open chat for order ${order.id}`}
                                        className="w-full flex items-center justify-center gap-2 rounded-lg bg-clay-600 px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-clay-700 min-h-[44px]"
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
                                                >
                                                    Approve (Replace)
                                                </button>
                                            </div>
                                            <button
                                                disabled={!canEditOrders}
                                                onClick={() => initiateStatusUpdate(order.id, "Completed")}
                                                className="w-full px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-[10px] font-bold hover:bg-red-100 transition shadow-sm disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px]"
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
                                            Funds released to your wallet.
                                        </p>
                                    </div>
                                </div>
                                <a
                                    href={route("orders.receipt", order.id)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-green-600 transition-colors hover:text-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/20 min-h-[44px]"
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
                </div>
            </div>
        </div>
    );
}
