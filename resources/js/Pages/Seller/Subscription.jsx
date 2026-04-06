import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import SellerSidebar from '@/Components/SellerSidebar';
import SellerHeader from '@/Components/SellerHeader';
import { AlertCircle, ArrowRight, CheckCircle2, ChevronRight, Crown, Package, ShieldCheck, Sparkles, X, Users } from 'lucide-react';
import Modal from '@/Components/Modal';

const PLAN_CONFIG = [
    {
        id: 'free',
        name: 'Standard',
        eyebrow: 'Foundational',
        price: 'Free',
        billingNote: 'No monthly fee',
        description: 'Keep your shop live with the essentials for catalog, orders, and seller workspace basics.',
        limit: 3,
        icon: Package,
        badgeClass: 'border-stone-200 bg-stone-100 text-stone-700',
        iconClass: 'bg-stone-100 text-stone-600',
        cardClass: 'border-stone-200 bg-white',
        currentClass: 'border-stone-300 ring-1 ring-stone-200',
        featureIconClass: 'text-stone-500',
        upgradeButtonClass: 'bg-stone-900 text-white hover:bg-stone-800',
        downgradeButtonClass: 'border-stone-300 bg-white text-stone-700 hover:border-stone-400 hover:bg-stone-50',
        heroStripeClass: 'from-stone-300 via-stone-200 to-[#F4EEE8]',
        benefitCardClass: 'border-stone-200 bg-stone-50/70',
        supportCopy: 'Best for new artisan shops keeping a focused active catalog.',
        features: [
            'Up to 3 active products',
            'Core seller workspace',
            'Basic analytics dashboard',
        ],
    },
    {
        id: 'premium',
        name: 'Premium',
        eyebrow: 'Most Popular',
        price: 'PHP 199',
        billingNote: 'per month',
        description: 'Add more shelf space and stronger operational tools once your shop starts growing beyond the basics.',
        limit: 10,
        icon: Crown,
        badgeClass: 'border-amber-200 bg-amber-50 text-amber-700',
        iconClass: 'bg-orange-100 text-orange-600',
        cardClass: 'border-amber-200 bg-white',
        currentClass: 'border-orange-500 ring-1 ring-orange-500',
        featureIconClass: 'text-green-500',
        upgradeButtonClass: 'bg-orange-600 text-white hover:bg-orange-700 shadow-md',
        downgradeButtonClass: 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50 hover:border-orange-300',
        heroStripeClass: 'from-[#F3D7BA] via-[#EBC8A4] to-[#FCF7F2]',
        benefitCardClass: 'border-[#E7D8C9] bg-[#FCF7F2]',
        supportCopy: 'A balanced plan for shops that need more products and stronger reporting.',
        features: [
            'Up to 10 active products',
            'Premium badge visibility',
            'Analytics report export',
            'Module customization',
        ],
    },
    {
        id: 'super_premium',
        name: 'Elite',
        eyebrow: 'Full Access',
        price: 'PHP 399',
        billingNote: 'per month',
        description: 'Unlock the complete seller suite for larger shops, staff workflows, and sponsorship-driven growth.',
        limit: 50,
        icon: Sparkles,
        badgeClass: 'border-stone-800 bg-stone-800 text-stone-100',
        iconClass: 'bg-stone-900 text-amber-300',
        cardClass: 'border-stone-300 bg-gradient-to-b from-white to-stone-50',
        currentClass: 'border-orange-500 ring-1 ring-orange-500',
        featureIconClass: 'text-green-500',
        upgradeButtonClass: 'bg-stone-900 text-white hover:bg-stone-800 shadow-sm shadow-stone-900/10',
        downgradeButtonClass: 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50 hover:border-stone-400',
        heroStripeClass: 'from-stone-900 via-stone-700 to-[#B78A5A]',
        benefitCardClass: 'border-stone-200 bg-stone-50',
        supportCopy: 'Built for artisan shops using advanced modules, staff accounts, and sponsored reach.',
        features: [
            'Up to 50 active products',
            'Elite badge',
            '5 sponsorship credits every 30 days',
            'All seller modules unlocked',
            'Sponsored homepage and catalog placement',
        ],
    },
];

