import React from 'react';
import { Link } from '@inertiajs/react';
import { Heart, History, ShoppingBag, Store, Trash2 } from 'lucide-react';

export default function ActivitySidebar({
    wishlistedCount,
    followedCount,
    recentlyViewedCount,
    activeTab,
    onClearAll,
}) {
    const hasItems = 
        (activeTab === 'wishlist' && wishlistedCount > 0) ||
        (activeTab === 'following' && followedCount > 0) ||
        (activeTab === 'recent' && recentlyViewedCount > 0);

    const getClearButtonLabel = () => {
        if (activeTab === 'wishlist') return 'Clear Wishlist';
        if (activeTab === 'following') return 'Unfollow All Studios';
        return 'Clear History';
    };

    return (
        <div className="hidden lg:block lg:col-span-1 self-start lg:sticky lg:top-24 space-y-5 animate-in fade-in duration-500">
            {/* Stats Overview */}
            <div className="rounded-[24px] border border-stone-200/80 bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-base font-bold text-stone-900 tracking-tight">Your Activity</h3>
                <div className="space-y-3.5 text-sm text-stone-600">
                    <div className="flex justify-between items-center border-b border-stone-100 pb-3">
                        <span className="flex items-center gap-2 font-medium">
                            <Heart size={15} className="text-rose-500" /> Wishlisted Items
                        </span>
                        <span className="font-bold text-stone-900 bg-stone-50 border border-stone-100 rounded-lg px-2.5 py-1 text-xs">
                            {wishlistedCount}
                        </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-stone-100 pb-3">
                        <span className="flex items-center gap-2 font-medium">
                            <Store size={15} className="text-clay-650" /> Followed Studios
                        </span>
                        <span className="font-bold text-stone-900 bg-stone-50 border border-stone-100 rounded-lg px-2.5 py-1 text-xs">
                            {followedCount}
                        </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-stone-100 pb-3">
                        <span className="flex items-center gap-2 font-medium">
                            <History size={15} className="text-blue-500" /> Recently Viewed
                        </span>
                        <span className="font-bold text-stone-900 bg-stone-50 border border-stone-100 rounded-lg px-2.5 py-1 text-xs">
                            {recentlyViewedCount}
                        </span>
                    </div>
                </div>
                
                <div className="mt-6">
                    <Link 
                        href={route('shop.index')} 
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-clay-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-clay-700 hover:shadow-md active:scale-95 min-h-[44px]"
                    >
                        <ShoppingBag size={16} /> Continue Shopping
                    </Link>
                    <p className="mt-3 text-center text-[11px] text-stone-400 font-semibold tracking-wide">
                        DISCOVER ARTISAN PIECES
                    </p>
                </div>
            </div>

            {/* Contextual Clear Actions */}
            {hasItems && (
                <div className="rounded-[24px] border border-stone-200/80 bg-stone-50/50 p-5 shadow-sm">
                    <h3 className="mb-3 text-[11px] font-bold text-stone-400 uppercase tracking-wider">Quick Actions</h3>
                    <button
                        type="button"
                        onClick={onClearAll}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm font-bold text-rose-600 shadow-sm transition hover:bg-rose-50 active:scale-95 min-h-[44px]"
                    >
                        <Trash2 size={15} /> 
                        {getClearButtonLabel()}
                    </button>
                </div>
            )}
        </div>
    );
}
