import React from 'react';
import { Search, SlidersHorizontal, ArrowUpDown, X } from 'lucide-react';

export default function SourcingCatalogToolbar({
    searchInput,
    setSearchInput,
    onSearchSubmit,
    onClearSearch,
    sort,
    onSortChange,
    activeFiltersCount,
    onOpenMobileFilters,
    filters,
    onRemoveFilter,
    onResetAllFilters,
}) {
    return (
        <div className="space-y-2.5 sm:space-y-3">
            {/* Unified Single-Row Toolbar */}
            <div className="flex items-center gap-2 sm:gap-3 bg-white p-2.5 sm:p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
                {/* Search Input Form */}
                <form onSubmit={onSearchSubmit} className="relative flex-1 min-w-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={15} />
                    <input
                        type="text"
                        value={searchInput ?? ''}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Search materials..."
                        className="w-full pl-8.5 pr-8 py-2 rounded-xl border border-stone-200 bg-stone-50/50 text-xs text-stone-900 placeholder:text-stone-400 focus:border-clay-500 focus:bg-white focus:ring-1 focus:ring-clay-500 transition-all font-medium min-h-[38px]"
                    />
                    {searchInput && (
                        <button
                            type="button"
                            onClick={onClearSearch}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5"
                            aria-label="Clear search"
                        >
                            <X size={13} />
                        </button>
                    )}
                </form>

                {/* Sort Dropdown */}
                <div className="flex items-center gap-1 bg-stone-50 border border-stone-200 rounded-xl px-2 sm:px-2.5 py-1 shrink-0 min-h-[38px]">
                    <ArrowUpDown size={13} className="text-stone-400 shrink-0" />
                    <select
                        value={sort}
                        onChange={(e) => onSortChange(e.target.value)}
                        className="bg-transparent border-0 text-xs font-bold text-stone-700 py-1 pl-0.5 pr-5 focus:ring-0 cursor-pointer"
                    >
                        <option value="newest">Newest</option>
                        <option value="price_low">Price: Low to High</option>
                        <option value="price_high">Price: High to Low</option>
                        <option value="moq_low">Lowest Min. Order</option>
                        <option value="weight_low">Lightest Weight</option>
                    </select>
                </div>

                {/* Mobile Filters Trigger */}
                <button
                    type="button"
                    onClick={onOpenMobileFilters}
                    className={`lg:hidden flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition shrink-0 cursor-pointer min-h-[38px] ${
                        activeFiltersCount > 0
                            ? 'bg-clay-50 border-clay-300 text-clay-800'
                            : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                    }`}
                    title="Open Filters"
                >
                    <SlidersHorizontal size={14} className={activeFiltersCount > 0 ? 'text-clay-600' : 'text-stone-400'} />
                    <span className="hidden sm:inline">Filters</span>
                    {activeFiltersCount > 0 && (
                        <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-clay-600 text-[10px] font-bold text-white px-1">
                            {activeFiltersCount}
                        </span>
                    )}
                </button>
            </div>

            {/* Active Filter Chips */}
            {activeFiltersCount > 0 && (
                <div className="flex flex-wrap items-center gap-2 px-1">
                    <span className="text-[11px] font-black uppercase tracking-wider text-stone-400">Active Filters:</span>

                    {filters.search && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-stone-700 text-xs font-medium shadow-2xs">
                            Search: &ldquo;{filters.search}&rdquo;
                            <button type="button" onClick={() => onRemoveFilter('search')} className="text-stone-400 hover:text-stone-700">
                                <X size={12} />
                            </button>
                        </span>
                    )}

                    {filters.category && filters.category !== 'All' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-clay-50 border border-clay-200 text-clay-800 text-xs font-semibold shadow-2xs">
                            Category: {filters.category}
                            <button type="button" onClick={() => onRemoveFilter('category')} className="text-clay-500 hover:text-clay-800">
                                <X size={12} />
                            </button>
                        </span>
                    )}

                    {(filters.price_min || filters.price_max) && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-stone-700 text-xs font-medium shadow-2xs">
                            Price: ₱{filters.price_min || 0} &ndash; {filters.price_max ? `₱${filters.price_max}` : 'Any'}
                            <button type="button" onClick={() => onRemoveFilter('price')} className="text-stone-400 hover:text-stone-700">
                                <X size={12} />
                            </button>
                        </span>
                    )}

                    {filters.locations && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-stone-700 text-xs font-medium shadow-2xs">
                            Hubs: {filters.locations}
                            <button type="button" onClick={() => onRemoveFilter('locations')} className="text-stone-400 hover:text-stone-700">
                                <X size={12} />
                            </button>
                        </span>
                    )}

                    {filters.has_wholesale && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold shadow-2xs">
                            Wholesale Discount Tier Only
                            <button type="button" onClick={() => onRemoveFilter('has_wholesale')} className="text-amber-500 hover:text-amber-800">
                                <X size={12} />
                            </button>
                        </span>
                    )}

                    {filters.moq_tier && filters.moq_tier !== 'all' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-stone-700 text-xs font-medium shadow-2xs">
                            MOQ: {filters.moq_tier === 'low' ? '1 - 5 units' : filters.moq_tier === 'mid' ? '6 - 15 units' : '16+ units'}
                            <button type="button" onClick={() => onRemoveFilter('moq_tier')} className="text-stone-400 hover:text-stone-700">
                                <X size={12} />
                            </button>
                        </span>
                    )}

                    <button
                        type="button"
                        onClick={onResetAllFilters}
                        className="text-xs font-bold text-clay-700 hover:text-clay-900 underline underline-offset-2 ml-1 cursor-pointer"
                    >
                        Clear all
                    </button>
                </div>
            )}
        </div>
    );
}
