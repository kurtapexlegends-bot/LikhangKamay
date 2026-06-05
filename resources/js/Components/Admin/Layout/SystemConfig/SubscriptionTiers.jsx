import React from 'react';
import { ShieldCheck, CheckCircle, XCircle } from 'lucide-react';

export default function SubscriptionTiers() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                <ShieldCheck className="text-clay-600" size={16} />
                <div>
                    <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">Subscription Tiers Overview</h3>
                    <p className="text-[9px] text-stone-400 font-medium">System configuration limits and features configured for active marketplace plans.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Free Tier Card */}
                <div className="bg-white rounded-2xl border border-stone-200 p-6 flex flex-col justify-between transition hover:border-stone-300 relative">
                    <div className="space-y-4">
                        <div>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400">Basic</span>
                            <h4 className="text-lg font-black text-stone-950">Free Plan</h4>
                            <p className="text-[10px] text-stone-500 mt-0.5">Starter capabilities for hobbyist sellers.</p>
                        </div>
                        
                        <div className="text-2xl font-black text-stone-900 tracking-tight">
                            ₱0 <span className="text-xs font-medium text-stone-400">/ month</span>
                        </div>

                        <div className="w-full h-px bg-stone-100" />

                        <ul className="space-y-2 text-[10px] font-medium text-stone-600">
                            <li className="flex items-center gap-1.5">
                                <CheckCircle className="text-clay-600" size={12} />
                                <span>Active products limit: 15 items</span>
                            </li>
                            <li className="flex items-center gap-1.5">
                                <CheckCircle className="text-clay-600" size={12} />
                                <span>Platform commission: 5.0% rate</span>
                            </li>
                            <li className="flex items-center gap-1.5">
                                <CheckCircle className="text-clay-600" size={12} />
                                <span>Staff accounts limit: 1 seat</span>
                            </li>
                            <li className="flex items-center gap-1.5 text-stone-400">
                                <XCircle className="text-stone-300" size={12} />
                                <span>Lalamove integrations access</span>
                            </li>
                            <li className="flex items-center gap-1.5 text-stone-400">
                                <XCircle className="text-stone-300" size={12} />
                                <span>Verified artisan badge</span>
                            </li>
                        </ul>
                    </div>
                    
                    <div className="mt-8 text-center text-[9px] font-bold text-stone-400 uppercase tracking-widest bg-stone-50 py-2 rounded-lg border">
                        Default Onboarding
                    </div>
                </div>

                {/* Premium Tier Card */}
                <div className="bg-white rounded-2xl border-2 border-clay-500 p-6 flex flex-col justify-between transition hover:shadow-sm relative">
                    <div className="absolute top-3 right-3 bg-clay-500 text-white text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm">
                        Most Popular
                    </div>
                    <div className="space-y-4">
                        <div>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-clay-600">Growth</span>
                            <h4 className="text-lg font-black text-stone-950">Premium Plan</h4>
                            <p className="text-[10px] text-stone-500 mt-0.5">Advanced integrations for full-time creators.</p>
                        </div>
                        
                        <div className="text-2xl font-black text-stone-900 tracking-tight">
                            ₱199 <span className="text-xs font-medium text-stone-400">/ month</span>
                        </div>

                        <div className="w-full h-px bg-stone-100" />

                        <ul className="space-y-2 text-[10px] font-medium text-stone-600">
                            <li className="flex items-center gap-1.5">
                                <CheckCircle className="text-clay-600" size={12} />
                                <span>Active products limit: 100 items</span>
                            </li>
                            <li className="flex items-center gap-1.5">
                                <CheckCircle className="text-clay-600" size={12} />
                                <span>Platform commission: 2.5% rate</span>
                            </li>
                            <li className="flex items-center gap-1.5">
                                <CheckCircle className="text-clay-600" size={12} />
                                <span>Staff accounts limit: 5 seats</span>
                            </li>
                            <li className="flex items-center gap-1.5">
                                <CheckCircle className="text-clay-600" size={12} />
                                <span>Lalamove delivery integrations</span>
                            </li>
                            <li className="flex items-center gap-1.5">
                                <CheckCircle className="text-clay-600" size={12} />
                                <span>Premium Verified Badge</span>
                            </li>
                        </ul>
                    </div>
                    
                    <div className="mt-8 text-center text-[9px] font-bold text-clay-700 uppercase tracking-widest bg-clay-50 py-2 rounded-lg border border-clay-200">
                        Artisan Growth Tier
                    </div>
                </div>

                {/* Elite Tier Card */}
                <div className="bg-white rounded-2xl border border-stone-200 p-6 flex flex-col justify-between transition hover:border-stone-300 relative">
                    <div className="space-y-4">
                        <div>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-violet-600">Enterprise</span>
                            <h4 className="text-lg font-black text-stone-950">Elite Plan</h4>
                            <p className="text-[10px] text-stone-500 mt-0.5">Zero platform commission for pro scale.</p>
                        </div>
                        
                        <div className="text-2xl font-black text-stone-900 tracking-tight">
                            ₱399 <span className="text-xs font-medium text-stone-400">/ month</span>
                        </div>

                        <div className="w-full h-px bg-stone-100" />

                        <ul className="space-y-2 text-[10px] font-medium text-stone-600">
                            <li className="flex items-center gap-1.5">
                                <CheckCircle className="text-clay-600" size={12} />
                                <span className="font-bold text-stone-900">Unlimited Active Products</span>
                            </li>
                            <li className="flex items-center gap-1.5">
                                <CheckCircle className="text-clay-600" size={12} />
                                <span className="font-bold text-stone-900">0.0% Commission (direct payouts)</span>
                            </li>
                            <li className="flex items-center gap-1.5">
                                <CheckCircle className="text-clay-600" size={12} />
                                <span>Unlimited Staff Seats</span>
                            </li>
                            <li className="flex items-center gap-1.5">
                                <CheckCircle className="text-clay-600" size={12} />
                                <span>Lalamove priority auto-booking</span>
                            </li>
                            <li className="flex items-center gap-1.5">
                                <CheckCircle className="text-clay-600" size={12} />
                                <span>Elite Badge & Featured Status</span>
                            </li>
                        </ul>
                    </div>
                    
                    <div className="mt-8 text-center text-[9px] font-bold text-violet-700 uppercase tracking-widest bg-violet-50 py-2 rounded-lg border border-violet-200">
                        Pro Scale Tier
                    </div>
                </div>

            </div>
        </div>
    );
}
