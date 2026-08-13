import React from 'react';
import Modal from '@/Components/Modal';
import { AlertTriangle, Clock, X, ShieldAlert } from 'lucide-react';

export default function CancelSubscriptionModal({
    isOpen,
    onClose,
    currentPlanName,
    formattedExpirationDate,
    daysRemaining,
    onConfirm,
    isProcessing,
}) {
    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="md">
            <div className="p-6 bg-white rounded-2xl">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100/80 text-amber-700 border border-amber-200/60 shadow-2xs">
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-extrabold text-stone-900 tracking-tight">
                                Cancel Subscription Renewal?
                            </h3>
                            <p className="text-xs font-medium text-stone-500 mt-0.5">
                                Your benefits will remain active until the end of your billing cycle.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Content Details */}
                <div className="mt-5 space-y-3">
                    <div className="rounded-xl border border-stone-200/80 bg-stone-50/80 p-3.5 text-xs text-stone-700 space-y-2">
                        <div className="flex items-center gap-2 font-bold text-stone-900">
                            <Clock size={14} className="text-amber-600 shrink-0" />
                            <span>100% Active Benefits Guarantee</span>
                        </div>
                        <p className="text-stone-600 leading-relaxed text-[11.5px]">
                            Your <strong>{currentPlanName}</strong> plan benefits will stay fully active until{' '}
                            <strong>{formattedExpirationDate || 'the end of your current period'}</strong>
                            {daysRemaining !== null ? ` (${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} remaining)` : ''}.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-50/70 border border-amber-200/70 text-amber-900 text-[11px] font-semibold">
                        <ShieldAlert size={14} className="text-amber-700 shrink-0" />
                        <span>All subscription purchases are final and strictly non-refundable.</span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isProcessing}
                        className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-stone-800 active:scale-95 shadow-sm min-h-[40px]"
                    >
                        Keep My Plan
                    </button>

                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isProcessing}
                        className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50/60 px-4 py-2.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 hover:border-rose-300 active:scale-95 min-h-[40px]"
                    >
                        {isProcessing ? 'Cancelling...' : 'Confirm Cancellation'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
