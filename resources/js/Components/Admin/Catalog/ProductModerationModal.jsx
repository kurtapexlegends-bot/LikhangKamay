import React, { useState, useEffect } from 'react';
import { XCircle, ShieldAlert, CheckCircle2 } from 'lucide-react';
import ConfirmationModal from '@/Components/ConfirmationModal';
import SlideOverDrawer from '@/Components/SlideOverDrawer';
import Modal from '@/Components/Modal';

export default function ProductModerationModal({
    isOpen,
    type,
    ids,
    processing,
    feedback,
    setFeedback,
    onClose,
    onConfirm,
    lastType
}) {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    if (!isOpen) return null;

    if (type === 'approve') {
        return (
            <ConfirmationModal
                isOpen={isOpen && type === 'approve'}
                onClose={onClose}
                onConfirm={onConfirm}
                title="Approve Listing(s)?"
                message={`Are you sure you want to approve the selected ${ids?.length || 1} product listing(s)? This will publish them and make them fully searchable in the public marketplace.`}
                icon={CheckCircle2}
                iconBg="bg-emerald-50 text-emerald-600"
                confirmText="Yes, Approve"
                confirmColor="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-250/20"
                processing={processing}
            />
        );
    }

    if (type === 'reject' || type === 'flag') {
        const isReject = lastType === 'reject' || type === 'reject';
        
        const renderModerationForm = () => (
            <div className="space-y-6">
                <div className="flex items-start gap-3">
                    <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 ${
                            isReject
                                ? 'bg-red-50 text-red-650 border-red-100/50'
                                : 'bg-amber-50 text-amber-655 border-amber-100/50'
                        }`}
                    >
                        {isReject ? <XCircle size={22} /> : <ShieldAlert size={22} />}
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-stone-900">
                            {isReject ? 'Provide Rejection Feedback' : 'Provide Flag Reason'}
                        </h2>
                        <p className="text-xs text-stone-550 mt-1 font-medium leading-relaxed">
                            Enter the feedback or reason for this moderation action on the selected {ids?.length || 1} product(s). Sellers will be notified of this message.
                        </p>
                    </div>
                </div>

                <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-2">
                        Reason Feedback
                    </label>
                    <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        rows={5}
                        className="w-full rounded-xl border border-stone-250 focus:border-clay-300 focus:ring-clay-200 text-sm"
                        placeholder="Explain the listing adjustments or guidelines violated so the seller can take corrective actions."
                        autoFocus
                    />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 border border-stone-200 rounded-xl text-sm font-bold text-stone-700 hover:bg-stone-50 transition min-h-[44px]"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={processing || !feedback.trim()}
                        className={`px-5 py-2.5 rounded-xl text-sm font-bold text-white transition disabled:opacity-50 min-h-[44px] ${
                            isReject
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-amber-600 hover:bg-amber-700'
                        }`}
                    >
                        {processing ? 'Processing...' : isReject ? 'Reject Listing(s)' : 'Flag Listing(s)'}
                    </button>
                </div>
            </div>
        );

        if (isMobile) {
            return (
                <SlideOverDrawer
                    show={isOpen && (type === 'reject' || type === 'flag')}
                    onClose={onClose}
                    title={isReject ? 'Reject Product Listing(s)?' : 'Flag Product Listing(s)?'}
                    widthClass="max-w-md"
                >
                    {renderModerationForm()}
                </SlideOverDrawer>
            );
        }

        return (
            <Modal show={isOpen && (type === 'reject' || type === 'flag')} onClose={onClose} maxWidth="md">
                <div className="p-6">
                    <h2 className="text-lg font-bold text-stone-900 mb-1">
                        {isReject ? 'Reject Product Listing(s)' : 'Flag Product Listing(s)'}
                    </h2>
                    {renderModerationForm()}
                </div>
            </Modal>
        );
    }

    return null;
}
