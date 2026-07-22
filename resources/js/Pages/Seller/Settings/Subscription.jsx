import React, { useState, useMemo } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { useToast } from '@/Components/ToastContext';
import SellerHeader from '@/Layouts/SellerHeader';
import { AlertCircle, CheckCircle2, Clock3, ShieldCheck, Crown, Package, Sparkles } from 'lucide-react';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';

// Subcomponents
import SubscriptionPlans from '@/Components/Seller/Settings/SubscriptionPlans';
import SubscriptionComparisonModal from '@/Components/Seller/Settings/SubscriptionComparisonModal';
import BillingActivity from '@/Components/Seller/Settings/BillingActivity';
import DowngradeModal from '@/Components/Seller/Settings/DowngradeModal';

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
}) {
    const [finalDowngradeModalOpen, setFinalDowngradeModalOpen] = useState(false);
    const [comparisonModalOpen, setComparisonModalOpen] = useState(false);
    const [targetPlan, setTargetPlan] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [activePageIndex, setActivePageIndex] = useState(0);
    const { addToast } = useToast();
    const { openSidebar } = useSellerWorkspaceShell();

    const plans = useMemo(() => {
        const freeLimit = planSettings?.free_limit ?? 3;
        const premiumPrice = planSettings?.premium_price ?? 199;
        const premiumLimit = planSettings?.premium_limit ?? 10;
        const superPremiumPrice = planSettings?.super_premium_price ?? 399;
        const superPremiumLimit = planSettings?.super_premium_limit ?? 50;

        return [
            {
                id: 'free',
                name: 'Standard',
                eyebrow: 'Foundational',
                price: 'Free',
                billingNote: 'No monthly fee',
                description: 'Keep your shop live with the essentials for catalog, orders, and seller workspace basics.',
                limit: freeLimit,
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
                    `Up to ${freeLimit} active products`,
                    'Core seller workspace',
                    'Basic analytics dashboard',
                ],
            },
            {
                id: 'premium',
                name: 'Premium',
                eyebrow: 'Most Popular',
                price: `PHP ${premiumPrice}`,
                billingNote: 'per month',
                description: 'Add more shelf space and stronger operational tools once your shop starts growing beyond the basics.',
                limit: premiumLimit,
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
                    `Up to ${premiumLimit} active products`,
                    'Premium badge visibility',
                    'Analytics report export',
                    'Module customization',
                ],
            },
            {
                id: 'super_premium',
                name: 'Elite',
                eyebrow: 'Full Access',
                price: `PHP ${superPremiumPrice}`,
                billingNote: 'per month',
                description: 'Unlock the complete seller suite for larger shops, staff workflows, and sponsorship-driven growth.',
                limit: superPremiumLimit,
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
                    `Up to ${superPremiumLimit} active products`,
                    'Elite badge',
                    '5 sponsorship credits every 30 days',
                    'All seller modules unlocked',
                    'Sponsored homepage and catalog placement',
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
                        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
                            <span className="inline-flex w-full sm:w-auto items-center justify-center sm:justify-start gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-[11px] font-bold text-stone-600">
                                <ShieldCheck size={13} />
                                Current plan: {currentPlanMeta.name}
                            </span>
                            {pendingUpgrade ? (
                                <span className="inline-flex w-full sm:w-auto items-center justify-center sm:justify-start gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-700">
                                    <Clock3 size={13} />
                                    Payment pending until PayMongo confirms it
                                </span>
                            ) : (
                                <span className="inline-flex w-full sm:w-auto items-center justify-center sm:justify-start gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
                                    <CheckCircle2 size={13} />
                                    Plan changes apply after paid upgrades or confirmed downgrades
                                </span>
                            )}
                            {activeProductsCount > limit && (
                                <span className="inline-flex w-full sm:w-auto items-center justify-center sm:justify-start gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-bold text-red-700">
                                    <AlertCircle size={13} />
                                    Some products must return to draft under the current limit
                                </span>
                            )}
                        </div>

                        <SubscriptionPlans
                            plans={plans}
                            currentPlan={currentPlan}
                            pendingUpgrade={pendingUpgrade}
                            activeProductsCount={activeProductsCount}
                            limit={limit}
                            isProcessing={isProcessing}
                            handleUpgrade={handleUpgrade}
                            initiateDowngrade={initiateDowngrade}
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
                isProcessing={isProcessing}
            />
        </div>
    );
}

Subscription.layout = (page) => <SellerWorkspaceLayout active="subscription">{page}</SellerWorkspaceLayout>;
