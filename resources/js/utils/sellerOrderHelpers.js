import {
    RotateCcw,
    PackageCheck,
    CheckCircle2,
    CreditCard
} from "lucide-react";

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

export const sellerDeliverySummary = (order) => {
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

export const sellerIssueSummary = (order) => {
    if (order.status === "Refund/Return") {
        const dispute = order.dispute;
        const reason = dispute ? dispute.reason : (order.return_reason || "No reason provided.");
        const proofPhotos = dispute ? dispute.proof_photos : (order.return_proof_image ? [order.return_proof_image] : []);
        
        let title = "Return Pending Decision";
        let detail = "Review the buyer proof, coordinate in chat if needed, then respond to the dispute claim.";
        let tone = "border-orange-200 bg-orange-50";
        let badgeTone = "border-orange-200 bg-white text-orange-700";

        if (dispute) {
            if (dispute.status === "seller_accepted") {
                title = "Refund Accepted by Shop";
                detail = "You accepted the buyer's refund request.";
                tone = "border-purple-200 bg-purple-50";
                badgeTone = "border-purple-200 bg-white text-purple-700";
            } else if (dispute.status === "seller_rejected") {
                title = "Return Request Declined";
                detail = "You declined the return claim. The buyer may accept this or escalate to platform support.";
                tone = "border-rose-200 bg-rose-50";
                badgeTone = "border-rose-200 bg-white text-rose-700";
            } else if (dispute.status === "seller_proposed_replacement") {
                title = "Replacement Offered";
                detail = "You offered a replacement. Waiting for customer response.";
                tone = "border-blue-200 bg-blue-50";
                badgeTone = "border-blue-200 bg-white text-blue-700";
            } else if (dispute.status === "escalated") {
                title = "Needs Platform Review";
                detail = "The dispute has been escalated. Platform support is reviewing evidence from both parties.";
                tone = "border-amber-200 bg-amber-50";
                badgeTone = "border-amber-200 bg-white text-amber-700";
            }
        }

        return {
            tone,
            badgeTone,
            icon: RotateCcw,
            title,
            detail,
            timestampLabel: dispute?.resolved_at ? "Resolved" : null,
            timestampValue: dispute?.resolved_at || null,
            infoLabel: "Reason",
            infoValue: reason,
            resolutionNotes: dispute?.admin_notes || null,
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
            title: "Replacement in progress",
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
            detail: "The refund was processed for this order. Escrow funds were returned to the customer.",
            timestampLabel: dispute?.resolved_at ? "Resolved" : null,
            timestampValue: dispute?.resolved_at || null,
            infoLabel: dispute ? "Reason" : null,
            infoValue: dispute ? dispute.reason : null,
            resolutionNotes: dispute?.admin_notes || null,
            proofPhotos: proofPhotos,
            proofHref: !dispute && order.return_proof_image ? order.return_proof_image : null,
            proofLabel: "View Buyer Proof",
        };
    }

    return null;
};

export const getBOMWarning = (order) => {
    const issues = [];
    if (!order.items) return issues;
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
