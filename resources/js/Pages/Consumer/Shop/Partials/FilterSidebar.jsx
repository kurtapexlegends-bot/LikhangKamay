import React, { useState } from 'react';
import { SlidersHorizontal, Check, Star, Sparkles, MapPin, ChevronDown, Search, LayoutGrid } from 'lucide-react';

export default function FilterSidebar({
    categories,
    availableLocations,
    availableMaterials,
    categoryCounts = {},
    materialCounts = {},
    locationCounts = {},
    activeCategory,
    minPrice, setMinPrice,
    maxPrice, setMaxPrice,
    minRating,
    selectedLocations,
    selectedMaterials,
    activeFilterCount,
    onCategoryClick,
    onApplyPrice,
    onRatingChange,
    onMaterialChange,
    onLocationChange,
    onClearAll,
    className = ''
}) {
    // Accordion toggle states
    const [isCategoryExpanded, setIsCategoryExpanded] = useState(true);
    const [isLocationExpanded, setIsLocationExpanded] = useState(true);
    const [isMaterialExpanded, setIsMaterialExpanded] = useState(true);
    
    // Quick search filters for large lists
    const [categorySearch, setCategorySearch] = useState('');
    const [materialSearch, setMaterialSearch] = useState('');
    const [locationSearch, setLocationSearch] = useState('');
    const [showAllCategories, setShowAllCategories] = useState(false);
    
    const [priceError, setPriceError] = useState('');

    // Rating options
    const ratingOptions = [
        { value: '', label: 'Any Rating' },
        { value: '4', label: '4★ & Up' },
        { value: '3', label: '3★ & Up' },
        { value: '2', label: '2★ & Up' },
    ];

    const handlePriceSubmit = () => {
        if (minPrice && maxPrice && Number(minPrice) > Number(maxPrice)) {
            setPriceError('Min cannot exceed Max');
            return;
        }
        setPriceError('');
        onApplyPrice();
    };

    // Filtered lists
    const filteredCategories = categories.filter(cat => 
        cat.toLowerCase().includes(categorySearch.toLowerCase())
    );

    const visibleCategories = showAllCategories || categorySearch
        ? filteredCategories
        : filteredCategories.slice(0, 6);

    const filteredMaterials = availableMaterials.filter(mat => 
        mat.toLowerCase().includes(materialSearch.toLowerCase())
    );

    const filteredLocations = availableLocations.filter(loc => 
        loc.toLowerCase().includes(locationSearch.toLowerCase())
    );

    return (
        <aside className={`space-y-4 ${className}`}>
            
            {/* Filter Header */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-200/50">
                <h2 className="font-serif font-black text-stone-900 flex items-center gap-2 text-sm uppercase tracking-wider">
                    <SlidersHorizontal size={14} className="text-clay-600" />
                    Filters
                    {activeFilterCount > 0 && (
                        <span className="bg-clay-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                            {activeFilterCount}
                        </span>
                    )}
                </h2>
                {activeFilterCount > 0 && (
                    <button 
                        onClick={onClearAll}
                        className="text-xs font-bold text-clay-600 hover:text-clay-700 hover:underline transition-all active:scale-95"
                    >
                        Clear All
                    </button>
                )}
            </div>

            {/* Unified Card Container */}
            <div className="bg-white rounded-2xl border border-stone-200/50 shadow-sm divide-y divide-stone-150 overflow-hidden">
                
                {/* Categories */}
                <div className="p-4">
                    <button 
                        onClick={() => setIsCategoryExpanded(!isCategoryExpanded)}
                        className="w-full font-bold text-stone-850 text-[10px] uppercase tracking-wider flex items-center justify-between select-none mb-1"
                    >
                        <span className="flex items-center gap-1.5">
                            <LayoutGrid size={12} className="text-clay-600" /> Categories
                            {activeCategory && activeCategory !== 'All' && (
                                <span className="bg-clay-100 text-clay-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                                    1
                                </span>
                            )}
                        </span>
                        <ChevronDown size={14} className={`text-stone-400 transition-transform duration-300 ${isCategoryExpanded ? 'transform rotate-180' : ''}`} />
                    </button>

                    {isCategoryExpanded && (
                        <div className="mt-3">
                            {categories.length > 6 && (
                                <div className="relative mb-2">
                                    <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                                    <input 
                                        type="text" 
                                        placeholder="Search categories..."
                                        value={categorySearch}
                                        onChange={(e) => setCategorySearch(e.target.value)}
                                        className="w-full bg-stone-50 border border-stone-200 rounded-lg text-[11px] py-1.5 pl-7 pr-2 focus:ring-1 focus:ring-clay-200 focus:border-clay-400 focus:bg-white transition duration-200"
                                    />
                                </div>
                            )}

                            <ul className={`space-y-1 pr-0.5 transition-all duration-300 ${showAllCategories || categorySearch ? 'max-h-96 overflow-y-auto' : 'max-h-none'}`}>
                                {visibleCategories.map((cat) => (
                                    <li key={cat}>
                                        <button 
                                            onClick={() => onCategoryClick(cat)}
                                            className={`text-xs w-full text-left py-2 px-3 rounded-xl transition-all duration-200 active:scale-95 flex justify-between items-center font-bold border ${
                                                activeCategory === cat 
                                                ? 'bg-clay-50 text-clay-700 border-clay-200/60 shadow-sm' 
                                                : 'text-stone-600 hover:bg-stone-50 hover:text-clay-600 border-transparent'
                                            }`}
                                        >
                                            <span className="truncate">{cat}</span>
                                            {activeCategory === cat && <Check size={12} className="text-clay-600 flex-shrink-0" />}
                                        </button>
                                    </li>
                                ))}
                            </ul>

                            {categories.length > 6 && !categorySearch && (
                                <button
                                    type="button"
                                    onClick={() => setShowAllCategories(prev => !prev)}
                                    className="text-[11px] font-bold text-clay-600 hover:text-clay-700 hover:underline mt-2.5 transition-colors cursor-pointer block"
                                >
                                    {showAllCategories ? '- Show Less' : `+ Show More (${categories.length - 6})`}
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Price Range */}
                <div className="p-4">
                    <h3 className="font-bold text-stone-850 text-[10px] uppercase tracking-wider mb-3">Price Range</h3>
                    <div className="flex gap-2 mb-2">
                        <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-bold">₱</span>
                            <input 
                                type="number" min="0" step="any" placeholder="Min" value={minPrice}
                                onKeyDown={(e) => {
                                    if (e.key === '-') e.preventDefault();
                                    if (e.key === 'Enter') { e.preventDefault(); handlePriceSubmit(); }
                                }}
                                onChange={(e) => { setPriceError(''); setMinPrice(e.target.value.replace(/-/g, "")); }}
                                className="w-full bg-stone-50 border border-stone-200 rounded-xl text-xs py-2 pl-6 pr-2 focus:ring-1 focus:ring-clay-200 focus:border-clay-400 focus:bg-white transition duration-200"
                            />
                        </div>
                        <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-bold">₱</span>
                            <input 
                                type="number" min="0" step="any" placeholder="Max" value={maxPrice}
                                onKeyDown={(e) => {
                                    if (e.key === '-') e.preventDefault();
                                    if (e.key === 'Enter') { e.preventDefault(); handlePriceSubmit(); }
                                }}
                                onChange={(e) => { setPriceError(''); setMaxPrice(e.target.value.replace(/-/g, "")); }}
                                className="w-full bg-stone-50 border border-stone-200 rounded-xl text-xs py-2 pl-6 pr-2 focus:ring-1 focus:ring-clay-200 focus:border-clay-400 focus:bg-white transition duration-200"
                            />
                        </div>
                    </div>
                    {priceError && (
                        <p className="text-[10px] font-semibold text-red-500 mb-2">{priceError}</p>
                    )}
                    <button 
                        onClick={handlePriceSubmit}
                        className="w-full bg-clay-600 hover:bg-clay-700 text-white text-xs font-bold py-2.5 rounded-xl transition duration-200 active:scale-95 shadow-sm min-h-[40px] flex items-center justify-center border border-clay-600 hover:border-clay-700"
                    >
                        Apply Price
                    </button>
                    <p className="text-[9px] text-stone-400 text-center mt-1.5 font-medium">Press Enter to apply price filter</p>
                </div>

                {/* Rating Filter */}
                <div className="p-4">
                    <h3 className="font-bold text-stone-850 text-[10px] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Star size={12} className="text-amber-500 fill-amber-400" /> Rating
                    </h3>
                    <div className="space-y-1">
                        {ratingOptions.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => onRatingChange(option.value)}
                                className={`w-full text-left py-2 px-3 rounded-xl text-xs transition duration-200 active:scale-95 flex items-center gap-2 font-bold border ${
                                    minRating === option.value
                                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                                        : 'text-stone-600 hover:bg-stone-50 border-transparent'
                                }`}
                            >
                                {option.value && (
                                    <span className="flex items-center gap-0.5">
                                        {[...Array(parseInt(option.value))].map((_, i) => (
                                            <Star key={i} size={10} className="fill-amber-400 text-amber-400" />
                                        ))}
                                    </span>
                                )}
                                <span>{option.label}</span>
                                {minRating === option.value && <Check size={12} className="ml-auto text-amber-700" />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Material / Clay Type Filter */}
                {availableMaterials.length > 0 && (
                    <div className="p-4">
                        <button 
                            onClick={() => setIsMaterialExpanded(!isMaterialExpanded)}
                            className="w-full font-bold text-stone-850 text-[10px] uppercase tracking-wider flex items-center justify-between select-none"
                        >
                            <span className="flex items-center gap-1.5">
                                <Sparkles size={12} className="text-clay-600" /> Material
                                {selectedMaterials.length > 0 && (
                                    <span className="bg-clay-100 text-clay-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                                        {selectedMaterials.length}
                                    </span>
                                )}
                            </span>
                            <ChevronDown size={14} className={`text-stone-400 transition-transform duration-300 ${isMaterialExpanded ? 'transform rotate-180' : ''}`} />
                        </button>
                        {isMaterialExpanded && (
                            <div className="mt-3">
                                {availableMaterials.length > 6 && (
                                    <div className="relative mb-2">
                                        <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                                        <input 
                                            type="text" 
                                            placeholder="Search materials..."
                                            value={materialSearch}
                                            onChange={(e) => setMaterialSearch(e.target.value)}
                                            className="w-full bg-stone-50 border border-stone-200 rounded-lg text-[11px] py-1.5 pl-7 pr-2 focus:ring-1 focus:ring-clay-200 focus:border-clay-400 focus:bg-white transition duration-200"
                                        />
                                    </div>
                                )}
                                <div className="space-y-2.5 max-h-40 overflow-y-auto pt-1 pr-0.5">
                                    {filteredMaterials.map(material => {
                                        const count = materialCounts?.[material];
                                        return (
                                            <label key={material} className="flex items-center gap-2.5 text-xs font-bold text-stone-650 cursor-pointer hover:text-stone-900 group select-none">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedMaterials.includes(material)}
                                                    onChange={() => onMaterialChange(material)}
                                                    className="w-4 h-4 rounded border-stone-300 text-clay-600 focus:ring-clay-500 cursor-pointer transition duration-200" 
                                                />
                                                <span className="capitalize flex-1 truncate">{material}</span>
                                                {count !== undefined && count > 0 && (
                                                    <span className="text-[10px] font-medium text-stone-400">({count})</span>
                                                )}
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Location Filter */}
                {availableLocations.length > 0 && (
                    <div className="p-4">
                        <button 
                            onClick={() => setIsLocationExpanded(!isLocationExpanded)}
                            className="w-full font-bold text-stone-850 text-[10px] uppercase tracking-wider flex items-center justify-between select-none"
                        >
                            <span className="flex items-center gap-1.5">
                                <MapPin size={12} className="text-clay-600" /> Location
                                {selectedLocations.length > 0 && (
                                    <span className="bg-clay-100 text-clay-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                                        {selectedLocations.length}
                                    </span>
                                )}
                            </span>
                            <ChevronDown size={14} className={`text-stone-400 transition-transform duration-300 ${isLocationExpanded ? 'transform rotate-180' : ''}`} />
                        </button>
                        {isLocationExpanded && (
                            <div className="mt-3">
                                {availableLocations.length > 6 && (
                                    <div className="relative mb-2">
                                        <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                                        <input 
                                            type="text" 
                                            placeholder="Search locations..."
                                            value={locationSearch}
                                            onChange={(e) => setLocationSearch(e.target.value)}
                                            className="w-full bg-stone-50 border border-stone-200 rounded-lg text-[11px] py-1.5 pl-7 pr-2 focus:ring-1 focus:ring-clay-200 focus:border-clay-400 focus:bg-white transition duration-200"
                                        />
                                    </div>
                                )}
                                <div className="space-y-2.5 max-h-40 overflow-y-auto pt-1 pr-0.5">
                                    {filteredLocations.map(loc => {
                                        const count = locationCounts?.[loc];
                                        return (
                                            <label key={loc} className="flex items-center gap-2.5 text-xs font-bold text-stone-650 cursor-pointer hover:text-stone-900 group select-none">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedLocations.includes(loc)}
                                                    onChange={() => onLocationChange(loc)}
                                                    className="w-4 h-4 rounded border-stone-300 text-clay-600 focus:ring-clay-500 cursor-pointer transition duration-200" 
                                                />
                                                <span className="flex-1 truncate">{loc}</span>
                                                {count !== undefined && count > 0 && (
                                                    <span className="text-[10px] font-medium text-stone-400">({count})</span>
                                                )}
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </aside>
    );
}
