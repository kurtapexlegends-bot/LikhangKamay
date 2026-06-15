/**
 * Helper utilities for rendering seller review moderation statuses, outcomes, and styling tones.
 */

export const moderationStatusLabel = (status) => {
    if (status === 'resolved') return 'Request approved';
    if (status === 'under_review') return 'Under review';
    if (status === 'rejected') return 'Request rejected';
    return 'Pending review';
};

export const moderationOutcomeLabel = (dispute) => {
    if (!dispute) return null;
    if (dispute.status === 'resolved') {
        return dispute.review_hidden_from_marketplace
            ? 'Review hidden from marketplace'
            : 'Request approved, but review is still visible';
    }
    if (dispute.status === 'rejected') {
        return 'Review remains visible in the marketplace';
    }
    if (dispute.status === 'under_review') {
        return 'Review is still visible while admin checks the request';
    }
    return 'No review action yet';
};

export const moderationOutcomeTone = (dispute) => {
    if (!dispute) return 'border-stone-200 bg-stone-50 text-stone-600';
    if (dispute.status === 'resolved' && dispute.review_hidden_from_marketplace) {
        return 'border-rose-200 bg-rose-50 text-rose-700';
    }
    if (['resolved', 'rejected'].includes(dispute.status)) {
        return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    }
    return 'border-stone-200 bg-stone-50 text-stone-600';
};
