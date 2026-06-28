import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { router, usePage } from '@inertiajs/react';
import { Crown, X, ChevronRight } from 'lucide-react';
import { PLANS, PLAN_CONFIG } from '@/utils/planConfig';
import PlanPricingCard from '@/Components/Seller/Subscriptions/Partials/PlanPricingCard';
import DowngradeWarningOverlay from '@/Components/Seller/Subscriptions/Partials/DowngradeWarningOverlay';

export { PLANS, PLAN_CONFIG };

export function PlanModal({ isOpen, onClose, currentTier, canManagePlan = true }) {
    const { sellerSubscription } = usePage().props;
    const [isVisible, setIsVisible] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [hoveredPlan, setHoveredPlan] = useState(null);
    const [pendingDowngrade, setPendingDowngrade] = useState(null);
    const [isDowngrading, setIsDowngrading] = useState(false);
    const [activePageIndex, setActivePageIndex] = useState(0);
    const overlayRef = useRef(null);

    const handleScroll = (e) => {
        const scrollLeft = e.currentTarget.scrollLeft;
        const width = e.currentTarget.getBoundingClientRect().width;
        if (width > 0) {
            const index = Math.round(scrollLeft / width);
            setActivePageIndex(index);
        }
    };

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            requestAnimationFrame(() => {
                setIsVisible(true);
                setIsAnimating(true);
            });
        } else {
            document.body.style.overflow = '';
            setIsVisible(false);
            setIsAnimating(false);
            setPendingDowngrade(null);
            setIsDowngrading(false);
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const handleClose = () => {
        setIsAnimating(false);
        setIsVisible(false);
        setPendingDowngrade(null);
        setIsDowngrading(false);
        setTimeout(() => onClose(), 280);
    };

    const handleOverlayClick = (e) => {
        if (e.target === overlayRef.current) {
            handleClose();
        }
    };

    const handleUpgrade = (planId) => {
        if (!canManagePlan) return;
        router.post(route('seller.subscription.upgrade'), { plan: planId }, { preserveScroll: true });
        handleClose();
    };

    const handleDowngrade = (planId, targetLimit) => {
        if (!canManagePlan) return;
        const activeCount = sellerSubscription?.activeCount ?? 0;

        if (activeCount > targetLimit) {
            router.visit(route('seller.subscription'));
            handleClose();
            return;
        }

        const targetPlan = PLANS.find((plan) => plan.id === planId);
        setPendingDowngrade({
            id: planId,
            name: targetPlan?.name ?? planId,
            limit: targetLimit,
        });
    };

    const confirmDowngrade = () => {
        if (!pendingDowngrade || isDowngrading) return;

        setIsDowngrading(true);
        router.post(
            route('seller.subscription.downgrade'),
            { plan: pendingDowngrade.id },
            {
                preserveScroll: true,
                onSuccess: () => handleClose(),
                onError: () => setIsDowngrading(false),
                onFinish: () => setIsDowngrading(false),
            }
        );
    };

    const handleManage = () => {
        if (!canManagePlan) return;
        router.visit(route('seller.subscription'));
        handleClose();
    };

    if (!isOpen && !isVisible) return null;

    const currentIndex = PLANS.findIndex((plan) => plan.id === currentTier);
    const activeCount = sellerSubscription?.activeCount ?? 0;
    const draftCount = pendingDowngrade ? Math.max(0, activeCount - pendingDowngrade.limit) : 0;
    const showsEliteStandardWarning = currentTier === 'super_premium' && pendingDowngrade?.id === 'free';

    const modalContent = (
        <div
            className={`fixed inset-0 z-[9999] overflow-hidden transition-all duration-300 ${
                isAnimating ? 'bg-black/40 backdrop-blur-sm' : 'bg-black/0 backdrop-blur-0'
            }`}
        >
            <div
                ref={overlayRef}
                onClick={handleOverlayClick}
                className="flex min-h-full items-center justify-center p-3 sm:p-4"
                style={{ perspective: '1200px' }}
            >
                <div
                    className={`relative w-full max-w-[52rem] overflow-hidden rounded-[1.5rem] bg-white shadow-2xl transition-all duration-500 ease-out ${
                        isAnimating
                            ? 'opacity-100 translate-y-0 scale-100'
                            : 'opacity-0 translate-y-8 scale-95'
                    }`}
                    style={{
                        transformStyle: 'preserve-3d',
                        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                >
                    <div className="relative border-b border-stone-100 px-5 py-3 sm:px-6">
                        <div className="absolute right-3 top-0 h-20 w-20 -translate-y-1/3 rounded-full bg-gradient-to-br from-amber-100/25 to-orange-100/20 blur-2xl pointer-events-none" />
                        <div className="absolute left-3 top-3 h-14 w-14 rounded-full bg-gradient-to-br from-violet-100/20 to-indigo-100/10 blur-xl pointer-events-none" />

                        <div className="relative flex items-start justify-between">
                            <div>
                                <div className="mb-1 flex items-center gap-2.5">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm shadow-amber-200/40">
                                        <Crown size={15} className="text-white" />
                                    </div>
                                    <h2 className="text-lg font-extrabold tracking-tight text-stone-900 sm:text-[1.35rem]">
                                        Choose Your Plan
                                    </h2>
                                </div>

                                <p className="ml-[38px] text-[11px] font-medium text-stone-500">
                                    Unlock more features for your seller workspace.
                                </p>
                            </div>

                            <button
                                onClick={handleClose}
                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-stone-400 transition-all duration-200 hover:bg-stone-200 hover:text-stone-600"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="bg-stone-50/30 p-4 sm:p-4">
                        <div
                            onScroll={handleScroll}
                            className="flex overflow-x-auto snap-x snap-mandatory pb-4 gap-4 lg:grid lg:grid-cols-3 lg:gap-5 no-scrollbar"
                        >
                            {PLANS.map((plan, index) => {
                                const isCurrent = plan.id === currentTier;
                                const isUpgrade = index > currentIndex;
                                const isDowngrade = index < currentIndex;

                                const limits = sellerSubscription?.tierLimits || { free: 3, premium: 10, super_premium: 50 };
                                const prices = sellerSubscription?.tierPrices || { free: 0, premium: 199, super_premium: 399 };

                                const planLimit = limits[plan.id] ?? plan.limit;
                                const rawPrice = prices[plan.id] ?? 0;
                                const planPrice = plan.id === 'free' ? 'Free' : `₱${rawPrice}`;

                                return (
                                    <PlanPricingCard
                                        key={plan.id}
                                        plan={plan}
                                        isCurrent={isCurrent}
                                        isUpgrade={isUpgrade}
                                        isDowngrade={isDowngrade}
                                        planLimit={planLimit}
                                        planPrice={planPrice}
                                        hoveredPlan={hoveredPlan}
                                        setHoveredPlan={setHoveredPlan}
                                        isAnimating={isAnimating}
                                        index={index}
                                        canManagePlan={canManagePlan}
                                        handleUpgrade={handleUpgrade}
                                        handleDowngrade={handleDowngrade}
                                    />
                                );
                            })}
                        </div>

                        {/* Page Indicator Dots on Mobile */}
                        <div className="flex justify-center gap-1.5 mt-2 lg:hidden">
                            {PLANS.map((_, i) => (
                                <span
                                    key={i}
                                    className={`h-1.5 rounded-full transition-all duration-300 ${
                                        activePageIndex === i ? 'w-4 bg-[#6D5EF6]' : 'w-1.5 bg-stone-200'
                                    }`}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col items-center justify-between gap-2 border-t border-stone-100 bg-white px-5 py-2.5 sm:flex-row sm:px-6">
                        <p className="text-center text-[10px] font-medium text-stone-500 sm:text-left">
                            {canManagePlan
                                ? 'Plans can be changed anytime. Downgrades may deactivate some products.'
                                : 'Your access to subscription details is read-only.'}
                        </p>

                        {canManagePlan ? (
                            <button
                                onClick={handleManage}
                                className="group flex items-center gap-1 whitespace-nowrap text-[11px] font-bold text-orange-600 transition-colors hover:text-orange-700"
                            >
                                Manage Subscription
                                <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                            </button>
                        ) : (
                            <span className="whitespace-nowrap text-[11px] font-bold text-stone-400">
                                Owner-managed plan
                            </span>
                        )}
                    </div>

                    {pendingDowngrade && (
                        <DowngradeWarningOverlay
                            pendingDowngrade={pendingDowngrade}
                            setPendingDowngrade={setPendingDowngrade}
                            confirmDowngrade={confirmDowngrade}
                            isDowngrading={isDowngrading}
                            currentTier={currentTier}
                            draftCount={draftCount}
                            showsEliteStandardWarning={showsEliteStandardWarning}
                        />
                    )}
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
