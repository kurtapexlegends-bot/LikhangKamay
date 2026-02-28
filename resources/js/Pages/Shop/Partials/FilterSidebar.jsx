import React from 'react';
import { SlidersHorizontal, Check, Star, Sparkles, MapPin } from 'lucide-react';

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
            <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                    <SlidersHorizontal size={14} />
                    Filters
                    {activeFilterCount > 0 && (
                        <span className="bg-clay-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                            {activeFilterCount}
                        </span>
                    )}
                </h2>
                {activeFilterCount > 0 && (
                    <button 
                        onClick={onClearAll}
                        className="text-xs text-clay-600 hover:underline"
                    >
                        Clear All
                    </button>
                )}
            </div>

            {/* Categories */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-3 text-xs uppercase tracking-wider">Categories</h3>
                <ul className="space-y-0.5">
                    {categories.map((cat) => (
                        <li key={cat}>
                            <button 
                                onClick={() => onCategoryClick(cat)}
                                className={`text-sm w-full text-left py-2 px-3 rounded-lg transition-all flex justify-between items-center ${
                                    activeCategory === cat 
                                    ? 'bg-clay-600 text-white font-medium' 
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-clay-600'
                                }`}
                            >
                                {cat}
                                {activeCategory === cat && <Check size={12} />}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Price Range */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-3 text-xs uppercase tracking-wider">Price Range</h3>
                <div className="flex gap-2 mb-3">
                    <div className="relative flex-1">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₱</span>
                        <input 
                            type="number" placeholder="Min" value={minPrice}
                            onChange={(e) => setMinPrice(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg text-sm py-2 pl-6 pr-2 focus:ring-1 focus:ring-clay-200 focus:border-clay-400 focus:bg-white transition"
                        />
                    </div>
                    <div className="relative flex-1">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₱</span>
                        <input 
                            type="number" placeholder="Max" value={maxPrice}
                            onChange={(e) => setMaxPrice(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg text-sm py-2 pl-6 pr-2 focus:ring-1 focus:ring-clay-200 focus:border-clay-400 focus:bg-white transition"
                        />
                    </div>
                </div>
                <button 
                    onClick={onApplyPrice}
                    className="w-full bg-clay-600 text-white text-xs font-medium py-2 rounded-lg hover:bg-clay-700 transition"
                >
                    Apply Price
                </button>
            </div>

            {/* Rating Filter */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-3 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Star size={12} className="text-amber-400" /> Rating
                </h3>
                <div className="space-y-1.5">
                    {ratingOptions.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => onRatingChange(option.value)}
                            className={`w-full text-left py-2 px-3 rounded-lg text-sm transition-all flex items-center gap-2 ${
                                minRating === option.value
                                    ? 'bg-amber-50 text-amber-700 font-medium border border-amber-200'
                                    : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            {option.value && (
                                <span className="flex items-center">
                                    {[...Array(parseInt(option.value))].map((_, i) => (
                                        <Star key={i} size={10} className="fill-amber-400 text-amber-400" />
                                    ))}
                                </span>
                            )}
                            <span>{option.label}</span>
                            {minRating === option.value && <Check size={12} className="ml-auto" />}
                        </button>
                    ))}
                </div>
            </div>

            {/* Material / Clay Type Filter */}
            {availableMaterials.length > 0 && (
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="font-semibold text-gray-900 mb-3 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles size={12} className="text-clay-500" /> Material
                    </h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                        {availableMaterials.map(material => (
                            <label key={material} className="flex items-center gap-2.5 text-sm text-gray-600 cursor-pointer hover:text-gray-900 group select-none">
                                <input 
                                    type="checkbox" 
                                    checked={selectedMaterials.includes(material)}
                                    onChange={() => onMaterialChange(material)}
                                    className="w-4 h-4 rounded border-gray-300 text-clay-600 focus:ring-clay-500 cursor-pointer" 
                                />
                                <span className="capitalize">{material}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {/* Location Filter */}
            {availableLocations.length > 0 && (
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="font-semibold text-gray-900 mb-3 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin size={12} className="text-clay-500" /> Location
                    </h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                        {availableLocations.map(loc => (
                            <label key={loc} className="flex items-center gap-2.5 text-sm text-gray-600 cursor-pointer hover:text-gray-900 group select-none">
                                <input 
                                    type="checkbox" 
                                    checked={selectedLocations.includes(loc)}
                                    onChange={() => onLocationChange(loc)}
                                    className="w-4 h-4 rounded border-gray-300 text-clay-600 focus:ring-clay-500 cursor-pointer" 
                                />
                                {loc}
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </aside>
    );
}
