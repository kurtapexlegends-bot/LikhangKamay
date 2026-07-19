import React, { useState, useEffect, useMemo } from 'react';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import { 
    Award, TrendingUp, Clock, AlertCircle, AlertTriangle, 
    CheckCircle2, XCircle, Search, Package, X, Sparkles, Check
} from 'lucide-react';
import InputLabel from '@/Components/InputLabel';
import { useToast } from '@/Components/ToastContext';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import useFlashToast from '@/hooks/useFlashToast';
import useSellerModuleAccess from '@/hooks/useSellerModuleAccess';
import SellerHeader from '@/Layouts/SellerHeader';
import FloatingModuleActions from '@/Components/FloatingModuleActions';

export default function Sponsorships({ auth, creditsAvailable, activeProducts, requests }) {
    const { addToast } = useToast();
    const { filters = {} } = usePage().props;
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [productSearch, setProductSearch] = useState('');
    const { openSidebar } = useSellerWorkspaceShell();

    // Sync search from URL (for Global Search support)
    useEffect(() => {
        if (filters.search && filters.search !== searchTerm) {
            setSearchTerm(filters.search);
        }
    }, [filters.search]);

    const { data, setData, post, processing, reset } = useForm({
        product_id: '',
    });

    const isSuperPremium = auth.user.premium_tier === 'super_premium';

    const submitRequest = (e) => {
        e.preventDefault();
        if (!data.product_id) return addToast('Please select a product first.', 'error');
        
        post(route('seller.sponsorships.store'), {
            onSuccess: () => {
                reset();
                addToast('Sponsorship request submitted.', 'success');
            },
            onError: (err) => {
                addToast(err.error || 'Failed to request sponsorship.', 'error');
            }
        });
    };

    // Filter available products for the dropdown
    const availableProducts = activeProducts.filter(p => !p.is_sponsored);
    const pendingProductIds = requests.filter(r => r.status === 'pending').map(r => r.product_id);
    const selectableProducts = availableProducts.filter(p => !pendingProductIds.includes(p.id));

    const filteredSelectableProducts = useMemo(() => {
        return selectableProducts.filter(p => 
            p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
            (p.sku && p.sku.toLowerCase().includes(productSearch.toLowerCase()))
        );
    }, [selectableProducts, productSearch]);

    // Filter history based on search
    const filteredRequests = requests.filter(r => 
        r.product?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const activeSponsorshipCount = useMemo(() => {
        return activeProducts.filter(p => p.is_sponsored).length;
    }, [activeProducts]);

    const pendingCount = useMemo(() => {
        return requests.filter(r => r.status === 'pending').length;
    }, [requests]);

    const getStatusBadge = (status) => {
        switch (status) {
            case 'approved': 
                return (
                    <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Active
                    </span>
                );
            case 'rejected': 
                return <span className="bg-rose-50 text-rose-600 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Rejected</span>;
            default: 
                return <span className="bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Pending</span>;
        }
    };

    return (
        <>
            <Head title="Product Sponsorships - Seller Dashboard" />

            <SellerHeader 
                title="Sponsorships"
                subtitle="Promote your products and manage active sponsorships."
                auth={auth}
                onMenuClick={openSidebar}
                badge={{ label: 'Enterprise', iconColor: 'text-amber-400' }}
            />

            <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-5xl mx-auto w-full">
                
                {/* SECTION 1: METRICS PANEL */}
                <div className="flex overflow-x-auto pb-2.5 gap-4 flex-nowrap snap-x snap-mandatory sm:grid sm:grid-cols-3 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                    <div className="w-[85vw] max-w-[280px] shrink-0 snap-center sm:w-auto bg-stone-900 text-white rounded-2xl p-5 shadow-sm border border-stone-850 relative overflow-hidden flex flex-col justify-between">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3"></div>
                        <div className="relative z-10 flex items-start justify-between">
                            <div>
                                <h4 className="text-stone-400 text-[10px] font-bold uppercase tracking-wider mb-1">Available Credits</h4>
                                <h3 className="text-3xl font-bold text-white tracking-tight flex items-baseline gap-1">
                                    {creditsAvailable}
                                    <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">/ 5 left</span>
                                </h3>
                            </div>
                            <div className="p-2 bg-white/10 rounded-xl border border-white/10 shrink-0">
                                <Award className="text-amber-400" size={20} />
                            </div>
                        </div>
                        <p className="text-[10px] text-stone-500 mt-4 leading-normal font-medium">Resets every 30 days based on billing cycle.</p>
                    </div>

                    <div className="w-[85vw] max-w-[280px] shrink-0 snap-center sm:w-auto bg-white rounded-2xl p-5 shadow-sm border border-stone-200 flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                            <div>
                                <h4 className="text-stone-400 text-[10px] font-bold uppercase tracking-wider mb-1">Active Campaigns</h4>
                                <h3 className="text-3xl font-bold text-stone-950 tracking-tight">{activeSponsorshipCount}</h3>
                            </div>
                            <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-100 shrink-0">
                                <Sparkles className="text-emerald-500" size={20} />
                            </div>
                        </div>
                        <p className="text-[10px] text-stone-500 mt-4 leading-normal font-medium">Currently live in homepage promotions.</p>
                    </div>

                    <div className="w-[85vw] max-w-[280px] shrink-0 snap-center sm:w-auto bg-white rounded-2xl p-5 shadow-sm border border-stone-200 flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                            <div>
                                <h4 className="text-stone-400 text-[10px] font-bold uppercase tracking-wider mb-1">Awaiting Review</h4>
                                <h3 className="text-3xl font-bold text-stone-950 tracking-tight">{pendingCount}</h3>
                            </div>
                            <div className="p-2 bg-amber-50 rounded-xl border border-amber-100 shrink-0">
                                <Clock className="text-amber-500" size={20} />
                            </div>
                        </div>
                        <p className="text-[10px] text-stone-500 mt-4 leading-normal font-medium">Sponsorship requests awaiting moderation.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* SECTION 2: NEW REQUEST WIZARD */}
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-sm flex flex-col justify-between">
                        <div>
                            <h2 className="text-base font-bold text-stone-950 mb-1 flex items-center gap-2">
                                <TrendingUp size={18} className="text-clay-600" />
                                Request Product Sponsorship
                            </h2>
                            <p className="text-xs text-stone-500 mb-4">Feature your listing on the front-page carousel for 7 days.</p>

                            {!isSuperPremium ? (
                                <div className="bg-amber-50/40 border border-amber-100 rounded-xl p-4 flex items-start gap-3">
                                    <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                                    <div>
                                        <h3 className="text-xs font-bold text-amber-800">Elite Subscription Only</h3>
                                        <p className="text-[11px] text-amber-700/80 mt-1 mb-3 leading-relaxed">
                                            Upgrade to the Elite tier to unlock sponsored features, marketing telemetry, and premium visibility slots.
                                        </p>
                                        <button 
                                            onClick={() => router.visit(route('seller.subscription'))}
                                            className="text-[10px] font-bold bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-1.5 rounded-lg shadow-sm transition active:scale-95 min-h-[44px] sm:min-h-[38px] flex items-center justify-center"
                                        >
                                            View Upgrade Options
                                        </button>
                                    </div>
                                </div>
                            ) : creditsAvailable <= 0 ? (
                                <div className="bg-rose-50/40 border border-rose-100 rounded-xl p-4 flex items-start gap-3">
                                    <AlertTriangle className="text-rose-600 shrink-0 mt-0.5" size={18} />
                                    <div>
                                        <h3 className="text-xs font-bold text-rose-800">Sponsorship Limit Reached</h3>
                                        <p className="text-[11px] text-rose-700 mt-1 leading-relaxed">
                                            You have used all 5 active credits for this monthly billing run. Wait for credits to reset.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={submitRequest} className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <InputLabel value="Select Product" className="text-[11px] font-bold text-stone-500 uppercase tracking-wider" />
                                            {selectableProducts.length > 3 && (
                                                <div className="relative w-44">
                                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" size={12} />
                                                    <input 
                                                        type="text" 
                                                        placeholder="Filter listings..." 
                                                        className="w-full pl-7 pr-2 py-1 bg-stone-50 border border-stone-200 rounded-lg text-[11px] focus:bg-white focus:border-clay-300 focus:ring-0 transition"
                                                        value={productSearch}
                                                        onChange={(e) => setProductSearch(e.target.value)}
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {filteredSelectableProducts.length > 0 ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1 border border-stone-100 rounded-xl p-2 bg-stone-50/30">
                                                {filteredSelectableProducts.map((p) => {
                                                    const isSelected = data.product_id === String(p.id);
                                                    return (
                                                        <div 
                                                            key={p.id}
                                                            onClick={() => setData('product_id', String(p.id))}
                                                            className={`flex items-center gap-3 p-2.5 rounded-xl border bg-white cursor-pointer transition-all duration-200 hover:border-clay-300 hover:shadow-sm select-none ${
                                                                isSelected 
                                                                    ? 'border-clay-500 ring-1 ring-clay-500/20 bg-clay-50/5' 
                                                                    : 'border-stone-200'
                                                            }`}
                                                        >
                                                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-stone-100 bg-stone-50 shrink-0 flex items-center justify-center">
                                                                {p.cover_photo_path ? (
                                                                    <img 
                                                                        src={`/storage/${p.cover_photo_path}`} 
                                                                        alt="" 
                                                                        className="w-full h-full object-cover"
                                                                        onError={(e) => { e.target.src = '/images/no-image.png'; }}
                                                                    />
                                                                ) : (
                                                                    <Package size={16} className="text-stone-300" />
                                                                )}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-xs font-bold text-stone-950 truncate">{p.name}</p>
                                                                <p className="text-[10px] text-stone-400 font-mono tracking-tight mt-0.5">{p.sku || 'No SKU'}</p>
                                                            </div>
                                                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                                                isSelected ? 'bg-clay-600 border-clay-600 text-white' : 'border-stone-300'
                                                            }`}>
                                                                {isSelected && <Check size={10} strokeWidth={3} />}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="p-8 text-center border border-dashed border-stone-200 bg-stone-50/30 rounded-xl">
                                                <Package className="mx-auto text-stone-300 mb-2" size={20} />
                                                <p className="text-[11px] text-stone-550 font-medium">No eligible products available to sponsor.</p>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={processing || !data.product_id}
                                        className="w-full bg-stone-900 text-white font-bold text-xs py-3 rounded-xl hover:bg-stone-850 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 active:scale-[0.99] min-h-[44px]"
                                    >
                                        {processing ? 'Submitting Request...' : 'Use 1 Credit to Sponsor'}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>

                    {/* SECTION 3: CAMPAIGN HISTORY & TIMELINE */}
                    <div className="lg:col-span-1 bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-sm flex flex-col">
                        <div className="flex items-center justify-between gap-3 mb-4">
                            <div>
                                <h2 className="text-base font-bold text-stone-950">Campaign History</h2>
                                <p className="text-[10px] text-stone-400 font-medium mt-0.5">Track your promo slots</p>
                            </div>
                            {requests.length > 3 && (
                                <div className="relative w-36">
                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-stone-400" size={11} />
                                    <input 
                                        type="text" 
                                        placeholder="Filter list..." 
                                        className="w-full pl-6 pr-2 py-1 bg-stone-50 border border-stone-200 rounded-lg text-[10px] focus:bg-white focus:border-clay-300 focus:ring-0 transition"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3.5 pr-0.5 max-h-[360px]">
                            {filteredRequests.length > 0 ? (
                                filteredRequests.map((req) => (
                                    <div key={req.id} className="rounded-xl border border-stone-150 p-3 bg-stone-50/10 hover:shadow-sm transition-all duration-200 flex flex-col justify-between">
                                        <div className="flex items-start justify-between gap-2.5">
                                            <div className="flex min-w-0 items-center gap-2.5">
                                                <div className="w-9 h-9 rounded-lg overflow-hidden border border-stone-100 bg-stone-50 shrink-0 flex items-center justify-center">
                                                    {req.product?.cover_photo_path ? (
                                                        <img
                                                            src={`/storage/${req.product.cover_photo_path}`}
                                                            alt=""
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => { e.target.src = '/images/no-image.png'; }}
                                                        />
                                                    ) : (
                                                        <Package size={14} className="text-stone-300" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="truncate text-xs font-bold text-stone-950 leading-none mb-1">{req.product?.name || 'Unknown Product'}</p>
                                                    <p className="text-[9px] text-stone-400 font-mono tracking-tight">{req.product?.sku || 'No SKU'}</p>
                                                </div>
                                            </div>
                                            <div className="shrink-0">{getStatusBadge(req.status)}</div>
                                        </div>

                                        <div className="mt-3.5 border-t border-stone-100/80 pt-2 flex flex-col justify-between">
                                            <span className="text-[9px] text-stone-400 font-semibold uppercase tracking-wider">Timeline details</span>
                                            <div className="mt-1 text-[11px] text-stone-600 leading-normal">
                                                {req.status === 'rejected' && req.rejection_reason ? (
                                                    <div className="mt-1 rounded-lg bg-rose-50/30 border border-rose-100/50 p-2 text-rose-700 text-[10px]">
                                                        <span className="font-bold uppercase tracking-wider block text-[9px] mb-0.5">Reason:</span>
                                                        {req.rejection_reason}
                                                    </div>
                                                ) : req.status === 'approved' ? (
                                                    <p className="text-emerald-700 font-medium">Approved for a 7-day featured run.</p>
                                                ) : (
                                                    <p className="text-stone-550 font-medium">Awaiting administrator verification.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-12 text-center flex flex-col items-center justify-center">
                                    <div className="w-12 h-12 bg-stone-50 rounded-full flex items-center justify-center mb-2.5">
                                        <Award size={18} className="text-stone-300" />
                                    </div>
                                    <h3 className="text-xs font-bold text-stone-950">No sponsorships yet</h3>
                                    <p className="text-[10px] text-stone-500 mt-1 max-w-[180px]">
                                        You haven't requested any product sponsorships. Select a product on the left to get started.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </main>
        </>
    );
}

Sponsorships.layout = (page) => <SellerWorkspaceLayout active="sponsorships">{page}</SellerWorkspaceLayout>;
