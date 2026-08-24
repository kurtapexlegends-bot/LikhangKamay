import React, { useState } from 'react';
import { 
    SlidersHorizontal, Check, MapPin, ChevronDown, 
    Search, Tag, Package, X, RotateCcw 
} from 'lucide-react';

export default function B2BFilterSidebar({
    categories = [],
    categoryCounts = {},
    availableLocations = [],
    locationCounts = {},
    activeCategory = 'All',
    minPrice = '',
    maxPrice = '',
    selectedLocations = [],
    hasWholesale = false,
    onCategoryClick,
    onPriceChange,
    onApplyPrice,
    onLocationChange,
    onWholesaleToggle,
    onClearAll,
    activeFilterCount = 0,
    className = '',
}) {
    const [isCategoryExpanded, setIsCategoryExpanded] = useState(true);
    const [isPriceExpanded, setIsPriceExpanded] = useState(true);
    const [isLocationExpanded, setIsLocationExpanded] = useState(true);
    const [isWholesaleExpanded, setIsWholesaleExpanded] = useState(true);
    const [locationSearch, setLocationSearch] = useState('');

    const filteredLocations = availableLocations.filter(loc =>
        loc.toLowerCase().includes(locationSearch.toLowerCase())
    );

    return (
        <aside className={`space-y-4 ${className}`}>
            {/* Filter Header */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <h2 className="font-bold text-stone-900 flex items-center gap-2 text-xs uppercase tracking-wider">
                    <SlidersHorizontal size={13} className="text-clay-600" />
                    Filters
                    {activeFilterCount > 0 && (
                        <span className="bg-clay-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-2xs">
                            {activeFilterCount}
                        </span>
                    )}
                </h2>
                {activeFilterCount > 0 && (
                    <button
                        type="button"
                        onClick={onClearAll}
                        className="text-xs font-bold text-clay-600 hover:text-clay-700 hover:underline transition-all"
                    >
                        Clear All
                    </button>
                )}
            </div>

            {/* Unified Card Container */}
            <div className="bg-white rounded-2xl border border-stone-200/80 shadow-2xs divide-y divide-stone-150 overflow-hidden text-xs">
                {/* 1. Categories Accordion */}
                <div className="p-4 space-y-3">
                    <button
                        type="button"
                        onClick={() => setIsCategoryExpanded(!isCategoryExpanded)}
                        className="w-full flex items-center justify-between font-bold text-stone-900 text-left uppercase tracking-wider text-[11px]"
                    >
                        <span>Material Categories</span>
                        <ChevronDown size={14} className={`text-stone-400 transition-transform ${isCategoryExpanded ? 'rotate-180' : ''}`} />
                    </button>

                    {isCategoryExpanded && (
                        <div className="space-y-1 pt-1">
                            {categories.map((cat) => {
                                const count = cat === 'All'
                                    ? Object.values(categoryCounts).reduce((a, b) => a + b, 0)
                                    : (categoryCounts[cat] || 0);
                                const isSelected = activeCategory === cat;

                                return (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => onCategoryClick(cat)}
                                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl font-medium transition-colors text-left ${
                                            isSelected 
                                                ? 'bg-clay-50 text-clay-800 font-bold border border-clay-200/60' 
                                                : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                                        }`}
                                    >
                                        <span className="truncate">{cat}</span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-clay-600 text-white font-bold' : 'text-stone-400'}`}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* 2. Price Range (₱) Accordion */}
                <div className="p-4 space-y-3">
                    <button
                        type="button"
                        onClick={() => setIsPriceExpanded(!isPriceExpanded)}
                        className="w-full flex items-center justify-between font-bold text-stone-900 text-left uppercase tracking-wider text-[11px]"
                    >
                        <span>Price Range (₱)</span>
                        <ChevronDown size={14} className={`text-stone-400 transition-transform ${isPriceExpanded ? 'rotate-180' : ''}`} />
                    </button>

                    {isPriceExpanded && (
                        <div className="space-y-2.5 pt-1">
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min="0"
                                    value={minPrice}
                                    onChange={(e) => onPriceChange('min', e.target.value)}
                                    placeholder="Min"
                                    className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-2.5 py-1.5 text-xs text-stone-900 focus:border-clay-500 focus:ring-1 focus:ring-clay-500"
                                />
                                <span className="text-stone-400 text-[11px]">—</span>
                                <input
                                    type="number"
                                    min="0"
                                    value={maxPrice}
                                    onChange={(e) => onPriceChange('max', e.target.value)}
                                    placeholder="Max"
                                    className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-2.5 py-1.5 text-xs text-stone-900 focus:border-clay-500 focus:ring-1 focus:ring-clay-500"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={onApplyPrice}
                                className="w-full rounded-xl bg-stone-900 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-stone-800 transition-colors"
                            >
                                Apply Price
                            </button>
                        </div>
                    )}
                </div>

                {/* 3. Supplier Studio Location Accordion */}
                {availableLocations.length > 0 && (
                    <div className="p-4 space-y-3">
                        <button
                            type="button"
                            onClick={() => setIsLocationExpanded(!isLocationExpanded)}
                            className="w-full flex items-center justify-between font-bold text-stone-900 text-left uppercase tracking-wider text-[11px]"
                        >
                            <span>Supplier Location</span>
                            <ChevronDown size={14} className={`text-stone-400 transition-transform ${isLocationExpanded ? 'rotate-180' : ''}`} />
                        </button>

                        {isLocationExpanded && (
                            <div className="space-y-2 pt-1">
                                {availableLocations.length > 4 && (
                                    <div className="relative">
                                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                                        <input
                                            type="text"
                                            value={locationSearch}
                                            onChange={(e) => setLocationSearch(e.target.value)}
                                            placeholder="Filter locations..."
                                            className="w-full rounded-lg border border-stone-200 bg-stone-50/50 pl-7 pr-2 py-1 text-[11px] text-stone-900"
                                        />
                                    </div>
                                )}
                                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 no-scrollbar">
                                    {filteredLocations.map((loc) => {
                                        const isChecked = selectedLocations.includes(loc);
                                        const count = locationCounts[loc] || 0;

                                        return (
                                            <label
                                                key={loc}
                                                className="flex items-center justify-between gap-2 px-1 py-1 rounded-lg hover:bg-stone-50 cursor-pointer"
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => onLocationChange(loc)}
                                                        className="h-3.5 w-3.5 rounded border-stone-300 text-clay-600 focus:ring-clay-500 cursor-pointer"
                                                    />
                                                    <span className="truncate text-stone-700">{loc}</span>
                                                </div>
                                                <span className="text-[10px] text-stone-400 font-mono">({count})</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 4. Wholesale Volume Discounts Accordion */}
                <div className="p-4 space-y-3">
                    <button
                        type="button"
                        onClick={() => setIsWholesaleExpanded(!isWholesaleExpanded)}
                        className="w-full flex items-center justify-between font-bold text-stone-900 text-left uppercase tracking-wider text-[11px]"
                    >
                        <span>Wholesale Tiers</span>
                        <ChevronDown size={14} className={`text-stone-400 transition-transform ${isWholesaleExpanded ? 'rotate-180' : ''}`} />
                    </button>

                    {isWholesaleExpanded && (
                        <div className="pt-1">
                            <label className="flex items-center gap-2 px-1 py-1 rounded-lg hover:bg-stone-50 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={hasWholesale}
                                    onChange={onWholesaleToggle}
                                    className="h-3.5 w-3.5 rounded border-stone-300 text-clay-600 focus:ring-clay-500 cursor-pointer"
                                />
                                <span className="text-stone-700 font-semibold">Bulk Discount Deals Only</span>
                            </label>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}
