import React from 'react';
import { Link } from '@inertiajs/react';
import { Heart, Store, History, Search, X, LayoutGrid, List, CheckSquare, Trash2 } from 'lucide-react';

export default function SavedHeroHeader({
    activeTab,
    setActiveTab,
    wishlistedCount = 0,
    followedCount = 0,
    recentlyViewedCount = 0,
    searchQuery = '',
    setSearchQuery,
    sortOrder = 'recent',
    setSortOrder,
    viewMode = 'grid',
    setViewMode,
    isBulkEdit = false,
    setIsBulkEdit,
    categories = [],
    selectedCategory = 'all',
    setSelectedCategory,
    onClearAll,
}) {
    const tabs = [
        { key: 'wishlist', label: 'Wishlist', icon: Heart, count: wishlistedCount, fillHeart: true },
        { key: 'following', label: 'Artisan Studios', icon: Store, count: followedCount },
        { key: 'recent', label: 'History', icon: History, count: recentlyViewedCount },
    ];

    const hasItemsToClear = 
        (activeTab === 'following' && followedCount > 0) ||
        (activeTab === 'recent' && recentlyViewedCount > 0);

    const getClearLabel = () => {
        if (activeTab === 'following') return 'Unfollow All';
        return 'Clear History';
    };

    return (
        <div className="space-y-3.5">
            {/* Top Bar: Title & Segmented Tab Navigation */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-2.5 border-b border-stone-200/80">
                <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                        Saved
                    </h1>
                    <span className="text-xs font-bold text-stone-400">
                        {activeTab === 'wishlist' && `(${wishlistedCount})`}
                        {activeTab === 'following' && `(${followedCount})`}
                        {activeTab === 'recent' && `(${recentlyViewedCount})`}
                    </span>
                </div>

                {/* Segmented Tabs */}
                <div className="inline-flex rounded-xl bg-stone-100/90 p-1 text-xs font-bold self-start sm:self-auto overflow-x-auto max-w-full scrollbar-none">
                    {tabs.map(({ key, label, icon: Icon, count, fillHeart }) => {
                        const isActive = activeTab === key;
                        return (
                            <button
                                key={key}
                                type="button"
                                onClick={() => {
                                    setActiveTab(key);
                                    if (isBulkEdit) setIsBulkEdit(false);
                                }}
                                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all shrink-0 active:scale-95 ${
                                    isActive
                                        ? 'bg-white text-stone-900 shadow-2xs font-extrabold'
                                        : 'text-stone-500 hover:text-stone-800'
                                }`}
                            >
                                <Icon
                                    size={13}
                                    className={`${isActive && fillHeart ? 'fill-rose-500 text-rose-500' : 'text-stone-400'}`}
                                />
                                <span>{label}</span>
                                {count > 0 && (
                                    <span
                                        className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                                            isActive
                                                ? 'bg-clay-100 text-clay-700'
                                                : 'bg-stone-200/70 text-stone-500'
                                        }`}
                                    >
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Wishlist Tab: 2-Row Natural Flow */}
            {activeTab === 'wishlist' && wishlistedCount > 0 && (
                <div className="space-y-3">
                    {/* TIER 1: FIND & REFINE (Search & Category Pills) */}
                    <div className="space-y-2">
                        {/* Full Search Bar */}
                        <div className="relative w-full">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                            <input
                                type="text"
                                placeholder="Search saved crafts or artisan studios..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-9 rounded-xl border-stone-200 bg-white py-1.5 pl-9 pr-8 text-xs font-medium text-stone-800 placeholder-stone-400 shadow-2xs focus:border-clay-500 focus:ring-clay-500"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 active:scale-90"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>

                        {/* Swipeable Category Filter Pills */}
                        {categories.length > 1 && (
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-xs -mx-1 px-1">
                                <button
                                    type="button"
                                    onClick={() => setSelectedCategory('all')}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 active:scale-95 ${
                                        selectedCategory === 'all'
                                            ? 'bg-stone-900 text-white shadow-2xs'
                                            : 'bg-stone-100/90 text-stone-600 hover:bg-stone-200/80'
                                    }`}
                                >
                                    All ({wishlistedCount})
                                </button>
                                {categories.map((cat) => (
                                    <button
                                        key={cat.name}
                                        type="button"
                                        onClick={() => setSelectedCategory(cat.name)}
                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 active:scale-95 ${
                                            selectedCategory === cat.name
                                                ? 'bg-stone-900 text-white shadow-2xs'
                                                : 'bg-stone-100/90 text-stone-600 hover:bg-stone-200/80'
                                        }`}
                                    >
                                        {cat.name} ({cat.count})
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* TIER 2: VIEW & MANAGE UTILITY STRIP */}
                    <div className="flex items-center justify-between gap-3 pt-1 border-t border-stone-100">
                        {/* Left: Result Count & Sort Dropdown */}
                        <div className="flex items-center gap-2 sm:gap-2.5">
                            <span className="text-xs font-semibold text-stone-500 whitespace-nowrap">
                                {wishlistedCount} {wishlistedCount === 1 ? 'saved piece' : 'saved pieces'}
                            </span>
                            <span className="text-stone-300">•</span>
                            <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-bold text-stone-400 hidden sm:inline">Sort:</span>
                                <select
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value)}
                                    className="h-8 rounded-lg border-stone-200 bg-white py-0.5 pl-2 pr-6 text-xs font-semibold text-stone-700 shadow-2xs focus:border-clay-500 focus:ring-clay-500 cursor-pointer"
                                >
                                    <option value="recent">Newest</option>
                                    <option value="price_asc">Price: Low to High</option>
                                    <option value="price_desc">Price: High to Low</option>
                                    <option value="name_asc">Name: A to Z</option>
                                </select>
                            </div>
                        </div>

                        {/* Right: View Switch (Grid vs List) & Manage Mode */}
                        <div className="flex items-center gap-1.5">
                            {/* View Switch */}
                            <div className="inline-flex h-8 rounded-lg border border-stone-200 bg-stone-50 p-0.5 items-center">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('grid')}
                                    className={`p-1 rounded-md transition-colors active:scale-90 ${
                                        viewMode === 'grid' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-400 hover:text-stone-700'
                                    }`}
                                    title="Grid View"
                                >
                                    <LayoutGrid size={13} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('list')}
                                    className={`p-1 rounded-md transition-colors active:scale-90 ${
                                        viewMode === 'list' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-400 hover:text-stone-700'
                                    }`}
                                    title="List View"
                                >
                                    <List size={13} />
                                </button>
                            </div>

                            {/* Manage Mode Toggle */}
                            <button
                                type="button"
                                onClick={() => setIsBulkEdit(!isBulkEdit)}
                                className={`inline-flex h-8 items-center gap-1 rounded-lg px-2.5 sm:px-3 text-xs font-bold transition-all border active:scale-95 ${
                                    isBulkEdit
                                        ? 'bg-clay-600 text-white border-clay-600 shadow-xs'
                                        : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50 shadow-2xs'
                                }`}
                            >
                                <CheckSquare size={12} />
                                <span>{isBulkEdit ? 'Done' : 'Manage'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Clear Button for Following & Recent Tabs */}
            {activeTab !== 'wishlist' && hasItemsToClear && (
                <div className="flex justify-end pt-0.5">
                    <button
                        type="button"
                        onClick={onClearAll}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-stone-200 bg-white text-stone-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 text-xs font-semibold transition-colors shadow-2xs active:scale-95"
                    >
                        <Trash2 size={12} />
                        <span>{getClearLabel()}</span>
                    </button>
                </div>
            )}
        </div>
    );
}
