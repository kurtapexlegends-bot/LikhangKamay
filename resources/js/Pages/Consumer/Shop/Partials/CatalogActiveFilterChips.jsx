import React from 'react';
import { Store, X } from 'lucide-react';

export default function CatalogActiveFilterChips({
    activeFilterCount = 0,
    searchTerm = '',
    followedOnly = false,
    setFollowedOnly,
    activeCategory = 'All',
    minPrice = '',
    maxPrice = '',
    setMinPrice,
    setMaxPrice,
    minRating = '',
    selectedMaterials = [],
    selectedLocations = [],
    applyFilters,
    clearSearch,
    handleCategoryClick,
    handleRatingChange,
    handleMaterialChange,
    handleLocationChange,
    clearAllFilters,
}) {
    if (activeFilterCount === 0 && !searchTerm) {
        return null;
    }

    return (
        <div className="flex flex-wrap items-center gap-2 mb-5 p-3 bg-stone-50 border border-stone-200/70 rounded-xl text-xs">
            <span className="font-bold text-stone-500 text-[10px] uppercase tracking-wider mr-1">
                Active Filters:
            </span>

            {/* Followed Only Chip */}
            {followedOnly && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-clay-50 border border-clay-200 text-clay-800 font-bold rounded-lg shadow-2xs">
                    <Store size={12} />
                    Studios You Follow
                    <button 
                        onClick={() => { 
                            if (setFollowedOnly) setFollowedOnly(false); 
                            applyFilters({ followed_only: undefined }); 
                        }} 
                        className="hover:text-clay-900 transition" 
                        title="Clear followed filter"
                    >
                        <X size={12} />
                    </button>
                </span>
            )}

            {/* Search Term Chip */}
            {searchTerm && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-stone-200 text-stone-800 font-bold rounded-lg shadow-2xs">
                    Search: &ldquo;{searchTerm}&rdquo;
                    <button onClick={clearSearch} className="hover:text-red-600 transition" title="Remove search">
                        <X size={12} />
                    </button>
                </span>
            )}

            {/* Category Chip */}
            {activeCategory !== 'All' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-clay-50 border border-clay-200 text-clay-800 font-bold rounded-lg shadow-2xs">
                    Category: {activeCategory}
                    <button onClick={() => handleCategoryClick('All')} className="hover:text-clay-900 transition" title="Clear category">
                        <X size={12} />
                    </button>
                </span>
            )}

            {/* Price Chip */}
            {(minPrice || maxPrice) && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-stone-200 text-stone-800 font-bold rounded-lg shadow-2xs">
                    Price: ₱{minPrice || '0'} – {maxPrice ? `₱${maxPrice}` : 'Any'}
                    <button 
                        onClick={() => { 
                            if (setMinPrice) setMinPrice(''); 
                            if (setMaxPrice) setMaxPrice(''); 
                            applyFilters({ price_min: '', price_max: '' }); 
                        }} 
                        className="hover:text-red-600 transition" 
                        title="Clear price filter"
                    >
                        <X size={12} />
                    </button>
                </span>
            )}

            {/* Rating Chip */}
            {minRating && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-900 font-bold rounded-lg shadow-2xs">
                    Rating: {minRating}★ &amp; Up
                    <button onClick={() => handleRatingChange('')} className="hover:text-amber-950 transition" title="Clear rating filter">
                        <X size={12} />
                    </button>
                </span>
            )}

            {/* Selected Materials Chips */}
            {selectedMaterials.map((mat) => (
                <span key={mat} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-stone-200 text-stone-800 font-bold capitalize rounded-lg shadow-2xs">
                    Material: {mat}
                    <button onClick={() => handleMaterialChange(mat)} className="hover:text-red-600 transition" title={`Remove ${mat}`}>
                        <X size={12} />
                    </button>
                </span>
            ))}

            {/* Selected Locations Chips */}
            {selectedLocations.map((loc) => (
                <span key={loc} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-stone-200 text-stone-800 font-bold rounded-lg shadow-2xs">
                    Location: {loc}
                    <button onClick={() => handleLocationChange(loc)} className="hover:text-red-600 transition" title={`Remove ${loc}`}>
                        <X size={12} />
                    </button>
                </span>
            ))}

            {/* Clear All Action */}
            <button 
                onClick={clearAllFilters}
                className="ml-auto text-xs font-bold text-clay-600 hover:text-clay-800 hover:underline transition px-1"
            >
                Clear All
            </button>
        </div>
    );
}
