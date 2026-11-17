/* global route */
import React, { useState, useMemo, useRef } from 'react';
import useIsolatedHorizontalScroll from '@/hooks/useIsolatedHorizontalScroll';
import { Head, Link, router } from '@inertiajs/react';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import SellerHeader from '@/Layouts/SellerHeader';
import B2BSupplyCard from '@/Components/Seller/SupplyHub/B2BSupplyCard';
import B2BFilterSidebar from '@/Components/Seller/SupplyHub/B2BFilterSidebar';
import SourcingCatalogToolbar from '@/Components/Seller/SupplyHub/SourcingCatalogToolbar';
import MaterialDetailModal from '@/Components/Seller/SupplyHub/MaterialDetailModal';
import ProcurementCartDrawer from '@/Components/Seller/SupplyHub/ProcurementCartDrawer';
import SlideOverDrawer from '@/Components/SlideOverDrawer';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import CompactPagination from '@/Components/CompactPagination';
import { 
    Store, Package, ShoppingCart, 
    ListOrdered, RotateCcw, Boxes, Building2 
} from 'lucide-react';
import { useToast } from '@/Components/ToastContext';

export default function Index({
    supplies,
    categories = [],
    categoryCounts = {},
    availableLocations = [],
    locationCounts = {},
    myPublishedCount = 0,
    activeOrdersCount = 0,
    openOrdersCount,
    wholesaleSalesCount = 0,
    cart: initialCart = {},
    filters = {},
}) {
    const { addToast } = useToast() || { addToast: () => {} };
    const { openSidebar } = useSellerWorkspaceShell();

    const subNavRef = useRef(null);
    useIsolatedHorizontalScroll(subNavRef);

    const totalOpenOrders = openOrdersCount !== undefined
        ? Number(openOrdersCount)
        : Number(activeOrdersCount || 0);

    // Search input state
    const [searchInput, setSearchInput] = useState(filters.search || '');
    const [selectedSupplyForDetail, setSelectedSupplyForDetail] = useState(null);
    const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
    const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
    const [cart, setCart] = useState(initialCart);
    const [prevInitialCart, setPrevInitialCart] = useState(initialCart);

    if (initialCart !== prevInitialCart) {
        setPrevInitialCart(initialCart);
        setCart(initialCart);
    }

    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (filters.search) count++;
        if (filters.category && filters.category !== 'All') count++;
        if (filters.price_min || filters.price_max) count++;
        if (filters.locations) count++;
        if (filters.has_wholesale) count++;
        if (filters.seller_type && filters.seller_type !== 'all') count++;
        if (filters.moq_tier && filters.moq_tier !== 'all') count++;
        return count;
    }, [filters]);

    const cartCount = useMemo(() => {
        return Object.values(cart).reduce((sum, item) => sum + (parseInt(item?.qty) || 1), 0);
    }, [cart]);

    const handleFilterChange = (key, value) => {
        const updated = { ...filters, [key]: value, page: 1 };
        router.get(route('seller.supply-hub.index'), updated, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        handleFilterChange('search', searchInput);
    };

    const handleClearSearch = () => {
        setSearchInput('');
        handleFilterChange('search', '');
    };

    const handleRemoveFilter = (filterKey) => {
        if (filterKey === 'price') {
            const updated = { ...filters, price_min: '', price_max: '', page: 1 };
            router.get(route('seller.supply-hub.index'), updated, { preserveState: true, preserveScroll: true });
        } else if (filterKey === 'search') {
            setSearchInput('');
            handleFilterChange('search', '');
        } else if (filterKey === 'seller_type') {
            handleFilterChange('seller_type', 'all');
        } else {
            handleFilterChange(filterKey, filterKey === 'category' ? 'All' : filterKey === 'moq_tier' ? 'all' : '');
        }
    };

    const handleResetAllFilters = () => {
        setSearchInput('');
        router.get(route('seller.supply-hub.index'), {}, { preserveState: false });
        setIsMobileFiltersOpen(false);
    };

    const handleAddToCart = async (supply, quantity) => {
        const qtyToAdd = Math.max(supply.moq || 1, parseInt(quantity) || supply.moq || 1);
        try {
            const endpoint = typeof route === 'function' && route().has('cart.store') ? route('cart.store') : '/cart/add';
            const res = await window.axios.post(endpoint, {
                product_id: supply.id,
                quantity: qtyToAdd,
            });
            if (res.data?.success || res.status === 200) {
                addToast({
                    type: 'success',
                    title: 'Added to Cart',
                    message: `Added ${qtyToAdd} ${supply.supply_unit || 'units'} of ${supply.name} to cart.`,
                });
                if (res.data?.cart) {
                    setCart(res.data.cart);
                } else {
                    router.reload({ only: ['cart'] });
                }
            }
        } catch (err) {
            addToast({
                type: 'error',
                title: 'Cart Error',
                message: err.response?.data?.message || 'Could not add item to cart. Please check minimum order requirements.',
            });
        }
    };

    return (
        <>
            <Head title="Supply Hub | LikhangKamay" />

            <SellerHeader
                title="Supply Hub"
                subtitle="Source pottery clay, timber, glazes, and packaging directly from verified peer workshops."
                onMenuClick={openSidebar}
                badge={{ label: 'Enterprise', iconColor: 'text-emerald-400' }}
            />

            <div className="p-3 sm:p-6 lg:p-8 space-y-3 sm:space-y-4 lg:space-y-6 pb-12">

                {/* Sub-Navigation Pill Tabs & Cart Row */}
                <div className="flex items-center justify-between gap-2 border-b border-stone-200/80 pb-2.5 sm:pb-3">
                    <div 
                        ref={subNavRef}
                        className="flex-1 min-w-0 overflow-x-auto scrollbar-none py-0.5 -mx-1 px-1 touch-pan-y overscroll-contain"
                    >
                        <div className="p-1 bg-stone-100/70 rounded-2xl inline-flex items-center gap-1">
                            <Link
                                href={route('seller.supply-hub.index')}
                                className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 bg-white text-clay-800 shadow-xs font-black"
                            >
                                <span>Browse Supplies</span>
                            </Link>

                            <Link
                                href={route('seller.supply-hub.my-listings')}
                                className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 text-stone-500 hover:text-stone-800 font-semibold"
                            >
                                <span>My Supplies</span>
                                {myPublishedCount > 0 && (
                                    <span className="px-1.5 py-0.2 text-[10px] rounded-full font-black bg-stone-200 text-stone-600">
                                        {myPublishedCount}
                                    </span>
                                )}
                            </Link>

                            <Link
                                href={route('seller.supply-hub.orders')}
                                className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 text-stone-500 hover:text-stone-800 font-semibold"
                            >
                                <span>Supplies Ordered</span>
                                {totalOpenOrders > 0 && (
                                    <span className="px-1.5 py-0.2 text-[10px] rounded-full font-black bg-stone-200 text-stone-600">
                                        {totalOpenOrders}
                                    </span>
                                )}
                            </Link>

                            <Link
                                href={route('seller.supply-hub.sales')}
                                className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 text-stone-500 hover:text-stone-800 font-semibold"
                            >
                                <span>Supplies Sold</span>
                                {wholesaleSalesCount > 0 && (
                                    <span className="px-1.5 py-0.2 text-[10px] rounded-full font-black bg-stone-200 text-stone-600">
                                        {wholesaleSalesCount}
                                    </span>
                                )}
                            </Link>
                        </div>
                    </div>

                    {/* Right Cart Shortcut */}
                    <div className="flex items-center gap-2 shrink-0">
                        <Link
                            href={route('procurement.index')}
                            className="hidden md:inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-50 hover:border-stone-300 transition shadow-2xs"
                            title="Inventory"
                        >
                            <Boxes size={14} className="text-stone-500" />
                            <span>Inventory</span>
                        </Link>

                        <Link
                            href={route('seller.supply-hub.cart')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-800 text-xs font-bold transition shadow-2xs cursor-pointer"
                            title="View Cart"
                        >
                            <ShoppingCart size={14} className="text-clay-600" />
                            <span className="hidden sm:inline">View Cart</span>
                            <span className="inline sm:hidden">Cart</span>
                            {cartCount > 0 && (
                                <span className="flex h-4 min-w-[18px] items-center justify-center rounded-full bg-clay-600 text-white px-1 text-[10px] font-black">
                                    {cartCount}
                                </span>
                            )}
                        </Link>
                    </div>
                </div>

                {/* 3-Way Sourcing Segmented Switch: All vs Factory Direct vs Peer Artisan */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 bg-stone-50/80 border border-stone-200/90 rounded-2xl p-2 sm:p-2.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider hidden sm:inline ml-1">
                            Sourcing Channel:
                        </span>
                        <div className="inline-flex rounded-xl bg-stone-200/70 p-0.5">
                            <button
                                type="button"
                                onClick={() => handleFilterChange('seller_type', 'all')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    (!filters.seller_type || filters.seller_type === 'all')
                                        ? 'bg-white text-stone-900 shadow-2xs font-extrabold'
                                        : 'text-stone-600 hover:text-stone-900'
                                }`}
                            >
                                All Sourcing
                            </button>
                            <button
                                type="button"
                                onClick={() => handleFilterChange('seller_type', 'supplier')}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    filters.seller_type === 'supplier'
                                        ? 'bg-emerald-600 text-white shadow-2xs font-extrabold'
                                        : 'text-stone-600 hover:text-stone-900'
                                }`}
                            >
                                <Building2 size={13} className={filters.seller_type === 'supplier' ? 'text-emerald-100' : 'text-emerald-600'} />
                                <span>Factory Direct (Suppliers)</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleFilterChange('seller_type', 'artisan')}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    filters.seller_type === 'artisan'
                                        ? 'bg-clay-600 text-white shadow-2xs font-extrabold'
                                        : 'text-stone-600 hover:text-stone-900'
                                }`}
                            >
                                <Store size={13} className={filters.seller_type === 'artisan' ? 'text-clay-100' : 'text-clay-600'} />
                                <span>Artisan Surplus</span>
                            </button>
                        </div>
                    </div>

                    {filters.seller_type === 'supplier' && (
                        <div className="hidden md:flex items-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-xl font-medium">
                            <Building2 size={13} className="text-emerald-600" />
                            <span>Showing wholesale industrial depots with guaranteed 24–48h dispatch.</span>
                        </div>
                    )}
                </div>

                {/* Main 2-Column Desktop Layout: Sidebar + Catalog */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                    {/* Left Sticky Filter Sidebar for Desktop */}
                    <div className="hidden lg:block lg:col-span-1 sticky top-6 max-h-[calc(100vh-2.5rem)] overflow-y-auto overscroll-contain pr-1 pb-6">
                        <B2BFilterSidebar
                            categories={categories}
                            categoryCounts={categoryCounts}
                            availableLocations={availableLocations}
                            locationCounts={locationCounts}
                            filters={filters}
                            onFilterChange={handleFilterChange}
                            onReset={handleResetAllFilters}
                        />
                    </div>

                    {/* Catalog Content Area */}
                    <div className="lg:col-span-3 space-y-3 sm:space-y-4 w-full min-w-0">
                        {/* Toolbar */}
                        <SourcingCatalogToolbar
                            searchInput={searchInput}
                            setSearchInput={setSearchInput}
                            onSearchSubmit={handleSearchSubmit}
                            onClearSearch={handleClearSearch}
                            sort={filters.sort || 'newest'}
                            onSortChange={(val) => handleFilterChange('sort', val)}
                            activeFiltersCount={activeFiltersCount}
                            onOpenMobileFilters={() => setIsMobileFiltersOpen(true)}
                            filters={filters}
                            onRemoveFilter={handleRemoveFilter}
                            onResetAllFilters={handleResetAllFilters}
                        />

                        {/* Product Grid */}
                        {supplies.data && supplies.data.length > 0 ? (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-4">
                                    {supplies.data.map((supply) => (
                                        <B2BSupplyCard
                                            key={supply.id}
                                            supply={supply}
                                            onAddToCart={handleAddToCart}
                                            onViewDetail={setSelectedSupplyForDetail}
                                        />
                                    ))}
                                </div>

                                {supplies.last_page > 1 && (
                                    <div className="pt-4">
                                        <CompactPagination
                                            currentPage={supplies.current_page}
                                            totalPages={supplies.last_page}
                                            totalItems={supplies.total}
                                            itemsPerPage={supplies.per_page}
                                            onPageChange={(page) => handleFilterChange('page', page)}
                                            itemLabel="material supplies"
                                            className="rounded-2xl border border-stone-200"
                                        />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center shadow-2xs">
                                <WorkspaceEmptyState
                                    icon={Store}
                                    title="No material supplies match your criteria"
                                    description="Try clearing some search terms, removing location filters, or resetting category selections."
                                    actionLabel="Reset All Filters"
                                    onAction={handleResetAllFilters}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick View Detail Modal */}
            <MaterialDetailModal
                supply={selectedSupplyForDetail}
                onClose={() => setSelectedSupplyForDetail(null)}
                onAddToCart={handleAddToCart}
            />

            {/* Cart Slide-Over Drawer */}
            <ProcurementCartDrawer
                isOpen={isCartDrawerOpen}
                onClose={() => setIsCartDrawerOpen(false)}
                cart={cart}
                onCartUpdated={(newCart) => setCart(newCart)}
            />

            {/* Mobile Filters Slide-Over Drawer */}
            <SlideOverDrawer
                show={isMobileFiltersOpen}
                onClose={() => setIsMobileFiltersOpen(false)}
                title="Filter Peer Supplies"
                subtitle="Narrow down material listings by type, budget, and hub location."
                footer={
                    <div className="flex items-center justify-between w-full">
                        <button
                            type="button"
                            onClick={handleResetAllFilters}
                            className="inline-flex items-center gap-1 text-xs font-bold text-stone-500 hover:text-stone-800"
                        >
                            <RotateCcw size={13} />
                            <span>Reset</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsMobileFiltersOpen(false)}
                            className="px-6 py-2.5 bg-clay-700 text-white rounded-xl text-xs font-bold shadow-md shadow-clay-200"
                        >
                            Show Results
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
                        filters={filters}
                        onFilterChange={handleFilterChange}
                        onReset={handleResetAllFilters}
                    />
                </div>
            </SlideOverDrawer>
        </>
    );
}

Index.layout = (page) => <SellerWorkspaceLayout active="supply-hub">{page}</SellerWorkspaceLayout>;
