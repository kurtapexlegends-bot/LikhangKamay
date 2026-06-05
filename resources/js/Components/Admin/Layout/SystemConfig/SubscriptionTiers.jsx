import React from 'react';
import { ShieldCheck, CheckCircle2, Zap, Crown, Sparkles } from 'lucide-react';

export default function SubscriptionTiers({ data, setData, errors }) {
    const plans = [
        {
            id: 'free',
            name: 'Standard',
            icon: Zap,
            color: 'stone',
            gradient: 'from-stone-500 to-stone-600',
            lightBg: 'bg-stone-50',
            lightBorder: 'border-stone-200',
            iconClass: 'bg-stone-100 text-stone-600',
            cardClass: 'border-stone-200 bg-white shadow-sm hover:border-stone-300',
            priceKey: null,
            limitKey: 'tier_free_limit',
            features: [
                'Core seller workspace',
                'Basic analytics dashboard',
            ]
        },
        {
            id: 'premium',
            name: 'Premium',
            icon: Crown,
            color: 'amber',
            gradient: 'from-amber-50 to-orange-50',
            lightBg: 'bg-amber-50',
            lightBorder: 'border-amber-200/60',
            iconClass: 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm',
            cardClass: 'border-amber-200 bg-white shadow-[0_28px_50px_-44px_rgba(255,138,28,0.35)]',
            priceKey: 'tier_premium_price',
            limitKey: 'tier_premium_limit',
            features: [
                'Premium badge visibility',
                'Analytics report export',
                'Module customization',
            ]
        },
        {
            id: 'super_premium',
            name: 'Elite',
            icon: Sparkles,
            color: 'violet',
            gradient: 'from-violet-50 to-indigo-50',
            lightBg: 'bg-violet-50',
            lightBorder: 'border-violet-200/60',
            iconClass: 'bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-sm',
            cardClass: 'border-stone-300 bg-gradient-to-b from-white to-stone-50 shadow-[0_24px_40px_-42px_rgba(15,23,42,0.35)]',
            priceKey: 'tier_super_premium_price',
            limitKey: 'tier_super_premium_limit',
            features: [
                'Elite badge',
                '5 sponsorship credits every 30 days',
                'All seller modules unlocked',
                'Sponsored homepage and catalog placement',
            ]
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                <ShieldCheck className="text-clay-600" size={16} />
                <div>
                    <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">Subscription Tiers Configuration</h3>
                    <p className="text-[9px] text-stone-400 font-medium">Customize active limits and pricing parameters for live plans.</p>
                </div>
            </div>

            <div className="flex overflow-x-auto snap-x snap-mandatory pb-4 gap-4 md:grid md:grid-cols-3 md:gap-6 no-scrollbar">
                {plans.map((plan) => {
                    const PlanIcon = plan.icon;
                    
                    return (
                        <div
                            key={plan.id}
                            className={`relative flex flex-col rounded-[1.7rem] border bg-white p-5 w-[85%] md:w-full shrink-0 snap-center transition-all duration-300 ${plan.cardClass}`}
                        >
                            <div className="flex items-start gap-3 mb-4">
                                <div className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.95rem] ${plan.iconClass}`}>
                                    <PlanIcon className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-[1.55rem] font-black leading-none tracking-tight text-stone-900">{plan.name}</h3>
                                    <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">
                                        {plan.id === 'free' ? 'Foundational' : plan.id === 'premium' ? 'Most Popular' : 'Full Access'}
                                    </span>
                                </div>
                            </div>

                            {/* Plan Parameters Form Block */}
                            <div className="space-y-3.5 mt-1 p-4 bg-stone-50/70 rounded-2xl border border-stone-100">
                                <div className="text-[9px] font-black text-stone-400 uppercase tracking-wider mb-1">
                                    Adjust Plan Parameters
                                </div>

                                {/* Monthly Price */}
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-bold text-stone-700">Monthly Price (PHP)</label>
                                    {plan.priceKey ? (
                                        <div className="relative rounded-lg shadow-sm">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5">
                                                <span className="text-[10px] font-medium text-stone-400">₱</span>
                                            </div>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={data[plan.priceKey] ?? ''}
                                                onChange={(e) => setData(plan.priceKey, e.target.value)}
                                                className="block w-full rounded-lg border-stone-200 pl-6 pr-3 py-1.5 text-xs text-stone-900 focus:border-clay-500 focus:ring-clay-500"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    ) : (
                                        <input
                                            type="text"
                                            disabled
                                            value="Free"
                                            className="block w-full rounded-lg border-stone-200 bg-stone-100/50 py-1.5 px-3 text-xs text-stone-500 cursor-not-allowed font-semibold"
                                        />
                                    )}
                                    {plan.priceKey && errors[plan.priceKey] && (
                                        <p className="text-[9px] text-red-600 font-bold">{errors[plan.priceKey]}</p>
                                    )}
                                </div>

                                {/* Product Limit */}
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-bold text-stone-700">Active Product Limit</label>
                                    <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={data[plan.limitKey] ?? ''}
                                        onChange={(e) => setData(plan.limitKey, e.target.value)}
                                        className="block w-full rounded-lg border-stone-200 py-1.5 px-3 text-xs text-stone-900 focus:border-clay-500 focus:ring-clay-500 font-medium"
                                        placeholder="3"
                                    />
                                    {errors[plan.limitKey] && (
                                        <p className="text-[9px] text-red-600 font-bold">{errors[plan.limitKey]}</p>
                                    )}
                                </div>
                            </div>

                            {/* Feature Bullets */}
                            <ul className="mt-5 space-y-2.5 flex-1">
                                <li className="flex items-start gap-2.5">
                                    <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${plan.id === 'super_premium' ? 'text-[#6D5EF6]' : 'text-green-500'}`} />
                                    <span className="text-[12px] leading-5 text-stone-700 font-semibold">
                                        Up to {data[plan.limitKey] ?? '...'} active products
                                    </span>
                                </li>
                                {plan.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-start gap-2.5">
                                        <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${plan.id === 'super_premium' ? 'text-[#6D5EF6]' : 'text-green-500'}`} />
                                        <span className="text-[12px] leading-5 text-stone-700">{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
