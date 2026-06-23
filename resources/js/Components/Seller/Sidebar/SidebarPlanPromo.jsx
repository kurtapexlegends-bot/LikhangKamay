import React, { useState, memo } from 'react';
import { Sparkles, Crown, Zap } from 'lucide-react';
import { PlanModal } from '@/Components/PlanBadge';

function SidebarPlanPromo({
    showPlanPanel,
    isCollapsed,
    isElite,
    isPremium,
    entitlement,
    sellerSubscription,
    canManagePlan,
    currentTierKey,
    handleTooltipShow,
    handleTooltipLeave
}) {
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);

    if (!showPlanPanel) return null;

    return (
        <>
            <div className={`border-b border-clay-100/30 bg-stone-50/10 flex-shrink-0 transition-[padding] duration-300 ${
                isCollapsed ? 'px-2 py-3 flex justify-center' : 'px-5 py-3'
            }`}>
                <button
                    type="button"
                    onClick={() => setIsPlanModalOpen(true)}
                    onMouseEnter={(e) => isCollapsed && handleTooltipShow(e, `${entitlement.tierLabel} Plan`, sellerSubscription ? `Products: ${sellerSubscription.activeCount} / ${sellerSubscription.limit}` : null)}
                    onMouseLeave={isCollapsed ? handleTooltipLeave : undefined}
                    className="group relative flex flex-col items-center w-full focus-visible:outline-none"
                >
                    {/* Badge Container */}
                    <div className={`flex items-center justify-center rounded-xl text-[11px] font-bold border transition-[height,width,border-color,background-color,box-shadow,gap,padding] duration-300 ${
                        isCollapsed 
                            ? 'h-9 w-9 border-stone-200' 
                            : 'w-full gap-1.5 px-3 py-1.5'
                    } ${
                        isElite 
                            ? 'bg-violet-50 border-violet-200 text-violet-800 hover:bg-violet-100 shadow-[0_2px_8px_rgba(109,40,217,0.08)]' 
                            : isPremium 
                                ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100 shadow-[0_2px_8px_rgba(217,119,6,0.08)]' 
                                : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                    >
                        {isElite ? (
                            <Sparkles size={isCollapsed ? 16 : 13} className="text-violet-500 fill-violet-200 transition-[width,height] duration-300 shrink-0" />
                        ) : isPremium ? (
                            <Crown size={isCollapsed ? 16 : 13} className="text-amber-500 fill-amber-200 transition-[width,height] duration-300 shrink-0" />
                        ) : (
                            <Zap size={isCollapsed ? 16 : 13} className="text-stone-400 fill-stone-200 transition-[width,height] duration-300 shrink-0" />
                        )}
                        <span className={`tracking-wide overflow-hidden transition-[max-width,opacity,margin-left] duration-300 whitespace-nowrap ${
                            isCollapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-[150px] opacity-100 ml-1.5'
                        }`}>
                            {entitlement.tierLabel} Plan
                        </span>
                    </div>
                    
                    {/* Expanded progress panel */}
                    <div className={`w-full overflow-hidden transition-[max-height,opacity,margin-top] duration-300 ${
                        isCollapsed ? 'max-h-0 opacity-0 mt-0 pointer-events-none' : 'max-h-24 opacity-100 mt-2.5'
                    }`}>
                        {sellerSubscription && (
                            <div className="flex flex-col gap-1.5 w-full text-left">
                                <div className="flex items-center justify-between text-[10px] text-stone-500 font-medium group-hover:text-stone-700 transition-colors">
                                    <span>Active Products</span>
                                    <span>
                                        <strong className="text-stone-900">{sellerSubscription.activeCount}</strong> / {sellerSubscription.limit}
                                    </span>
                                </div>
                                <div className="w-full h-1.5 bg-stone-200/80 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full transition-[width] duration-500 ${
                                            sellerSubscription.activeCount >= sellerSubscription.limit 
                                                ? 'bg-red-500' 
                                                : isElite 
                                                    ? 'bg-violet-500' 
                                                    : isPremium 
                                                        ? 'bg-amber-500' 
                                                        : 'bg-stone-500'
                                        }`}
                                        style={{ width: `${Math.min(100, (sellerSubscription.activeCount / sellerSubscription.limit) * 100)}%` }}
                                    />
                                </div>
                                {sellerSubscription.activeCount >= sellerSubscription.limit && !isElite && (
                                    <span className="text-[9px] text-red-500 font-medium leading-tight mt-0.5">
                                        {canManagePlan
                                            ? 'Product limit reached. Upgrade to add more.'
                                            : 'Product limit reached. Only the shop owner can upgrade.'}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </button>
            </div>

            <PlanModal 
                isOpen={isPlanModalOpen} 
                onClose={() => setIsPlanModalOpen(false)} 
                currentTier={sellerSubscription?.tierKey || entitlement.tierKey || currentTierKey}
                canManagePlan={canManagePlan}
            />
        </>
    );
}

export default memo(SidebarPlanPromo);
