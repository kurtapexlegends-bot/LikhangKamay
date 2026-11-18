import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Clock3, AlertCircle, CheckCircle2, ArrowRight, ChevronRight, HelpCircle, BadgeCheck, Sparkles, Gift, Percent } from 'lucide-react';

export default function SubscriptionPlans({
    plans,
    currentPlan,
    pendingUpgrade,
    activeProductsCount,
    limit,
    isProcessing,
    handleUpgrade,
    initiateDowngrade,
    handleScheduleRenewal,
    pendingDowngradeTier = null,
    daysRemaining = null,
    subscriptionExpiresAt = null,
    handleScroll,
    activePageIndex,
    pendingUpgradeDate,
    onOpenComparison,
    isOnTrial = false,
    trialEndsAt = null,
    trialDaysRemaining = null,
    hasSubscriptionHistory = false,
    isNewApprovedArtisan = false,
    isCancelled = false,
    isExpired = false,
    billingCycle = 'monthly',
    setBillingCycle,
    annualDiscount = 20,
}) {
    const currentPlanMeta = plans.find((plan) => plan.id === currentPlan) ?? plans[0];
    const isFirstTimeSeller = !isExpired && (isNewApprovedArtisan || (isOnTrial && !hasSubscriptionHistory));

    return (
        <section className="mx-auto max-w-[1020px] overflow-hidden rounded-[1.75rem] border border-stone-200 bg-white shadow-[0_24px_60px_-42px_rgba(15,23,42,0.32)]">
            <div className="border-b border-stone-100 px-5 py-4 sm:px-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                        <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[1.05rem] bg-gradient-to-br from-[#FFA426] to-[#FF7A00] text-white shadow-sm">
                            <Crown className="h-[18px] w-[18px]" />
                        </div>
                        <div>
                            <h2 className="text-[1.6rem] font-black tracking-tight text-stone-900 sm:text-[1.7rem]">
                                {isExpired ? 'Available Workshop Tiers' : 'Choose Your Plan'}
                            </h2>
                            <p className="mt-1 text-[13px] font-medium text-stone-500">
                                {isExpired ? 'Compare capacity and select a tier to resume operations.' : 'Unlock more features for your seller workspace.'}
                            </p>
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
                            className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50/80 px-3.5 py-2 text-xs font-bold text-stone-700 transition hover:border-stone-300 hover:bg-stone-100 hover:text-stone-900 shrink-0 min-h-[44px] sm:min-h-[38px] w-fit"
                        >
                            <HelpCircle className="h-4 w-4 text-stone-500" />
                            <span>Compare All Features</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Introductory Trial Welcome Banner for Newly Approved Sellers */}
            {isFirstTimeSeller && (
                <div className="mx-5 sm:mx-6 mt-5 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-300/80 shadow-2xs animate-in fade-in slide-in-from-top-3 duration-700 ease-out">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-start sm:items-center gap-3.5">
                            <div className="h-10 w-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                                <Sparkles className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 bg-amber-200/80 px-2.5 py-0.5 rounded-full border border-amber-300">
                                        Introductory Trial Activated
                                    </span>
                                    {trialDaysRemaining !== null && (
                                        <span className="text-xs font-bold text-amber-950 flex items-center gap-1">
                                            <Clock3 size={13} className="text-amber-700" />
                                            {trialDaysRemaining} {trialDaysRemaining === 1 ? 'day' : 'days'} remaining
                                        </span>
                                    )}
                                </div>
                                <h3 className="text-sm sm:text-base font-extrabold text-stone-900 mt-1">
                                    Welcome to LikhangKamay! Your 14-Day All-Access Trial is Live
                                </h3>
                                <p className="text-xs text-stone-600 mt-0.5 leading-relaxed max-w-2xl">
                                    Explore all artisan studio features risk-free. Your trial automatically transitions to Basic after {trialDaysRemaining ?? 14} days without unexpected charges. Upgrade below anytime to lock in continuous Premium or Elite capacity.
                                </p>
                            </div>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-amber-200 text-xs font-bold text-amber-900 shadow-2xs">
                                <BadgeCheck className="h-4 w-4 text-emerald-600" />
                                <span>No Card Required</span>
                            </span>
                        </div>
                    </div>
                </div>
            )}

            <div className="px-5 py-5 sm:px-6">
                {/* Refined & Centered Billing Cycle Switcher */}
                <div className="flex flex-col items-center justify-center text-center my-6 px-4">
                    <p className="text-xs font-bold text-stone-800 mb-2">
                        Choose commitment billing cycle
                    </p>
                    <div className="relative inline-flex items-center p-1.5 rounded-full bg-stone-100 border border-stone-200/90 shadow-2xs">
                        {/* Monthly Billing Tab */}
                        <button
                            type="button"
                            onClick={() => setBillingCycle?.('monthly')}
                            className={`relative z-10 px-5 py-2 rounded-full text-xs font-bold transition-colors duration-200 min-h-[38px] ${
                                billingCycle === 'monthly'
                                    ? 'text-stone-900 font-black'
                                    : 'text-stone-500 hover:text-stone-800'
                            }`}
                        >
                            {billingCycle === 'monthly' && (
                                <motion.div
                                    layoutId="billingCyclePill"
                                    className="absolute inset-0 rounded-full bg-white shadow-sm border border-stone-200/70"
                                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                                />
                            )}
                            <span className="relative z-10">Monthly Billing</span>
                        </button>

                        {/* Annual Commitment Tab */}
                        <button
                            type="button"
                            onClick={() => setBillingCycle?.('yearly')}
                            className={`relative z-10 px-5 py-2 rounded-full text-xs font-bold transition-colors duration-200 flex items-center gap-2 min-h-[38px] ${
                                billingCycle === 'yearly'
                                    ? 'text-stone-900 font-black'
                                    : 'text-stone-500 hover:text-stone-800'
                            }`}
                        >
                            {billingCycle === 'yearly' && (
                                <motion.div
                                    layoutId="billingCyclePill"
                                    className="absolute inset-0 rounded-full bg-white shadow-sm border border-stone-200/70"
                                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                                />
                            )}
                            <span className="relative z-10">Annual Commitment</span>
                            <span className="relative z-10 inline-flex items-center text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
                                Save {annualDiscount}%
                            </span>
                        </button>
                    </div>
                    <p className="text-[11px] font-medium text-stone-500 mt-2">
                        {billingCycle === 'yearly'
                            ? `Billed annually at ${annualDiscount}% discount. Lock in all features for 365 days.`
                            : 'Pay month-to-month. Switch to annual commitment anytime to save.'}
                    </p>
                </div>

                <div 
                    onScroll={handleScroll}
                    className="flex overflow-x-auto snap-x snap-mandatory pb-4 gap-4 md:grid md:grid-cols-3 md:gap-6 no-scrollbar"
                >
                    {plans.map((plan) => {
                        const isTrialPremium = isOnTrial && plan.id === 'premium';
                        const current = isTrialPremium || (!isOnTrial && currentPlan === plan.id);
                        const tierIndex = plans.findIndex((item) => item.id === plan.id);
                        const currentTierIndex = plans.findIndex((item) => item.id === (isOnTrial ? 'premium' : currentPlan));
                        const isUpgrade = isOnTrial ? (plan.id === 'super_premium') : (tierIndex > currentTierIndex);
                        const isDowngrade = isOnTrial ? (plan.id === 'free') : (tierIndex < currentTierIndex);
                        const isPendingPlan = pendingUpgrade?.plan === plan.id && !!pendingUpgrade?.checkoutUrl;
                        const PlanIcon = plan.icon;
                        const isPremiumPlan = plan.id === 'premium';
                        const isElitePlan = plan.id === 'super_premium';

                        const isYearly = billingCycle === 'yearly';
                        const baseMonthlyPrice = plan.rawPrice ?? (isElitePlan ? 1299 : isPremiumPlan ? 699 : 349);
                        const annualTotal = Math.round((baseMonthlyPrice * 12) * (1 - annualDiscount / 100));
                        const annualMonthlyEquivalent = Math.round(annualTotal / 12);

                        const cardClass = isTrialPremium
                            ? 'border-amber-300 ring-2 ring-amber-200/80 shadow-md bg-white'
                            : current
                                ? isElitePlan
                                    ? 'border-violet-300 ring-2 ring-violet-200 shadow-md bg-white'
                                    : isPremiumPlan
                                        ? 'border-amber-300 ring-2 ring-amber-200 shadow-md bg-white'
                                        : 'border-stone-300 ring-2 ring-stone-200 shadow-sm bg-white'
                                : isElitePlan
                                    ? 'border-violet-200/80 hover:border-violet-300 shadow-sm bg-white'
                                    : isPremiumPlan
                                        ? 'border-amber-200/80 hover:border-amber-300 shadow-sm bg-white'
                                        : 'border-stone-200 hover:border-stone-300 shadow-sm bg-white';

                        const iconClass = isElitePlan
                            ? 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-sm'
                            : isPremiumPlan || isTrialPremium
                                ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-sm'
                                : 'bg-stone-100 text-stone-700 border border-stone-200';

                        const upgradeButtonClass = isElitePlan
                            ? 'bg-violet-600 text-white hover:bg-violet-700 shadow-sm'
                            : isPremiumPlan
                                ? 'bg-amber-600 text-white hover:bg-amber-700 shadow-sm'
                                : 'bg-stone-900 text-white hover:bg-stone-800 shadow-sm';

                        return (
                            <article
                                key={plan.id}
                                className={`relative flex flex-col rounded-[1.7rem] border px-5 pb-5 pt-4 w-[85%] md:w-full shrink-0 snap-center transition-all duration-200 ${cardClass}`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.95rem] ${iconClass}`}>
                                        <PlanIcon className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="text-xl sm:text-[1.55rem] font-black leading-none tracking-tight text-stone-900">{plan.name}</h3>
                                            {isExpired && current ? (
                                                <span className="rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] whitespace-nowrap border bg-amber-50 text-amber-900 border-amber-300 flex items-center gap-1 shadow-2xs">
                                                    <Sparkles className="h-2.5 w-2.5 text-amber-600" />
                                                    Your Previous Plan
                                                </span>
                                            ) : isTrialPremium ? (
                                                <span className="rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] whitespace-nowrap border bg-amber-50 text-amber-800 border-amber-300 animate-pulse flex items-center gap-1">
                                                    <Sparkles className="h-2.5 w-2.5 text-amber-600" />
                                                    14-Day Free Trial
                                                </span>
                                            ) : plan.eyebrow ? (
                                                <span className={`rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] whitespace-nowrap border ${plan.badgeClass || 'bg-stone-100 text-stone-700 border-stone-200'}`}>
                                                    {plan.eyebrow}
                                                </span>
                                            ) : null}
                                        </div>
                                        <p className="mt-1 max-w-[210px] text-[13px] font-medium leading-6 text-stone-500">{plan.description}</p>
                                    </div>
                                </div>

                                <div className="mt-5 min-h-[76px]">
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={billingCycle}
                                            initial={{ opacity: 0, y: -4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 4 }}
                                            transition={{ duration: 0.16, ease: 'easeOut' }}
                                        >
                                            <div className="flex items-end gap-1.5">
                                                <p className="text-[2.35rem] font-black tracking-tight text-stone-900">
                                                    ₱{isYearly ? annualTotal.toLocaleString() : baseMonthlyPrice.toLocaleString()}
                                                </p>
                                                <p className="pb-1 text-[0.92rem] font-semibold text-stone-400">
                                                    {isYearly ? '/ year' : '/ mo'}
                                                </p>
                                                {isTrialPremium && (
                                                    <span className="mb-2 ml-1 text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 animate-pulse">
                                                        Active Trial
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs font-semibold text-stone-500">
                                                {isTrialPremium
                                                    ? `${trialDaysRemaining ?? 14} days remaining • Full Premium Access`
                                                    : isYearly
                                                        ? `₱${annualMonthlyEquivalent}/mo equivalent (Save ${annualDiscount}%)`
                                                        : 'Billed monthly'}
                                            </p>
                                        </motion.div>
                                    </AnimatePresence>
                                </div>

                                <ul className="mt-5 space-y-3">
                                    {plan.features.map((feature, index) => (
                                        <li key={index} className="flex items-start gap-3">
                                            <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${plan.featureIconClass || (isElitePlan ? 'text-violet-600' : isPremiumPlan || isTrialPremium ? 'text-amber-600' : 'text-stone-500')}`} />
                                            <span className="text-[13px] leading-6 text-stone-700">{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <div className="mt-auto pt-5">
                                    {current ? (
                                        isTrialPremium ? (
                                            <button
                                                type="button"
                                                disabled
                                                className="inline-flex w-full items-center justify-center gap-2 rounded-[1rem] bg-amber-50 border border-amber-300 px-4 py-2.5 text-[14px] font-extrabold text-amber-800 cursor-default shadow-2xs"
                                            >
                                                <Sparkles className="h-4 w-4 text-amber-600" />
                                                <span>14-Day Trial Active ({trialDaysRemaining ?? 14}d left)</span>
                                            </button>
                                        ) : isExpired ? (
                                            <button
                                                type="button"
                                                onClick={() => handleUpgrade(plan.id, billingCycle)}
                                                disabled={isProcessing}
                                                className={`inline-flex w-full items-center justify-center gap-2 rounded-[1rem] px-4 py-2.5 text-[14px] font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${upgradeButtonClass}`}
                                            >
                                                <span>Renew {plan.name} ({isYearly ? 'Annual' : 'Monthly'})</span>
                                                <ArrowRight className="h-4 w-4" />
                                            </button>
                                        ) : (
                                            <div className="flex flex-col items-center gap-1.5 w-full">
                                                <button
                                                    type="button"
                                                    disabled
                                                    className="inline-flex w-full items-center justify-center gap-2 rounded-[1rem] bg-stone-100 border border-stone-200 px-4 py-2.5 text-[14px] font-extrabold text-stone-700 cursor-default"
                                                >
                                                    <BadgeCheck className="h-4 w-4 text-emerald-600" />
                                                    Your Current Plan
                                                </button>
                                                {isCancelled ? (
                                                    <span className="text-[11px] font-semibold text-amber-700 flex items-center gap-1">
                                                        <Clock3 className="h-3 w-3" /> Auto-renewal cancelled • Ends in {daysRemaining}d
                                                    </span>
                                                ) : pendingDowngradeTier && pendingDowngradeTier !== currentPlan ? (
                                                    <span className="text-[11px] font-semibold text-amber-700 flex items-center gap-1">
                                                        <Clock3 className="h-3 w-3" /> Switches on renewal
                                                    </span>
                                                ) : daysRemaining !== null ? (
                                                    <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                                                        <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Auto-renews in {daysRemaining}d on {plan.name}
                                                    </span>
                                                ) : null}
                                            </div>
                                        )
                                    ) : isUpgrade ? (
                                        <button
                                            type="button"
                                            onClick={() => (isPendingPlan ? window.location.assign(pendingUpgrade.checkoutUrl) : handleUpgrade(plan.id, billingCycle))}
                                            disabled={isProcessing}
                                            className={`inline-flex w-full items-center justify-center gap-2 rounded-[1rem] px-4 py-2.5 text-[14px] font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${upgradeButtonClass}`}
                                        >
                                            {isProcessing ? 'Processing...' : isPendingPlan ? 'Continue Payment' : isExpired ? `Choose ${plan.name} (${isYearly ? 'Annual' : 'Monthly'})` : `Upgrade to ${plan.name} (${isYearly ? 'Annual' : 'Monthly'})`}
                                            {!isProcessing && <ArrowRight className="h-[15px] w-[15px]" />}
                                        </button>
                                    ) : isDowngrade ? (
                                        isOnTrial ? (
                                            <button
                                                type="button"
                                                onClick={() => handleUpgrade(plan.id, billingCycle)}
                                                disabled={isProcessing}
                                                className={`inline-flex w-full items-center justify-center gap-2 rounded-[1rem] px-4 py-2.5 text-[14px] font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${upgradeButtonClass}`}
                                            >
                                                <span>Choose {plan.name} ({isYearly ? 'Annual' : 'Monthly'})</span>
                                                <ArrowRight className="h-4 w-4" />
                                            </button>
                                        ) : isExpired ? (
                                            <button
                                                type="button"
                                                onClick={() => handleUpgrade(plan.id, billingCycle)}
                                                disabled={isProcessing}
                                                className={`inline-flex w-full items-center justify-center gap-2 rounded-[1rem] px-4 py-2.5 text-[14px] font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${upgradeButtonClass}`}
                                            >
                                                <span>Choose {plan.name} ({isYearly ? 'Annual' : 'Monthly'})</span>
                                                <ArrowRight className="h-4 w-4" />
                                            </button>
                                        ) : pendingDowngradeTier && pendingDowngradeTier === plan.id && pendingDowngradeTier !== currentPlan ? (
                                            <button
                                                type="button"
                                                disabled
                                                className="inline-flex w-full items-center justify-center gap-1.5 rounded-[1rem] bg-amber-50 border border-amber-200/80 px-4 py-2.5 text-[13px] font-bold text-amber-800 cursor-default"
                                            >
                                                <Clock3 className="h-4 w-4 text-amber-600" />
                                                Scheduled on Renewal
                                            </button>
                                        ) : daysRemaining !== null && daysRemaining > 0 ? (
                                            <button
                                                type="button"
                                                onClick={() => initiateDowngrade(plan.id, plan.limit)}
                                                className="inline-flex w-full items-center justify-center rounded-[1rem] border border-stone-300 bg-white px-4 py-2.5 text-[13px] font-bold text-stone-700 transition-all hover:border-amber-400 hover:text-stone-900 active:scale-95 shadow-2xs"
                                            >
                                                Switch to {plan.name} on Renewal
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => initiateDowngrade(plan.id, plan.limit)}
                                                className="inline-flex w-full items-center justify-center rounded-[1rem] border-2 border-stone-200 bg-white px-4 py-2.5 text-[14px] font-bold text-stone-600 transition-all hover:border-stone-300 hover:text-stone-900 active:scale-95"
                                            >
                                                Downgrade to {plan.name}
                                            </button>
                                        )
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
                    <p>
                        {isExpired
                            ? 'Select a tier above to immediately reactivate your workspace. All plans include secure PayMongo checkout with instant activation.'
                            : 'Plans can be changed anytime. Downgrades take effect at the end of the billing cycle (payments non-refundable).'}
                    </p>
                </div>
                {pendingUpgrade && pendingUpgrade.checkoutUrl && (
                    <button
                        type="button"
                        onClick={() => window.location.assign(pendingUpgrade.checkoutUrl)}
                        className="inline-flex items-center gap-1.5 font-bold text-orange-600 transition-all active:scale-95 hover:text-orange-700"
                    >
                        Continue Payment
                        <ChevronRight className="h-[15px] w-[15px]" />
                    </button>
                )}
            </div>
        </section>
    );
}
