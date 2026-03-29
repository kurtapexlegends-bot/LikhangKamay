import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { router, usePage } from '@inertiajs/react';
import { Crown, Sparkles, Zap, Check, X, ArrowRight, Star, Shield, Rocket, ChevronRight, AlertCircle, Users } from 'lucide-react';

const PLAN_CONFIG = {
    free: {
        label: 'Standard',
        icon: Zap,
        bg: 'bg-stone-100',
        border: 'border-stone-200',
        text: 'text-stone-600',
        iconColor: 'text-stone-400',
        hoverBg: 'hover:bg-stone-200/80',
    },
    premium: {
        label: 'Premium',
        icon: Crown,
        bg: 'bg-gradient-to-r from-amber-50 to-orange-50',
        border: 'border-amber-200/60',
        text: 'text-amber-800',
        iconColor: 'text-amber-500',
        hoverBg: 'hover:from-amber-100/80 hover:to-orange-100/80',
    },
    super_premium: {
        label: 'Elite',
        icon: Sparkles,
        bg: 'bg-gradient-to-r from-violet-50 to-indigo-50',
        border: 'border-violet-200/60',
        text: 'text-violet-800',
        iconColor: 'text-violet-500',
        hoverBg: 'hover:from-violet-100/80 hover:to-indigo-100/80',
    },
};

const PLANS = [
    {
        id: 'free',
        name: 'Standard',
        price: 'Free',
        period: '',
        description: 'Start selling your craft to the world.',
        icon: Zap,
        limit: 3,
        color: 'stone',
        gradient: 'from-stone-500 to-stone-600',
        lightBg: 'bg-stone-50',
        lightBorder: 'border-stone-200',
        lightText: 'text-stone-700',
        features: [
            'Up to 3 Active Products',
            'Core Seller Workspace',
            'Basic Analytics Dashboard',
        ],
    },
    {
        id: 'premium',
        name: 'Premium',
        price: '₱199',
        period: '/ mo',
        description: 'Grow your artisan business with stronger operational tools.',
        icon: Crown,
        limit: 10,
        color: 'amber',
        gradient: 'from-amber-500 to-orange-500',
        lightBg: 'bg-amber-50',
        lightBorder: 'border-amber-200',
        lightText: 'text-amber-700',
        recommended: true,
        features: [
            'Up to 10 Active Products',
            'Premium Badge (Crown Icon)',
            'Analytics Report Export',
            'Module Customization',
        ],
    },
    {
        id: 'super_premium',
        name: 'Elite',
        price: '₱399',
        period: '/ mo',
        description: 'Unlock the full seller suite and sponsored placements.',
        icon: Sparkles,
        limit: 50,
        color: 'violet',
        gradient: 'from-violet-500 to-indigo-500',
        lightBg: 'bg-violet-50',
        lightBorder: 'border-violet-200',
        lightText: 'text-violet-700',
        features: [
            'Up to 50 Active Products',
            'Elite Badge',
            '5 Sponsorship Credits Every 30 Days',
            'All Seller Modules Unlocked',
            'Sponsored Homepage and Catalog Placement',
        ],
    },
];

