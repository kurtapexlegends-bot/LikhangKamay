import React from 'react';
import { Heart, History, Search, Store, Trash2, CheckSquare } from 'lucide-react';

export default function NavigationHeader({
    activeTab,
    setActiveTab,
    wishlistedCount,
    followedCount,
    recentlyViewedCount,
    searchQuery,
    setSearchQuery,
    sortOrder,
    setSortOrder,
    isBulkEdit,
    setIsBulkEdit,
    onClearAll,
}) {
    const hasWishlistItems = wishlistedCount > 0;
    
    const hasItemsToClear = 
        (activeTab === 'wishlist' && wishlistedCount > 0) ||
        (activeTab === 'following' && followedCount > 0) ||
        (activeTab === 'recent' && recentlyViewedCount > 0);

    const getClearButtonLabel = () => {
        if (activeTab === 'wishlist') return 'Clear Wishlist';
        if (activeTab === 'following') return 'Unfollow All';
        return 'Clear History';
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Page Header Title */}
            <div className="px-1">
                <h1 className="text-3xl font-black text-stone-900 tracking-tight font-sans">Saved Collections</h1>
                <p className="text-sm font-medium text-stone-500 mt-1">Manage your curated artisan items, followed studios, and recent views</p>
            </div>

            {/* Navigation and Tab Section */}
            <div className="rounded-[24px] border border-stone-200/80 bg-white p-4 shadow-sm sm:p-5">
                {/* Row 1: Pill Tabs */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-400 pl-1">CURATED LISTS</span>
                    <div className="flex items-center gap-1.5 rounded-2xl bg-stone-50 border border-stone-100/80 p-1 overflow-x-auto flex-nowrap scrollbar-none max-w-full">
                        {[
                            { key: 'wishlist', label: 'Wishlist', icon: Heart, count: wishlistedCount, fill: true },
                            { key: 'following', label: 'Artisan Studios', icon: Store, count: followedCount },
                            { key: 'recent', label: 'Recently Viewed', icon: History, count: recentlyViewedCount },
                        ].map(({ key, label, icon: Icon, count, fill }) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => {
                                    setActiveTab(key);
                                    if (isBulkEdit) {
                                        setIsBulkEdit(false);
                                    }
                                }}
                                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold transition-all shrink-0 min-h-[44px] ${
                                    activeTab === key
                                        ? 'bg-white text-clay-700 shadow-sm border border-stone-200/50'
                                        : 'text-stone-500 hover:text-stone-850 hover:bg-stone-100/40'
                                }`}
                            >
                                <Icon size={14} className={activeTab === key && fill ? 'fill-clay-700 text-clay-700' : ''} />
                                <span>{label}</span>
                                {count > 0 && (
                                    <span className={`ml-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold leading-none ${
                                        activeTab === key ? 'bg-clay-100 text-clay-700' : 'bg-stone-200/80 text-stone-500'
                                    }`}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Row 2: Search + Sort + Manage (Wishlist only) OR Mobile Clear All (for other tabs) */}
                {hasItemsToClear && (
                    <div className="mt-4 pt-3.5 border-t border-stone-100">
                        {activeTab === 'wishlist' && hasWishlistItems ? (
                            <div className="flex flex-wrap items-center gap-2.5">
                                <div className="relative flex-1 min-w-[200px]">
                                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                                    <input 
                                        type="text" 
                                        placeholder="Search wishlist..." 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full rounded-xl border-stone-200 bg-stone-50/80 py-2.5 pl-10 pr-3 text-sm text-stone-600 transition-colors focus:bg-white focus:border-clay-500 focus:ring-clay-500/10 focus:ring-4 min-h-[44px]"
                                    />
                                </div>
                                
                                <select 
                                    value={sortOrder} 
                                    onChange={(e) => setSortOrder(e.target.value)}
                                    className="rounded-xl border-stone-200 bg-stone-50/80 py-2.5 pl-3 pr-8 text-sm font-medium text-stone-600 transition-colors focus:bg-white focus:border-clay-500 focus:ring-clay-500/10 focus:ring-4 cursor-pointer min-h-[44px]"
                                >
                                    <option value="recent">Recently Added</option>
                                    <option value="price_asc">Price: Low → High</option>
                                    <option value="price_desc">Price: High → Low</option>
                                </select>
                                
                                <div className="flex items-center gap-2">
                                    <button 
                                        type="button"
                                        onClick={() => setIsBulkEdit(!isBulkEdit)}
                                        className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold transition-all min-h-[44px] min-w-[100px] border active:scale-95 ${
                                            isBulkEdit 
                                                ? 'bg-clay-600 border-clay-650 text-white hover:bg-clay-700 shadow-sm' 
                                                : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                                        }`}
                                    >
                                        <CheckSquare size={14} /> 
                                        <span>{isBulkEdit ? 'Done' : 'Manage'}</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={onClearAll}
                                        className="inline-flex lg:hidden items-center justify-center rounded-xl border border-rose-200 bg-white p-2.5 text-rose-500 hover:bg-rose-50 min-h-[44px] min-w-[44px] active:scale-95"
                                        title={getClearButtonLabel()}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex lg:hidden justify-end">
                                <button
                                    type="button"
                                    onClick={onClearAll}
                                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-xs font-bold text-rose-600 shadow-sm transition hover:bg-rose-50 active:scale-95 min-h-[44px]"
                                >
                                    <Trash2 size={14} /> 
                                    <span>{getClearButtonLabel()}</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
