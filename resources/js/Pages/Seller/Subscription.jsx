import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import SellerSidebar from '@/Components/SellerSidebar';
import Modal from '@/Components/Modal';
import { Check, Star, Crown, Zap, AlertCircle } from 'lucide-react';

export default function Subscription({ auth, subscription_tier, sponsorship_credits, active_products_count, product_limit, active_products = [] }) {
    const plans = [
        {
            id: 'standard',
            name: 'Standard',
            price: 'Free',
            description: 'Perfect for new artisans just getting started.',
            limit: 3,
            features: [
                'List up to 3 active products',
                'Basic shop analytics',
                'Standard support',
            ],
            icon: Star,
            color: 'text-gray-600',
            bg: 'bg-gray-50',
            border: 'border-gray-200'
        },
        {
            id: 'premium',
            name: 'Premium',
            price: '₱499',
            period: '/month',
            description: 'For growing sellers who need more catalog space.',
            limit: 10,
            features: [
                'List up to 10 active products',
                'Advanced sales analytics',
                'Priority support',
                'Premium seller badge'
            ],
            icon: Zap,
            color: 'text-clay-600',
            bg: 'bg-clay-50',
            border: 'border-clay-300',
            popular: true
        },
        {
            id: 'super_premium',
            name: 'Super Premium',
            price: '₱999',
            period: '/month',
            description: 'For established brands requiring maximum visibility.',
            limit: 50,
            features: [
                'List up to 50 active products',
                'All Premium features',
                '5 Sponsorship Credits monthly',
                'Featured shop placement'
            ],
            icon: Crown,
            color: 'text-amber-500',
            bg: 'bg-amber-50',
            border: 'border-amber-300'
        }
    ];

    const currentLimitReached = active_products_count >= product_limit;

    // Downgrade / Upgrade Modal State
    const [actionModal, setActionModal] = useState({ open: false, targetPlan: null, type: 'upgrade' });
    const { data, setData, post, processing, errors, reset } = useForm({
        new_tier: '',
        keep_product_ids: []
    });

    const handleSelectPlan = (plan) => {
        if (plan.id === subscription_tier) return;
        
        const isDowngrade = plan.limit < product_limit;
        
        setActionModal({ open: true, targetPlan: plan, type: isDowngrade ? 'downgrade' : 'upgrade' });
        
        // If downgrading and active items are more than the new limit, they have to select which to keep
        let initialKeepIds = [];
        if (isDowngrade && active_products_count > plan.limit) {
            initialKeepIds = active_products.slice(0, plan.limit).map(p => p.id);
        } else {
            initialKeepIds = active_products.map(p => p.id); // implicitly keep all if within limit
        }

        setData({
            new_tier: plan.id,
            keep_product_ids: initialKeepIds
        });
    };

    const toggleProductSelection = (id) => {
        const keeps = [...data.keep_product_ids];
        if (keeps.includes(id)) {
            setData('keep_product_ids', keeps.filter(pid => pid !== id));
        } else {
            // Cannot select more than the target plan limit
            if (keeps.length >= actionModal.targetPlan.limit) {
                return;
            }
            setData('keep_product_ids', [...keeps, id]);
        }
    };

    const handleActionSubmit = (e) => {
        e.preventDefault();
        
        // Validation check
        if (actionModal.type === 'downgrade' && active_products_count > actionModal.targetPlan.limit) {
            if (data.keep_product_ids.length > actionModal.targetPlan.limit) {
                alert(`You can only keep up to ${actionModal.targetPlan.limit} products.`);
                return;
            }
        }

        post(route('seller.subscription.update-tier'), {
            onSuccess: () => {
                setActionModal({ open: false, targetPlan: null, type: 'upgrade' });
                reset();
            }
        });
    };

    return (
        <div className="min-h-screen bg-[#FDFBF9] flex font-sans text-gray-800">
            <Head title="Subscription Plans" />
            
            <SellerSidebar active="subscription" user={auth.user} />

            <div className="flex-1 flex flex-col min-w-0 lg:ml-56 transition-all duration-300">
                <header className="h-20 bg-white/80 backdrop-blur-xl border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-40">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Subscription Plans</h1>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">Manage your seller tier and limits</p>
                    </div>
                </header>

                <main className="flex-1 p-8 overflow-y-auto">
                    <div className="max-w-6xl mx-auto space-y-12">
                        
                        {/* Current Usage Banner */}
                        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-clay-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-50 pointer-events-none"></div>
                            
                            <div className="relative z-10">
                                <h2 className="text-lg font-bold text-gray-900 mb-2">Current Plan Usage</h2>
                                <div className="flex items-center gap-6 mt-4">
                                    <div>
                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-1">Your Plan</p>
                                        <p className="text-xl font-bold text-clay-700 capitalize">{subscription_tier.replace('_', ' ')}</p>
                                    </div>
                                    <div className="w-px h-10 bg-gray-200"></div>
                                    <div>
                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-1">Active Products</p>
                                        <div className="flex items-center gap-2">
                                            <p className={`text-xl font-bold ${currentLimitReached ? 'text-red-600' : 'text-gray-900'}`}>
                                                {active_products_count} <span className="text-gray-400 text-sm">/ {product_limit}</span>
                                            </p>
                                            {currentLimitReached && (
                                                <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                                                    <AlertCircle size={10} /> Limit Reached
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {subscription_tier === 'super_premium' && (
                                        <>
                                            <div className="w-px h-10 bg-gray-200"></div>
                                            <div>
                                                <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-1">Sponsorship Credits</p>
                                                <p className="text-xl font-bold text-amber-500 flex items-center gap-2">
                                                    {sponsorship_credits} <Crown size={16} />
                                                </p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Pricing Cards */}
                        <div>
                            <div className="text-center mb-10">
                                <h2 className="text-3xl font-serif font-bold text-gray-900 mb-3">Choose the right plan for your craft</h2>
                                <p className="text-gray-500 max-w-xl mx-auto">Scale your artisan business with our flexible subscription tiers. Unlock more product listings and premium features to reach more buyers.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {plans.map((plan) => (
                                    <div key={plan.id} className={`relative bg-white rounded-3xl p-8 border-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${plan.id === subscription_tier ? plan.border + ' shadow-md ring-4 ring-opacity-20 ' + plan.border.replace('border-', 'ring-') : 'border-gray-100'}`}>
                                        
                                        {plan.popular && (
                                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-clay-600 text-white text-[10px] font-bold uppercase tracking-wider py-1 px-3 rounded-full shadow-md">
                                                Most Popular
                                            </div>
                                        )}
                                        
                                        {plan.id === subscription_tier && (
                                            <div className="absolute top-4 right-4 bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wider py-1 px-2 rounded flex items-center gap-1">
                                                <Check size={12} /> Current
                                            </div>
                                        )}

                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${plan.bg} ${plan.color}`}>
                                            <plan.icon size={24} />
                                        </div>

                                        <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                                        <p className="text-sm text-gray-500 mb-6 h-10">{plan.description}</p>
                                        
                                        <div className="flex items-baseline gap-1 mb-8">
                                            <span className="text-4xl font-black text-gray-900">{plan.price}</span>
                                            {plan.period && <span className="text-sm font-medium text-gray-500">{plan.period}</span>}
                                        </div>

                                        <div className="space-y-4 mb-8 flex-1">
                                            {plan.features.map((feature, idx) => (
                                                <div key={idx} className="flex items-start gap-3">
                                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center mt-0.5 shrink-0 ${plan.id === 'super_premium' ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-600'}`}>
                                                        <Check size={12} strokeWidth={3} />
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-700">{feature}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Action Button */}
                                        {plan.id === subscription_tier ? (
                                            <button disabled className="w-full py-3 px-4 rounded-xl font-bold text-gray-500 bg-gray-100 cursor-not-allowed">
                                                Current Plan
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={() => handleSelectPlan(plan)}
                                                className={`w-full py-3 px-4 rounded-xl font-bold transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98] ${
                                                    plan.id === 'premium' ? 'bg-clay-600 hover:bg-clay-700 text-white shadow-clay-500/25' : 
                                                    plan.id === 'super_premium' ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/25' : 
                                                    'bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-700 shadow-none hover:bg-gray-50'
                                                }`}
                                            >
                                                Select {plan.name}
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </main>
            </div>
            
            {/* ACTION MODAL */}
            <Modal show={actionModal.open} onClose={() => setActionModal({ open: false, targetPlan: null, type: 'upgrade' })} maxWidth="md">
                <form onSubmit={handleActionSubmit} className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {actionModal.type === 'upgrade' ? 'Upgrade' : 'Downgrade'} to {actionModal.targetPlan?.name}
                    </h3>
                    
                    {actionModal.type === 'downgrade' && active_products_count > actionModal.targetPlan?.limit ? (
                        <div className="mt-4">
                            <p className="text-sm text-red-600 font-medium mb-4 bg-red-50 p-3 rounded-xl border border-red-100">
                                This plan allows {actionModal.targetPlan.limit} products. You have {active_products_count} active. 
                                Please select which products to keep <span className="font-bold">Active</span>. The rest will be archived.
                            </p>
                            
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                {active_products.map(product => {
                                    const isSelected = data.keep_product_ids.includes(product.id);
                                    const isDisabled = !isSelected && data.keep_product_ids.length >= actionModal.targetPlan.limit;
                                    
                                    return (
                                        <div 
                                            key={product.id} 
                                            onClick={() => !isDisabled && toggleProductSelection(product.id)}
                                            className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${isSelected ? 'border-clay-500 bg-clay-50' : isDisabled ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed' : 'border-gray-200 hover:border-gray-300'}`}
                                        >
                                            <div className={`w-5 h-5 flex items-center justify-center rounded border ${isSelected ? 'bg-clay-600 border-clay-600 text-white' : 'border-gray-300'}`}>
                                                {isSelected && <Check size={14} strokeWidth={3} />}
                                            </div>
                                            <span className="font-medium text-sm text-gray-700">{product.name}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            <p className="text-xs text-gray-500 mt-3 text-right">
                                Selected: <span className="font-bold text-gray-900">{data.keep_product_ids.length}</span> / {actionModal.targetPlan.limit}
                            </p>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 my-4">
                            You are about to switch to the <span className="font-bold text-gray-900">{actionModal.targetPlan?.name}</span> plan. 
                            {actionModal.type === 'upgrade' && " You will immediately get access to higher product limits and new features!"}
                        </p>
                    )}

                    <div className="flex gap-3 justify-end mt-6">
                        <button type="button" onClick={() => setActionModal({ open: false, targetPlan: null, type: 'upgrade' })} className="px-4 py-2 font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition">
                            Cancel
                        </button>
                        <button type="submit" disabled={processing} className="px-5 py-2 font-bold text-white bg-clay-600 hover:bg-clay-700 rounded-xl transition shadow-lg shadow-clay-500/20 disabled:opacity-50">
                            Confirm {actionModal.type === 'upgrade' ? 'Upgrade' : 'Downgrade'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
