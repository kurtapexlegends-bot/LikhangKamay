import React from 'react';
import { Link } from '@inertiajs/react';
import { ArrowLeft, ShieldCheck, Store } from 'lucide-react';

export default function CheckoutHeader({ isArtisan, totalSellers, sellerGroups = [] }) {
    return (
        <>
            {/* Unified compact top header bar */}
            <div className="mb-3.5 flex items-center justify-between border-b border-stone-200/60 pb-3">
                <div className="flex items-center gap-2.5 sm:gap-3">
                    <button 
                        type="button" 
                        onClick={() => window.history.back()} 
                        className="group flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-stone-500 shadow-2xs transition hover:border-clay-300 hover:text-clay-600 active:scale-95"
                        title="Go back"
                    >
                        <ArrowLeft size={13} />
                        <span className="text-[10.5px] font-bold uppercase tracking-wider">Back</span>
                    </button>
                    <div className="h-4 w-px bg-stone-200" />
                    <Link href={isArtisan ? route('seller.supply-hub.index') : '/'} className="flex items-center gap-2 group">
                        <img src="/images/logo.png" alt="Logo" className="h-6 w-6 object-contain" />
                        <h1 className="font-serif text-base sm:text-lg font-bold text-stone-900 tracking-tight">
                            {isArtisan ? 'Materials Checkout' : 'Checkout'}
                        </h1>
                    </Link>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50/70 px-2.5 py-1 text-emerald-700">
                    <ShieldCheck size={12} className="shrink-0" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Secure Checkout</span>
                </div>
            </div>

            {/* Artisan Procurement Guarantee Callout */}
            {isArtisan && (
                <div className="mb-3 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs text-stone-700 shadow-2xs flex items-center gap-2.5">
                    <Store size={15} className="text-clay-600 shrink-0" />
                    <p className="text-[11.5px] text-stone-600">
                        <strong className="font-bold text-stone-900">Workshop Materials:</strong> Confirming delivery receipt will automatically record these items into your <strong className="text-stone-800 font-semibold">Inventory</strong>.
                    </p>
                </div>
            )}

            {/* Multi-Shop Split Transparency Callout */}
            {totalSellers > 1 && (
                <div className="mb-3.5 rounded-xl border border-amber-200/80 bg-amber-50/70 px-3.5 py-2 text-xs text-amber-950 shadow-2xs flex items-start sm:items-center gap-2.5">
                    <Store size={15} className="text-amber-700 shrink-0 mt-0.5 sm:mt-0" />
                    <p className="text-[11.5px] text-amber-900 leading-snug">
                        <strong className="font-bold text-amber-950">Split Order ({totalSellers} Studios):</strong>{' '}
                        Purchasing from {sellerGroups.map(g => g.shopName).join(', ')}. Each studio packages and dispatches orders individually with separate tracking.
                    </p>
                </div>
            )}
        </>
    );
}
