import React from 'react';
import { AlertCircle, X, ChevronRight } from 'lucide-react';
import Modal from '@/Components/Modal';

const formatPlanName = (plan) => {
    if (plan === 'free') return 'Standard';
    if (plan === 'premium') return 'Premium';
    if (plan === 'super_premium') return 'Elite';
    return plan;
};

export default function DowngradeModal({
    isOpen,
    onClose,
    currentPlan,
    targetPlan,
    activeProductsCount,
    limit,
    linkedStaffCount,
    confirmDowngrade,
    isProcessing,
}) {
    const targetLimit = targetPlan?.limit ?? limit;
    const requiresAutomaticDrafting = activeProductsCount > targetLimit;
    const showsStandardDowngradeWarning = currentPlan === 'super_premium' && targetPlan?.value === 'free';
    const plannedDraftCount = targetPlan ? Math.max(0, activeProductsCount - targetPlan.limit) : 0;

    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="lg">
            <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
                            <AlertCircle className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-extrabold text-stone-900">
                                Final downgrade warning
                            </h2>
                            <p className="mt-1 text-sm leading-6 text-stone-600">
                                You are about to downgrade from {formatPlanName(currentPlan)} to {formatPlanName(targetPlan?.value)}.
                                Please review the effects before continuing.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg bg-stone-100 p-1.5 text-stone-400 transition-colors hover:bg-stone-200 hover:text-stone-600"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="mt-4 space-y-3 rounded-2xl border border-stone-200 bg-stone-50 p-4">
                    <div className="flex items-start gap-3">
                        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-orange-600" />
                        <p className="text-sm leading-6 text-stone-700">
                            Your shop will move to the <strong>{formatPlanName(targetPlan?.value)}</strong> plan immediately after confirmation.
                        </p>
                    </div>

                    {requiresAutomaticDrafting && (
                        <div className="flex items-start gap-3">
                            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-orange-600" />
                            <p className="text-sm leading-6 text-stone-700">
                                This downgrade exceeds the <strong>{targetLimit}</strong>-product limit, so the system will keep your top-selling active products first.
                            </p>
                        </div>
                    )}

                    {plannedDraftCount > 0 && (
                        <div className="flex items-start gap-3">
                            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-orange-600" />
                            <p className="text-sm leading-6 text-stone-700">
                                <strong>{plannedDraftCount}</strong> lower-priority active product{plannedDraftCount === 1 ? '' : 's'} will be moved to Draft automatically.
                            </p>
                        </div>
                    )}

                    {requiresAutomaticDrafting && (
                        <div className="flex items-start gap-3">
                            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-orange-600" />
                            <p className="text-sm leading-6 text-stone-700">
                                If sales are tied or zero, older active listings are kept first.
                            </p>
                        </div>
                    )}

                    {showsStandardDowngradeWarning && (
                        <div className="flex items-start gap-3">
                            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-orange-600" />
                            <p className="text-sm leading-6 text-stone-700">
                                Elite-only features will be suspended, and <strong>{linkedStaffCount}</strong> linked employee workspace account{linkedStaffCount === 1 ? '' : 's'} will be suspended until you upgrade again.
                            </p>
                        </div>
                    )}

                    {!plannedDraftCount && !showsStandardDowngradeWarning && (
                        <div className="flex items-start gap-3">
                            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-orange-600" />
                            <p className="text-sm leading-6 text-stone-700">
                                This change lowers your plan benefits and product limit, but no active products need to be drafted right now.
                            </p>
                        </div>
                    )}
                </div>

                <div className="mt-6 flex flex-col-reverse sm:flex-row justify-end gap-2.5 border-t border-stone-200 pt-4">
                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-stone-600 bg-white border border-stone-300 rounded-lg hover:bg-stone-50"
                    >
                        Go back
                    </button>
                    <button
                        onClick={confirmDowngrade}
                        disabled={isProcessing}
                        className={`w-full sm:w-auto px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors ${
                            isProcessing
                                ? 'bg-stone-300 cursor-not-allowed'
                                : 'bg-orange-600 hover:bg-orange-700'
                        }`}
                    >
                        {isProcessing ? 'Processing...' : 'Yes, downgrade now'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
