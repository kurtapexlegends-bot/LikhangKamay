import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

export default function ApprovalActionFooter({
    approval,
    isPending = true,
    processing = false,
    onClose,
    onApprove,
    onReject,
}) {
    if (!approval) return null;

    return (
        <div className="flex items-center justify-between gap-3 w-full">
            {isPending ? (
                <>
                    <button
                        type="button"
                        onClick={() => {
                            onClose();
                            onReject(approval);
                        }}
                        disabled={processing}
                        className="flex-1 py-2.5 px-4 rounded-xl border border-stone-200 bg-white text-stone-700 text-xs font-bold hover:bg-stone-100 hover:text-rose-600 transition active:scale-95 disabled:opacity-50 min-h-[44px] flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                        <XCircle size={15} />
                        <span>Decline Request</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            onClose();
                            onApprove(approval);
                        }}
                        disabled={processing}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-clay-600 hover:bg-clay-700 text-white text-xs font-bold shadow-xs transition active:scale-95 disabled:opacity-50 min-h-[44px] flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                        <CheckCircle2 size={15} />
                        <span>Approve Request</span>
                    </button>
                </>
            ) : (
                <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-2.5 px-4 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition min-h-[44px] cursor-pointer"
                >
                    Close Inspection
                </button>
            )}
        </div>
    );
}
