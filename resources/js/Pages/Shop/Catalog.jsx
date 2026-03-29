import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import BuyerNavbar from '@/Components/BuyerNavbar';
import {
    ChevronDown, Star, ShoppingCart,
    SlidersHorizontal, MapPin, Search, X, Check, Loader2,
    Sparkles, ArrowUpDown, Filter, Award
} from 'lucide-react';
import Modal from '@/Components/Modal';
import { normalizeRating, hasRating, formatRating } from '@/utils/rating';
import { trackSponsorshipEvent, useSponsoredImpressionTracking } from '@/utils/sponsorshipTracking';
import FilterSidebar from './Partials/FilterSidebar';

export default function Catalog(props) {
    // Explicitly handle potentially null props BEFORE any hooks
    const products = Array.isArray(props.products)
        ? props.products.map((product) => ({
            ...product,
            rating: normalizeRating(product?.rating),
        }))
        : [];
    const sponsoredProducts = Array.isArray(props.sponsoredProducts)
        ? props.sponsoredProducts.map((product) => ({
            ...product,
            rating: normalizeRating(product?.rating),
        }))
        : [];
    const categories = Array.isArray(props.categories) ? props.categories : [
        'All', 
        'Tableware', 
        'Drinkware', 
        'Vases & Jars', 
        'Planters & Pots', 
        'Home Decor', 
        'Kitchenware', 
        'Artisan Sets'
    ];
    const availableLocations = Array.isArray(props.availableLocations) ? props.availableLocations : [];
    const availableMaterials = Array.isArray(props.availableMaterials) ? props.availableMaterials : [];
    const safeFilters = (props.filters && typeof props.filters === 'object' && !Array.isArray(props.filters)) ? props.filters : {};
    const sponsoredResultsPlacement = 'catalog_sponsored_results';
    const sponsoredGridPlacement = 'catalog_sponsored_grid';
    const sponsoredGridProducts = products.filter((product) => product.is_sponsored);

    useSponsoredImpressionTracking(sponsoredProducts, sponsoredResultsPlacement);
    useSponsoredImpressionTracking(sponsoredGridProducts, sponsoredGridPlacement);
    
    // --- STATE ---
    const [minPrice, setMinPrice] = useState(safeFilters.price_min || '');
    const [maxPrice, setMaxPrice] = useState(safeFilters.price_max || '');
    const [activeCategory, setActiveCategory] = useState(safeFilters.category || 'All');
    const [sortBy, setSortBy] = useState(safeFilters.sort || 'newest');
    const [searchTerm, setSearchTerm] = useState(safeFilters.search || '');
    
    // Location filter
    const initialLocations = safeFilters.locations ? String(safeFilters.locations).split(',') : [];
    const [selectedLocations, setSelectedLocations] = useState(initialLocations);
    
    // Material filter
    const initialMaterials = safeFilters.materials ? String(safeFilters.materials).split(',') : [];
    const [selectedMaterials, setSelectedMaterials] = useState(initialMaterials);
    
    // Rating filter
    const [minRating, setMinRating] = useState(safeFilters.min_rating || '');
    
    const [addingId, setAddingId] = useState(null);
    const [addedId, setAddedId] = useState(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Sort options configuration
    const sortOptions = [
        { value: 'newest', label: 'Newest Arrivals' },
        { value: 'popular', label: 'Most Popular' },
        { value: 'rating', label: 'Highest Rated' },
        { value: 'price_low', label: 'Price: Low to High' },
        { value: 'price_high', label: 'Price: High to Low' },
    ];

    // Rating options
    const ratingOptions = [
        { value: '', label: 'Any Rating' },
        { value: '4', label: '4★ & Up' },
        { value: '3', label: '3★ & Up' },
        { value: '2', label: '2★ & Up' },
    ];

    // --- FILTER LOGIC ---
    const applyFilters = (overrides = {}) => {
        const params = {
            search: searchTerm,
            category: activeCategory,
            price_min: minPrice,
            price_max: maxPrice,
            sort: sortBy,
            locations: selectedLocations.join(','),
            materials: selectedMaterials.join(','),
            min_rating: minRating,
            ...overrides
        };
        
        // Remove empty values
        Object.keys(params).forEach(key => {
            if (!params[key] || params[key] === 'All') delete params[key];
        });
        
        router.get(route('shop.index'), params, { preserveState: true, preserveScroll: true });
    };

    const handleCategoryClick = (cat) => { 
        setActiveCategory(cat); 
        applyFilters({ category: cat }); 
    };

    const handleLocationChange = (loc) => {
        let newLocs = selectedLocations.includes(loc) 
            ? selectedLocations.filter(l => l !== loc) 
            : [...selectedLocations, loc];
        setSelectedLocations(newLocs);
        applyFilters({ locations: newLocs.join(',') });
    };

    const handleMaterialChange = (material) => {
        let newMaterials = selectedMaterials.includes(material) 
            ? selectedMaterials.filter(m => m !== material) 
            : [...selectedMaterials, material];
        setSelectedMaterials(newMaterials);
        applyFilters({ materials: newMaterials.join(',') });
    };

    const handleRatingChange = (rating) => {
        setMinRating(rating);
        applyFilters({ min_rating: rating });
    };

    const handleSortChange = (sort) => {
        setSortBy(sort);
        applyFilters({ sort });
    };

    const addToCart = (e, productId) => {
        e.preventDefault();
        setAddingId(productId);
        
        router.post(route('cart.store'), { product_id: productId }, {
            preserveScroll: true,
            only: ['cartCount', 'flash'], 
            onSuccess: () => {
                setAddedId(productId);
                setTimeout(() => setAddedId(null), 2000);
            },
            onFinish: () => setAddingId(null),
        });
    };

    const clearSearch = () => {
        setSearchTerm('');
        applyFilters({ search: '' });
    };

    const clearAllFilters = () => {
        setActiveCategory('All');
        setSearchTerm('');
        setMinPrice('');
        setMaxPrice('');
        setSelectedLocations([]);
        setSelectedMaterials([]);
        setMinRating('');
        setSortBy('newest');
        router.visit(route('shop.index'));
    };

    // Count active filters
    const activeFilterCount = [
        activeCategory !== 'All',
        minPrice || maxPrice,
        selectedLocations.length > 0,
        selectedMaterials.length > 0,
        minRating,
    ].filter(Boolean).length;

    // Format price display
    const formatPrice = (price) => {
        return Number(price).toLocaleString('en-PH');
    };

    return (
        <div className="min-h-screen bg-[#FDFBF9] font-sans text-gray-800">
            <Head title="Shop Collection" />
            <BuyerNavbar />

            <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
                
                <div className="flex flex-col lg:flex-row gap-6">
                    
                    {/* --- LEFT SIDEBAR (Desktop) --- */}
                    <FilterSidebar 
                        className="hidden lg:block w-60 flex-shrink-0 h-fit sticky top-20"
                        categories={categories}
                        availableLocations={availableLocations}
                        availableMaterials={availableMaterials}
                        activeCategory={activeCategory}
                        minPrice={minPrice} setMinPrice={setMinPrice}
                        maxPrice={maxPrice} setMaxPrice={setMaxPrice}
                        minRating={minRating}
                        selectedLocations={selectedLocations}
                        selectedMaterials={selectedMaterials}
                        activeFilterCount={activeFilterCount}
                        onCategoryClick={handleCategoryClick}
                        onApplyPrice={() => applyFilters({ price_min: minPrice, price_max: maxPrice })}
                        onRatingChange={handleRatingChange}
                        onMaterialChange={handleMaterialChange}
                        onLocationChange={handleLocationChange}
                        onClearAll={clearAllFilters}
                    />

                    {/* --- MOBILE FILTER MODAL --- */}
                    <Modal show={isFilterOpen} onClose={() => setIsFilterOpen(false)}>
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-gray-900">Filters</h3>
                                <button onClick={() => setIsFilterOpen(false)} className="text-gray-400 hover:text-gray-600">
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="overflow-y-auto max-h-[70vh] pr-2">
                                <FilterSidebar 
                                    className="block w-full"
                                    categories={categories}
                                    availableLocations={availableLocations}
                                    availableMaterials={availableMaterials}
                                    activeCategory={activeCategory}
                                    minPrice={minPrice} setMinPrice={setMinPrice}
                                    maxPrice={maxPrice} setMaxPrice={setMaxPrice}
                                    minRating={minRating}
                                    selectedLocations={selectedLocations}
                                    selectedMaterials={selectedMaterials}
                                    activeFilterCount={activeFilterCount}
                                    onCategoryClick={(cat) => { handleCategoryClick(cat); setIsFilterOpen(false); }}
                                    onApplyPrice={() => { applyFilters({ price_min: minPrice, price_max: maxPrice }); setIsFilterOpen(false); }}
                                    onRatingChange={(rating) => { handleRatingChange(rating); setIsFilterOpen(false); }}
                                    onMaterialChange={(mat) => { handleMaterialChange(mat); }}
                                    onLocationChange={(loc) => { handleLocationChange(loc); }}
                                    onClearAll={() => { clearAllFilters(); setIsFilterOpen(false); }}
                                />
                            </div>
                            <div className="mt-6 pt-4 border-t border-gray-100 flex gap-3">
                                <button 
                                    onClick={() => setIsFilterOpen(false)}
                                    className="flex-1 py-2.5 bg-clay-600 text-white rounded-lg font-bold text-sm"
                                >
                                    Show Results
                                </button>
                            </div>
                        </div>
                    </Modal>

                    {/* --- RIGHT SIDE: GRID --- */}
                    <div className="flex-1">
                        
                        {/* --- HEADER TOOLBAR --- */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-3">
                            
                            {/* LEFT: Title */}
                            <div>
                                {safeFilters.search ? (
                                    <div>
                                        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-0.5">Search Results</p>
                                        <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                            "{safeFilters.search}"
                                            <button onClick={clearSearch} className="text-gray-300 hover:text-red-500 transition" title="Clear">
                                                <X size={16} />
                                            </button>
                                        </h1>
                                    </div>
                                ) : (
                                    <h1 className="text-lg font-semibold text-gray-900">
                                        {activeCategory === 'All' ? 'All Products' : activeCategory}
                                        <span className="ml-2 text-sm font-normal text-gray-400">({products.length})</span>
                                    </h1>
                                )}
                            </div>

                            {/* RIGHT: Sort & Filter (Mobile) Dropdown */}
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => setIsFilterOpen(true)}
                                    className="lg:hidden flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:border-clay-300 transition"
                                >
                                    <SlidersHorizontal size={14} /> Filters
                                    {activeFilterCount > 0 && (
                                        <span className="bg-clay-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                                            {activeFilterCount}
                                        </span>
                                    )}
                                </button>
                                <ArrowUpDown size={14} className="text-gray-400" />
                                <span className="text-xs text-gray-400">Sort:</span>
                                <div className="relative">
                                    <select 
                                        value={sortBy} 
                                        onChange={(e) => handleSortChange(e.target.value)}
                                        className="appearance-none bg-white border border-gray-200 text-gray-700 py-1.5 pl-3 pr-8 rounded-lg text-sm font-medium focus:outline-none focus:ring-1 focus:ring-clay-200 cursor-pointer hover:border-clay-300 transition"
                                    >
                                        {sortOptions.map(option => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                                </div>
                            </div>
                        </div>

                        {/* Active Filters Chips */}
                        {activeFilterCount > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4">
                                {selectedMaterials.map(material => (
                                    <span key={material} className="inline-flex items-center gap-1 bg-clay-50 text-clay-700 text-xs font-medium px-2.5 py-1 rounded-full">
                                        {material}
                                        <button onClick={() => handleMaterialChange(material)} className="hover:text-red-500">
                                            <X size={12} />
                                        </button>
                                    </span>
                                ))}
                                {selectedLocations.map(loc => (
                                    <span key={loc} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">
                                        <MapPin size={10} /> {loc}
                                        <button onClick={() => handleLocationChange(loc)} className="hover:text-red-500">
                                            <X size={12} />
                                        </button>
                                    </span>
                                ))}
                                {minRating && (
                                    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-xs font-medium px-2.5 py-1 rounded-full">
                                        {minRating}★ & Up
                                        <button onClick={() => handleRatingChange('')} className="hover:text-red-500">
                                            <X size={12} />
                                        </button>
                                    </span>
                                )}
                            </div>
                        )}

                        {/* --- PRODUCT GRID --- */}
                        {products.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                                {products.map((product) => (
                                    <Link 
                                        href={route('product.show', product.slug)} 
                                        key={product.id} 
                                        data-sponsored-placement={product.is_sponsored ? sponsoredGridPlacement : undefined}
                                        data-sponsored-product-id={product.is_sponsored ? product.id : undefined}
                                        onClick={() => {
                                            if (!product.is_sponsored) {
                                                return;
                                            }

                                            trackSponsorshipEvent({
                                                productId: product.id,
                                                eventType: 'click',
                                                placement: sponsoredGridPlacement,
                                                oncePerSession: true,
                                            });
                                        }}
                                        className={`group bg-white rounded-xl border transition-[border-color,box-shadow] duration-300 flex flex-col overflow-hidden ${
                                            product.is_sponsored 
                                                ? 'border-amber-200 shadow-sm shadow-amber-50 hover:border-amber-400 hover:shadow-md' 
                                                : 'border-gray-100 hover:border-gray-200 hover:shadow-md'
                                        }`}
                                    >
                                        {/* Image */}
                                        <div className="aspect-square relative overflow-hidden bg-stone-100">
                                            <img 
                                                src={product.image ? (product.image.startsWith('http') || product.image.startsWith('/storage') ? product.image : `/storage/${product.image}`) : '/images/no-image.png'} 
                                                alt={product.name} 
                                                className="absolute inset-0 block h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                                                onError={(e) => { e.target.src = '/images/no-image.png'; }}
                                            />
                                            {product.is_sponsored ? (
                                                <span className="absolute top-1.5 left-1.5 bg-amber-100 text-amber-700 text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1 border border-amber-200">
                                                    <Award size={9} /> Sponsored
                                                </span>
                                            ) : product.is_new ? (
                                                <span className="absolute top-1.5 left-1.5 bg-clay-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">New</span>
                                            ) : null}
                                        </div>
                                        {/* Content */}
                                        <div className={`p-3 flex flex-col flex-1 ${product.is_sponsored ? 'bg-amber-50/10' : ''}`}>
                                            <h3 className={`text-xs font-bold line-clamp-2 leading-tight mb-1 transition ${product.is_sponsored ? 'text-amber-900 group-hover:text-amber-600' : 'text-gray-800 group-hover:text-clay-600'}`}>
                                                {product.name}
                                            </h3>
                                            <div className="mt-auto">
                                                <div className="flex items-center gap-1 mb-1.5">
                                                    <span className="text-[10px] text-gray-400 truncate">{product.seller}</span>
                                                    <span className="text-gray-300">·</span>
                                                    <span className="text-[10px] text-gray-400 truncate">{product.location}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className={`text-sm font-black ${product.is_sponsored ? 'text-amber-700' : 'text-clay-600'}`}>
                                                        &#8369;{product.price}
                                                    </span>
                                                    {hasRating(product.rating) && (
                                                        <div className="flex items-center gap-0.5 text-[10px] font-bold text-gray-600">
                                                            {formatRating(product.rating)} <Star size={10} className="fill-amber-400 text-amber-400" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            /* Empty State */
                            <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border border-gray-100">
                                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3 text-gray-300">
                                    <Search size={24} />
                                </div>
                                <h3 className="font-semibold text-gray-900 text-base">No products found</h3>
                                <p className="text-gray-500 text-sm mt-1 max-w-xs mx-auto">
                                    {safeFilters.search 
                                        ? `No matches for "${safeFilters.search}". Try different keywords.`
                                        : 'No products match your filters. Try adjusting your criteria.'}
                                </p>
                                <button 
                                    onClick={clearAllFilters} 
                                    className="mt-4 text-clay-600 font-medium text-sm hover:underline transition"
                                >
                                    Clear all filters
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
