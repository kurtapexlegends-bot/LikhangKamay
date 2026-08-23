import React, { useState, useEffect } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import SellerHeader from '@/Layouts/SellerHeader';
import { useToast } from '@/Components/ToastContext';
import { Package, ShieldCheck, CheckCircle2, Plus } from 'lucide-react';
import { Link } from '@inertiajs/react';

// Modular Subcomponents
import SupplyHubKPIs from '@/Components/Seller/SupplyHub/SupplyHubKPIs';
import SupplyFilterBar from '@/Components/Seller/SupplyHub/SupplyFilterBar';
import SupplyCard from '@/Components/Seller/SupplyHub/SupplyCard';

export default function SupplyHubIndex({ 
    supplies, 
    categories = [], 
    filters = {}, 
    stats = {} 
}) {
    const { addToast } = useToast();
    const { openSidebar } = useSellerWorkspaceShell();
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [activeCategory, setActiveCategory] = useState(filters.category || 'All');
    const [quantities, setQuantities] = useState({});

    const [shouldAnimateKPI, setShouldAnimateKPI] = useState(true);
    useEffect(() => {
        const timer = setTimeout(() => setShouldAnimateKPI(false), 2000);
        return () => clearTimeout(timer);
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route('seller.supply-hub.index'), {
            search: searchQuery,
            category: activeCategory,
        }, { preserveState: true, replace: true });
    };

    const handleCategoryClick = (cat) => {
        setActiveCategory(cat);
        router.get(route('seller.supply-hub.index'), {
            search: searchQuery,
            category: cat,
        }, { preserveState: true, replace: true });
    };

    const handleQuantityChange = (item, newQty) => {
        const min = item.moq || 1;
        const max = item.stock || 9999;
        const clamped = Math.max(min, Math.min(max, newQty));
        setQuantities(prev => ({ ...prev, [item.id]: clamped }));
    };

    const handleQuickOrder = (item, qty) => {
        router.visit(route('checkout.create', {
            product_id: item.id,
            quantity: qty,
        }));
    };

    const handleAddToCart = async (item, qty) => {
        try {
            await window.axios.post(route('cart.store'), {
                product_id: item.id,
                quantity: qty,
                variant: 'Standard',
            });
            addToast({
                type: 'success',
                message: `Added ${qty} ${item.supply_unit || 'units'} of "${item.name}" to your studio procurement cart.`,
            });
        } catch {
            addToast({
                type: 'error',
                message: 'Could not add material to cart. Please try again.',
            });
        }
    };

    return (
        <>
            <Head title="Artisan Supply & Materials Hub" />

            <SellerHeader
                title="Supply Hub"
                subtitle="Source raw materials, timber, glazes, and blanks directly from verified local peer studios."
                onMenuClick={openSidebar}
                badge={{ label: 'Wholesale B2B', iconColor: 'text-clay-500' }}
            />

            <div className="p-4 sm:p-6 lg:p-8 space-y-6 pb-12">
                {/* Metric Summary Ribbon */}
                <SupplyHubKPIs stats={stats} shouldAnimate={shouldAnimateKPI} />

                {/* Auto-Restock Closed-Loop Notice */}
                <div className="rounded-xl border border-stone-200 bg-white p-4 text-xs text-stone-700 flex items-start gap-3 shadow-2xs">
                    <CheckCircle2 size={16} className="shrink-0 text-emerald-600 mt-0.5" />
                    <div className="flex-1 space-y-0.5">
                        <span className="font-bold text-stone-900">Automated Studio Restocking:</span>
                        <p className="text-stone-500 leading-relaxed">
                            When you mark a delivered B2B materials order as received, LikhangKamay automatically updates your Studio Materials inventory with the exact quantity and unit cost.
                        </p>
                    </div>
                </div>

                {/* Search & Category Filter Controls */}
                <SupplyFilterBar
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    onSearch={handleSearch}
                    categories={categories}
                    activeCategory={activeCategory}
                    onCategoryChange={handleCategoryClick}
                    myPublishedCount={stats.my_published_count || 0}
                />

                {/* Supplies Grid */}
                {supplies.data.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-12 text-center space-y-3">
                        <Package size={36} className="mx-auto text-stone-300" />
                        <h3 className="text-sm font-bold text-stone-800">No Wholesale Supplies Found</h3>
                        <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
                            There are currently no raw materials or blanks listed matching your query.
                        </p>
                        <div className="pt-2">
                            <Link
                                href={route('seller.supply-hub.my-listings')}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-clay-600 px-4 py-2 text-xs font-bold text-white hover:bg-clay-700 transition-colors shadow-2xs"
                            >
                                <Plus size={14} />
                                <span>Publish Material Listing</span>
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {supplies.data.map((item) => (
                            <SupplyCard
                                key={item.id}
                                item={item}
                                quantity={quantities[item.id]}
                                onQuantityChange={handleQuantityChange}
                                onAddToCart={handleAddToCart}
                                onQuickOrder={handleQuickOrder}
                            />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

SupplyHubIndex.layout = (page) => <SellerWorkspaceLayout active="supply-hub">{page}</SellerWorkspaceLayout>;
