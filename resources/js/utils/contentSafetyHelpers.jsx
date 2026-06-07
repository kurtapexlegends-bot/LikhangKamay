import React from 'react';

export const statusClasses = {
    pending: 'border-amber-200 bg-amber-50 text-amber-700',
    under_review: 'border-blue-200 bg-blue-50 text-blue-700',
    resolved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    rejected: 'border-stone-200 bg-stone-50 text-stone-600',
};

export const statusLabels = {
    pending: 'Pending',
    under_review: 'Under Review',
    resolved: 'Approved',
    rejected: 'Rejected',
};

export const outcomeClasses = {
    hidden: 'border-rose-200 bg-rose-50 text-rose-700',
    visible: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

export const getModerationOutcome = (dispute) => {
    if (dispute.status === 'resolved') {
        return dispute.review_hidden_from_marketplace
            ? { tone: 'hidden', label: 'Review hidden from marketplace' }
            : { tone: 'visible', label: 'Request approved, but review is still visible' };
    }
    if (dispute.status === 'rejected') {
        return { tone: 'visible', label: 'Review remains visible in the marketplace' };
    }
    if (dispute.status === 'under_review') {
        return { tone: null, label: 'Review is still visible while the request is being reviewed' };
    }
    return { tone: null, label: 'No review action yet. Start review or remove the request.' };
};

export const SkeletonModeration = () => (
    <div className="divide-y divide-stone-100">
        {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="p-4 space-y-3 animate-pulse">
                <div className="flex justify-between">
                    <div className="h-2 w-16 bg-stone-100 rounded" />
                    <div className="h-2 w-12 bg-stone-100 rounded" />
                </div>
                <div className="h-4 w-3/4 bg-stone-100 rounded" />
                <div className="h-2 w-1/2 bg-stone-100 rounded" />
            </div>
        ))}
    </div>
);
