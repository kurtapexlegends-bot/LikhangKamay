import React, { useState } from 'react';
import { SlidersHorizontal, Check, Star, Sparkles, MapPin, ChevronDown } from 'lucide-react';

export default function FilterSidebar({
    categories,
    availableLocations,
    availableMaterials,
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
    const [isLocationExpanded, setIsLocationExpanded] = useState(true);
    const [isMaterialExpanded, setIsMaterialExpanded] = useState(true);

    // Rating options
    const ratingOptions = [
        { value: '', label: 'Any Rating' },
        { value: '4', label: '4★ & Up' },
        { value: '3', label: '3★ & Up' },
        { value: '2', label: '2★ & Up' },
    ];

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
                    <h3 className="font-bold text-stone-850 text-[10px] uppercase tracking-wider mb-3">Categories</h3>
                    <ul className="space-y-1">
                        {categories.map((cat) => (
                            <li key={cat}>
                                <button 
                                    onClick={() => onCategoryClick(cat)}
                                    className={`text-xs w-full text-left py-2 px-3 rounded-xl transition-all duration-200 active:scale-95 flex justify-between items-center font-bold border ${
                                        activeCategory === cat 
                                        ? 'bg-clay-50 text-clay-700 border-clay-200/60 shadow-sm' 
                                        : 'text-stone-600 hover:bg-stone-50 hover:text-clay-600 border-transparent'
                                    }`}
                                >
                                    {cat}
                                    {activeCategory === cat && <Check size={12} className="text-clay-600" />}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Price Range */}
                <div className="p-4">
                    <h3 className="font-bold text-stone-850 text-[10px] uppercase tracking-wider mb-3">Price Range</h3>
                    <div className="flex gap-2 mb-3">
                        <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-bold">₱</span>
                            <input 
                                type="number" min="0" step="any" placeholder="Min" value={minPrice}
                                onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                                onChange={(e) => setMinPrice(e.target.value.replace(/-/g, ""))}
                                className="w-full bg-stone-50 border border-stone-200 rounded-xl text-xs py-2 pl-6 pr-2 focus:ring-1 focus:ring-clay-200 focus:border-clay-400 focus:bg-white transition duration-200"
                            />
                        </div>
                        <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-bold">₱</span>
                            <input 
                                type="number" min="0" step="any" placeholder="Max" value={maxPrice}
                                onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                                onChange={(e) => setMaxPrice(e.target.value.replace(/-/g, ""))}
                                className="w-full bg-stone-50 border border-stone-200 rounded-xl text-xs py-2 pl-6 pr-2 focus:ring-1 focus:ring-clay-200 focus:border-clay-400 focus:bg-white transition duration-200"
                            />
                        </div>
                    </div>
                    <button 
                        onClick={onApplyPrice}
                        className="w-full bg-clay-600 hover:bg-clay-700 text-white text-xs font-bold py-2.5 rounded-xl transition duration-200 active:scale-95 shadow-sm min-h-[40px] flex items-center justify-center border border-clay-600 hover:border-clay-700"
                    >
                        Apply Price
                    </button>
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
                            </span>
                            <ChevronDown size={14} className={`text-stone-400 transition-transform duration-300 ${isMaterialExpanded ? 'transform rotate-180' : ''}`} />
                        </button>
                        {isMaterialExpanded && (
                            <div className="space-y-2.5 max-h-40 overflow-y-auto mt-3 pt-1">
                                {availableMaterials.map(material => (
                                    <label key={material} className="flex items-center gap-2.5 text-xs font-bold text-stone-650 cursor-pointer hover:text-stone-900 group select-none">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedMaterials.includes(material)}
                                            onChange={() => onMaterialChange(material)}
                                            className="w-4 h-4 rounded border-stone-300 text-clay-600 focus:ring-clay-500 cursor-pointer transition duration-200" 
                                        />
                                        <span className="capitalize">{material}</span>
                                    </label>
                                ))}
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
                            </span>
                            <ChevronDown size={14} className={`text-stone-400 transition-transform duration-300 ${isLocationExpanded ? 'transform rotate-180' : ''}`} />
                        </button>
                        {isLocationExpanded && (
                            <div className="space-y-2.5 max-h-40 overflow-y-auto mt-3 pt-1">
                                {availableLocations.map(loc => (
                                    <label key={loc} className="flex items-center gap-2.5 text-xs font-bold text-stone-650 cursor-pointer hover:text-stone-900 group select-none">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedLocations.includes(loc)}
                                            onChange={() => onLocationChange(loc)}
                                            className="w-4 h-4 rounded border-stone-300 text-clay-600 focus:ring-clay-500 cursor-pointer transition duration-200" 
                                        />
                                        {loc}
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </aside>
    );
}
