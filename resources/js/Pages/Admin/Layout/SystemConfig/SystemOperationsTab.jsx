import React from 'react';
import { motion } from 'framer-motion';
import { 
    Save, 
    ShieldCheck, 
    CheckCircle2, 
    Info 
} from 'lucide-react';
import PrimaryButton from '@/Components/PrimaryButton';
import SubscriptionTiers from '@/Components/Admin/Layout/SystemConfig/SubscriptionTiers';

export default function SystemOperationsTab({
    data,
    setData,
    errors,
    processing,
    recentlySuccessful,
    isDirty,
    availablePlanModules = [],
    onSubmit,
}) {
    return (
        <motion.div
            key="system-operations-tab"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.2 }}
            className="space-y-6 mt-6"
        >
            <form onSubmit={onSubmit} className="space-y-6">
                {/* Top Command Bar with Live Save & Status */}
                <div className="bg-white rounded-2xl border border-stone-200/80 p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-stone-900 text-white flex items-center justify-center shrink-0 shadow-sm">
                            <ShieldCheck size={20} className="text-clay-400" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-black text-stone-900 tracking-tight">Subscription Plans & Entitlements</h3>
                                {isDirty && (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-700 border border-amber-500/20 px-2 py-0.5 rounded-full">
                                        Unsaved Changes
                                    </span>
                                )}

                                {/* Live Plan Sync Notice Tooltip */}
                                <div className="relative group/notice inline-flex items-center ml-0.5">
                                    <button
                                        type="button"
                                        aria-label="Live Plan Sync Notice"
                                        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-850 border border-stone-200/80 transition-colors text-[11px] font-bold cursor-help focus:outline-none focus:ring-2 focus:ring-stone-400"
                                    >
                                        <Info size={12} />
                                    </button>
                                    <div className="absolute left-0 sm:left-1/2 sm:-translate-x-1/2 top-full mt-2 hidden group-hover/notice:flex group-focus-within/notice:flex flex-col z-50 w-72 sm:w-80 p-3.5 bg-stone-900 text-white rounded-xl shadow-xl border border-stone-800 text-xs pointer-events-none animate-in fade-in duration-150">
                                        <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px] uppercase tracking-wider mb-1">
                                            <Info size={13} />
                                            <span>Live Plan Sync Notice</span>
                                        </div>
                                        <p className="text-stone-300 leading-relaxed text-[11px] font-normal">
                                            Modifying product or staff quotas applies immediately to all active artisan shops. Lowering quotas moves excess active products to draft to keep catalogs compliant without deleting any artisan data.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <p className="text-xs text-stone-500 font-medium mt-0.5">
                                Customize live pricing, product limits, staff quotas, badges, and feature benefits for each tier.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 self-end md:self-center">
                        {recentlySuccessful && (
                            <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl animate-in fade-in">
                                <CheckCircle2 size={14} className="text-emerald-600" />
                                <span>Tier changes synchronized!</span>
                            </div>
                        )}
                        <PrimaryButton 
                            disabled={processing}
                            className="py-2.5 px-5 bg-stone-900 hover:bg-stone-850 text-white rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm border-none text-xs font-bold min-h-[42px] cursor-pointer"
                        >
                            <Save size={15} />
                            {processing ? 'Saving...' : 'Apply Tier Update'}
                        </PrimaryButton>
                    </div>
                </div>

                {/* Full-Width 3-Column Tiers Configuration */}
                <SubscriptionTiers 
                    data={data} 
                    setData={setData} 
                    errors={errors} 
                    availableModules={availablePlanModules}
                />
            </form>

            {/* Sticky actions bar for Mobile (below lg) */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 flex items-center justify-between shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
                <div className="flex-1 min-w-0 pr-4">
                    {recentlySuccessful ? (
                        <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold">
                            <CheckCircle2 size={13} />
                            <span>Saved!</span>
                        </div>
                    ) : (
                        <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">Unsaved Changes</span>
                    )}
                </div>
                <PrimaryButton 
                    disabled={processing}
                    onClick={onSubmit}
                    className="py-2.5 px-4 bg-stone-900 hover:bg-stone-850 text-white rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold min-h-[40px]"
                >
                    <Save size={13} />
                    {processing ? 'Saving...' : 'Apply Update'}
                </PrimaryButton>
            </div>
        </motion.div>
    );
}
