import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { CheckCircle2, ChevronRight, AlertCircle, Crown, Search, X } from 'lucide-react';
import Modal from '@/Components/Modal';

export default function Subscription({ auth, currentPlan, activeProductsCount, limit, activeProducts }) {
    const [downgradeModalOpen, setDowngradeModalOpen] = useState(false);
    const [targetPlan, setTargetPlan] = useState(null);
    const [selectedProductsToKeep, setSelectedProductsToKeep] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    const { post, processing, errors, reset } = useForm({
        plan: '',
        keep_active_ids: []
    });

    const isCurrentPlan = (plan) => currentPlan === plan;

    const submitSubscriptionChange = (url, payload, options = {}) => {
        post(url, {
            data: payload,
            preserveScroll: true,
            preserveState: 'errors',
            replace: true,
            ...options,
        });
    };

    const handleUpgrade = (planValue) => {
        submitSubscriptionChange(route('seller.subscription.upgrade'), { plan: planValue });
    };

    const initiateDowngrade = (planValue, newLimit) => {
        if (activeProductsCount > newLimit) {
            setTargetPlan({ value: planValue, limit: newLimit });
            setDowngradeModalOpen(true);
            setSelectedProductsToKeep([]);
            reset();
        } else {
            // Direct downgrade since they are under the limit
            submitSubscriptionChange(route('seller.subscription.downgrade'), {
                plan: planValue,
                keep_active_ids: activeProducts.map(p => p.id),
            });
        }
    };

    const toggleProductSelection = (id) => {
        if (selectedProductsToKeep.includes(id)) {
            setSelectedProductsToKeep(prev => prev.filter(pid => pid !== id));
        } else {
            if (targetPlan && selectedProductsToKeep.length >= targetPlan.limit) {
                // Ignore if limit reached
                return;
            }
            setSelectedProductsToKeep(prev => [...prev, id]);
        }
    };

    const confirmDowngrade = () => {
        submitSubscriptionChange(
            route('seller.subscription.downgrade'),
            {
                plan: targetPlan.value,
                keep_active_ids: selectedProductsToKeep,
            },
            {
                onSuccess: () => {
                    setDowngradeModalOpen(false);
                    setSelectedProductsToKeep([]);
                    setTargetPlan(null);
                    setSearchQuery('');
                    reset();
                },
                onError: () => {
                    // Keep the modal open so the seller can correct their selection.
                    setDowngradeModalOpen(true);
                }
            }
        );
    };

    const formatPlanName = (plan) => {
        if (plan === 'free') return 'Standard';
        if (plan === 'premium') return 'Premium';
        if (plan === 'super_premium') return 'Elite';
        return plan;
    };

    const plans = [
        {
            id: 'free',
            name: 'Standard',
            price: 'Free',
            description: 'Start selling your craft to the world.',
            limit: 3,
            features: [
                'Up to 3 Active Products',
                'Basic Analytics',
                'Standard Support',
            ],
            buttonText: 'Current Plan',
        },
        {
            id: 'premium',
            name: 'Premium',
            price: '₱199 / mo',
            description: 'Grow your artisan business with more visibility.',
            limit: 10,
            features: [
                'Up to 10 Active Products',
                'Premium Badge (Crown Icon)',
                'Priority Support',
                'Advanced Analytics',
            ],
            recommended: true,
        },
        {
            id: 'super_premium',
            name: 'Elite',
            price: '₱399 / mo',
            description: 'Maximized reach and enterprise features.',
            limit: 50,
            features: [
                'Up to 50 Active Products',
                'Elite Badge',
                '5 Monthly Sponsorship Credits',
                'Dedicated Account Manager',
                'Featured Placement in Search',
            ],
            isSuper: true,
        }
    ];

    const filteredProducts = activeProducts.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.sku.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const closeDowngradeModal = () => {
        setDowngradeModalOpen(false);
        setSelectedProductsToKeep([]);
        setTargetPlan(null);
        setSearchQuery('');
        reset();
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => window.history.length > 1 ? window.history.back() : router.visit(route('dashboard'))}
                        className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-full transition-colors flex items-center justify-center group"
                        title="Go back"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-left transition-transform group-hover:-translate-x-1">
                            <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
                        </svg>
                    </button>
                    <h2 className="font-semibold text-xl text-stone-800 leading-tight">Subscription Plan</h2>
                </div>
            }
        >
            <Head title="Subscription Plan" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-8">
                    
                    {/* Current Usage Banner */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 flex flex-col md:flex-row justify-between items-start md:items-center">
                        <div>
                            <h3 className="text-lg font-bold text-stone-800 flex items-center gap-2">
                                Your Current Plan: {formatPlanName(currentPlan)}
                                {currentPlan !== 'free' && <Crown className="w-5 h-5 text-amber-500" />}
                            </h3>
                            <p className="text-stone-500 mt-1">
                                You are using {activeProductsCount} of your {limit} active product slots.
                            </p>
                        </div>
                        <div className="mt-4 md:mt-0">
                            <div className="w-full md:w-64 bg-stone-100 rounded-full h-2.5">
                                <div 
                                    className={`h-2.5 rounded-full ${activeProductsCount >= limit ? 'bg-red-500' : 'bg-green-500'}`}
                                    style={{ width: `${Math.min(100, (activeProductsCount / limit) * 100)}%` }}
                                ></div>
                            </div>
                            <p className="text-xs text-stone-500 text-right mt-1">{limit - activeProductsCount} slots remaining</p>
                        </div>
                    </div>

                    {/* Pricing Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {plans.map((plan) => {
                            const current = isCurrentPlan(plan.id);
                            const tierIndex = plans.findIndex(p => p.id === plan.id);
                            const currentTierIndex = plans.findIndex(p => p.id === currentPlan);
                            const isUpgrade = tierIndex > currentTierIndex;
                            const isDowngrade = tierIndex < currentTierIndex;

                            return (
                                <div key={plan.id} className={`relative flex flex-col p-8 bg-white border rounded-3xl shadow-sm transition-all duration-300 ${
                                    current ? 'border-orange-500 shadow-md ring-1 ring-orange-500' : 
                                    plan.recommended ? 'border-amber-400 shadow-lg scale-105' : 'border-stone-200 hover:border-stone-300'
                                }`}>
                                    {plan.recommended && !current && (
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
                                            Most Popular
                                        </div>
                                    )}
                                    {current && (
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-stone-800 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                            Current Plan
                                        </div>
                                    )}

                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                                            {plan.name}
                                            {plan.isSuper && <Crown className="w-5 h-5 text-amber-500" />}
                                        </h3>
                                        <p className="mt-4 flex items-baseline text-stone-900">
                                            <span className="text-4xl font-extrabold tracking-tight">{plan.price}</span>
                                        </p>
                                        <p className="mt-2 text-sm text-stone-500">{plan.description}</p>
                                        
                                        <ul className="mt-8 space-y-4">
                                            {plan.features.map((feature, i) => (
                                                <li key={i} className="flex items-start">
                                                    <CheckCircle2 className="flex-shrink-0 w-5 h-5 text-green-500" />
                                                    <span className="ml-3 text-sm text-stone-700">{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="mt-8">
                                        {current ? (
                                            <button disabled className="w-full inline-flex justify-center items-center py-3 px-4 rounded-xl text-sm font-semibold bg-stone-100 text-stone-400 cursor-not-allowed">
                                                Active
                                            </button>
                                        ) : isUpgrade ? (
                                            <button
                                                onClick={() => handleUpgrade(plan.id)}
                                                className={`w-full inline-flex justify-center items-center py-3 px-4 rounded-xl text-sm font-semibold transition-colors duration-200 ${
                                                    plan.recommended 
                                                        ? 'bg-orange-600 text-white hover:bg-orange-700 shadow-md hover:shadow-lg' 
                                                        : 'bg-stone-900 text-white hover:bg-stone-800'
                                                }`}
                                            >
                                                Upgrade to {plan.name}
                                            </button>
                                        ) : isDowngrade ? (
                                            <button
                                                onClick={() => initiateDowngrade(plan.id, plan.limit)}
                                                className="w-full inline-flex justify-center items-center py-3 px-4 rounded-xl text-sm font-semibold bg-white border-2 border-stone-200 text-stone-600 hover:border-stone-300 hover:text-stone-800 transition-colors"
                                            >
                                                Downgrade to {plan.name}
                                            </button>
                                        ) : null}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Downgrade Product Selection Modal */}
            <Modal show={downgradeModalOpen} onClose={closeDowngradeModal} maxWidth="2xl">
                <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <h2 className="text-lg font-bold text-stone-900">Select Products to Keep Active</h2>
                        <button
                            onClick={closeDowngradeModal}
                            className="text-stone-400 hover:text-stone-600"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    
                    <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-4 text-sm flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <p>
                            You are downgrading to a plan with a limit of <strong>{targetPlan?.limit}</strong> active products. 
                            You currently have {activeProductsCount} active products. Please select which products you want to keep active. The rest will be set to Draft.
                        </p>
                    </div>

                    <div className="flex justify-between items-center mb-4">
                        <p className="text-sm font-medium text-stone-600">
                            Selected: {selectedProductsToKeep.length} / {targetPlan?.limit}
                        </p>
                        <div className="relative w-64">
                            <input 
                                type="text" 
                                placeholder="Search products..." 
                                className="w-full pl-9 pr-4 py-2 text-sm border-stone-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        </div>
                    </div>

                    {errors.limit && (
                        <p className="text-sm text-red-600 mb-4">{errors.limit}</p>
                    )}

                    <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
                        {filteredProducts.map(product => {
                            const isSelected = selectedProductsToKeep.includes(product.id);
                            const isDisabled = !isSelected && selectedProductsToKeep.length >= targetPlan?.limit;

                            return (
                                <div 
                                    key={product.id}
                                    onClick={() => !isDisabled && toggleProductSelection(product.id)}
                                    className={`flex items-center gap-4 p-3 rounded-xl border transition-colors ${
                                        isSelected ? 'bg-orange-50 border-orange-200' : 
                                        isDisabled ? 'opacity-50 cursor-not-allowed bg-stone-50 border-stone-200' : 
                                        'bg-white border-stone-200 hover:border-orange-300 cursor-pointer'
                                    }`}
                                >
                                    <div className="flex-shrink-0 flex items-center justify-center w-6 h-6">
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-orange-600 border-orange-600' : 'border-stone-300 bg-white'}`}>
                                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                        </div>
                                    </div>
                                    
                                    <div className="w-12 h-12 bg-stone-100 rounded overflow-hidden flex-shrink-0">
                                        {product.cover_photo_path ? (
                                            <img src={`/storage/${product.cover_photo_path}`} className="w-full h-full object-cover" alt="" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xs text-stone-400">No Img</div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-stone-900 truncate">{product.name}</p>
                                        <p className="text-xs text-stone-500">SKU: {product.sku}</p>
                                    </div>
                                    <div className="font-medium text-sm text-stone-900">
                                        ₱{parseFloat(product.price).toFixed(2)}
                                    </div>
                                </div>
                            );
                        })}
                        {filteredProducts.length === 0 && (
                            <p className="text-center text-stone-500 py-8 text-sm">No products found matching your search.</p>
                        )}
                    </div>

                    <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-stone-200">
                        <button
                            onClick={closeDowngradeModal}
                            className="px-4 py-2 text-sm font-medium text-stone-600 bg-white border border-stone-300 rounded-lg hover:bg-stone-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmDowngrade}
                            disabled={selectedProductsToKeep.length > targetPlan?.limit || processing}
                            className={`px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors ${
                                selectedProductsToKeep.length <= targetPlan?.limit && !processing
                                    ? 'bg-orange-600 hover:bg-orange-700' 
                                    : 'bg-stone-300 cursor-not-allowed'
                            }`}
                        >
                            {processing ? 'Processing...' : `Confirm Downgrade`}
                        </button>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