export default function Subscription({ auth, currentPlan, activeProductsCount, limit, activeProducts, linkedStaffCount = 0, pendingUpgrade = null }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [finalDowngradeModalOpen, setFinalDowngradeModalOpen] = useState(false);
    const [targetPlan, setTargetPlan] = useState(null);

    const { post, processing, reset } = useForm({
        plan: '',
    });

    const isCurrentPlan = (plan) => currentPlan === plan;

    const submitSubscriptionChange = (url, payload, options = {}) => {
        post(url, {
            data: payload,
            preserveScroll: true,
            preserveState: 'errors',
            replace: true,
            ...options,
        });
    };

    const handleUpgrade = (planValue) => {
        submitSubscriptionChange(route('seller.subscription.upgrade'), { plan: planValue });
    };

    const initiateDowngrade = (planValue, newLimit) => {
        setTargetPlan({ value: planValue, limit: newLimit });
        setFinalDowngradeModalOpen(true);
        reset();
    };

    const closeDowngradeFlow = () => {
        setFinalDowngradeModalOpen(false);
        setTargetPlan(null);
        reset();
    };

    const confirmDowngrade = () => {
        submitSubscriptionChange(
            route('seller.subscription.downgrade'),
            {
                plan: targetPlan.value,
            },
            {
                onSuccess: () => {
                    closeDowngradeFlow();
                },
                onError: () => {
                    setFinalDowngradeModalOpen(true);
                }
            }
        );
    };

    const formatPlanName = (plan) => {
        if (plan === 'free') return 'Standard';
        if (plan === 'premium') return 'Premium';
        if (plan === 'super_premium') return 'Elite';
        return plan;
    };

    const formatCurrency = (amount, currency = pendingUpgrade?.currency || 'PHP') => new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
    }).format(Number(amount || 0));
    const plans = PLAN_CONFIG;
    const requiresAutomaticDrafting = activeProductsCount > (targetPlan?.limit ?? limit);
    const showsStandardDowngradeWarning = currentPlan === 'super_premium' && targetPlan?.value === 'free';
    const plannedDraftCount = targetPlan ? Math.max(0, activeProductsCount - targetPlan.limit) : 0;
    const pendingUpgradeDate = pendingUpgrade?.createdAt
        ? new Date(pendingUpgrade.createdAt).toLocaleString('en-PH', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        })
        : null;
    const currentPlanMeta = plans.find((plan) => plan.id === currentPlan) ?? plans[0];
    const closeFinalDowngradeModal = () => closeDowngradeFlow();

    return (
        <div className="min-h-screen bg-[#FDFBF9] font-sans text-gray-800">
            <Head title="Subscription Plan" />
            <SellerSidebar active="subscription" user={auth.user} mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className="flex min-h-screen flex-col lg:ml-56">
                <SellerHeader
                    title="Subscription Plan"
                    subtitle="Manage product capacity, workspace access, and plan upgrades."
                    auth={auth}
                    onMenuClick={() => setSidebarOpen(true)}
                />

                <main className="mx-auto w-full max-w-[1120px] px-4 py-5 sm:px-6 lg:px-7">
                    <div className="space-y-5">
                        <section className="mx-auto max-w-[1020px] overflow-hidden rounded-[1.75rem] border border-stone-200 bg-white shadow-[0_24px_60px_-42px_rgba(15,23,42,0.32)]">
                            <div className="h-1 bg-gradient-to-r from-[#FFA426] via-[#FF8A1C] to-[#8B5CF6]" />

                            <div className="border-b border-stone-100 px-5 py-4 sm:px-6">
                                <div className="flex items-start gap-3.5">
                                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-[1.05rem] bg-gradient-to-br from-[#FFA426] to-[#FF7A00] text-white shadow-sm">
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
                            </div>

                            <div className="px-5 py-5 sm:px-6">
                                <div className="grid gap-3 lg:grid-cols-3">
                                    {plans.map((plan) => {
                                        const current = isCurrentPlan(plan.id);
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
                                                className={`relative flex flex-col rounded-[1.7rem] border bg-white px-5 pb-5 pt-4 ${cardClass}`}
                                            >
                                                {(current || isPremiumPlan) && (
                                                    <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
                                                        <span className={`rounded-full px-3.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] ${labelClass}`}>
                                                            {current ? 'Current Plan' : 'Most Popular'}
                                                        </span>
                                                    </div>
                                                )}

                                                <div className="flex items-start gap-3">
                                                    <div className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.95rem] ${iconClass}`}>
                                                        <PlanIcon className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-[1.55rem] font-black leading-none tracking-tight text-stone-900">{plan.name}</h3>
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
                                                            className={`inline-flex w-full items-center justify-center gap-2 rounded-[1rem] px-4 py-2.5 text-[14px] font-bold transition ${upgradeButtonClass}`}
                                                        >
                                                            {isPendingPlan ? 'Continue Payment' : `Upgrade to ${plan.name}`}
                                                            <ArrowRight className="h-[15px] w-[15px]" />
                                                        </button>
                                                    ) : isDowngrade ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => initiateDowngrade(plan.id, plan.limit)}
                                                            className="inline-flex w-full items-center justify-center rounded-[1rem] border-2 border-stone-200 bg-white px-4 py-2.5 text-[14px] font-bold text-stone-600 transition hover:border-stone-300 hover:text-stone-900"
                                                        >
                                                            Downgrade
                                                        </button>
                                                    ) : null}
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex flex-col gap-2.5 border-t border-stone-100 px-5 py-3 text-[12px] text-stone-500 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                                <p>Plans can be changed anytime. Downgrades may deactivate some products.</p>
                                {pendingUpgrade && pendingUpgrade.checkoutUrl ? (
                                    <button
                                        type="button"
                                        onClick={() => window.location.assign(pendingUpgrade.checkoutUrl)}
                                        className="inline-flex items-center gap-1.5 font-bold text-orange-600 transition hover:text-orange-700"
                                    >
                                        Continue Payment
                                        <ChevronRight className="h-[15px] w-[15px]" />
                                    </button>
                                ) : (
                                    <p className="font-semibold text-orange-600">Current plan: {currentPlanMeta.name}</p>
                                )}
                            </div>
                        </section>
                    </div>
                </main>
            </div>

            <Modal show={finalDowngradeModalOpen} onClose={closeFinalDowngradeModal} maxWidth="lg">
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
                            onClick={closeFinalDowngradeModal}
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
                                    This downgrade exceeds the <strong>{targetPlan?.limit}</strong>-product limit, so the system will keep your top-selling active products first.
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

                    <div className="mt-6 flex justify-end gap-3 border-t border-stone-200 pt-4">
                        <button
                            onClick={closeFinalDowngradeModal}
                            className="px-4 py-2 text-sm font-medium text-stone-600 bg-white border border-stone-300 rounded-lg hover:bg-stone-50"
                        >
                            Go back
                        </button>
                        <button
                            onClick={confirmDowngrade}
                            disabled={processing}
                            className={`px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors ${
                                processing
                                    ? 'bg-stone-300 cursor-not-allowed'
                                    : 'bg-orange-600 hover:bg-orange-700'
                            }`}
                        >
                            {processing ? 'Processing...' : 'Yes, downgrade now'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
