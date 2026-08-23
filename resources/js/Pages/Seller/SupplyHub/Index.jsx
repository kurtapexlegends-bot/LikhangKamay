import React, { useState, useMemo } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import SellerWorkspaceLayout from '@/Layouts/SellerWorkspaceLayout';
import { 
    Truck, Search, Package, ShieldCheck, CheckCircle2, 
    ArrowUpRight, SlidersHorizontal, Sparkles, Layers,
    Plus, Minus, ShoppingCart, Info, MapPin, Store, Car, Bike
} from 'lucide-react';
import { useToast } from '@/Components/ToastContext';

const peso = (val) => `PHP ${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function SupplyHubIndex({ supplies, categories = [], filters = {} }) {
    const { addToast } = useToast();
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [activeCategory, setActiveCategory] = useState(filters.category || 'All');
    const [quantities, setQuantities] = useState({});

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

    const getQty = (item) => quantities[item.id] || item.moq || 1;

    const setQty = (item, newQty) => {
        const min = item.moq || 1;
        const max = item.stock || 9999;
        const clamped = Math.max(min, Math.min(max, newQty));
        setQuantities(prev => ({ ...prev, [item.id]: clamped }));
    };

    const handleQuickOrder = (item) => {
        const qty = getQty(item);
        router.visit(route('checkout.create', {
            product_id: item.id,
            quantity: qty,
        }));
    };

    const handleAddToCart = async (item) => {
        const qty = getQty(item);
        try {
            await window.axios.post(route('cart.store'), {
                product_id: item.id,
                quantity: qty,
                variant: 'Standard',
            });
            addToast({
                type: 'success',
                message: `Added ${qty} ${item.supply_unit || 'units'} of "${item.name}" to your studio procurement cart!`,
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

            <div className="space-y-6 pb-12">
                {/* Header Banner */}
                <div className="rounded-2xl border border-stone-200 bg-gradient-to-br from-stone-900 via-stone-850 to-stone-900 p-6 md:p-8 text-white shadow-md relative overflow-hidden">
                    <div className="absolute right-0 top-0 h-full w-1/3 bg-radial-pattern opacity-10 pointer-events-none" />
                    <div className="relative z-10 max-w-3xl space-y-3">
                        <div className="inline-flex items-center gap-2 rounded-full bg-clay-500/20 border border-clay-400/30 px-3 py-1 text-xs font-bold text-clay-300">
                            <Truck size={13} />
                            <span>Artisan-to-Artisan Supply Chain</span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-serif">
                            Studio Materials & Wholesale Supply Hub
                        </h1>
                        <p className="text-sm text-stone-300 leading-relaxed max-w-2xl">
                            Source raw clay sacks, kiln-dried timber, natural glazes, and blanks directly from verified local peer studios. Delivered by heavy-load couriers with automatic restock into your Studio Materials inventory.
                        </p>
                    </div>

                    <div className="mt-6 flex flex-wrap items-center gap-3 pt-2 border-t border-stone-800/80">
                        <Link
                            href={route('seller.supply-hub.my-listings')}
                            className="inline-flex items-center gap-2 rounded-xl bg-clay-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-clay-500 transition-colors"
                        >
                            <Layers size={14} />
                            <span>List Your Studio Supplies / Blanks</span>
                        </Link>
                        <Link
                            href={route('procurement.index')}
                            className="inline-flex items-center gap-2 rounded-xl border border-stone-700 bg-stone-800/80 px-4 py-2.5 text-xs font-semibold text-stone-300 hover:bg-stone-700 hover:text-white transition-colors"
                        >
                            <Package size={14} />
                            <span>View My Studio Inventory</span>
                        </Link>
                    </div>
                </div>

                {/* Auto-Restock Guarantee Pill */}
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs text-emerald-900 flex items-start gap-3 shadow-xs">
                    <Sparkles size={16} className="shrink-0 text-emerald-700 mt-0.5" />
                    <div className="flex-1">
                        <span className="font-bold">Automated Closed-Loop Inventory Sync:</span>
                        <span className="ml-1 text-emerald-800">
                            Whenever you mark a delivered B2B materials order as received, LikhangKamay automatically adds the purchased quantity and unit cost into your Studio Materials inventory.
                        </span>
                    </div>
                </div>

                {/* Search & Category Filter Controls */}
                <div className="space-y-4">
                    <form onSubmit={handleSearch} className="flex gap-3">
                        <div className="relative flex-1">
                            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search raw materials, clay types, glazes, lumber, or supplier studios..."
                                className="w-full rounded-xl border border-stone-200 bg-white pl-10 pr-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-clay-500 focus:ring-1 focus:ring-clay-500 shadow-xs"
                            />
                        </div>
                        <button
                            type="submit"
                            className="rounded-xl bg-stone-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-stone-800 transition-colors shadow-xs"
                        >
                            Search
                        </button>
                    </form>

                    {/* Category Filter Chips */}
                    <div className="flex flex-wrap gap-2">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => handleCategoryClick(cat)}
                                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                                    activeCategory === cat
                                        ? 'bg-clay-600 text-white shadow-xs'
                                        : 'border border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:text-stone-900'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Supplies Grid */}
                {supplies.data.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-12 text-center space-y-3">
                        <Package size={36} className="mx-auto text-stone-300" />
                        <h3 className="text-base font-bold text-stone-800">No Wholesale Supplies Found</h3>
                        <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
                            There are currently no raw materials or blanks listed matching your query. Be the first local studio to list bulk supplies!
                        </p>
                        <div className="pt-2">
                            <Link
                                href={route('seller.supply-hub.my-listings')}
                                className="inline-flex items-center gap-2 rounded-xl bg-clay-600 px-4 py-2 text-xs font-bold text-white hover:bg-clay-700 transition-colors"
                            >
                                <Plus size={14} />
                                <span>Publish Material Listing</span>
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {supplies.data.map((item) => {
                            const qty = getQty(item);
                            const hasWholesaleDiscount = item.wholesale_price && item.wholesale_min_qty && qty >= item.wholesale_min_qty;
                            const unitPrice = hasWholesaleDiscount ? item.wholesale_price : item.effective_price;
                            const subtotal = unitPrice * qty;
                            const totalWeight = roundNum(qty * (item.weight || 1.0) * 1.10);

                            return (
                                <div
                                    key={item.id}
                                    className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-4 shadow-sm hover:shadow-md transition-all duration-200 space-y-3.5"
                                >
                                    {/* Image & Supplier Header */}
                                    <div className="space-y-3">
                                        <div className="relative aspect-4/3 w-full overflow-hidden rounded-xl bg-stone-100 border border-stone-200/60">
                                            <img
                                                src={item.img || '/images/placeholder.svg'}
                                                alt={item.name}
                                                className="h-full w-full object-cover"
                                                onError={(e) => { e.target.onerror = null; e.target.src = '/images/placeholder.svg'; }}
                                            />
                                            <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
                                                <span className="rounded-lg bg-stone-900/80 backdrop-blur-xs px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                                                    MOQ: {item.moq} {item.supply_unit}
                                                </span>
                                                <span className="rounded-lg bg-white/90 backdrop-blur-xs px-2 py-0.5 text-[10px] font-bold text-stone-800 border border-stone-200/60">
                                                    {item.weight} kg / {item.supply_unit}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Supplier & Location */}
                                        <div className="flex items-center justify-between gap-2 text-[11px] text-stone-500">
                                            <div className="flex items-center gap-1.5 min-w-0 font-medium">
                                                <Store size={12} className="text-clay-500 shrink-0" />
                                                <span className="truncate font-semibold text-stone-700">{item.seller.shop_name}</span>
                                                {item.seller.is_verified && (
                                                    <ShieldCheck size={12} className="text-blue-500 shrink-0" />
                                                )}
                                            </div>
                                            <span className="flex items-center gap-0.5 text-stone-400 shrink-0">
                                                <MapPin size={11} />
                                                {item.seller.city}
                                            </span>
                                        </div>

                                        {/* Material Title & Category */}
                                        <div>
                                            <h4 className="font-bold text-stone-900 text-sm line-clamp-1">{item.name}</h4>
                                            <p className="text-[11px] text-stone-400 mt-0.5">{item.category}</p>
                                        </div>

                                        {/* Pricing Box */}
                                        <div className="rounded-xl border border-stone-150 bg-stone-50/60 p-2.5 text-xs space-y-1">
                                            <div className="flex items-baseline justify-between">
                                                <span className="text-stone-500">Base Price:</span>
                                                <span className="font-bold text-stone-900">{peso(item.effective_price)} / {item.supply_unit}</span>
                                            </div>
                                            {item.wholesale_price && item.wholesale_min_qty && (
                                                <div className={`flex items-baseline justify-between text-[11px] font-semibold ${hasWholesaleDiscount ? 'text-emerald-700' : 'text-stone-500'}`}>
                                                    <span>Wholesale ({item.wholesale_min_qty}+ {item.supply_unit}):</span>
                                                    <span>{peso(item.wholesale_price)} / {item.supply_unit}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Courier Vehicle Preview Pill */}
                                        <div className="rounded-lg bg-stone-100 px-2.5 py-1.5 text-[11px] text-stone-600 flex items-center justify-between">
                                            <span className="flex items-center gap-1.5">
                                                {totalWeight > 200 ? (
                                                    <Truck size={13} className="text-clay-600" />
                                                ) : totalWeight > 20 ? (
                                                    <Car size={13} className="text-amber-600" />
                                                ) : (
                                                    <Bike size={13} className="text-stone-500" />
                                                )}
                                                <span className="font-medium">{item.vehicle_preview.label}</span>
                                            </span>
                                            <span className="font-bold text-stone-700">{totalWeight} kg</span>
                                        </div>
                                    </div>

                                    {/* Action Footer: Stepper & Procurement Button */}
                                    <div className="space-y-2.5 pt-2 border-t border-stone-150">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-stone-500 font-medium">Order Qty:</span>
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => setQty(item, qty - 1)}
                                                    disabled={qty <= (item.moq || 1)}
                                                    className="h-7 w-7 rounded-lg border border-stone-200 bg-white flex items-center justify-center text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                                >
                                                    <Minus size={12} />
                                                </button>
                                                <span className="w-8 text-center text-xs font-bold text-stone-900">{qty}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setQty(item, qty + 1)}
                                                    disabled={qty >= item.stock}
                                                    className="h-7 w-7 rounded-lg border border-stone-200 bg-white flex items-center justify-center text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                                >
                                                    <Plus size={12} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between font-bold text-stone-900 text-xs">
                                            <span>Subtotal:</span>
                                            <span className="text-sm font-extrabold text-clay-700">{peso(subtotal)}</span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleAddToCart(item)}
                                                className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-250 bg-stone-50 py-2 text-xs font-bold text-stone-800 hover:bg-stone-100 transition-colors"
                                            >
                                                <ShoppingCart size={13} />
                                                <span>Add Cart</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleQuickOrder(item)}
                                                className="flex items-center justify-center gap-1 rounded-xl bg-clay-600 py-2 text-xs font-bold text-white shadow-xs hover:bg-clay-700 transition-colors"
                                            >
                                                <span>Buy Wholesale</span>
                                                <ArrowUpRight size={13} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
}

SupplyHubIndex.layout = (page) => <SellerWorkspaceLayout active="supply-hub">{page}</SellerWorkspaceLayout>;

function roundNum(num) {
    return Math.round((num + Number.EPSILON) * 10) / 10;
}
