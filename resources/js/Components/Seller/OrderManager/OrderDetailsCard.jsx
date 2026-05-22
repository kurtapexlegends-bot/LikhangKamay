import React from "react";
import { motion } from "framer-motion";
import {
    MapPin,
    PackageCheck,
    Truck,
    User,
    MessageCircle,
    PackageOpen,
    Hash,
    CameraIcon,
    AlertTriangle,
    Activity,
    ExternalLink,
    CheckCircle2,
    XCircle,
    Clock,
    CreditCard,
    RotateCcw,
    Store,
    Printer,
    FileText,
    Check,
    DollarSign
} from "lucide-react";
import { router } from "@inertiajs/react";
import OrderStatusBadge from "@/Components/Orders/OrderStatusBadge";
import PaymentStatusBadge from "@/Components/Orders/PaymentStatusBadge";
import OrderTimeline from "@/Components/Orders/OrderTimeline";
import {
    sellerDeliverySummary,
    sellerIssueSummary,
    sellerCourierTrackingState,
    formatTimelineStamp,
    timelineSourceTone,
    isLalamoveManagedOrder,
    humanizeAddressType,
    sellerProofLabel
} from "@/utils/orderUtils";

export default function OrderDetailsCard({
    order,
    idx,
    selectedOrderIds,
    toggleOrderSelection,
    canAccessMessages,
    openChat,
    canEditOrders,
    updateOrderStatus,
    initiateShipping,
    openReplacementApproval
}) {
    const issueSummary = sellerIssueSummary(order);

    return (
        <motion.div
            key={order.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={`group relative mb-4 rounded-2xl border bg-white p-4 shadow-sm transition-all hover:shadow-md sm:p-6 ${
                selectedOrderIds.includes(order.id)
                    ? "border-clay-300 ring-1 ring-clay-100"
                    : "border-stone-100"
            }`}
        >
            {/* Bulk Selection Checkbox */}
            <div 
                onClick={() => toggleOrderSelection(order.id)}
                className={`absolute left-4 top-4 z-10 flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg border transition-all sm:left-auto sm:right-6 sm:top-6 ${
                    selectedOrderIds.includes(order.id)
                        ? "border-clay-600 bg-clay-600 text-white shadow-sm"
                        : "border-stone-200 bg-white text-transparent opacity-0 group-hover:opacity-100"
                }`}
            >
                <Check size={14} strokeWidth={4} />
            </div>
            {/* Order Header */}
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                    <div>
                        <span className="text-[10px] text-gray-400 uppercase tracking-wide">
                            Order
                        </span>
                        <h3 className="font-bold text-gray-900 text-sm">
                            {order.id}
                        </h3>
                    </div>
                    <div className="hidden sm:block h-6 w-px bg-gray-200" />
                    <div className="flex items-center gap-1.5 text-gray-500">
                        <Clock size={12} />
                        <span className="text-xs font-medium">
                            {order.date}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-700">
                        <User size={12} />
                        <span className="text-xs font-semibold">
                            {order.customer}
                        </span>
                        {canAccessMessages && (
                            <button
                                onClick={() =>
                                    openChat(
                                        order.user_id,
                                    )
                                }
                                className="ml-1 p-1 text-stone-400 hover:text-clay-600 hover:bg-clay-50 rounded-full transition-colors"
                                title="Chat with customer"
                                type="button"
                            >
                                <MessageCircle
                                    size={14}
                                />
                            </button>
                        )}
                    </div>
                </div>
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                    <PaymentStatusBadge
                        status={
                            order.payment_status
                        }
                        method={
                            order.payment_method
                        }
                    />
                    <OrderStatusBadge
                        status={order.status}
                    />
                </div>
            </div>
            <div className="mb-3 flex flex-wrap gap-1.5 sm:gap-2">
                {order.payment_status ===
                    "pending" &&
                    order.payment_method ===
                        "COD" &&
                    [
                        "Pending",
                        "Accepted",
                        "Shipped",
                        "Ready for Pickup",
                        "Delivered",
                    ].includes(order.status) && (
                        <button
                            disabled={
                                !canEditOrders
                            }
                            onClick={() =>
                                router.post(
                                    route(
                                        "orders.payment-status",
                                        order.id,
                                    ),
                                    {
                                        payment_status:
                                            "paid",
                                    },
                                )
                            }
                            aria-label={`Mark order ${order.id} as paid`}
                            className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-green-700 hover:bg-green-100 transition disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <DollarSign size={12} />
                            Mark as Paid
                        </button>
                    )}
                {order.tracking_number && (
                    <div className="inline-flex items-center gap-1.5 bg-sky-50 border border-sky-100 rounded-lg px-2.5 py-1.5">
                        <Hash
                            size={12}
                            className="text-sky-600"
                        />
                        <span className="text-[10px] font-semibold text-sky-700">
                            {order.tracking_number}
                        </span>
                    </div>
                )}
                {order.proof_of_delivery && (
                    <a
                        href={
                            order.proof_of_delivery
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition group/proof"
                    >
                        <PackageCheck
                            size={12}
                            className="text-gray-400 group-hover/proof:text-gray-600"
                        />
                        {sellerProofLabel(order)}
                    </a>
                )}
                {order.shipping_address && (
                    <div className="inline-flex items-center gap-1.5 text-[11px] text-gray-500">
                        <MapPin size={12} />
                        <span className="truncate max-w-[180px] sm:max-w-[220px]">
                            {order.shipping_address}
                        </span>
                    </div>
                )}
                {order.shipping_contact_phone && (
                    <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-bold text-gray-600 inline-flex items-center gap-1">
                        {
                            order.shipping_contact_phone
                        }
                    </span>
                )}
                {order.delivery && (
                    <div
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-bold ${sellerCourierTrackingState(order).tone}`}
                    >
                        <Truck size={12} />
                        Lalamove{" "}
                        {
                            sellerCourierTrackingState(
                                order,
                            ).label
                        }
                    </div>
                )}
            </div>
        
            {/* Order Items + Actions */}
            <div className="flex flex-col gap-4 lg:flex-row">
                {/* Items */}
                <div className="flex-1 space-y-2">
                    {order.items.map(
                        (item, idx) => (
                            <div
                                key={idx}
                                className="flex flex-col gap-2.5 rounded-lg border border-gray-100 bg-gray-50 p-2 sm:flex-row sm:items-center sm:gap-3"
                            >
                                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                                    <img
                                        src={
                                            item.img.startsWith(
                                                "http",
                                            ) ||
                                            item.img.startsWith(
                                                "/storage",
                                            )
                                                ? item.img
                                                : `/storage/${item.img}`
                                        }
                                        alt={
                                            item.name
                                        }
                                        className="w-full h-full object-cover"
                                        onError={(
                                            e,
                                        ) => {
                                            e.target.src =
                                                "/images/no-image.png";
                                        }}
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="truncate text-[13px] font-semibold text-gray-900">
                                        {item.name}
                                    </p>
                                    <p className="text-[11px] text-gray-500">
                                        Variant:{" "}
                                        {
                                            item.variant
                                        }{" "}
                                        / Qty{" "}
                                        {item.qty}
                                    </p>
                                </div>
                                <div className="text-[13px] font-semibold text-gray-700">
                                    PHP{" "}
                                    {Number(
                                        item.price,
                                    ).toLocaleString()}
                                </div>
                            </div>
                        ),
                    )}
                </div>
        
                {/* Action Panel */}
                <div className="border-t border-gray-100 pt-3 lg:w-64 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
                    <div className="mb-4 rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
                        <div className="flex items-center justify-between border-b border-stone-100 pb-2 mb-2">
                            <div>
                                <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">
                                    Buyer Total
                                </p>
                                <p className="text-sm font-bold text-stone-800">
                                    PHP{" "}
                                    {order.total}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">
                                    Your Net
                                </p>
                                <p className="text-sm font-bold text-emerald-600">
                                    PHP{" "}
                                    {Number(
                                        order.seller_net_amount,
                                    ).toLocaleString(
                                        undefined,
                                        {
                                            minimumFractionDigits: 2,
                                        },
                                    )}
                                </p>
                            </div>
                        </div>
        
                        <div className="space-y-1.5 text-[10px]">
                            <div className="flex justify-between text-stone-500 border-b border-stone-50 pb-1 mb-1">
                                <span>
                                    Merchandise:
                                </span>
                                <span className="font-semibold text-stone-700">
                                    {Number(
                                        order.merchandise_subtotal,
                                    ).toLocaleString(
                                        undefined,
                                        {
                                            minimumFractionDigits: 2,
                                        },
                                    )}
                                </span>
                            </div>
        
                            {/* Transaction context */}
                            <div className="flex justify-between text-stone-400 pt-0.5">
                                <span>
                                    Shipping (Paid
                                    by Buyer):
                                </span>
                                <span className="font-medium text-stone-600">
                                    {Number(
                                        order.shipping_fee_amount,
                                    ).toLocaleString(
                                        undefined,
                                        {
                                            minimumFractionDigits: 2,
                                        },
                                    )}
                                </span>
                            </div>
                            <div className="flex justify-between text-stone-400">
                                <span>
                                    Platform Fee
                                    (Paid by Buyer):
                                </span>
                                <span className="font-medium text-stone-600">
                                    {Number(
                                        order.convenience_fee_amount,
                                    ).toLocaleString(
                                        undefined,
                                        {
                                            minimumFractionDigits: 2,
                                        },
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>
        
                    {/* Status-specific Actions */}
                    <div className="space-y-2">
                        {sellerDeliverySummary(
                            order,
                        ) && (
                            <div
                                className={`rounded-lg border px-2.5 py-2 text-left ${sellerDeliverySummary(order).tone}`}
                            >
                                <p className="text-[11px] font-bold">
                                    {
                                        sellerDeliverySummary(
                                            order,
                                        ).title
                                    }
                                </p>
                                <p className="mt-0.5 text-[9px] leading-snug opacity-90">
                                    {
                                        sellerDeliverySummary(
                                            order,
                                        ).detail
                                    }
                                </p>
                            </div>
                        )}
        
                        {order.delivery && (
                            <div className="rounded-xl border border-stone-200/80 bg-[#FCF7F2] p-3 shadow-sm transition-colors hover:border-clay-300">
                                <div className="mb-2 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <Truck
                                            size={
                                                12
                                            }
                                            className="text-clay-600"
                                        />
                                        <p className="text-[10px] font-extrabold uppercase tracking-wide text-clay-700">
                                            Courier
                                            Tracking
                                        </p>
                                    </div>
                                    {order.delivery
                                        .share_link && (
                                        <a
                                            href={
                                                order
                                                    .delivery
                                                    .share_link
                                            }
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 rounded-md border border-clay-200 bg-white px-2 py-1 text-[10px] font-bold text-clay-700 hover:bg-clay-50 hover:text-clay-800 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all"
                                        >
                                            Live
                                            Track{" "}
                                            <ExternalLink
                                                size={
                                                    10
                                                }
                                            />
                                        </a>
                                    )}
                                </div>
        
                                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                                    {order.delivery
                                        .flow_type ===
                                        "replacement_exchange" && (
                                        <span className="inline-flex rounded-md border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] font-bold tracking-tight text-teal-700 shadow-sm">
                                            {
                                                order
                                                    .delivery
                                                    .flow_label
                                            }
                                        </span>
                                    )}
                                    <div
                                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold shadow-sm ${sellerCourierTrackingState(order).tone}`}
                                    >
                                        {
                                            sellerCourierTrackingState(
                                                order,
                                            ).label
                                        }
                                    </div>
                                </div>
        
                                <p className="text-[11px] leading-relaxed text-stone-600 mb-2.5 font-medium">
                                    {
                                        sellerCourierTrackingState(
                                            order,
                                        ).detail
                                    }
                                </p>
        
                                {order.delivery
                                    .flow_type ===
                                    "replacement_exchange" &&
                                    order.delivery
                                        .route_legs
                                        ?.length >
                                        0 && (
                                        <div className="mb-2.5 flex flex-col gap-1 rounded-lg bg-white/60 p-2 border border-stone-100/50">
                                            {order.delivery.route_legs.map(
                                                (
                                                    leg,
                                                ) => (
                                                    <div
                                                        key={`${leg.label}-${leg.from}-${leg.to}`}
                                                        className="flex items-start gap-2"
                                                    >
                                                        <div className="mt-1 h-1 w-1 shrink-0 rounded-full bg-teal-400" />
                                                        <p className="text-[10px] text-stone-700 font-medium">
                                                            <span className="font-bold text-teal-800">
                                                                {
                                                                    leg.label
                                                                }
                                                                :
                                                            </span>{" "}
                                                            {
                                                                leg.from
                                                            }{" "}
                                                            <span className="mx-0.5 text-stone-400">
                                                                →
                                                            </span>{" "}
                                                            {
                                                                leg.to
                                                            }
                                                        </p>
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    )}
        
                                {(order.delivery
                                    .external_order_id ||
                                    order.delivery
                                        .last_updated_at) && (
                                    <div className="flex flex-wrap gap-1.5 mt-2 pt-2.5 border-t border-stone-200/50">
                                        {order
                                            .delivery
                                            .external_order_id && (
                                            <div className="flex items-center gap-1 px-1.5 text-[9px]">
                                                <Hash
                                                    size={
                                                        10
                                                    }
                                                    className="text-stone-400"
                                                />
                                                <span className="font-bold text-stone-600">
                                                    ID:{" "}
                                                    {
                                                        order
                                                            .delivery
                                                            .external_order_id
                                                    }
                                                </span>
                                            </div>
                                        )}
                                        {order
                                            .delivery
                                            .last_updated_at && (
                                            <div className="flex items-center gap-1 px-1.5 text-[9px] text-stone-500 border-l border-stone-300/50">
                                                <Clock
                                                    size={
                                                        10
                                                    }
                                                    className="text-stone-400"
                                                />
                                                <span>
                                                    {
                                                        order
                                                            .delivery
                                                            .last_updated_at
                                                    }
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}
        
                                {order.delivery
                                    .pending_auto_cancel && (
                                    <div className="mt-2.5 flex items-start gap-1.5 rounded-lg border border-red-200 bg-red-50 p-2 text-red-700 shadow-sm">
                                        <AlertTriangle
                                            size={
                                                12
                                            }
                                            className="shrink-0 mt-0.5"
                                        />
                                        <div className="text-[10px]">
                                            <span className="font-bold">
                                                Return-to-sender
                                                Hold
                                            </span>
                                            <p className="mt-0.5">
                                                Auto-cancel
                                                after{" "}
                                                {
                                                    order
                                                        .delivery
                                                        .cancel_hold_ends_at
                                                }{" "}
                                                if
                                                unresolved.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
        
                        {order.timeline?.length >
                            0 && (
                            <div className="rounded-xl border border-stone-200/80 bg-white p-3 shadow-sm transition-colors hover:border-clay-200 flex flex-col">
                                <div className="mb-3 flex items-center justify-between gap-2 border-b border-stone-100 pb-2">
                                    <div className="flex items-center gap-1.5">
                                        <Activity
                                            size={
                                                12
                                            }
                                            className="text-stone-400"
                                        />
                                        <p className="text-[10px] font-extrabold uppercase tracking-wide text-stone-500">
                                            Recent
                                            Activity
                                        </p>
                                    </div>
                                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[9px] font-bold text-stone-500">
                                        {
                                            order
                                                .timeline
                                                .length
                                        }{" "}
                                        events
                                    </span>
                                </div>
                                <div className="space-y-3 pl-1">
                                    {order.timeline
                                        .slice(0, 4)
                                        .map(
                                            (
                                                entry,
                                                i,
                                            ) => (
                                                <div
                                                    key={
                                                        entry.key
                                                    }
                                                    className="relative flex items-start gap-3"
                                                >
                                                    {i !==
                                                        order.timeline.slice(
                                                            0,
                                                            4,
                                                        )
                                                            .length -
                                                            1 && (
                                                        <div className="absolute left-[3px] top-[14px] bottom-[-14px] w-[2px] bg-stone-100" />
                                                    )}
                                                    <div className="relative mt-1 h-2 w-2 shrink-0 rounded-full bg-clay-500 ring-4 ring-white shadow-sm" />
                                                    <div className="min-w-0 flex-1 bg-stone-50/50 rounded-lg p-2 border border-stone-100/50">
                                                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                                                            <p className="text-[11px] font-bold text-stone-800">
                                                                {
                                                                    entry.label
                                                                }
                                                            </p>
                                                            <span
                                                                className={`inline-flex items-center justify-center rounded-md px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider shadow-sm ${timelineSourceTone(entry.source)}`}
                                                            >
                                                                {
                                                                    entry.source
                                                                }
                                                            </span>
                                                        </div>
                                                        {entry.description && (
                                                            <p className="mt-1 text-[10px] leading-relaxed text-stone-600">
                                                                {
                                                                    entry.description
                                                                }
                                                            </p>
                                                        )}
                                                        <div className="mt-1.5 flex items-center gap-1 text-[9px] font-medium text-stone-400">
                                                            <Clock
                                                                size={
                                                                    10
                                                                }
                                                            />
                                                            <span>
                                                                {formatTimelineStamp(
                                                                    entry.timestamp,
                                                                )}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ),
                                        )}
                                </div>
                            </div>
                        )}
        
                        {issueSummary && (
                            <div
                                className={`rounded-lg border px-2.5 py-2 text-left ${issueSummary.tone}`}
                            >
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <issueSummary.icon
                                                size={
                                                    13
                                                }
                                                className="shrink-0 text-current"
                                            />
                                            <p className="text-[11px] font-bold text-stone-900">
                                                {
                                                    issueSummary.title
                                                }
                                            </p>
                                        </div>
                                        <p className="mt-1 text-[9px] leading-snug text-stone-600">
                                            {
                                                issueSummary.detail
                                            }
                                        </p>
                                    </div>
                                    {issueSummary.timestampValue && (
                                        <span
                                            className={`rounded-full border px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide ${issueSummary.badgeTone}`}
                                        >
                                            {
                                                issueSummary.timestampLabel
                                            }
                                            :{" "}
                                            {
                                                issueSummary.timestampValue
                                            }
                                        </span>
                                    )}
                                </div>
        
                                {issueSummary.infoValue && (
                                    <div className="mt-1.5 rounded border border-white/80 bg-white/75 px-2 py-1 text-[9px] text-stone-700 whitespace-pre-wrap leading-snug">
                                        <span className="font-bold">
                                            {
                                                issueSummary.infoLabel
                                            }
                                            :{" "}
                                        </span>
                                        {
                                            issueSummary.infoValue
                                        }
                                    </div>
                                )}
        
                                {issueSummary.proofHref && (
                                    <a
                                        href={
                                            issueSummary.proofHref
                                        }
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-white/80 bg-white/80 px-2 py-1 text-[9px] font-bold text-stone-700 hover:bg-white"
                                    >
                                        <CameraIcon
                                            size={
                                                10
                                            }
                                        />{" "}
                                        {
                                            issueSummary.proofLabel
                                        }
                                    </a>
                                )}
                            </div>
                        )}
        
                        {order.status ===
                            "Pending" && (
                            <>
                                {canAccessMessages && (
                                    <button
                                        onClick={() =>
                                            openChat(
                                                order.user_id,
                                            )
                                        }
                                        aria-label={`Open chat for order ${order.id}`}
                                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-bold text-gray-600 shadow-sm transition-all hover:bg-gray-50 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/20"
                                    >
                                        <MessageCircle
                                            size={
                                                16
                                            }
                                        />{" "}
                                        Discuss
                                        Shipping
                                    </button>
                                )}
                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <button
                                        disabled={
                                            !canEditOrders
                                        }
                                        onClick={() =>
                                            initiateStatusUpdate(
                                                order.id,
                                                "Rejected",
                                            )
                                        }
                                        className="flex-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-bold text-red-600 transition-all hover:bg-red-100 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <XCircle
                                            size={
                                                14
                                            }
                                            className="inline mr-1"
                                        />{" "}
                                        Reject
                                    </button>
                                    <button
                                        disabled={
                                            !canEditOrders
                                        }
                                        onClick={() =>
                                            initiateStatusUpdate(
                                                order.id,
                                                "Accepted",
                                            )
                                        }
                                        className="flex-1 rounded-lg bg-clay-600 px-3 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-clay-700 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <CheckCircle2
                                            size={
                                                14
                                            }
                                            className="inline mr-1"
                                        />{" "}
                                        Accept
                                    </button>
                                </div>
                            </>
                        )}
        
                        {order.status ===
                            "Accepted" && (
                            <div className="space-y-3">
                                {getBOMWarning(
                                    order,
                                ).length > 0 && (
                                    <div className="rounded-xl border border-rose-100 bg-rose-50 p-3">
                                        <div className="flex gap-2 text-rose-700 font-bold text-[11px] mb-1.5">
                                            <AlertTriangle
                                                size={
                                                    14
                                                }
                                                className="shrink-0"
                                            />
                                            <span>
                                                Supply
                                                Shortage
                                                Warning
                                            </span>
                                        </div>
                                        <ul className="space-y-1">
                                            {getBOMWarning(
                                                order,
                                            ).map(
                                                (
                                                    msg,
                                                    i,
                                                ) => (
                                                    <li
                                                        key={
                                                            i
                                                        }
                                                        className="text-[10px] text-rose-600 flex gap-2"
                                                    >
                                                        <div className="mt-1 h-1 w-1 rounded-full bg-rose-400 shrink-0" />
                                                        {
                                                            msg
                                                        }
                                                    </li>
                                                ),
                                            )}
                                        </ul>
                                    </div>
                                )}
        
                                <button
                                    disabled={
                                        !canEditOrders ||
                                        getBOMWarning(
                                            order,
                                        ).length > 0
                                    }
                                    onClick={() =>
                                        initiateStatusUpdate(
                                            order.id,
                                            "Processing",
                                        )
                                    }
                                    className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-white shadow-lg transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${getBOMWarning(order).length > 0 ? "bg-stone-400 shadow-stone-200" : "bg-indigo-600 shadow-indigo-200 hover:bg-indigo-700"}`}
                                >
                                    <Play
                                        size={18}
                                    />{" "}
                                    Start Production
                                </button>
        
                                <div className="h-px bg-stone-100 my-1" />
        
                                <button
                                    disabled={
                                        !canEditOrders
                                    }
                                    onClick={() =>
                                        initiateStatusUpdate(
                                            order.id,
                                            "Rejected",
                                        )
                                    }
                                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-xs font-bold text-red-600 transition-all hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <XCircle
                                        size={14}
                                    />{" "}
                                    Reject Order
                                </button>
                            </div>
                        )}
        
                        {order.status ===
                            "Processing" && (
                            <>
                                <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 text-center">
                                    <div className="flex items-center justify-center gap-2 text-indigo-700 font-bold text-xs mb-1">
                                        <LoaderCircle
                                            size={
                                                14
                                            }
                                            className="animate-spin"
                                        />
                                        <span>
                                            Currently
                                            in
                                            Production
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-indigo-600">
                                        Materials
                                        have been
                                        deducted.
                                        Complete the
                                        item then
                                        dispatch.
                                    </p>
                                </div>
        
                                {order.payment_method !==
                                    "COD" &&
                                order.payment_status !==
                                    "paid" ? (
                                    <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-center">
                                        <div className="flex items-center justify-center gap-2 text-red-600 font-bold text-xs mb-1">
                                            <AlertTriangle
                                                size={
                                                    14
                                                }
                                            />
                                            <span>
                                                Payment
                                                Pending
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-red-500">
                                            Wait for
                                            payment
                                            before
                                            shipping.
                                        </p>
                                    </div>
                                ) : order.shipping_method ===
                                  "Pick Up" ? (
                                    <button
                                        disabled={
                                            !canEditOrders
                                        }
                                        onClick={() =>
                                            openShippingModal(
                                                order,
                                                "pickup-ready",
                                            )
                                        }
                                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-200 transition-colors hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <PackageCheck
                                            size={
                                                18
                                            }
                                        />{" "}
                                        Mark as
                                        Ready for
                                        Pickup
                                    </button>
                                ) : (
                                    <div className="space-y-2.5">
                                        <button
                                            disabled={
                                                !canEditOrders
                                            }
                                            onClick={() =>
                                                openShippingModal(
                                                    order,
                                                    "ship",
                                                )
                                            }
                                            className="flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 shadow-sm transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <PackageCheck
                                                size={
                                                    18
                                                }
                                            />{" "}
                                            Dispatch
                                            Order
                                        </button>
                                        <button
                                            onClick={() =>
                                                createLalamoveDelivery(
                                                    order.id,
                                                )
                                            }
                                            disabled={
                                                !canEditOrders ||
                                                !order.lalamove_booking_ready ||
                                                bookingOrderId ===
                                                    order.id
                                            }
                                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-200 transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            {bookingOrderId ===
                                            order.id ? (
                                                <>
                                                    <LoaderCircle
                                                        size={
                                                            18
                                                        }
                                                        className="animate-spin"
                                                    />
                                                    Creating
                                                    Lalamove...
                                                </>
                                            ) : (
                                                <>
                                                    <Truck
                                                        size={
                                                            18
                                                        }
                                                    />
                                                    Use
                                                    Lalamove
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
        
                        {(order.status ===
                            "Shipped" ||
                            order.status ===
                                "Ready for Pickup") && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-2">
                                    <Truck
                                        size={13}
                                        className="text-blue-400 shrink-0"
                                    />
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-bold text-blue-700">
                                            {order.status ===
                                            "Ready for Pickup"
                                                ? "Ready for Pickup"
                                                : "Shipment in Progress"}
                                        </p>
                                        <p className="text-[9px] text-blue-500">
                                            {order.status ===
                                            "Ready for Pickup"
                                                ? "Mark it as picked up once the buyer receives it."
                                                : "Mark it as delivered once the buyer has the parcel."}
                                        </p>
                                    </div>
                                </div>
                                {!isLalamoveManagedOrder(
                                    order,
                                ) && (
                                    <button
                                        disabled={
                                            !canEditOrders
                                        }
                                        onClick={() =>
                                            openShippingModal(
                                                order,
                                                "deliver",
                                            )
                                        }
                                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-teal-200 transition-colors hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <MapPin
                                            size={
                                                18
                                            }
                                        />
                                        {order.status ===
                                        "Ready for Pickup"
                                            ? "Mark as Picked Up"
                                            : "Mark as Delivered"}
                                    </button>
                                )}
                            </div>
                        )}
        
                        {order.status === 'Delivered' && !order.replacement_in_progress && !isLalamoveManagedOrder(order) && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-2.5 py-2">
                                        <CheckCircle2
                                            size={
                                                13
                                            }
                                            className="text-green-500 shrink-0"
                                        />
                                        <div className="min-w-0">
                                            <p className="text-[11px] font-bold text-green-700">
                                                Delivered
                                                to
                                                Buyer
                                            </p>
                                            <p className="text-[9px] text-green-600">
                                                Complete
                                                when
                                                buyer
                                                has
                                                confirmed.
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        disabled={
                                            !canEditOrders
                                        }
                                        onClick={() =>
                                            initiateStatusUpdate(
                                                order.id,
                                                "Completed",
                                            )
                                        }
                                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-green-200 transition-colors hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <CheckCircle2
                                            size={
                                                18
                                            }
                                        />{" "}
                                        Complete
                                        Transaction
                                    </button>
                                </div>
                            )}
        
                        {order.status === 'Delivered' && !order.replacement_in_progress && isLalamoveManagedOrder(order) && (
                                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2">
                                    <CheckCircle2
                                        size={13}
                                        className="text-emerald-500 shrink-0"
                                    />
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-bold text-emerald-700">
                                            Courier
                                            marked
                                            delivered
                                        </p>
                                        <p className="text-[9px] text-emerald-600">
                                            Awaiting
                                            buyer
                                            receipt
                                            confirmation.
                                        </p>
                                    </div>
                                </div>
                            )}
        
                        {order.status ===
                            "Delivered" &&
                            order.replacement_in_progress && (
                                <div className="flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-2">
                                    <PackageCheck
                                        size={13}
                                        className="text-teal-500 shrink-0"
                                    />
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-bold text-teal-700">Waiting for Buyer Confirmation</p>
                                        <p className="text-[9px] text-teal-600">
                                            Replacement
                                            unresolved
                                            until
                                            receipt.
                                        </p>
                                    </div>
                                </div>
                            )}
        
                        {order.status ===
                            "Refund/Return" && (
                            <>
                                {canAccessMessages && (
                                    <button
                                        onClick={() =>
                                            openChat(
                                                order.user_id,
                                            )
                                        }
                                        aria-label={`Open chat for order ${order.id}`}
                                        className="w-full flex items-center justify-center gap-2 rounded-lg bg-clay-600 px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-clay-700"
                                    >
                                        <MessageCircle
                                            size={
                                                16
                                            }
                                        />{" "}
                                        Negotiate
                                    </button>
                                )}
                                <div className="flex flex-col gap-2">
                                    <div className="flex flex-col gap-2 sm:flex-row">
                                        <button
                                            onClick={() =>
                                                submitRefundApproval(
                                                    order.id,
                                                )
                                            }
                                            disabled={
                                                !canEditOrders ||
                                                !!returnActionKey ||
                                                replacementModal.processing
                                            }
                                            className="flex-1 px-2 py-2 border border-gray-200 text-gray-700 bg-white rounded-lg text-[10px] font-bold hover:bg-gray-50 transition shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                                            title="Refunds money without deducting stock"
                                        >
                                            {returnActionKey ===
                                            `${order.id}:refund`
                                                ? "Refunding..."
                                                : "Approve (Refund)"}
                                        </button>
                                        <button
                                            onClick={() =>
                                                openReplacementModal(
                                                    order.id,
                                                )
                                            }
                                            disabled={
                                                !canEditOrders ||
                                                !!returnActionKey ||
                                                replacementModal.processing
                                            }
                                            className="flex-1 px-2 py-2 border border-gray-200 text-gray-700 bg-white rounded-lg text-[10px] font-bold hover:bg-gray-50 transition shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                                            title="Restarts the delivery cycle and requires a compensation note"
                                        >
                                            Approve
                                            (Replace)
                                        </button>
                                    </div>
                                    <button
                                        disabled={
                                            !canEditOrders
                                        }
                                        onClick={() =>
                                            initiateStatusUpdate(
                                                order.id,
                                                "Completed",
                                            )
                                        }
                                        className="w-full px-2 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg text-[10px] font-bold hover:bg-red-100 transition disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Reject
                                        Return
                                    </button>
                                </div>
                            </>
                        )}
        
                        {order.status ===
                            "Completed" && (
                            <a
                                href={route(
                                    "orders.receipt",
                                    order.id,
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-green-600 transition-colors hover:text-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/20"
                            >
                                <Printer
                                    size={16}
                                />{" "}
                                View Receipt
                            </a>
                        )}
        
                        {(order.status ===
                            "Cancelled" ||
                            order.status ===
                                "Rejected") && (
                            <div className="flex items-center justify-center gap-1.5 rounded-lg bg-gray-50 border border-gray-100 px-2.5 py-2">
                                <XCircle
                                    size={12}
                                    className="text-gray-400"
                                />
                                <p className="text-[11px] font-medium text-gray-500">
                                    Order{" "}
                                    {order.status.toLowerCase()}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
