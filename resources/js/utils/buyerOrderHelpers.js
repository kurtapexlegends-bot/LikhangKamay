import {
    RotateCcw,
    PackageCheck,
    CheckCircle,
    CreditCard
} from "lucide-react";

export const humanizeAddressType = (value) => {
    if (!value) return null;
    return String(value)
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
};

export const formatTimelineStamp = (value) => {
    if (!value) return null;

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

export const deliveryStatusConfig = (status) => {
    const normalized = String(status || '').toUpperCase();

    const configs = {
        ASSIGNING_DRIVER: {
            label: 'Assigning Driver',
            tone: 'border-sky-200 bg-sky-50 text-sky-700',
            detail: 'Lalamove is assigning a courier.',
        },
        ON_GOING: {
            label: 'On Going',
            tone: 'border-sky-200 bg-sky-50 text-sky-700',
            detail: 'Courier is moving with your order.',
        },
        PICKED_UP: {
            label: 'Picked Up',
            tone: 'border-blue-200 bg-blue-50 text-blue-700',
            detail: 'Your package has been picked up.',
        },
        COMPLETED: {
            label: 'Completed',
            tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
            detail: 'Lalamove marked this delivery as completed.',
        },
        CANCELED: {
            label: 'Canceled',
            tone: 'border-red-200 bg-red-50 text-red-700',
            detail: 'Courier canceled the delivery.',
        },
        REJECTED: {
            label: 'Rejected',
            tone: 'border-red-200 bg-red-50 text-red-700',
            detail: 'Lalamove rejected the delivery request.',
        },
        EXPIRED: {
            label: 'Expired',
            tone: 'border-amber-200 bg-amber-50 text-amber-700',
            detail: 'The delivery request expired.',
        },
    };

    return configs[normalized] || {
        label: normalized || 'Pending',
        tone: 'border-gray-200 bg-gray-50 text-gray-700',
        detail: 'Waiting for courier updates.',
    };
};

export const buyerCourierTrackingState = (order) => {
    const base = deliveryStatusConfig(order?.delivery?.status);
    const isReplacementExchange = order?.delivery?.flow_type === 'replacement_exchange';

    if (String(order?.delivery?.status || '').toUpperCase() === 'COMPLETED' && order?.status === 'Delivered') {
        return {
            ...base,
            label: isReplacementExchange ? 'Exchange Completed' : 'Awaiting Your Confirmation',
            tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
            detail: isReplacementExchange
                ? 'Courier completed the replacement exchange. Confirm receipt once the replacement item is safely with you.'
                : 'Courier completed delivery. Confirm receipt once the order is safely with you.',
        };
    }

    if (String(order?.delivery?.status || '').toUpperCase() === 'COMPLETED' && order?.status === 'Completed') {
        return {
            ...base,
            label: isReplacementExchange ? 'Exchange Resolved' : 'Delivered',
            tone: 'border-green-200 bg-green-50 text-green-700',
            detail: isReplacementExchange
                ? 'Courier completed the replacement exchange and you already confirmed receipt.'
                : 'Courier completed delivery and you already confirmed receipt.',
        };
    }

    if (isReplacementExchange) {
        return {
            ...base,
            detail: 'Replacement exchange is in progress. Courier will deliver the replacement item and return the rejected item to the seller.',
        };
    }

    return base;
};

export const buyerProofLabel = (order) => {
    if (!order?.proof_of_delivery) return null;

    if (order.shipping_method === 'Pick Up') {
        return ['Delivered', 'Completed'].includes(order.status)
            ? 'View Pickup Handover Proof'
            : 'View Proof of Readiness';
    }

    return ['Delivered', 'Completed'].includes(order.status)
        ? 'View Delivery Proof'
        : 'View Shipment Proof';
};

export const buyerDeliverySummary = (order) => {
    const latestEvent = order?.timeline?.[0] ?? null;
    const latestEventTime = latestEvent?.timestamp ? formatTimelineStamp(latestEvent.timestamp) : null;

    if (order.shipping_method === 'Pick Up') {
        if (order.status === 'Ready for Pickup') {
            return {
                tone: 'border-sky-100 bg-sky-50',
                title: 'Ready for pickup',
                detail: 'Your order is packed and ready. Coordinate the pickup time with the seller.',
                latestEvent,
                latestEventTime,
            };
        }

        if (['Delivered', 'Completed'].includes(order.status)) {
            return {
                tone: 'border-emerald-100 bg-emerald-50',
                title: order.status === 'Completed' ? 'Pickup completed' : 'Picked up',
                detail: order.status === 'Completed'
                    ? 'You already confirmed receipt of this pickup order.'
                    : 'The seller marked the order as picked up. Confirm receipt once everything is complete.',
                latestEvent,
                latestEventTime,
            };
        }

        return {
            tone: 'border-orange-100 bg-orange-50',
            title: 'Pickup preparation',
            detail: 'The seller will notify you once the order is ready for pickup.',
            latestEvent,
            latestEventTime,
        };
    }

    if (order.delivery?.provider === 'lalamove') {
        return null;
    }

    if (order.status === 'Accepted') {
        return {
            tone: 'border-blue-100 bg-blue-50',
            title: 'Preparing for shipment',
            detail: 'The seller accepted the order and will upload shipment proof before marking it as shipped.',
            latestEvent,
            latestEventTime,
        };
    }

    if (order.status === 'Shipped') {
        return {
            tone: 'border-sky-100 bg-sky-50',
            title: 'Shipment in progress',
            detail: 'The seller marked the parcel as shipped. Check the shipment proof and tracking details if provided.',
            latestEvent,
            latestEventTime,
        };
    }

    if (order.status === 'Delivered') {
        return {
            tone: 'border-teal-100 bg-teal-50',
            title: 'Marked as delivered',
            detail: 'Review the delivery proof, then confirm receipt once the order is safely with you.',
            latestEvent,
            latestEventTime,
        };
    }

    if (order.status === 'Completed') {
        return {
            tone: 'border-green-100 bg-green-50',
            title: 'Order completed',
            detail: 'You already confirmed receipt of this order.',
            latestEvent,
            latestEventTime,
        };
    }

    return {
        tone: 'border-stone-100 bg-stone-50',
        title: 'Order update pending',
        detail: 'The seller will update the delivery status as the order moves forward.',
        latestEvent,
        latestEventTime,
    };
};

export const buyerIssueSummary = (order) => {
    if (order.dispute) {
        const dispute = order.dispute;
        let title = 'Dispute Return/Refund Filed';
        let detail = 'Your request is waiting for the seller. Use chat to agree on a refund or replacement.';
        let tone = 'border-orange-200 bg-orange-50';
        let badgeTone = 'border-orange-200 bg-white text-orange-700';

        if (dispute.status === 'seller_accepted') {
            title = 'Refund Approved';
            detail = 'The seller accepted your refund request.';
            tone = 'border-purple-200 bg-purple-50';
            badgeTone = 'border-purple-200 bg-white text-purple-700';
        } else if (dispute.status === 'seller_rejected') {
            title = 'Dispute Rejected by Seller';
            detail = 'The seller rejected your return request. You can negotiate via chat, accept the decision, or escalate to Admin Helpdesk for arbitration.';
            tone = 'border-red-200 bg-red-50';
            badgeTone = 'border-red-200 bg-white text-red-700';
        } else if (dispute.status === 'seller_proposed_replacement') {
            title = 'Replacement Exchange Proposed';
            detail = 'The seller proposed a replacement exchange. Please review the details below. You can accept this offer or escalate the dispute to Admin Helpdesk.';
            tone = 'border-blue-200 bg-blue-50';
            badgeTone = 'border-blue-200 bg-white text-blue-700';
        } else if (dispute.status === 'escalated') {
            title = 'Escalated to Admin Support';
            detail = 'The dispute has been escalated. Platform moderators are reviewing the evidence to resolve the issue.';
            tone = 'border-amber-200 bg-amber-50';
            badgeTone = 'border-amber-200 bg-white text-amber-700';
        } else if (dispute.status === 'resolved_refunded') {
            title = 'Dispute Resolved: Refunded';
            detail = 'Admin support or seller ruled in favor of a refund. The transaction has been refunded.';
            tone = 'border-purple-200 bg-purple-50';
            badgeTone = 'border-purple-200 bg-white text-purple-700';
        } else if (dispute.status === 'resolved_rejected') {
            title = 'Dispute Case Closed';
            detail = 'Admin support ruled to reject the return claim. The order remains completed.';
            tone = 'border-stone-200 bg-stone-50';
            badgeTone = 'border-stone-200 bg-white text-stone-700';
        } else if (dispute.status === 'resolved_replacement') {
            title = 'Replacement Exchange Started';
            detail = 'You accepted the replacement proposal. The seller is preparing the replacement item.';
            tone = 'border-teal-200 bg-teal-50';
            badgeTone = 'border-teal-200 bg-white text-teal-700';
        }

        return {
            tone,
            badgeTone,
            icon: RotateCcw,
            title,
            detail,
            timestampLabel: dispute.resolved_at ? 'Resolved' : (dispute.status === 'seller_proposed_replacement' ? 'Proposed' : null),
            timestampValue: dispute.resolved_at || null,
            infoLabel: dispute.status === 'seller_proposed_replacement' ? 'Replacement Description' : (dispute.status === 'seller_rejected' ? 'Rejection Explanation' : 'Reason'),
            infoValue: dispute.status === 'seller_proposed_replacement' ? dispute.seller_proposed_description : (dispute.status === 'seller_rejected' ? dispute.seller_explanation : dispute.reason),
            proofPhotos: dispute.proof_photos,
        };
    }

    if (order.status === 'Refund/Return') {
        return {
            tone: 'border-orange-200 bg-orange-50',
            badgeTone: 'border-orange-200 bg-white text-orange-700',
            icon: RotateCcw,
            title: 'Return under review',
            detail: 'Your request is waiting for the seller. Use chat to agree on a refund or replacement.',
            timestampLabel: null,
            timestampValue: null,
            infoLabel: 'Reason',
            infoValue: order.return_reason || 'No reason provided.',
            proofHref: order.return_proof_image,
            proofLabel: 'View Return Proof',
        };
    }

    if (order.replacement_in_progress) {
        return {
            tone: 'border-teal-200 bg-teal-50',
            badgeTone: 'border-teal-200 bg-white text-teal-700',
            icon: PackageCheck,
            title: 'Replacement approved',
            detail: order.delivery?.flow_type === 'replacement_exchange'
                ? 'Courier will deliver the replacement to you and return the rejected item to the seller.'
                : 'The seller approved a replacement. Wait for the replacement item, then confirm receipt once it arrives.',
            timestampLabel: 'Approved',
            timestampValue: order.replacement_started_at,
            infoLabel: 'Resolution',
            infoValue: order.replacement_resolution_description || null,
            proofHref: null,
            proofLabel: null,
        };
    }

    if (order.replacement_resolved_at) {
        return {
            tone: 'border-emerald-200 bg-emerald-50',
            badgeTone: 'border-emerald-200 bg-white text-emerald-700',
            icon: CheckCircle,
            title: 'Replacement completed',
            detail: 'You already confirmed receipt of the replacement item and the issue has been resolved.',
            timestampLabel: 'Confirmed',
            timestampValue: order.replacement_resolved_at,
            infoLabel: 'Resolution',
            infoValue: order.replacement_resolution_description || null,
            proofHref: null,
            proofLabel: null,
        };
    }

    if (order.status === 'Refunded' || order.payment_status === 'refunded') {
        return {
            tone: 'border-purple-200 bg-purple-50',
            badgeTone: 'border-purple-200 bg-white text-purple-700',
            icon: CreditCard,
            title: 'Refund completed',
            detail: 'The seller approved your return and the refund has already been processed for this order.',
            timestampLabel: null,
            timestampValue: null,
            infoLabel: null,
            infoValue: null,
            proofHref: order.return_proof_image,
            proofLabel: order.return_proof_image ? 'View Return Proof' : null,
        };
    }

    return null;
};
