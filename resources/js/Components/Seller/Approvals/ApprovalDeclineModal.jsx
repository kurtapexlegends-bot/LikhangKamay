import React from 'react';
import { XCircle } from 'lucide-react';
import RevisionChecklistSelector from '@/Components/Common/RevisionChecklistSelector';

export default function ApprovalDeclineModal({
    declineModal,
    setDeclineModal,
    onConfirm,
    processing = false,
}) {
    if (!declineModal.isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-900/40 backdrop-blur-xs">
            <div className="bg-[#FDFBF9] rounded-t-3xl sm:rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-6 shadow-xl border border-stone-200 space-y-4">
                <div className="flex items-center gap-2.5 text-stone-900 font-bold">
                    <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                        <XCircle size={20} />
                    </div>
                    <div className="min-w-0">
                        <h4 className="text-base font-bold text-stone-900">Decline &amp; Request Revision</h4>
                        <p className="text-[11px] text-stone-500 font-medium truncate">
                            {declineModal.approval?.title}
                        </p>
                    </div>
                </div>

                <RevisionChecklistSelector
                    schemaKey="owner_approval"
                    selectedItems={declineModal.revisionItems || []}
                    onChangeItems={(revisionItems) => setDeclineModal((prev) => ({ ...prev, revisionItems }))}
                    reason={declineModal.reason}
                    onChangeReason={(reason) => setDeclineModal((prev) => ({ ...prev, reason }))}
                    reasonLabel="Decline Reason (Optional if checklist selected)"
                    reasonPlaceholder="e.g. Verify overtime hours or adjust restock quantity..."
                    compact
                />

                <div className="flex justify-end gap-2 pt-2">
                    <button
                        type="button"
                        onClick={() => setDeclineModal({ isOpen: false, approval: null, reason: '', revisionItems: [] })}
                        disabled={processing}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition min-h-[44px] sm:min-h-[38px]"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={processing}
                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition min-h-[44px] sm:min-h-[38px] disabled:opacity-50"
                    >
                        Confirm Decline
                    </button>
                </div>
            </div>
        </div>
    );
}
