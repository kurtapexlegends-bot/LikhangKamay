import React, { useState } from 'react';
import { usePage } from '@inertiajs/react';
import { PLAN_CONFIG, PlanModal } from './PlanModal';

export { PlanModal };

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
