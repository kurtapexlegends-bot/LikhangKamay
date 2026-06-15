import React, { useState, useEffect } from 'react';
import Modal from '@/Components/Modal';
import SlideOverDrawer from '@/Components/SlideOverDrawer';
import InputLabel from '@/Components/InputLabel';
import { ShieldAlert } from 'lucide-react';

export default function ReviewDisputeModal({
    isOpen,
    review,
    mode,
    disputeReason,
    setDisputeReason,
    disputeDetails,
    setDisputeDetails,
    disputeFeedback,
    disputeErrors,
    submitting,
    onClose,
    onConfirm,
    canEditReviews
}) {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const checkMobile = () => setIsMobile(window.innerWidth < 1024);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const title = mode === 'edit' ? 'Edit Moderation Request' : 'Request Review Moderation';
    const subtitle = mode === 'edit'
        ? 'Update the reason or details before the request is closed.'
        : 'Flag this review for admin review with a clear reason.';

    const formContent = (
        <div className="space-y-4">
            {disputeFeedback && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 animate-page-enter">
                    {disputeFeedback}
                </div>
            )}
            <div>
                <InputLabel value="Reason" />
                <select
                    value={disputeReason}
                    onChange={(event) => setDisputeReason(event.target.value)}
                    className={`w-full rounded-xl border px-3 py-2 text-sm text-stone-700 outline-none transition focus:border-clay-300 ${disputeErrors.reason ? 'border-rose-300 bg-rose-50/40' : 'border-stone-200'}`}
                >
                    <option value="Misleading review">Misleading review</option>
                    <option value="Abusive language">Abusive language</option>
                    <option value="Spam or irrelevant content">Spam or irrelevant content</option>
                    <option value="Suspected fraudulent review">Suspected fraudulent review</option>
                </select>
                {disputeErrors.reason && (
                    <p className="mt-1 text-[11px] font-medium text-rose-600">{disputeErrors.reason}</p>
                )}
            </div>
            <div>
                <InputLabel value="Details" />
                <textarea
                    value={disputeDetails}
                    onChange={(event) => setDisputeDetails(event.target.value)}
                    rows={4}
                    maxLength={1500}
                    placeholder="State what looks inaccurate or why this review needs moderation."
                    className={`w-full rounded-xl border px-3 py-2 text-sm text-stone-700 outline-none transition focus:border-clay-300 ${disputeErrors.details ? 'border-rose-300 bg-rose-50/40' : 'border-stone-200'}`}
                />
                <p className="mt-1 text-[11px] text-stone-400">{disputeDetails.length} / 1500</p>
                {disputeErrors.details && (
                    <p className="mt-1 text-[11px] font-medium text-rose-600">{disputeErrors.details}</p>
                )}
            </div>

            <div className="mt-6 flex items-center gap-3">
                <button
                    type="button"
                    className="flex-1 rounded-xl bg-stone-100 px-4 py-2.5 text-sm font-bold text-stone-700 transition hover:bg-stone-200 min-h-[44px]"
                    onClick={onClose}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    disabled={!canEditReviews || submitting}
                    className="flex-1 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px]"
                    onClick={onConfirm}
                >
                    {submitting ? 'Submitting...' : mode === 'edit' ? 'Save Changes' : 'Submit Request'}
                </button>
            </div>
        </div>
    );

    if (isOpen && isMobile) {
        return (
            <SlideOverDrawer
                show={isOpen}
                onClose={onClose}
                title={title}
                widthClass="max-w-md"
            >
                <div className="space-y-6">
                    <p className="text-xs text-stone-500 font-medium -mt-2">{subtitle}</p>
                    {formContent}
                </div>
            </SlideOverDrawer>
        );
    }

    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="md">
            <div className="p-6">
                <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                        <ShieldAlert size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-stone-900">{title}</h2>
                        <p className="text-sm text-stone-500">{subtitle}</p>
                    </div>
                </div>
                {formContent}
            </div>
        </Modal>
    );
}
