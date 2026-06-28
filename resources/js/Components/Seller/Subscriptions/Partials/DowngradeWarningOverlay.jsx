import React from 'react';
import { AlertCircle, X, ChevronRight, Users } from 'lucide-react';
import { PLANS } from '@/utils/planConfig';
import { motion } from 'framer-motion';

export default function DowngradeWarningOverlay({
    pendingDowngrade,
    setPendingDowngrade,
    confirmDowngrade,
    isDowngrading,
    currentTier,
    draftCount,
    showsEliteStandardWarning,
}) {
    const currentPlanName = PLANS.find((plan) => plan.id === currentTier)?.name ?? currentTier;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-[2px]"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
                className="w-full max-w-md rounded-[1.35rem] border border-stone-200 bg-white p-5 shadow-2xl"
            >
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
                            <AlertCircle size={18} />
                        </div>
                        <div>
                            <h3 className="text-base font-extrabold text-stone-900">
                                Final downgrade warning
                            </h3>
                            <p className="mt-1 text-sm leading-6 text-stone-600">
                                You are about to move from {currentPlanName} to {pendingDowngrade.name}.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setPendingDowngrade(null)}
                        className="rounded-lg bg-stone-100 p-1.5 text-stone-400 transition-colors hover:bg-stone-200 hover:text-stone-600"
                    >
                        <X size={15} />
                    </button>
                </div>

                <div className="mt-4 space-y-3 rounded-2xl border border-stone-200 bg-stone-50 p-4">
                    <div className="flex items-start gap-3">
                        <ChevronRight size={15} className="mt-1 shrink-0 text-orange-600" />
                        <p className="text-sm leading-6 text-stone-700">
                            Your lower plan benefits and product limit will apply immediately after confirmation.
                        </p>
                    </div>

                    {draftCount > 0 && (
                        <div className="flex items-start gap-3">
                            <ChevronRight size={15} className="mt-1 shrink-0 text-orange-600" />
                            <p className="text-sm leading-6 text-stone-700">
                                <strong>{draftCount}</strong> active product{draftCount === 1 ? '' : 's'} may need to be set to Draft. You can review those on the Subscription page.
                            </p>
                        </div>
                    )}

                    {showsEliteStandardWarning && (
                        <div className="flex items-start gap-3">
                            <Users size={15} className="mt-1 shrink-0 text-orange-600" />
                            <p className="text-sm leading-6 text-stone-700">
                                Downgrading from Elite to Standard will suspend Elite-only features and linked employee workspace accounts until you upgrade again.
                            </p>
                        </div>
                    )}
                </div>

                <div className="mt-5 flex flex-col-reverse sm:flex-row justify-end gap-2.5">
                    <button
                        onClick={() => setPendingDowngrade(null)}
                        className="w-full sm:w-auto rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-600 transition-colors hover:bg-stone-50"
                    >
                        Go back
                    </button>
                    <button
                        onClick={confirmDowngrade}
                        disabled={isDowngrading}
                        className={`w-full sm:w-auto rounded-xl px-4 py-2 text-sm font-bold text-white transition-colors ${
                            isDowngrading ? 'cursor-not-allowed bg-stone-300' : 'bg-orange-600 hover:bg-orange-700'
                        }`}
                    >
                        {isDowngrading ? 'Processing...' : 'Yes, downgrade now'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
