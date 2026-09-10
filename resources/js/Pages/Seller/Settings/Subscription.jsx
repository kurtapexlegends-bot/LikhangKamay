import React, { useState, useMemo } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { useToast } from '@/Components/ToastContext';
import SellerHeader from '@/Layouts/SellerHeader';
import { AlertCircle, CheckCircle2, Clock3, ShieldCheck, Crown, Package, Sparkles, BadgeCheck } from 'lucide-react';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';

// Subcomponents
import SubscriptionPlans from '@/Components/Seller/Settings/SubscriptionPlans';
import SubscriptionComparisonModal from '@/Components/Seller/Settings/SubscriptionComparisonModal';
import BillingActivity from '@/Components/Seller/Settings/BillingActivity';
import DowngradeModal from '@/Components/Seller/Settings/DowngradeModal';
import CancelSubscriptionModal from '@/Components/Seller/Settings/CancelSubscriptionModal';

export default function Subscription({
    auth,
    currentPlan,
    activeProductsCount,
    limit,
    activeProducts,
    linkedStaffCount = 0,
    pendingUpgrade = null,
    recentTransactions = [],
    planSettings = {},
    subscriptionExpiresAt = null,
    subscriptionCancelledAt = null,
    isCancelled = false,
    daysRemaining = null,
    pendingDowngradeTier = 'free',
}) {
    const [finalDowngradeModalOpen, setFinalDowngradeModalOpen] = useState(false);
    const [comparisonModalOpen, setComparisonModalOpen] = useState(false);
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [targetPlan, setTargetPlan] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [activePageIndex, setActivePageIndex] = useState(0);
    const { addToast } = useToast();
    const { openSidebar } = useSellerWorkspaceShell();

    const plans = useMemo(() => {
        const freeLimit = planSettings?.free_limit ?? 3;
        const freeStaffLimit = planSettings?.free_staff_limit ?? 0;
        const freeBadge = planSettings?.free_badge || 'Foundational';
        const freeDescription = planSettings?.free_description || 'Keep your shop live with the essentials for catalog, orders, and seller workspace basics.';
        const freeFeatures = planSettings?.free_features && planSettings.free_features.length > 0
            ? planSettings.free_features
            : [
                'Core seller workspace',
                'Basic analytics dashboard',
                '3D interactive model viewer',
                'Courier booking (Lalamove)',
                'Printable invoices & receipts',
                'Customer reviews',
            ];

        const premiumPrice = planSettings?.premium_price ?? 199;
        const premiumLimit = planSettings?.premium_limit ?? 10;
        const premiumStaffLimit = planSettings?.premium_staff_limit ?? 3;
        const premiumBadge = planSettings?.premium_badge || 'Most Popular';
        const premiumDescription = planSettings?.premium_description || 'Add more shelf space and stronger operational tools once your shop starts growing beyond the basics.';
        const premiumFeatures = planSettings?.premium_features && planSettings.premium_features.length > 0
            ? planSettings.premium_features
            : [
                'Premium badge visibility',
                'In-house driver dispatch',
                'Materials & craft recipes',
                'Staff attendance & payroll',
                'Analytics report export',
                'Module customization',
                'Automated thank-you messages',
            ];

        const superPremiumPrice = planSettings?.super_premium_price ?? 399;
        const superPremiumLimit = planSettings?.super_premium_limit ?? 50;
        const superPremiumStaffLimit = planSettings?.super_premium_staff_limit ?? 15;
        const superPremiumBadge = planSettings?.super_premium_badge || 'Full Access';
        const superPremiumDescription = planSettings?.super_premium_description || 'Unlock the complete seller suite for larger shops, staff workflows, and sponsorship-driven growth.';
        const superPremiumFeatures = planSettings?.super_premium_features && planSettings.super_premium_features.length > 0
            ? planSettings.super_premium_features
            : [
                'Elite badge',
                'B2B supply hub & wholesale ordering',
                '5 sponsorship credits every 30 days',
                'Discounts module & marketing',
                'All seller modules unlocked',
                'Sponsored homepage & catalog placement',
                'Priority search ranking',
            ];

        return [
            {
                id: 'free',
                name: 'Standard',
                eyebrow: freeBadge,
                price: 'Free',
                billingNote: 'No monthly fee',
                description: freeDescription,
                limit: freeLimit,
                staffLimit: freeStaffLimit,
                icon: Package,
                badgeClass: 'border-stone-200 bg-stone-100 text-stone-700',
                iconClass: 'bg-stone-100 text-stone-700 border border-stone-200',
                cardClass: 'border-stone-200 bg-white',
                currentClass: 'border-stone-300 ring-2 ring-stone-200',
                featureIconClass: 'text-stone-500',
                upgradeButtonClass: 'bg-stone-900 text-white hover:bg-stone-800',
                downgradeButtonClass: 'border-stone-300 bg-white text-stone-700 hover:border-stone-400 hover:bg-stone-50',
                heroStripeClass: 'from-stone-300 via-stone-200 to-[#F4EEE8]',
                benefitCardClass: 'border-stone-200 bg-stone-50/70',
                supportCopy: 'Best for new artisan shops keeping a focused active catalog.',
                features: [
                    `Up to ${freeLimit} active products • ${freeStaffLimit} staff accounts`,
                    ...freeFeatures,
                ],
            },
            {
                id: 'premium',
                name: 'Premium',
                eyebrow: premiumBadge,
                price: `PHP ${premiumPrice}`,
                billingNote: 'per month',
                description: premiumDescription,
                limit: premiumLimit,
                staffLimit: premiumStaffLimit,
                icon: Crown,
                badgeClass: 'border-amber-200 bg-amber-50 text-amber-800',
                iconClass: 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-sm',
                cardClass: 'border-amber-200/90 bg-white ring-1 ring-amber-100',
                currentClass: 'border-amber-300 ring-2 ring-amber-300',
                featureIconClass: 'text-amber-600',
                upgradeButtonClass: 'bg-amber-600 text-white hover:bg-amber-700 shadow-sm',
                downgradeButtonClass: 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50 hover:border-amber-300',
                heroStripeClass: 'from-amber-200 via-amber-100 to-stone-50',
                benefitCardClass: 'border-amber-200/70 bg-amber-50/40',
                supportCopy: 'A balanced plan for shops that need more products, staff dispatch, and stronger reporting.',
                features: [
                    `Up to ${premiumLimit} active products • ${premiumStaffLimit} staff accounts`,
                    ...premiumFeatures,
                ],
            },
            {
                id: 'super_premium',
                name: 'Elite',
                eyebrow: superPremiumBadge,
                price: `PHP ${superPremiumPrice}`,
                billingNote: 'per month',
                description: superPremiumDescription,
                limit: superPremiumLimit,
                staffLimit: superPremiumStaffLimit,
                icon: Sparkles,
                badgeClass: 'border-violet-200 bg-violet-50 text-violet-800',
                iconClass: 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-sm',
                cardClass: 'border-violet-200/90 bg-white ring-1 ring-violet-100',
                currentClass: 'border-violet-300 ring-2 ring-violet-300',
                featureIconClass: 'text-violet-600',
                upgradeButtonClass: 'bg-violet-600 text-white hover:bg-violet-700 shadow-sm',
                downgradeButtonClass: 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50 hover:border-violet-300',
                heroStripeClass: 'from-violet-500 via-indigo-500 to-purple-500',
                benefitCardClass: 'border-violet-200/70 bg-violet-50/40',
                supportCopy: 'Built for artisan shops using advanced modules, staff accounts, B2B wholesale, and sponsored reach.',
                features: [
                    `Up to ${superPremiumLimit} active products • ${superPremiumStaffLimit} staff accounts`,
                    ...superPremiumFeatures,
                ],
            },
        ];
    }, [planSettings]);

    const handleScroll = (e) => {
        const scrollLeft = e.currentTarget.scrollLeft;
        const width = e.currentTarget.getBoundingClientRect().width;
        if (width > 0) {
            const index = Math.round(scrollLeft / width);
            setActivePageIndex(index);
        }
    };

    const submitSubscriptionChange = (url, payload, options = {}) => {
        setIsProcessing(true);
        router.post(url, payload, {
            preserveScroll: true,
            onSuccess: () => {
                setIsProcessing(false);
                options.onSuccess?.();
            },
            onError: (err) => {
                setIsProcessing(false);
                const errorMsg = Object.values(err)[0] || 'An error occurred. Please try again.';
                addToast(errorMsg, 'error');
                options.onError?.(err);
            },
            onFinish: () => {
                setIsProcessing(false);
            },
            ...options,
        });
    };

    const handleUpgrade = (planValue) => {
        submitSubscriptionChange(route('seller.subscription.upgrade'), { plan: planValue });
    };

    const initiateDowngrade = (planValue, newLimit) => {
        setTargetPlan({ value: planValue, limit: newLimit });
        setFinalDowngradeModalOpen(true);
    };

    const closeDowngradeFlow = () => {
        setFinalDowngradeModalOpen(false);
        setTargetPlan(null);
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
                    addToast('Plan downgraded successfully.', 'success');
                },
                onError: () => {
                    setFinalDowngradeModalOpen(true);
                }
            }
        );
    };

    const handleScheduleRenewal = (planValue) => {
        submitSubscriptionChange(
            route('seller.subscription.schedule-renewal'),
            {
                plan: planValue || targetPlan?.value,
            },
            {
                onSuccess: () => {
                    closeDowngradeFlow();
                    addToast('Renewal plan updated successfully.', 'success');
                },
                onError: () => {
                    setFinalDowngradeModalOpen(true);
                }
            }
        );
    };

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

    const formattedExpirationDate = subscriptionExpiresAt
        ? new Date(subscriptionExpiresAt).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        })
        : null;

    const handleCancelSubscription = () => {
        setCancelModalOpen(true);
    };

    const confirmCancelSubscription = () => {
        submitSubscriptionChange(
            route('seller.subscription.cancel-auto-renewal'),
            {},
            {
                onSuccess: () => setCancelModalOpen(false),
                onError: () => setCancelModalOpen(true),
            }
        );
    };

    const handleReactivateSubscription = () => {
        submitSubscriptionChange(route('seller.subscription.resume-auto-renewal'), {});
    };

    return (
        <div className="min-h-screen bg-[#FDFBF9] font-sans text-gray-800">
            <Head title="Subscription Plan" />

            <div className="flex min-h-screen flex-col">
                <SellerHeader
                    title="Subscription Plan"
                    subtitle="Manage shop capacity, tier limits, and billing."
                    auth={auth}
                    onMenuClick={openSidebar}
                />

                <main className="mx-auto w-full max-w-[1120px] px-4 py-5 sm:px-6 lg:px-7">
                    <div className="space-y-5">
                        {/* Expiration & Policy Status Banner */}
                        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-bold shadow-2xs ${
                                     currentPlan === 'super_premium'
                                         ? 'border-violet-200/80 bg-violet-50/70 text-violet-900'
                                         : currentPlan === 'premium'
                                             ? 'border-amber-200/80 bg-amber-50/70 text-amber-900'
                                             : 'border-stone-200 bg-stone-100/80 text-stone-800'
                                 }`}>
                                     <BadgeCheck className={`h-4 w-4 shrink-0 ${
                                         currentPlan === 'super_premium'
                                             ? 'text-violet-600'
                                             : currentPlan === 'premium'
                                                 ? 'text-amber-600'
                                                 : 'text-stone-600'
                                     }`} />
                                     <span>Your Current Plan: <strong className={`font-black ${
                                         currentPlan === 'super_premium'
                                             ? 'text-violet-950'
                                             : currentPlan === 'premium'
                                                 ? 'text-amber-950'
                                                 : 'text-stone-950'
                                     }`}>{currentPlanMeta.name}</strong></span>
                                 </span>

                                {formattedExpirationDate && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50/80 px-3 py-1 text-xs font-semibold text-stone-700">
                                        <Clock3 size={13} className="text-stone-500" />
                                        {isCancelled ? `Expires on ${formattedExpirationDate}` : `Renews on ${formattedExpirationDate}`}
                                        {daysRemaining !== null && (
                                            <span className="font-bold text-stone-900">
                                                ({daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left)
                                            </span>
                                        )}
                                    </span>
                                )}

                                <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-stone-500">
                                    Non-Refundable
                                </span>
                            </div>

                            {/* Subscription Actions */}
                            {currentPlan !== 'free' && (
                                <div className="shrink-0 flex items-center gap-2">
                                    {isCancelled ? (
                                        <button
                                            type="button"
                                            onClick={handleReactivateSubscription}
                                            disabled={isProcessing}
                                            className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-stone-800 active:scale-95 shadow-sm"
                                        >
                                            <CheckCircle2 size={13} className="text-emerald-400" />
                                            <span>Reactivate Subscription</span>
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={handleCancelSubscription}
                                            disabled={isProcessing}
                                            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-1.5 text-xs font-bold text-stone-700 transition hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 active:scale-95 shadow-2xs"
                                        >
                                            <span>Cancel Subscription</span>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Cancellation Warning Banner */}
                        {isCancelled && formattedExpirationDate && (
                            <div className="flex items-start gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/70 p-4 text-amber-900 shadow-2xs">
                                <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-xs font-bold text-amber-950">Subscription Scheduled for Cancellation</h4>
                                    <p className="mt-0.5 text-xs leading-relaxed text-amber-800 font-medium">
                                        Your auto-renewal has been cancelled. Your <strong>{currentPlanMeta.name}</strong> benefits will remain <strong>100% active until {formattedExpirationDate}</strong>. Per our strict policy, subscription payments are non-refundable. You can resume auto-renewal anytime before expiration.
                                    </p>
                                </div>
                            </div>
                        )}

                        <SubscriptionPlans
                            plans={plans}
                            currentPlan={currentPlan}
                            pendingUpgrade={pendingUpgrade}
                            activeProductsCount={activeProductsCount}
                            limit={limit}
                            isProcessing={isProcessing}
                            handleUpgrade={handleUpgrade}
                            initiateDowngrade={initiateDowngrade}
                            handleScheduleRenewal={handleScheduleRenewal}
                            pendingDowngradeTier={pendingDowngradeTier}
                            daysRemaining={daysRemaining}
                            subscriptionExpiresAt={subscriptionExpiresAt}
                            handleScroll={handleScroll}
                            activePageIndex={activePageIndex}
                            pendingUpgradeDate={pendingUpgradeDate}
                            onOpenComparison={() => setComparisonModalOpen(true)}
                        />

                        <BillingActivity
                            recentTransactions={recentTransactions}
                        />
                    </div>
                </main>
            </div>

            <SubscriptionComparisonModal
                isOpen={comparisonModalOpen}
                onClose={() => setComparisonModalOpen(false)}
                currentPlan={currentPlan}
                planSettings={planSettings}
            />

            <DowngradeModal
                isOpen={finalDowngradeModalOpen}
                onClose={closeDowngradeFlow}
                currentPlan={currentPlan}
                targetPlan={targetPlan}
                activeProductsCount={activeProductsCount}
                limit={limit}
                linkedStaffCount={linkedStaffCount}
                confirmDowngrade={confirmDowngrade}
                onScheduleRenewal={handleScheduleRenewal}
                daysRemaining={daysRemaining}
                formattedExpirationDate={formattedExpirationDate}
                isProcessing={isProcessing}
            />

            <CancelSubscriptionModal
                isOpen={cancelModalOpen}
                onClose={() => setCancelModalOpen(false)}
                currentPlanName={currentPlanMeta.name}
                formattedExpirationDate={formattedExpirationDate}
                daysRemaining={daysRemaining}
                onConfirm={confirmCancelSubscription}
                isProcessing={isProcessing}
            />
        </div>
    );
}

Subscription.layout = (page) => <SellerWorkspaceLayout active="subscription">{page}</SellerWorkspaceLayout>;
