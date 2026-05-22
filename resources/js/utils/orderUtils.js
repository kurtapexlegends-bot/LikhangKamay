export const humanizeAddressType = (value) => {
    if (!value) return null;

    return String(value)
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
};

export const isLalamoveManagedOrder = (order) =>
    order?.shipping_method === "Delivery" &&
    !!order?.delivery?.external_order_id;

export const lalamoveStatusConfig = (status) => {
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

export const sellerCourierTrackingState = (order) => {
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

export const formatTimelineStamp = (value) => {
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

export const timelineSourceTone = (source) => {
    if (source === "courier") {
        return "border-sky-200 bg-sky-50 text-sky-700";
    }

    if (source === "status") {
        return "border-stone-200 bg-stone-100 text-stone-600";
    }

    return "border-clay-200 bg-clay-50 text-clay-700";
};

export const sellerProofLabel = (order) => {
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

import { RotateCcw, PackageCheck, CheckCircle2, CreditCard } from "lucide-react";

export const sellerDeliverySummary = (order) => {
    if (order.shipping_method === "Pick Up") {
        if (order.status === "Accepted") {
            return {
                tone: "border-orange-200 bg-orange-50 text-orange-700",
                title: "Prepare for pickup",
                detail: "Upload a readiness photo before the buyer is notified for pickup.",
            };
        }

        if (order.status === "Ready for Pickup") {
            return {
                tone: "border-sky-200 bg-sky-50 text-sky-700",
                title: "Waiting for buyer pickup",
                detail: "Mark the order as picked up once the handover is complete.",
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

    if (order.status === "Shipped") {
        return {
            tone: "border-sky-200 bg-sky-50 text-sky-700",
            title: "Manual shipment in progress",
            detail: "Keep the shipment proof visible to the buyer, then upload final delivery proof when the parcel arrives.",
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

export const sellerIssueSummary = (order) => {
    if (order.status === "Refund/Return") {
        return {
            tone: "border-orange-200 bg-orange-50",
            badgeTone: "border-orange-200 bg-white text-orange-700",
            icon: RotateCcw,
            title: "Return pending decision",
            detail: "Review the buyer proof, coordinate in chat if needed, then refund, replace, or reject the request.",
            timestampLabel: null,
            timestampValue: null,
            infoLabel: "Reason",
            infoValue: order.return_reason || "No reason provided.",
            proofHref: order.return_proof_image,
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

    if (order.replacement_resolved_at || order.status === "Replaced") {
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
        return {
            tone: "border-purple-200 bg-purple-50",
            badgeTone: "border-purple-200 bg-white text-purple-700",
            icon: CreditCard,
            title: "Refund completed",
            detail: "The refund is already processed for this order. The return case is closed unless a new issue is opened.",
            timestampLabel: null,
            timestampValue: null,
            infoLabel: null,
            infoValue: null,
            proofHref: order.return_proof_image,
            proofLabel: order.return_proof_image ? "View Buyer Proof" : null,
        };
    }

    return null;
};
