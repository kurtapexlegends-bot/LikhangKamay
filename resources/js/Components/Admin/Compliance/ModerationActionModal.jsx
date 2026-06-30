import React from 'react';
import Modal from '@/Components/Modal';
import SlideOverDrawer from '@/Components/SlideOverDrawer';

export default function ModerationActionModal({
    isMobile,
    disputeModalState,
    closeDisputeActionModal,
    disputeResolutionNotes,
    setDisputeResolutionNotes,
    disputeProcessing,
    submitDisputeUpdate,
    disputeDeleteState,
    setDisputeDeleteState,
    submitDisputeDelete
}) {
    const [countdown, setCountdown] = React.useState(0);

    React.useEffect(() => {
        if (disputeModalState.open && (disputeModalState.status === 'resolved' || disputeModalState.status === 'rejected')) {
            setCountdown(5);
        } else {
            setCountdown(0);
        }
    }, [disputeModalState.open, disputeModalState.status]);

    React.useEffect(() => {
        if (countdown <= 0) return;
        const timer = setTimeout(() => {
            setCountdown(prev => prev - 1);
        }, 1000);
        return () => clearTimeout(timer);
    }, [countdown]);

    // --- Inner content for dispute update decision ---
    const updateModalTitle = disputeModalState.status === 'under_review' ? 'Start Dispute Review' : 
                             disputeModalState.status === 'resolved' ? 'Approve Moderation Request' : 'Reject Moderation Request';
                             
    const updateModalDescription = disputeModalState.status === 'under_review' ? 'Mark this dispute as active under_review so other staff are informed.' : 
                                   disputeModalState.status === 'resolved' ? 'Approve this request. The review will be hidden from the product page.' : 
                                   'Reject this request. The review comment will remain visible on the product catalog.';

    const renderUpdateContent = () => (
        <div className={`space-y-4 ${isMobile ? '' : 'p-6 bg-white'}`}>
            {!isMobile && (
                <div>
                    <h3 className="text-sm font-bold text-stone-900">{updateModalTitle}</h3>
                    <p className="mt-1 text-xs text-stone-500">{updateModalDescription}</p>
                </div>
            )}
            {isMobile && (
                <p className="text-xs text-stone-500 mb-4">{updateModalDescription}</p>
            )}
            <textarea
                value={disputeResolutionNotes}
                onChange={(event) => setDisputeResolutionNotes(event.target.value)}
                rows={4}
                placeholder="Provide resolution details or feedback for the seller..."
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-xs text-stone-800 focus:border-clay-300 focus:ring-0 outline-none"
            />
            {disputeModalState.open && (disputeModalState.status === 'resolved' || disputeModalState.status === 'rejected') && countdown > 0 && (
                <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl text-center">
                    <p className="text-[11px] font-bold text-amber-600 animate-pulse">
                        Security Hold: Unlocking action in {countdown}s...
                    </p>
                </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
                <button
                    type="button"
                    onClick={closeDisputeActionModal}
                    className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-50 min-h-[44px] min-w-[80px]"
                    disabled={disputeProcessing}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={submitDisputeUpdate}
                    className="rounded-xl bg-clay-600 px-4 py-2 text-xs font-bold text-white hover:bg-clay-700 disabled:opacity-50 min-h-[44px] min-w-[120px] flex items-center justify-center"
                    disabled={disputeProcessing || countdown > 0}
                >
                    {disputeProcessing 
                        ? 'Saving...' 
                        : (countdown > 0 ? `Confirm Decision (${countdown}s)` : 'Confirm Decision')
                    }
                </button>
            </div>
        </div>
    );

    // --- Inner content for dispute deletion confirmation ---
    const renderDeleteContent = () => (
        <div className={`space-y-4 ${isMobile ? '' : 'p-6 bg-white'}`}>
            {!isMobile && (
                <div>
                    <h3 className="text-sm font-bold text-stone-900">Remove Moderation Request</h3>
                    <p className="mt-1 text-xs text-stone-500">
                        This deletes the moderation request record. If this request had already been approved, the linked review will be restored unless another approved request still exists.
                    </p>
                </div>
            )}
            {isMobile && (
                <p className="text-xs text-stone-500 mb-4">
                    This deletes the moderation request record. If this request had already been approved, the linked review will be restored unless another approved request still exists.
                </p>
            )}
            <div className="rounded-xl border border-stone-100 bg-stone-50 px-4 py-3 text-xs text-stone-600">
                {disputeDeleteState.dispute?.product_name || 'Selected request'}
            </div>
            <div className="flex justify-end gap-2 pt-2">
                <button
                    type="button"
                    onClick={() => setDisputeDeleteState({ open: false, dispute: null })}
                    className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-50 min-h-[44px] min-w-[80px]"
                    disabled={disputeProcessing}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={submitDisputeDelete}
                    className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50 min-h-[44px] min-w-[130px]"
                    disabled={disputeProcessing}
                >
                    {disputeProcessing ? 'Removing...' : 'Remove Request'}
                </button>
            </div>
        </div>
    );

    return (
        <>
            {/* Disputes Status Update - Modal (Desktop) / SlideOverDrawer (Mobile) */}
            {isMobile ? (
                <SlideOverDrawer
                    show={disputeModalState.open}
                    onClose={closeDisputeActionModal}
                    title={updateModalTitle}
                    widthClass="max-w-xl"
                >
                    {renderUpdateContent()}
                </SlideOverDrawer>
            ) : (
                <Modal show={disputeModalState.open} onClose={closeDisputeActionModal} maxWidth="lg">
                    {renderUpdateContent()}
                </Modal>
            )}

            {/* Dispute Deletion Confirmation - Modal (Desktop) / SlideOverDrawer (Mobile) */}
            {isMobile ? (
                <SlideOverDrawer
                    show={disputeDeleteState.open}
                    onClose={() => !disputeProcessing && setDisputeDeleteState({ open: false, dispute: null })}
                    title="Remove Moderation Request"
                    widthClass="max-w-xl"
                >
                    {renderDeleteContent()}
                </SlideOverDrawer>
            ) : (
                <Modal 
                    show={disputeDeleteState.open} 
                    onClose={() => !disputeProcessing && setDisputeDeleteState({ open: false, dispute: null })} 
                    maxWidth="sm"
                >
                    {renderDeleteContent()}
                </Modal>
            )}
        </>
    );
}
