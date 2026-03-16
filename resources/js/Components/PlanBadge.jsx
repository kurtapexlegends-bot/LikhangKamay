import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { router, usePage } from '@inertiajs/react';
import { Crown, Sparkles, Zap, Check, X, ArrowRight, Star, Shield, Rocket, ChevronRight } from 'lucide-react';

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
            'Basic Analytics',
            'Standard Support',
        ],
    },
    {
        id: 'premium',
        name: 'Premium',
        price: '₱199',
        period: '/ mo',
        description: 'Grow your artisan business with more visibility.',
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
            'Priority Support',
            'Advanced Analytics',
        ],
    },
    {
        id: 'super_premium',
        name: 'Elite',
        price: '₱399',
        period: '/ mo',
        description: 'Maximized reach and enterprise features.',
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
            '5 Monthly Sponsorship Credits',
            'Dedicated Account Manager',
            'Featured Placement in Search',
        ],
    },
];

// ─── Animated Modal ───
export function PlanModal({ isOpen, onClose, currentTier }) {
    const { sellerSubscription } = usePage().props;
    const [isVisible, setIsVisible] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [hoveredPlan, setHoveredPlan] = useState(null);
    const overlayRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            // Prevent body scroll
            document.body.style.overflow = 'hidden';
            // Trigger entrance animation
            requestAnimationFrame(() => {
                setIsVisible(true);
                setIsAnimating(true);
            });
        } else {
            document.body.style.overflow = '';
            setIsVisible(false);
            setIsAnimating(false);
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    const handleClose = () => {
        setIsAnimating(false);
        setIsVisible(false);
        setTimeout(() => onClose(), 280);
    };

    const handleOverlayClick = (e) => {
        if (e.target === overlayRef.current) handleClose();
    };

    const handleUpgrade = (planId) => {
        router.post(route('seller.subscription.upgrade'), { plan: planId }, { preserveScroll: true });
        handleClose();
    };

    const handleDowngrade = (planId, targetLimit) => {
        const activeCount = sellerSubscription?.activeCount ?? 0;

        // If they exceed the target limit, send them to subscription page to choose kept products.
        if (activeCount > targetLimit) {
            router.visit(route('seller.subscription'));
            handleClose();
            return;
        }

        router.post(
            route('seller.subscription.downgrade'),
            { plan: planId },
            {
                preserveScroll: true,
                onSuccess: () => handleClose(),
            }
        );
    };

    const handleManage = () => {
        router.visit(route('seller.subscription'));
        handleClose();
    };

    if (!isOpen && !isVisible) return null;

    const currentIndex = PLANS.findIndex(p => p.id === currentTier);

    const modalContent = (
        <div
            className={`fixed inset-0 z-[9999] overflow-y-auto transition-all duration-300 ${
                isAnimating ? 'bg-black/40 backdrop-blur-sm' : 'bg-black/0 backdrop-blur-0'
            }`}
        >
            <div 
                ref={overlayRef}
                onClick={handleOverlayClick}
                className="flex min-h-full items-center justify-center p-4 sm:p-6"
                style={{ perspective: '1200px' }}
            >
                <div
                    className={`relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden transition-all duration-500 ease-out my-4 ${
                        isAnimating
                            ? 'opacity-100 translate-y-0 scale-100'
                            : 'opacity-0 translate-y-8 scale-95'
                    }`}
                    style={{
                        transformStyle: 'preserve-3d',
                        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                >
                    {/* ── Decorative top gradient line ── */}
                    <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-orange-500 to-violet-500" />

                    {/* ── Header ── */}
                    <div className="relative px-5 sm:px-8 pt-6 pb-5 border-b border-stone-100">
                        {/* Decorative blobs */}
                        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-amber-100/40 to-orange-100/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
                        <div className="absolute top-4 left-4 w-24 h-24 bg-gradient-to-br from-violet-100/30 to-indigo-100/20 rounded-full blur-2xl pointer-events-none" />

                        <div className="relative flex items-start justify-between">
                            <div>
                                <div className="flex items-center gap-3 mb-1.5">
                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-200/50">
                                        <Crown size={18} className="text-white" />
                                    </div>
                                    <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">
                                        Choose Your Plan
                                    </h2>
                                </div>
                                <p className="text-xs sm:text-sm text-stone-500 font-medium ml-[48px]">
                                    Unlock more features and grow your artisanal business
                                </p>
                            </div>
                            <button
                                onClick={handleClose}
                                className="w-8 h-8 rounded-xl bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-400 hover:text-stone-600 transition-all duration-200 hover:rotate-90"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    {/* ── Plan Cards ── */}
                    <div className="p-5 sm:p-7 bg-stone-50/30">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {PLANS.map((plan, index) => {
                                const isCurrent = plan.id === currentTier;
                                const isUpgrade = index > currentIndex;
                                const isDowngrade = index < currentIndex;
                                const PlanIcon = plan.icon;

                                return (
                                    <div
                                        key={plan.id}
                                        className={`relative rounded-2xl border-2 p-5 transition-all duration-300 ease-out group cursor-pointer flex flex-col h-full bg-white ${
                                            isCurrent
                                                ? `${plan.lightBorder} ${plan.lightBg} ring-1 ring-offset-1 ring-offset-white ${plan.lightBorder} shadow-md`
                                                : hoveredPlan === plan.id
                                                    ? 'border-stone-300 shadow-xl -translate-y-1'
                                                    : 'border-stone-100 hover:border-stone-200 shadow-sm'
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
                                        {/* Current/Recommended badge */}
                                        {isCurrent && (
                                            <div className={`absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r ${plan.gradient} text-white text-[9px] font-extrabold px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg whitespace-nowrap`}>
                                                Current Plan
                                            </div>
                                        )}
                                        {plan.recommended && !isCurrent && (
                                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[9px] font-extrabold px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg flex items-center gap-1 whitespace-nowrap">
                                                <Star size={10} fill="currentColor" /> Most Popular
                                            </div>
                                        )}

                                        {/* Icon & Plan Name */}
                                        <div className="flex items-center gap-3 mb-3 mt-1">
                                            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center shadow-sm transition-transform duration-300 ${hoveredPlan === plan.id ? 'scale-110 rotate-3' : ''}`}>
                                                <PlanIcon size={16} className="text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-[15px] font-extrabold text-stone-900">{plan.name}</h3>
                                                <p className="text-[11px] text-stone-500 font-medium leading-tight">{plan.description}</p>
                                            </div>
                                        </div>

                                        {/* Price */}
                                        <div className="mb-5">
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">{plan.price}</span>
                                                {plan.period && (
                                                    <span className="text-xs sm:text-sm text-stone-400 font-semibold">{plan.period}</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Features */}
                                        <ul className="space-y-2.5 mb-6 flex-1">
                                            {plan.features.map((feature, i) => (
                                                <li key={i} className="flex items-start gap-2.5 text-xs text-stone-600 font-medium">
                                                    <Check size={14} className={`mt-0.5 shrink-0 ${isCurrent ? plan.lightText : 'text-green-500'}`} strokeWidth={3} />
                                                    <span className="leading-relaxed">{feature}</span>
                                                </li>
                                            ))}
                                        </ul>

                                        {/* Action Button */}
                                        <div className="mt-auto">
                                            {isCurrent ? (
                                                <button
                                                    disabled
                                                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-stone-100 text-stone-400 cursor-not-allowed flex items-center justify-center gap-1.5"
                                                >
                                                    <Shield size={14} /> Active Plan
                                                </button>
                                            ) : isUpgrade ? (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleUpgrade(plan.id); }}
                                                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r ${plan.gradient} hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-1.5 hover:-translate-y-0.5 active:scale-[0.98]`}
                                                >
                                                    <Rocket size={14} /> Upgrade
                                                    <ArrowRight size={13} className="ml-0.5" />
                                                </button>
                                            ) : isDowngrade ? (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDowngrade(plan.id, plan.limit); }}
                                                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-stone-600 bg-white border-2 border-stone-200 hover:border-stone-300 hover:text-stone-900 transition-all duration-200 flex items-center justify-center gap-1.5"
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

                    {/* ── Footer ── */}
                    <div className="px-5 sm:px-8 py-3.5 border-t border-stone-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
                        <p className="text-[11px] text-stone-500 font-medium text-center sm:text-left">
                            Plans can be changed anytime. Downgrades may deactivate some products.
                        </p>
                        <button
                            onClick={handleManage}
                            className="text-[12px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 transition-colors group whitespace-nowrap"
                        >
                            Manage Subscription
                            <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}

// ─── Badge + Modal ───
export default function PlanBadge({ user }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Check both fields to ensure backward compatibility and catch Elite clearly
    const isElite = user?.premium_tier === 'super_premium' || user?.subscription_plan === 'super_premium';
    const isPremium = user?.premium_tier === 'premium' || user?.subscription_plan === 'premium';
    const tier = isElite ? 'super_premium' : isPremium ? 'premium' : 'free';
    
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
            />
        </>
    );
}
