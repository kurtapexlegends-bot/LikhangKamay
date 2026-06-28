import React from 'react';
import { Star, Check, Shield, Rocket, ArrowRight } from 'lucide-react';

export default function PlanPricingCard({
    plan,
    isCurrent,
    isUpgrade,
    isDowngrade,
    planLimit,
    planPrice,
    hoveredPlan,
    setHoveredPlan,
    isAnimating,
    index,
    canManagePlan,
    handleUpgrade,
    handleDowngrade,
}) {
    const PlanIcon = plan.icon;

    return (
        <div
            className={`relative flex h-full flex-col rounded-[1.25rem] border-2 bg-white p-4 transition-all duration-300 ease-out group cursor-pointer w-[85%] lg:w-full shrink-0 snap-center lg:min-h-[22.5rem] ${
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
                transitionProperty: 'all',
                transitionDuration: '0.5s',
                transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
            }}
        >
            <div className="mb-2.5 mt-0.5 flex items-start gap-2">
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${plan.gradient} shadow-sm transition-transform duration-300 ${hoveredPlan === plan.id ? 'scale-110' : ''}`}>
                    <PlanIcon size={15} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="text-[1.05rem] font-extrabold leading-none text-stone-900">{plan.name}</h3>
                        {isCurrent && (
                            <span className="rounded-full bg-stone-100 border border-stone-200 px-1.5 py-0.5 text-[7px] font-extrabold uppercase tracking-[0.1em] text-stone-600 whitespace-nowrap">
                                Current
                            </span>
                        )}
                        {plan.recommended && !isCurrent && (
                            <span className="flex items-center gap-0.5 rounded-full bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[7px] font-extrabold uppercase tracking-[0.1em] text-amber-700 whitespace-nowrap">
                                <Star size={7} fill="currentColor" />
                                Popular
                            </span>
                        )}
                    </div>
                    <p className="mt-1 text-[10px] font-medium leading-4 text-stone-500">{plan.description}</p>
                </div>
            </div>

            <div className="mb-3">
                <div className="flex items-baseline gap-1">
                    <span className="text-[2rem] font-black tracking-tight text-stone-900">{planPrice}</span>
                    {plan.period && (
                        <span className="text-xs font-semibold text-stone-400">{plan.period}</span>
                    )}
                </div>
            </div>

            <ul className="mb-4 flex-1 space-y-2">
                {plan.features.map((feature, featureIndex) => {
                    let renderedFeature = feature;
                    if (feature.startsWith('Up to ') && feature.includes('Active Product')) {
                        renderedFeature = `Up to ${planLimit} Active Products`;
                    }
                    return (
                        <li key={featureIndex} className="flex items-start gap-2 text-[10.5px] font-medium leading-4 text-stone-600">
                            <Check
                                size={12}
                                className={`mt-0.5 shrink-0 ${isCurrent ? plan.lightText : 'text-green-500'}`}
                                strokeWidth={3}
                            />
                            <span>{renderedFeature}</span>
                        </li>
                    );
                })}
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
                            handleDowngrade(plan.id, planLimit);
                        }}
                        className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-stone-200 bg-white px-4 py-2 text-[11px] font-bold text-stone-600 transition-all duration-200 hover:border-stone-300 hover:text-stone-900"
                    >
                        Downgrade
                    </button>
                ) : null}
            </div>
        </div>
    );
}
