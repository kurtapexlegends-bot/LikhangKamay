import React from 'react';
import { 
    Search, 
    Loader2, 
    SlidersHorizontal, 
    ChevronDown, 
    Filter, 
    RotateCcw, 
    Clock, 
    Store, 
    X 
} from 'lucide-react';
import TextInput from '@/Components/TextInput';
import SlideOverDrawer from '@/Components/SlideOverDrawer';

export default function ModerationFilterToolbar({
    searchQuery,
    setSearchQuery,
    isValidating,
    statusCounts,
    shops = [],
    currentStatusFilter,
    setCurrentStatusFilter,
    selectedShopId,
    setSelectedShopId,
    draftStatus,
    setDraftStatus,
    draftShopId,
    setDraftShopId,
    activeFiltersCount,
    draftActiveCount,
    statusLabels,
    handleOpenFilters,
    applyDraftFilters,
    resetFilters,
    isPopoverOpen,
    setIsPopoverOpen,
    popoverRef,
    isDrawerOpen,
    setIsDrawerOpen,
    onStatusFilterChange,
    onShopFilterChange,
}) {
    return (
        <div className="space-y-4">
            {/* Search & Filter Controls Row */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                {/* Left: Summary Title */}
                <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-clay-500"></span>
                    Product Moderation Catalog
                </div>

                {/* Right: Search & Filters Control Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                    {/* Search Input Bar */}
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                        <TextInput 
                            placeholder="Search by title or product code..." 
                            className="pl-9 text-xs py-2 w-full min-h-[38px] bg-white hover:border-stone-300 focus:border-clay-500 focus:ring focus:ring-clay-500/10 transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {isValidating && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <Loader2 size={14} className="text-stone-400 animate-spin" />
                            </div>
                        )}
                    </div>

                    {/* Unified Filters Trigger Button */}
                    <div className="relative inline-block text-left" ref={popoverRef}>
                        <button
                            type="button"
                            onClick={handleOpenFilters}
                            className={`inline-flex h-[38px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl border px-4 text-xs font-bold transition-all shadow-sm active:scale-95 ${
                                activeFiltersCount > 0
                                    ? 'bg-clay-700 text-white border-clay-800 shadow-clay-200 hover:bg-clay-800'
                                    : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                            }`}
                        >
                            <SlidersHorizontal size={14} strokeWidth={2.2} />
                            <span>Filters</span>
                            {activeFiltersCount > 0 && (
                                <span className="ml-0.5 inline-flex items-center justify-center rounded-full bg-white/25 px-1.5 py-0.5 text-[10px] font-black text-white">
                                    {activeFiltersCount}
                                </span>
                            )}
                            <ChevronDown size={14} strokeWidth={2.5} className={`transition-transform duration-200 ${isPopoverOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Desktop Popover Card */}
                        {isPopoverOpen && (
                            <div className="hidden lg:block absolute right-0 z-[100] mt-2 w-[420px] rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150">
                                <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
                                    <div className="flex items-center gap-2">
                                        <Filter size={15} className="text-clay-700" />
                                        <h3 className="text-sm font-bold text-stone-900">Filter Moderation Catalog</h3>
                                    </div>
                                    {draftActiveCount > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setDraftStatus('pending_review');
                                                setDraftShopId('');
                                            }}
                                            className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-500 hover:text-clay-700 transition"
                                        >
                                            <RotateCcw size={12} />
                                            <span>Reset Selection</span>
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    {/* Status Filter */}
                                    <div>
                                        <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 mb-1.5">
                                            Listing Status
                                        </label>
                                        <div className="relative">
                                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                                            <select
                                                value={draftStatus}
                                                onChange={(e) => setDraftStatus(e.target.value)}
                                                className="pl-9 pr-8 text-xs py-2 w-full min-h-[40px] bg-white border border-stone-200 hover:border-stone-300 rounded-xl font-bold text-stone-700 focus:border-clay-500 focus:ring focus:ring-clay-500/10 transition-all cursor-pointer"
                                            >
                                                <option value="pending_review">Pending Review ({statusCounts?.pending_review || 0})</option>
                                                <option value="Active">Approved / Active ({statusCounts?.Active || 0})</option>
                                                <option value="rejected">Rejected ({statusCounts?.rejected || 0})</option>
                                                <option value="flagged">Flagged ({statusCounts?.flagged || 0})</option>
                                                <option value="all">All Listings ({statusCounts?.all || 0})</option>
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={14} />
                                        </div>
                                    </div>

                                    {/* Shop Filter */}
                                    {shops.length > 0 && (
                                        <div>
                                            <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 mb-1.5">
                                                Artisan Shop
                                            </label>
                                            <div className="relative">
                                                <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                                                <select
                                                    value={draftShopId}
                                                    onChange={(e) => setDraftShopId(e.target.value)}
                                                    className="pl-9 pr-8 text-xs py-2 w-full min-h-[40px] bg-white border border-stone-200 hover:border-stone-300 rounded-xl font-bold text-stone-700 focus:border-clay-500 focus:ring focus:ring-clay-500/10 transition-all cursor-pointer"
                                                >
                                                    <option value="">All Artisan Shops ({shops.length})</option>
                                                    {shops.map((shop) => (
                                                        <option key={shop.id} value={shop.id}>
                                                            {shop.shop_name || shop.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={14} />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-5 pt-3 border-t border-stone-100 flex items-center justify-between">
                                    <button
                                        type="button"
                                        onClick={() => setIsPopoverOpen(false)}
                                        className="rounded-xl border border-stone-200 px-3.5 py-2 text-xs font-bold text-stone-600 hover:bg-stone-50 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={applyDraftFilters}
                                        className="rounded-xl bg-clay-700 px-5 py-2 text-xs font-bold text-white shadow-md shadow-clay-200 hover:bg-clay-800 transition active:scale-95"
                                    >
                                        Apply &amp; Close
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Reset Button */}
                    {activeFiltersCount > 0 && (
                        <button
                            type="button"
                            onClick={resetFilters}
                            className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-stone-500 hover:text-clay-700 transition px-2 py-2"
                        >
                            <RotateCcw size={13} />
                            <span>Reset</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Active Filter Tag Pills */}
            {activeFiltersCount > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mr-1">
                        Active Filters:
                    </span>
                    {currentStatusFilter !== 'pending_review' && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-bold text-stone-700 shadow-sm">
                            <span>Status: {statusLabels[currentStatusFilter] || currentStatusFilter}</span>
                            <button
                                type="button"
                                onClick={() => onStatusFilterChange('pending_review')}
                                className="rounded-full p-0.5 hover:bg-stone-200 text-stone-400 hover:text-stone-700 transition"
                            >
                                <X size={12} strokeWidth={2.5} />
                            </button>
                        </span>
                    )}
                    {selectedShopId !== '' && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-bold text-stone-700 shadow-sm">
                            <span>Shop: {shops.find(s => String(s.id) === String(selectedShopId))?.shop_name || 'Selected Shop'}</span>
                            <button
                                type="button"
                                onClick={() => onShopFilterChange('')}
                                className="rounded-full p-0.5 hover:bg-stone-200 text-stone-400 hover:text-stone-700 transition"
                            >
                                <X size={12} strokeWidth={2.5} />
                            </button>
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={resetFilters}
                        className="text-[11px] font-bold text-clay-700 hover:underline ml-1"
                    >
                        Clear All
                    </button>
                </div>
            )}

            {/* Mobile Bottom-Sheet Filter Drawer */}
            <SlideOverDrawer
                show={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                title="Filter Moderation Catalog"
                position="bottom"
                widthClass="max-w-md"
                footer={
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={resetFilters}
                            className="flex-1 rounded-xl border border-stone-200 bg-white py-2.5 text-xs font-bold text-stone-700 min-h-[44px]"
                        >
                            Reset All
                        </button>
                        <button
                            type="button"
                            onClick={applyDraftFilters}
                            className="flex-1 rounded-xl bg-clay-700 py-2.5 text-xs font-bold text-white shadow-lg shadow-clay-200 min-h-[44px]"
                        >
                            Apply Filters
                        </button>
                    </div>
                }
            >
                <div className="py-2 space-y-4">
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 mb-1.5">
                            Listing Status
                        </label>
                        <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                            <select
                                value={draftStatus}
                                onChange={(e) => setDraftStatus(e.target.value)}
                                className="pl-9 pr-8 text-xs py-2 w-full min-h-[40px] bg-white border border-stone-200 hover:border-stone-300 rounded-xl font-bold text-stone-700 focus:border-clay-500 focus:ring focus:ring-clay-500/10 transition-all cursor-pointer"
                            >
                                <option value="pending_review">Pending Review ({statusCounts?.pending_review || 0})</option>
                                <option value="Active">Approved / Active ({statusCounts?.Active || 0})</option>
                                <option value="rejected">Rejected ({statusCounts?.rejected || 0})</option>
                                <option value="flagged">Flagged ({statusCounts?.flagged || 0})</option>
                                <option value="all">All Listings ({statusCounts?.all || 0})</option>
                            </select>
                        </div>
                    </div>

                    {shops.length > 0 && (
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 mb-1.5">
                                Artisan Shop
                            </label>
                            <div className="relative">
                                <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                                <select
                                    value={draftShopId}
                                    onChange={(e) => setDraftShopId(e.target.value)}
                                    className="pl-9 pr-8 text-xs py-2 w-full min-h-[40px] bg-white border border-stone-200 hover:border-stone-300 rounded-xl font-bold text-stone-700 focus:border-clay-500 focus:ring focus:ring-clay-500/10 transition-all cursor-pointer"
                                >
                                    <option value="">All Artisan Shops ({shops.length})</option>
                                    {shops.map((shop) => (
                                        <option key={shop.id} value={shop.id}>
                                            {shop.shop_name || shop.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </div>
            </SlideOverDrawer>
        </div>
    );
}
