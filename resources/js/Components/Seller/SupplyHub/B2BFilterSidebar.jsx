import React, { useState, useEffect } from 'react';
import { 
    SlidersHorizontal, Check, MapPin, ChevronDown, 
    Search, Tag, Package, X, RotateCcw, Boxes, Percent 
} from 'lucide-react';

export default function B2BFilterSidebar({
    categories = [],
    categoryCounts = {},
    availableLocations = [],
    locationCounts = {},
    filters = {},
    onFilterChange,
    onReset,
    activeCategory = 'All',
    minPrice = '',
    maxPrice = '',
    selectedLocations = [],
    hasWholesale = false,
    moqTier = 'all',
    onCategoryClick,
    onPriceChange,
    onApplyPrice,
    onLocationChange,
    onWholesaleToggle,
    onMoqTierChange,
    onClearAll,
    activeFilterCount: propActiveFilterCount,
    className = '',
}) {
    // Resolve props vs filters object
    const currentCategory = filters?.category || activeCategory || 'All';
    const currentMinPrice = filters?.price_min !== undefined && filters?.price_min !== null 
        ? String(filters.price_min) 
        : (minPrice !== undefined && minPrice !== null ? String(minPrice) : '');
    const currentMaxPrice = filters?.price_max !== undefined && filters?.price_max !== null 
        ? String(filters.price_max) 
        : (maxPrice !== undefined && maxPrice !== null ? String(maxPrice) : '');
    const currentLocations = filters?.locations
        ? (typeof filters.locations === 'string' ? filters.locations.split(',').filter(Boolean) : filters.locations)
        : (selectedLocations || []);
    const currentHasWholesale = filters?.has_wholesale !== undefined ? Boolean(filters.has_wholesale) : Boolean(hasWholesale);
    const currentMoqTier = filters?.moq_tier || moqTier || 'all';

    // Local price inputs for smooth typing before applying
    const [priceMinInput, setPriceMinInput] = useState(currentMinPrice || '');
    const [priceMaxInput, setPriceMaxInput] = useState(currentMaxPrice || '');

    useEffect(() => {
        setPriceMinInput(currentMinPrice || '');
    }, [currentMinPrice]);

    useEffect(() => {
        setPriceMaxInput(currentMaxPrice || '');
    }, [currentMaxPrice]);

    // Accordion expand states
    const [isCategoryExpanded, setIsCategoryExpanded] = useState(true);
    const [isPriceExpanded, setIsPriceExpanded] = useState(true);
    const [isMoqExpanded, setIsMoqExpanded] = useState(true);
    const [isLocationExpanded, setIsLocationExpanded] = useState(false);
    const [locationSearch, setLocationSearch] = useState('');

    const filteredLocations = availableLocations.filter(loc =>
        loc.toLowerCase().includes(locationSearch.toLowerCase())
    );

    const moqOptions = [
        { value: 'all', label: 'All Minimums' },
        { value: 'low', label: 'Sample (1–5)' },
        { value: 'mid', label: 'Batch (6–15)' },
        { value: 'high', label: 'Bulk (16+)' },
    ];

    // Compute active filter count if not provided
    const computedActiveCount = React.useMemo(() => {
        if (propActiveFilterCount !== undefined) return propActiveFilterCount;
        let count = 0;
        if (currentCategory && currentCategory !== 'All') count++;
        if (currentMinPrice || currentMaxPrice) count++;
        if (currentLocations.length > 0) count++;
        if (currentHasWholesale) count++;
        if (currentMoqTier && currentMoqTier !== 'all') count++;
        return count;
    }, [propActiveFilterCount, currentCategory, currentMinPrice, currentMaxPrice, currentLocations, currentHasWholesale, currentMoqTier]);

    // Handlers
    const handleCategoryClick = (cat) => {
        if (onFilterChange) {
            onFilterChange('category', cat);
        } else if (onCategoryClick) {
            onCategoryClick(cat);
        }
    };

    const handleApplyPriceFilter = () => {
        if (onFilterChange) {
            onFilterChange('price_min', priceMinInput);
            onFilterChange('price_max', priceMaxInput);
        } else if (onApplyPrice) {
            onApplyPrice();
        }
    };

    const handleWholesaleChange = (e) => {
        const checked = e.target.checked;
        if (onFilterChange) {
            onFilterChange('has_wholesale', checked);
        } else if (onWholesaleToggle) {
            onWholesaleToggle(e);
        }
    };

    const handleLocationToggle = (loc) => {
        const next = currentLocations.includes(loc)
            ? currentLocations.filter(l => l !== loc)
            : [...currentLocations, loc];

        if (onFilterChange) {
            onFilterChange('locations', next.join(','));
        } else if (onLocationChange) {
            onLocationChange(loc);
        }
    };

    const handleMoqTierSelect = (tier) => {
        if (onFilterChange) {
            onFilterChange('moq_tier', tier);
        } else if (onMoqTierChange) {
            onMoqTierChange(tier);
        }
    };

    const handleReset = () => {
        setPriceMinInput('');
        setPriceMaxInput('');
        if (onReset) {
            onReset();
        } else if (onClearAll) {
            onClearAll();
        }
    };

    return (
        <aside className={`space-y-3 ${className}`}>
            {/* Filter Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-stone-200">
                <h2 className="font-bold text-stone-900 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                    <SlidersHorizontal size={13} className="text-clay-600" />
                    <span>Filters</span>
                    {computedActiveCount > 0 && (
                        <span className="bg-clay-600 text-white text-[10px] font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center shadow-2xs">
                            {computedActiveCount}
                        </span>
                    )}
                </h2>
                {computedActiveCount > 0 && (
                    <button
                        type="button"
                        onClick={handleReset}
                        className="text-xs font-bold text-clay-600 hover:text-clay-700 hover:underline transition-all cursor-pointer"
                    >
                        Clear All
                    </button>
                )}
            </div>

            {/* 1. Categories Card */}
            <div className="bg-white rounded-2xl border border-stone-200 p-3 sm:p-3.5 shadow-2xs space-y-2.5">
                <button
                    type="button"
                    onClick={() => setIsCategoryExpanded(!isCategoryExpanded)}
                    className="w-full flex items-center justify-between font-bold text-stone-900 text-left uppercase tracking-wider text-[11px] cursor-pointer"
                >
                    <span>Material Categories</span>
                    <ChevronDown size={14} className={`text-stone-400 transition-transform duration-200 ${isCategoryExpanded ? 'rotate-180' : ''}`} />
                </button>

                {isCategoryExpanded && (
                    <div className="space-y-1 pt-0.5">
                        {categories.map((cat) => {
                            const count = cat === 'All'
                                ? Object.values(categoryCounts).reduce((a, b) => a + b, 0)
                                : (categoryCounts[cat] || 0);
                            const isSelected = currentCategory === cat;

                            return (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => handleCategoryClick(cat)}
                                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl font-medium transition-colors text-left text-xs cursor-pointer ${
                                        isSelected 
                                            ? 'bg-clay-50 text-clay-800 font-bold border border-clay-200/70 shadow-2xs' 
                                            : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                                    }`}
                                >
                                    <span className="truncate">{cat}</span>
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-clay-600 text-white font-bold' : 'text-stone-400'}`}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* 2. Order MOQ Card */}
            <div className="bg-white rounded-2xl border border-stone-200 p-3 sm:p-3.5 shadow-2xs space-y-2.5">
                <button
                    type="button"
                    onClick={() => setIsMoqExpanded(!isMoqExpanded)}
                    className="w-full flex items-center justify-between font-bold text-stone-900 text-left uppercase tracking-wider text-[11px] cursor-pointer"
                >
                    <span>Minimum Order</span>
                    <ChevronDown size={14} className={`text-stone-400 transition-transform duration-200 ${isMoqExpanded ? 'rotate-180' : ''}`} />
                </button>

                {isMoqExpanded && (
                    <div className="space-y-1 pt-0.5">
                        {moqOptions.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => handleMoqTierSelect(opt.value)}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl font-medium transition-colors text-left text-xs cursor-pointer ${
                                    currentMoqTier === opt.value
                                        ? 'bg-stone-900 text-white font-bold shadow-2xs'
                                        : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                                }`}
                            >
                                <span className="truncate">{opt.label}</span>
                                {currentMoqTier === opt.value && (
                                    <Check size={12} className="text-white shrink-0 ml-1" />
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* 3. Price Range (₱) Card */}
            <div className="bg-white rounded-2xl border border-stone-200 p-3 sm:p-3.5 shadow-2xs space-y-2.5">
                <button
                    type="button"
                    onClick={() => setIsPriceExpanded(!isPriceExpanded)}
                    className="w-full flex items-center justify-between font-bold text-stone-900 text-left uppercase tracking-wider text-[11px] cursor-pointer"
                >
                    <span>Price Range (₱)</span>
                    <ChevronDown size={14} className={`text-stone-400 transition-transform duration-200 ${isPriceExpanded ? 'rotate-180' : ''}`} />
                </button>

                {isPriceExpanded && (
                    <div className="space-y-2 pt-0.5">
                        <div className="flex items-center gap-1.5">
                            <input
                                type="number"
                                min="0"
                                value={priceMinInput ?? ''}
                                onChange={(e) => {
                                    setPriceMinInput(e.target.value);
                                    if (onPriceChange) onPriceChange('min', e.target.value);
                                }}
                                onKeyDown={(e) => e.key === 'Enter' && handleApplyPriceFilter()}
                                placeholder="Min"
                                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-2.5 py-1.5 text-xs text-stone-900 focus:border-clay-500 focus:ring-1 focus:ring-clay-500 font-semibold"
                            />
                            <span className="text-stone-400 text-xs font-bold">—</span>
                            <input
                                type="number"
                                min="0"
                                value={priceMaxInput ?? ''}
                                onChange={(e) => {
                                    setPriceMaxInput(e.target.value);
                                    if (onPriceChange) onPriceChange('max', e.target.value);
                                }}
                                onKeyDown={(e) => e.key === 'Enter' && handleApplyPriceFilter()}
                                placeholder="Max"
                                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-2.5 py-1.5 text-xs text-stone-900 focus:border-clay-500 focus:ring-1 focus:ring-clay-500 font-semibold"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={handleApplyPriceFilter}
                            className="w-full rounded-xl bg-stone-900 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-stone-800 transition-colors cursor-pointer"
                        >
                            Apply Price
                        </button>
                    </div>
                )}
            </div>

            {/* 4. Bulk Volume Discounts Card */}
            <div className="bg-white rounded-2xl border border-stone-200 p-3 sm:p-3.5 shadow-2xs">
                <label className="flex items-center justify-between gap-2 cursor-pointer">
                    <span className="text-xs text-stone-700 font-semibold flex items-center gap-1.5">
                        <Percent size={13} className="text-emerald-600" />
                        Bulk Discounts Only
                    </span>
                    <input
                        type="checkbox"
                        checked={currentHasWholesale}
                        onChange={handleWholesaleChange}
                        className="h-4 w-4 rounded border-stone-300 text-clay-600 focus:ring-clay-500 cursor-pointer"
                    />
                </label>
            </div>

            {/* 5. Supplier Location Card */}
            {availableLocations.length > 0 && (
                <div className="bg-white rounded-2xl border border-stone-200 p-3 sm:p-3.5 shadow-2xs space-y-2.5">
                    <button
                        type="button"
                        onClick={() => setIsLocationExpanded(!isLocationExpanded)}
                        className="w-full flex items-center justify-between font-bold text-stone-900 text-left uppercase tracking-wider text-[11px] cursor-pointer"
                    >
                        <span>Store Location</span>
                        <ChevronDown size={14} className={`text-stone-400 transition-transform duration-200 ${isLocationExpanded ? 'rotate-180' : ''}`} />
                    </button>

                    {isLocationExpanded && (
                        <div className="space-y-2 pt-0.5">
                            {availableLocations.length > 4 && (
                                <div className="relative">
                                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                                    <input
                                        type="text"
                                        value={locationSearch ?? ''}
                                        onChange={(e) => setLocationSearch(e.target.value)}
                                        placeholder="Search locations..."
                                        className="w-full rounded-lg border border-stone-200 bg-stone-50/50 pl-7 pr-2 py-1 text-[11px] text-stone-900"
                                    />
                                </div>
                            )}
                            <div className="space-y-1 max-h-36 overflow-y-auto pr-1 no-scrollbar">
                                {filteredLocations.map((loc) => {
                                    const isChecked = currentLocations.includes(loc);
                                    const count = locationCounts[loc] || 0;

                                    return (
                                        <label
                                            key={loc}
                                            className="flex items-center justify-between gap-1.5 px-1 py-0.5 rounded-lg hover:bg-stone-50 cursor-pointer text-xs"
                                        >
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => handleLocationToggle(loc)}
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
        </aside>
    );
}