// ─── Animated Modal ───
export function PlanModal({ isOpen, onClose, currentTier, canManagePlan = true }) {
    const { sellerSubscription } = usePage().props;
    const [isVisible, setIsVisible] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [hoveredPlan, setHoveredPlan] = useState(null);
    const [pendingDowngrade, setPendingDowngrade] = useState(null);
    const [isDowngrading, setIsDowngrading] = useState(false);
    const overlayRef = useRef(null);

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
            className={`fixed inset-0 z-[9999] overflow-y-auto transition-all duration-300 ${
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
                    <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-orange-500 to-violet-500" />

                    <div className="relative border-b border-stone-100 px-5 pb-3.5 pt-4.5 sm:px-6">
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

                    <div className="bg-stone-50/30 p-4.5 sm:p-5">
                        <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-3">
                            {PLANS.map((plan, index) => {
                                const isCurrent = plan.id === currentTier;
                                const isUpgrade = index > currentIndex;
                                const isDowngrade = index < currentIndex;
                                const PlanIcon = plan.icon;

                                return (
                                    <div
                                        key={plan.id}
                                        className={`relative flex h-full flex-col rounded-[1.25rem] border-2 bg-white p-5 transition-all duration-300 ease-out group cursor-pointer lg:min-h-[29rem] ${
                                            isCurrent
                                                ? `${plan.lightBorder} ${plan.lightBg} ring-1 ring-offset-1 ring-offset-white ${plan.lightBorder} shadow-md`
                                                : hoveredPlan === plan.id
                                                    ? 'border-stone-300 shadow-xl -translate-y-1'
                                                    : 'border-stone-100 shadow-sm hover:border-stone-200'
                                        }`}
                                        onMouseEnter={() => setHoveredPlan(plan.id)}
                                        onMouseLeave={() => setHoveredPlan(null)}
                                        style={{
                                            transitionDelay: isAnimating ? `${index * 80}ms` : '0ms',
                                            opacity: isAnimating ? 1 : 0,
                                            transform: isAnimating && hoveredPlan !== plan.id
                                                ? 'translateY(0px)'
                                                : hoveredPlan === plan.id ? 'translateY(-4px)' : 'translateY(20px)',
                                            transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                                        }}
                                    >
                                        {isCurrent && (
                                            <div className={`absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r ${plan.gradient} px-2.5 py-1 text-[8px] font-extrabold uppercase tracking-[0.18em] text-white shadow-lg`}>
                                                Current Plan
                                            </div>
                                        )}

                                        {plan.recommended && !isCurrent && (
                                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex items-center gap-1 whitespace-nowrap rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2.5 py-1 text-[8px] font-extrabold uppercase tracking-[0.18em] text-white shadow-lg">
                                                <Star size={10} fill="currentColor" />
                                                Most Popular
                                            </div>
                                        )}

                                        <div className="mb-3.5 mt-1 flex items-start gap-2.5">
                                            <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${plan.gradient} shadow-sm transition-transform duration-300 ${hoveredPlan === plan.id ? 'scale-105 rotate-3' : ''}`}>
                                                <PlanIcon size={15} className="text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-[1.05rem] font-extrabold leading-none text-stone-900">{plan.name}</h3>
                                                <p className="mt-1 text-[10px] font-medium leading-4 text-stone-500">{plan.description}</p>
                                            </div>
                                        </div>

                                        <div className="mb-5">
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-[2rem] font-black tracking-tight text-stone-900">{plan.price}</span>
                                                {plan.period && (
                                                    <span className="text-xs font-semibold text-stone-400">{plan.period}</span>
                                                )}
                                            </div>
                                        </div>

                                        <ul className="mb-6 flex-1 space-y-3">
                                            {plan.features.map((feature, featureIndex) => (
                                                <li key={featureIndex} className="flex items-start gap-2 text-[10.5px] font-medium leading-4 text-stone-600">
                                                    <Check
                                                        size={12}
                                                        className={`mt-0.5 shrink-0 ${isCurrent ? plan.lightText : 'text-green-500'}`}
                                                        strokeWidth={3}
                                                    />
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>

                                        <div className="mt-auto">
                                            {isCurrent ? (
                                                <button
                                                    disabled
                                                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-stone-100 px-4 py-2 text-[11px] font-bold text-stone-400 cursor-not-allowed"
                                                >
                                                    <Shield size={14} />
                                                    Active Plan
                                                </button>
                                            ) : !canManagePlan ? (
                                                <button
                                                    disabled
                                                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-stone-100 px-4 py-2 text-[11px] font-bold text-stone-400 cursor-not-allowed"
                                                >
                                                    View Only
                                                </button>
                                            ) : isUpgrade ? (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleUpgrade(plan.id);
                                                    }}
                                                    className={`flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r ${plan.gradient} px-4 py-2 text-[11px] font-bold text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98]`}
                                                >
                                                    <Rocket size={14} />
                                                    Upgrade
                                                    <ArrowRight size={13} className="ml-0.5" />
                                                </button>
                                            ) : isDowngrade ? (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDowngrade(plan.id, plan.limit);
                                                    }}
                                                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-stone-200 bg-white px-4 py-2 text-[11px] font-bold text-stone-600 transition-all duration-200 hover:border-stone-300 hover:text-stone-900"
                                                >
                                                    Downgrade
                                                </button>
                                            ) : null}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex flex-col items-center justify-between gap-2.5 border-t border-stone-100 bg-white px-5 py-3 sm:flex-row sm:px-6">
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
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/65 p-4 backdrop-blur-[2px]">
                            <div className="w-full max-w-md rounded-[1.35rem] border border-stone-200 bg-white p-5 shadow-2xl">
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
                                                You are about to move from {PLANS.find((plan) => plan.id === currentTier)?.name ?? currentTier} to {pendingDowngrade.name}.
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

                                <div className="mt-5 flex justify-end gap-3">
                                    <button
                                        onClick={() => setPendingDowngrade(null)}
                                        className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-600 transition-colors hover:bg-stone-50"
                                    >
                                        Go back
                                    </button>
                                    <button
                                        onClick={confirmDowngrade}
                                        disabled={isDowngrading}
                                        className={`rounded-xl px-4 py-2 text-sm font-bold text-white transition-colors ${
                                            isDowngrading ? 'cursor-not-allowed bg-stone-300' : 'bg-orange-600 hover:bg-orange-700'
                                        }`}
                                    >
                                        {isDowngrading ? 'Processing...' : 'Yes, downgrade now'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}

// ─── Badge + Modal ───
export default function PlanBadge({ user }) {
    const { sellerSubscription } = usePage().props;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const tier = sellerSubscription?.tierKey
        || (user?.premium_tier === 'super_premium' || user?.subscription_plan === 'super_premium'
            ? 'super_premium'
            : user?.premium_tier === 'premium' || user?.subscription_plan === 'premium'
                ? 'premium'
                : 'free');
    
    const config = PLAN_CONFIG[tier] || PLAN_CONFIG.free;
    const Icon = config.icon;

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all duration-300 ease-out transform ${config.bg} ${config.border} ${config.text} ${config.hoverBg} shadow-sm hover:shadow-md hover:scale-105 hover:-translate-y-0.5 active:scale-95 active:translate-y-0 cursor-pointer`}
                title="View Subscription Plans"
            >
                <Icon size={13} className={config.iconColor} />
                <span className="tracking-wide">{config.label} Plan</span>
            </button>

            <PlanModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                currentTier={tier}
                canManagePlan={sellerSubscription?.canManageSubscription ?? true}
            />
        </>
    );
}


