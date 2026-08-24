import React, { useState, useEffect } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import SellerHeader from '@/Layouts/SellerHeader';
import { useToast } from '@/Components/ToastContext';
import { 
    Store, Layers, ShoppingCart, SlidersHorizontal, Search, 
    X, ArrowUpDown, ChevronDown, CheckCircle2, Package, RotateCcw,
    Truck, ShieldCheck 
} from 'lucide-react';
import SlideOverDrawer from '@/Components/SlideOverDrawer';

// Subcomponents
import B2BFilterSidebar from '@/Components/Seller/SupplyHub/B2BFilterSidebar';
import B2BSupplyCard from '@/Components/Seller/SupplyHub/B2BSupplyCard';
import MaterialDetailModal from '@/Components/Seller/SupplyHub/MaterialDetailModal';
import ProcurementCartDrawer from '@/Components/Seller/SupplyHub/ProcurementCartDrawer';

export default function SupplyHubIndex({
    supplies,
    categories = [],
    categoryCounts = {},
    availableLocations = [],
    locationCounts = {},
    myPublishedCount = 0,
    cart = {},
    filters = {},
}) {
    const { addToast } = useToast();
    const { openSidebar } = useSellerWorkspaceShell();
    const { cartCount: globalCartCount } = usePage().props;

    // Filter states
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [activeCategory, setActiveCategory] = useState(filters.category || 'All');
    const [minPrice, setMinPrice] = useState(filters.price_min || '');
    const [maxPrice, setMaxPrice] = useState(filters.price_max || '');
    const [hasWholesale, setHasWholesale] = useState(Boolean(filters.has_wholesale));
    const [moqTier, setMoqTier] = useState(filters.moq_tier || 'all');
    const [sortBy, setSortBy] = useState(filters.sort || 'newest');
    const initialLocations = filters.locations ? String(filters.locations).split(',') : [];
    const [selectedLocations, setSelectedLocations] = useState(initialLocations);

    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
    const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
    const [quantities, setQuantities] = useState({});
    const [cartCount, setCartCount] = useState(globalCartCount || 0);
    const [selectedDetailItem, setSelectedDetailItem] = useState(null);

    // Dismissible sync notice state
    const [showSyncNotice, setShowSyncNotice] = useState(() => {
        if (typeof window === 'undefined') return true;
        return localStorage.getItem('lk_dismiss_b2b_sync_notice') !== 'true';
    });

    const handleDismissNotice = () => {
        setShowSyncNotice(false);
        if (typeof window !== 'undefined') {
            localStorage.setItem('lk_dismiss_b2b_sync_notice', 'true');
        }
    };

    useEffect(() => {
        if (typeof globalCartCount === 'number') {
            setCartCount(globalCartCount);
        }
    }, [globalCartCount]);

    // Active filter count
    const activeFilterCount = [
        activeCategory !== 'All',
        Boolean(minPrice || maxPrice),
        selectedLocations.length > 0,
        hasWholesale,
        moqTier !== 'all',
        Boolean(searchTerm),
    ].filter(Boolean).length;

    // Apply Filter Helper
    const applyFilters = (overrides = {}) => {
        const queryParams = {
            search: overrides.search !== undefined ? overrides.search : searchTerm,
            category: overrides.category !== undefined ? overrides.category : activeCategory,
            price_min: overrides.price_min !== undefined ? overrides.price_min : minPrice,
            price_max: overrides.price_max !== undefined ? overrides.price_max : maxPrice,
            locations: overrides.locations !== undefined ? overrides.locations.join(',') : selectedLocations.join(','),
            has_wholesale: overrides.has_wholesale !== undefined ? (overrides.has_wholesale ? 1 : undefined) : (hasWholesale ? 1 : undefined),
            moq_tier: overrides.moq_tier !== undefined ? overrides.moq_tier : moqTier,
            sort: overrides.sort !== undefined ? overrides.sort : sortBy,
        };

        // Remove undefined / empty keys
        Object.keys(queryParams).forEach(k => {
            if (queryParams[k] === '' || queryParams[k] === undefined || (k === 'category' && queryParams[k] === 'All') || (k === 'moq_tier' && queryParams[k] === 'all')) {
                delete queryParams[k];
            }
        });

        router.get(route('seller.supply-hub.index'), queryParams, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    // MOQ Tier toggle
    const handleMoqTierChange = (tier) => {
        setMoqTier(tier);
        applyFilters({ moq_tier: tier });
    };

    // Category Click
    const handleCategoryClick = (cat) => {
        setActiveCategory(cat);
        applyFilters({ category: cat });
    };

    // Location toggle
    const handleLocationChange = (loc) => {
        const next = selectedLocations.includes(loc)
            ? selectedLocations.filter(l => l !== loc)
            : [...selectedLocations, loc];
        setSelectedLocations(next);
        applyFilters({ locations: next });
    };

    // Wholesale toggle
    const handleWholesaleToggle = () => {
        const next = !hasWholesale;
        setHasWholesale(next);
        applyFilters({ has_wholesale: next });
    };

    // Price submit
    const handleApplyPrice = () => {
        applyFilters();
    };

    // Sort change
    const handleSortChange = (newSort) => {
        setSortBy(newSort);
        applyFilters({ sort: newSort });
    };

    // Search submit
    const handleSearchSubmit = (e) => {
        e.preventDefault();
        applyFilters();
    };

    // Clear all filters
    const handleClearAll = () => {
        setSearchTerm('');
        setActiveCategory('All');
        setMinPrice('');
        setMaxPrice('');
        setSelectedLocations([]);
        setHasWholesale(false);
        setSortBy('newest');
        router.get(route('seller.supply-hub.index'), {}, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    // Quantity stepper
    const handleQuantityChange = (item, newQty) => {
        const min = item.moq || 1;
        const max = item.stock || 9999;
        const clamped = Math.max(min, Math.min(max, newQty));
        setQuantities(prev => ({ ...prev, [item.id]: clamped }));
    };

    // Add to cart
    const handleAddToCart = async (item, qty) => {
        try {
            await window.axios.post(route('cart.store'), {
                product_id: item.id,
                quantity: qty,
                variant: 'Standard',
            });
            const newCount = cartCount + 1;
            setCartCount(newCount);
            if (typeof window !== 'undefined') {
                localStorage.setItem('lk_cart_count', newCount);
                window.dispatchEvent(new Event('cart-updated'));
            }
            addToast({
                type: 'success',
                message: `Added ${qty} ${item.supply_unit || 'units'} of "${item.name}" to procurement cart.`,
            });
        } catch {
            addToast({
                type: 'error',
                message: 'Failed to add material to cart. Please try again.',
            });
        }
    };

    // 1-Click Buy Now
    const handleQuickOrder = (item, qty) => {
        router.visit(route('checkout.create', {
            product_id: item.id,
            quantity: qty,
        }));
    };

    const productList = supplies?.data || [];

    return (
        <>
            <Head title="Artisan Wholesale Sourcing Catalog" />

            <SellerHeader
                title="Supply Hub"
                subtitle="Source bulk raw materials, clay sacks, timber, and glazes directly from verified peer studios."
                onMenuClick={openSidebar}
                badge={{ label: 'Wholesale Sourcing', iconColor: 'text-clay-500' }}
            />

            <div className="p-4 sm:p-6 lg:p-8 space-y-6 pb-16">
                {/* Top Workspace Tab Bar with Procurement Cart */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-3">
                    <div className="flex items-center gap-2">
                        <Link
                            href={route('seller.supply-hub.index')}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-bold text-white shadow-2xs"
                        >
                            <Store size={13} />
                            <span>Browse Peer Supplies</span>
                        </Link>
                        <Link
                            href={route('seller.supply-hub.my-listings')}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 hover:border-stone-300 transition-colors shadow-2xs"
                        >
                            <Layers size={13} className="text-clay-600" />
                            <span>My Wholesale Listings</span>
                            {myPublishedCount > 0 && (
                                <span className="rounded-full bg-clay-100 text-clay-700 px-1.5 py-0.2 text-[10px] font-extrabold">
                                    {myPublishedCount}
                                </span>
                            )}
                        </Link>
                    </div>

                    {/* Procurement Cart & Studio Inventory Shortcuts */}
                    <div className="flex items-center gap-2.5">
                        <Link
                            href={route('procurement.index')}
                            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 transition-colors mr-1"
                        >
                            <span>Studio Inventory</span>
                            <Truck size={13} />
                        </Link>

                        <button
                            type="button"
                            onClick={() => setIsCartDrawerOpen(true)}
                            className="inline-flex items-center gap-2 rounded-xl bg-clay-600 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-clay-700 transition-all active:scale-95 cursor-pointer"
                        >
                            <ShoppingCart size={14} />
                            <span>Procurement Cart</span>
                            {cartCount > 0 && (
                                <span className="rounded-full bg-white text-clay-800 px-1.5 py-0.2 text-[10px] font-black">
                                    {cartCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Dismissible Auto-Restock Closed-Loop Guarantee Card */}
                {showSyncNotice && (
                    <div className="rounded-2xl border border-stone-200 bg-white p-4 text-xs text-stone-700 flex items-start gap-3 shadow-2xs relative">
                        <CheckCircle2 size={16} className="shrink-0 text-emerald-600 mt-0.5" />
                        <div className="flex-1 space-y-0.5 pr-6">
                            <span className="font-bold text-stone-900">Automated Closed-Loop Inventory Sync:</span>
                            <p className="text-stone-500 leading-relaxed">
                                When you confirm delivery of peer studio materials, LikhangKamay automatically adds the purchased units and unit costs into your Studio Materials inventory.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleDismissNotice}
                            className="absolute top-3 right-3 text-stone-400 hover:text-stone-700 p-1 rounded-lg hover:bg-stone-100 transition-colors"
                            aria-label="Dismiss notice"
                        >
                            <X size={14} />
                        </button>
                    </div>
                )}

                {/* Main 2-Column Catalog Sourcing Layout */}
                <div className="flex flex-col lg:flex-row gap-6 items-start">
                    {/* Left Column: Filter Sidebar (Desktop) */}
                    <div className="hidden lg:block w-64 xl:w-72 shrink-0 sticky top-20">
                        <B2BFilterSidebar
                            categories={categories}
                            categoryCounts={categoryCounts}
                            availableLocations={availableLocations}
                            locationCounts={locationCounts}
                            activeCategory={activeCategory}
                            minPrice={minPrice}
                            maxPrice={maxPrice}
                            selectedLocations={selectedLocations}
                            hasWholesale={hasWholesale}
                            moqTier={moqTier}
                            onCategoryClick={handleCategoryClick}
                            onPriceChange={(type, val) => type === 'min' ? setMinPrice(val) : setMaxPrice(val)}
                            onApplyPrice={handleApplyPrice}
                            onLocationChange={handleLocationChange}
                            onWholesaleToggle={handleWholesaleToggle}
                            onMoqTierChange={handleMoqTierChange}
                            onClearAll={handleClearAll}
                            activeFilterCount={activeFilterCount}
                        />
                    </div>

                    {/* Right Column: Catalog Grid & Toolbar */}
                    <div className="flex-1 min-w-0 space-y-4 w-full">
                        {/* Toolbar: Search + Sort + Mobile Filter Trigger */}
                        <div className="bg-white rounded-2xl border border-stone-200 p-3 sm:p-4 shadow-2xs space-y-3">
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                                {/* Search Bar */}
                                <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
                                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Search materials, clay types, timber, or supplier studios..."
                                        className="w-full rounded-xl border border-stone-200 bg-stone-50/60 pl-9 pr-8 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-clay-500 focus:ring-1 focus:ring-clay-500"
                                    />
                                    {searchTerm && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSearchTerm('');
                                                applyFilters({ search: '' });
                                            }}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                                        >
                                            <X size={13} />
                                        </button>
                                    )}
                                </form>

                                {/* Sort & Mobile Filter Trigger */}
                                <div className="flex items-center gap-2.5 justify-between sm:justify-end">
                                    {/* Mobile Filter Drawer Button */}
                                    <button
                                        type="button"
                                        onClick={() => setIsMobileFilterOpen(true)}
                                        className="lg:hidden inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-700 shadow-2xs"
                                    >
                                        <SlidersHorizontal size={13} className="text-clay-600" />
                                        <span>Filters</span>
                                        {activeFilterCount > 0 && (
                                            <span className="rounded-full bg-clay-600 text-white px-1.5 py-0.2 text-[10px] font-black">
                                                {activeFilterCount}
                                            </span>
                                        )}
                                    </button>

                                    {/* Sort Dropdown */}
                                    <div className="relative">
                                        <select
                                            value={sortBy}
                                            onChange={(e) => handleSortChange(e.target.value)}
                                            className="appearance-none rounded-xl border border-stone-200 bg-white pl-3.5 pr-8 py-2 text-xs font-bold text-stone-700 hover:border-stone-300 focus:border-clay-500 focus:ring-1 focus:ring-clay-500 shadow-2xs cursor-pointer"
                                        >
                                            <option value="newest">Newest Sourcing Items</option>
                                            <option value="price_low">Price: Low to High</option>
                                            <option value="price_high">Price: High to Low</option>
                                            <option value="moq_low">Lowest MOQ First</option>
                                        </select>
                                        <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            {/* Active Filter Tags */}
                            {activeFilterCount > 0 && (
                                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-stone-150 text-xs">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mr-1">Active:</span>
                                    {activeCategory !== 'All' && (
                                        <span className="inline-flex items-center gap-1 bg-stone-100 border border-stone-200 rounded-lg px-2 py-0.5 text-[11px] font-bold text-stone-800">
                                            <span>Category: {activeCategory}</span>
                                            <button type="button" onClick={() => handleCategoryClick('All')} className="text-stone-400 hover:text-stone-700">
                                                <X size={11} />
                                            </button>
                                        </span>
                                    )}
                                    {(minPrice || maxPrice) && (
                                        <span className="inline-flex items-center gap-1 bg-stone-100 border border-stone-200 rounded-lg px-2 py-0.5 text-[11px] font-bold text-stone-800">
                                            <span>Price: ₱{minPrice || 0} – ₱{maxPrice || '∞'}</span>
                                            <button type="button" onClick={() => { setMinPrice(''); setMaxPrice(''); applyFilters({ price_min: '', price_max: '' }); }} className="text-stone-400 hover:text-stone-700">
                                                <X size={11} />
                                            </button>
                                        </span>
                                    )}
                                    {selectedLocations.map(loc => (
                                        <span key={loc} className="inline-flex items-center gap-1 bg-stone-100 border border-stone-200 rounded-lg px-2 py-0.5 text-[11px] font-bold text-stone-800">
                                            <span>Location: {loc}</span>
                                            <button type="button" onClick={() => handleLocationChange(loc)} className="text-stone-400 hover:text-stone-700">
                                                <X size={11} />
                                            </button>
                                        </span>
                                    ))}
                                    {hasWholesale && (
                                        <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                                            <span>Bulk Tier Only</span>
                                            <button type="button" onClick={handleWholesaleToggle} className="text-emerald-500 hover:text-emerald-800">
                                                <X size={11} />
                                            </button>
                                        </span>
                                    )}
                                    {moqTier !== 'all' && (
                                        <span className="inline-flex items-center gap-1 bg-stone-100 border border-stone-200 rounded-lg px-2 py-0.5 text-[11px] font-bold text-stone-800">
                                            <span>MOQ: {moqTier === 'low' ? '1–5 units' : moqTier === 'mid' ? '6–15 units' : '16+ units'}</span>
                                            <button type="button" onClick={() => handleMoqTierChange('all')} className="text-stone-400 hover:text-stone-700">
                                                <X size={11} />
                                            </button>
                                        </span>
                                    )}
                                    {searchTerm && (
                                        <span className="inline-flex items-center gap-1 bg-stone-100 border border-stone-200 rounded-lg px-2 py-0.5 text-[11px] font-bold text-stone-800">
                                            <span>Search: "{searchTerm}"</span>
                                            <button type="button" onClick={() => { setSearchTerm(''); applyFilters({ search: '' }); }} className="text-stone-400 hover:text-stone-700">
                                                <X size={11} />
                                            </button>
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={handleClearAll}
                                        className="text-[11px] font-bold text-clay-700 hover:underline ml-1"
                                    >
                                        Clear All
                                    </button>
                                </div>
                            )}

                            {/* Total Results Summary */}
                            <div className="text-[11px] text-stone-500 font-medium pt-1">
                                Showing <span className="font-bold text-stone-900">{supplies?.total || productList.length}</span> wholesale supplies from verified peer artisan studios.
                            </div>
                        </div>

                        {/* Product Cards Grid */}
                        {productList.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-16 text-center space-y-3 shadow-2xs">
                                <Package size={40} className="mx-auto text-stone-300" />
                                <h3 className="text-base font-bold text-stone-800">No Wholesale Materials Found</h3>
                                <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
                                    No raw materials or blanks match your filter criteria. Try adjusting your category or clearing filters.
                                </p>
                                <button
                                    type="button"
                                    onClick={handleClearAll}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-stone-800 transition-colors"
                                >
                                    <RotateCcw size={13} />
                                    <span>Reset All Filters</span>
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                                {productList.map((item) => (
                                    <B2BSupplyCard
                                        key={item.id}
                                        item={item}
                                        quantity={quantities[item.id]}
                                        onQuantityChange={handleQuantityChange}
                                        onAddToCart={handleAddToCart}
                                        onQuickOrder={handleQuickOrder}
                                        onOpenDetail={(detailItem) => setSelectedDetailItem(detailItem)}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Pagination */}
                        {supplies?.links && supplies.links.length > 3 && (
                            <div className="flex items-center justify-center gap-1.5 pt-6">
                                {supplies.links.map((link, idx) => (
                                    <Link
                                        key={idx}
                                        href={link.url || '#'}
                                        preserveScroll
                                        preserveState
                                        className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                                            link.active
                                                ? 'bg-clay-600 text-white shadow-2xs'
                                                : link.url
                                                    ? 'border border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                                                    : 'text-stone-300 cursor-not-allowed'
                                        }`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Material Detail Quick-View Modal */}
                <MaterialDetailModal
                    show={Boolean(selectedDetailItem)}
                    onClose={() => setSelectedDetailItem(null)}
                    item={selectedDetailItem}
                    quantity={selectedDetailItem ? quantities[selectedDetailItem.id] : undefined}
                    onQuantityChange={handleQuantityChange}
                    onAddToCart={handleAddToCart}
                    onQuickOrder={handleQuickOrder}
                />

                {/* Procurement Cart Drawer */}
                <ProcurementCartDrawer
                    show={isCartDrawerOpen}
                    onClose={() => setIsCartDrawerOpen(false)}
                    initialCart={cart}
                />

                {/* Mobile Filter SlideOverDrawer */}
                <SlideOverDrawer
                    show={isMobileFilterOpen}
                    onClose={() => setIsMobileFilterOpen(false)}
                    title="Filter Wholesale Materials"
                    position="bottom"
                    widthClass="max-w-md"
                    footer={
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    handleClearAll();
                                    setIsMobileFilterOpen(false);
                                }}
                                className="flex-1 rounded-xl border border-stone-200 bg-white py-2.5 text-xs font-bold text-stone-700 min-h-[44px]"
                            >
                                Reset All
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    applyFilters();
                                    setIsMobileFilterOpen(false);
                                }}
                                className="flex-1 rounded-xl bg-clay-600 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-clay-700 min-h-[44px]"
                            >
                                Apply Filters
                            </button>
                        </div>
                    }
                >
                    <div className="py-2">
                        <B2BFilterSidebar
                            categories={categories}
                            categoryCounts={categoryCounts}
                            availableLocations={availableLocations}
                            locationCounts={locationCounts}
                            activeCategory={activeCategory}
                            minPrice={minPrice}
                            maxPrice={maxPrice}
                            selectedLocations={selectedLocations}
                            hasWholesale={hasWholesale}
                            moqTier={moqTier}
                            onCategoryClick={(cat) => {
                                handleCategoryClick(cat);
                                setIsMobileFilterOpen(false);
                            }}
                            onPriceChange={(type, val) => type === 'min' ? setMinPrice(val) : setMaxPrice(val)}
                            onApplyPrice={() => {
                                handleApplyPrice();
                                setIsMobileFilterOpen(false);
                            }}
                            onLocationChange={handleLocationChange}
                            onWholesaleToggle={handleWholesaleToggle}
                            onMoqTierChange={(tier) => {
                                handleMoqTierChange(tier);
                                setIsMobileFilterOpen(false);
                            }}
                            onClearAll={handleClearAll}
                            activeFilterCount={activeFilterCount}
                        />
                    </div>
                </SlideOverDrawer>
            </div>
        </>
    );
}

SupplyHubIndex.layout = (page) => <SellerWorkspaceLayout active="supply-hub">{page}</SellerWorkspaceLayout>;
