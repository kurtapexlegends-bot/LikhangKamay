import React from 'react';
import { Crown, ShieldCheck, Clock3, AlertCircle, CheckCircle2, ArrowRight, ChevronRight, HelpCircle } from 'lucide-react';

export default function SubscriptionPlans({
    plans,
    currentPlan,
    pendingUpgrade,
    activeProductsCount,
    limit,
    isProcessing,
    handleUpgrade,
    initiateDowngrade,
    handleScroll,
    activePageIndex,
    pendingUpgradeDate,
    onOpenComparison,
}) {
    const currentPlanMeta = plans.find((plan) => plan.id === currentPlan) ?? plans[0];

    return (
        <section className="mx-auto max-w-[1020px] overflow-hidden rounded-[1.75rem] border border-stone-200 bg-white shadow-[0_24px_60px_-42px_rgba(15,23,42,0.32)]">
            <div className="border-b border-stone-100 px-5 py-4 sm:px-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                        <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[1.05rem] bg-gradient-to-br from-[#FFA426] to-[#FF7A00] text-white shadow-sm">
                            <Crown className="h-[18px] w-[18px]" />
                        </div>
                        <div>
                            <h2 className="text-[1.6rem] font-black tracking-tight text-stone-900 sm:text-[1.7rem]">Choose Your Plan</h2>
                            <p className="mt-1 text-[13px] font-medium text-stone-500">Unlock more features for your seller workspace.</p>
                            {pendingUpgrade && (
                                <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">
                                    Payment pending
                                    {pendingUpgradeDate ? ` • ${pendingUpgradeDate}` : ''}
                                </p>
                            )}
                        </div>
                    </div>
                    {onOpenComparison && (
                        <button
                            type="button"
                            onClick={onOpenComparison}
                            className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50/80 px-3.5 py-2 text-xs font-bold text-stone-700 transition hover:border-stone-300 hover:bg-stone-100 hover:text-stone-900 shrink-0 min-h-[38px] w-fit"
                        >
                            <HelpCircle className="h-4 w-4 text-stone-500" />
                            <span>Compare All Features</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="px-5 py-5 sm:px-6">
                <div 
                    onScroll={handleScroll}
                    className="flex overflow-x-auto snap-x snap-mandatory pb-4 gap-4 md:grid md:grid-cols-3 md:gap-6 no-scrollbar"
                >
                    {plans.map((plan) => {
                        const current = currentPlan === plan.id;
                        const tierIndex = plans.findIndex((item) => item.id === plan.id);
                        const currentTierIndex = plans.findIndex((item) => item.id === currentPlan);
                        const isUpgrade = tierIndex > currentTierIndex;
                        const isDowngrade = tierIndex < currentTierIndex;
                        const isPendingPlan = pendingUpgrade?.plan === plan.id && !!pendingUpgrade?.checkoutUrl;
                        const PlanIcon = plan.icon;
                        const isPremiumPlan = plan.id === 'premium';
                        const isElitePlan = plan.id === 'super_premium';

                        const cardClass = current
                            ? 'border-[#C4B5FD] ring-2 ring-[#DDD6FE] shadow-[0_28px_50px_-42px_rgba(109,94,246,0.55)]'
                            : isPremiumPlan
                                ? 'border-stone-300 shadow-[0_28px_50px_-44px_rgba(255,138,28,0.45)]'
                                : 'border-stone-200 shadow-[0_24px_40px_-42px_rgba(15,23,42,0.45)]';

                        const labelClass = current
                            ? 'bg-[#6D5EF6] text-white shadow-sm'
                            : isPremiumPlan
                                ? 'bg-gradient-to-r from-[#FFB432] to-[#FF8A1C] text-white shadow-sm'
                                : 'hidden';

                        const iconClass = isElitePlan
                            ? 'bg-[#6D5EF6] text-white'
                            : isPremiumPlan
                                ? 'bg-gradient-to-br from-[#FFA426] to-[#FF7A00] text-white'
                                : 'bg-[#6D625C] text-white';

                        const upgradeButtonClass = isElitePlan
                            ? 'bg-[#6D5EF6] text-white hover:bg-[#5C4DEA]'
                            : 'bg-orange-600 text-white hover:bg-orange-700';

                        return (
                            <article
                                key={plan.id}
                                className={`relative flex flex-col rounded-[1.7rem] border bg-white px-5 pb-5 pt-4 w-[85%] md:w-full shrink-0 snap-center ${cardClass}`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.95rem] ${iconClass}`}>
                                        <PlanIcon className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="text-xl sm:text-[1.55rem] font-black leading-none tracking-tight text-stone-900">{plan.name}</h3>
                                            {(current || isPremiumPlan) && (
                                                <span className={`rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] whitespace-nowrap ${labelClass}`}>
                                                    {current ? 'Current Plan' : 'Most Popular'}
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-1 max-w-[210px] text-[13px] font-medium leading-6 text-stone-500">{plan.description}</p>
                                    </div>
                                </div>

                                <div className="mt-5 flex items-end gap-1.5">
                                    <p className={`${plan.id === 'free' ? 'text-[2.45rem]' : 'text-[2.35rem]'} font-black tracking-tight text-stone-900`}>
                                        {plan.id === 'free' ? 'Free' : `₱${plan.price.replace('PHP ', '')}`}
                                    </p>
                                    {plan.id !== 'free' && (
                                        <p className="pb-1 text-[0.92rem] font-semibold text-stone-400">/ mo</p>
                                    )}
                                </div>

                                <ul className="mt-5 space-y-3">
                                    {plan.features.map((feature, index) => (
                                        <li key={index} className="flex items-start gap-3">
                                            <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${isElitePlan ? 'text-[#6D5EF6]' : 'text-green-500'}`} />
                                            <span className="text-[13px] leading-6 text-stone-700">{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <div className="mt-auto pt-5">
                                    {current ? (
                                        <button
                                            type="button"
                                            disabled
                                            className="inline-flex w-full items-center justify-center gap-2 rounded-[1rem] bg-stone-100 px-4 py-2.5 text-[14px] font-bold text-stone-400"
                                        >
                                            <ShieldCheck className="h-4 w-4" />
                                            Active Plan
                                        </button>
                                    ) : isUpgrade ? (
                                        <button
                                            type="button"
                                            onClick={() => (isPendingPlan ? window.location.assign(pendingUpgrade.checkoutUrl) : handleUpgrade(plan.id))}
                                            disabled={isProcessing}
                                            className={`inline-flex w-full items-center justify-center gap-2 rounded-[1rem] px-4 py-2.5 text-[14px] font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${upgradeButtonClass}`}
                                        >
                                            {isProcessing ? 'Processing...' : isPendingPlan ? 'Continue Payment' : `Upgrade to ${plan.name}`}
                                            {!isProcessing && <ArrowRight className="h-[15px] w-[15px]" />}
                                        </button>
                                    ) : isDowngrade ? (
                                        <button
                                            type="button"
                                            onClick={() => initiateDowngrade(plan.id, plan.limit)}
                                            className="inline-flex w-full items-center justify-center rounded-[1rem] border-2 border-stone-200 bg-white px-4 py-2.5 text-[14px] font-bold text-stone-600 transition-all hover:border-stone-300 hover:text-stone-900 active:scale-95"
                                        >
                                            Downgrade
                                        </button>
                                    ) : null}
                                </div>
                            </article>
                        );
                    })}
                </div>

                {/* Page Indicator Dots on Mobile */}
                <div className="flex justify-center gap-1.5 mt-2 md:hidden">
                    {plans.map((_, i) => (
                        <span
                            key={i}
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                                activePageIndex === i ? 'w-4 bg-orange-600' : 'w-1.5 bg-stone-200'
                            }`}
                        />
                    ))}
                </div>
            </div>

            <div className="flex flex-col gap-2.5 border-t border-stone-100 px-5 py-3 text-[12px] text-stone-500 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p>Plans can be changed anytime. Downgrades will enforce listing limits and suspend staff accounts at the end of the current billing cycle.</p>
                    <p className="mt-1 text-[11px] text-stone-400 font-semibold uppercase tracking-wider">
                        All payments are strictly non-refundable once processed.
                    </p>
                </div>
                {pendingUpgrade && pendingUpgrade.checkoutUrl ? (
                    <button
                        type="button"
                        onClick={() => window.location.assign(pendingUpgrade.checkoutUrl)}
                        className="inline-flex items-center gap-1.5 font-bold text-orange-600 transition-all active:scale-95 hover:text-orange-700"
                    >
                        Continue Payment
                        <ChevronRight className="h-[15px] w-[15px]" />
                    </button>
                ) : (
                    <p className="font-semibold text-orange-600">Current plan: {currentPlanMeta.name}</p>
                )}
            </div>
        </section>
    );
}
