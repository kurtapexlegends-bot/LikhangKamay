import React, { useState, useMemo } from 'react';
import { 
    Package, Store, ShieldCheck, MapPin, Search, SlidersHorizontal, 
    ChevronDown, X, ShoppingCart, ArrowUpRight, Plus, Minus,
    Truck, Car, Bike, LayoutList, LayoutGrid, CheckCircle2, RotateCcw
} from 'lucide-react';
import { router } from '@inertiajs/react';
import { useToast } from '@/Components/ToastContext';

const formatCurrency = (val) => `₱${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function SourcingSuppliesTable({
    supplies = [],
    categories = [],
    filters = {},
}) {
    const { addToast } = useToast();
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [selectedCategory, setSelectedCategory] = useState(filters.category || 'All');
    const [quantities, setQuantities] = useState({});
    const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Quantity adjustments
    const handleQtyChange = (item, newQty) => {
        const min = item.moq || 1;
        const max = item.stock || 9999;
        const clamped = Math.max(min, Math.min(max, newQty));
        setQuantities(prev => ({ ...prev, [item.id]: clamped }));
    };

    const getItemQty = (item) => quantities[item.id] || item.moq || 1;

    // Instant filtered items
    const filteredItems = useMemo(() => {
        const list = Array.isArray(supplies) ? supplies : (supplies.data || []);
        const term = searchTerm.toLowerCase().trim();

        return list.filter(item => {
            const matchSearch = !term || 
                item.name.toLowerCase().includes(term) ||
                (item.description && item.description.toLowerCase().includes(term)) ||
                (item.seller && item.seller.shop_name.toLowerCase().includes(term)) ||
                (item.seller && item.seller.city && item.seller.city.toLowerCase().includes(term));
            
            const matchCat = selectedCategory === 'All' || item.category === selectedCategory;
            return matchSearch && matchCat;
        });
    }, [supplies, searchTerm, selectedCategory]);

    const handleQuickOrder = (item) => {
        const qty = getItemQty(item);
        router.visit(route('checkout.create', {
            product_id: item.id,
            quantity: qty,
        }));
    };

    const handleAddToCart = async (item) => {
        const qty = getItemQty(item);
        try {
            await window.axios.post(route('cart.store'), {
                product_id: item.id,
                quantity: qty,
                variant: 'Standard',
            });
            addToast({
                type: 'success',
                message: `Added ${qty} ${item.supply_unit || 'units'} of "${item.name}" to procurement cart.`,
            });
        } catch {
            addToast({
                type: 'error',
                message: 'Failed to add item to cart.',
            });
        }
    };

    return (
        <div className="rounded-2xl border border-stone-200 bg-white shadow-2xs overflow-hidden">
            {/* Integrated Studio Table Toolbar */}
            <div className="p-4 sm:p-5 border-b border-stone-200 bg-stone-50/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Search Bar */}
                <div className="relative flex-1 max-w-md">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Filter by material name, category, or supplier workshop..."
                        className="w-full rounded-xl border border-stone-200 bg-white pl-9 pr-8 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-clay-500 focus:ring-1 focus:ring-clay-500 shadow-2xs font-medium"
                    />
                    {searchTerm && (
                        <button
                            type="button"
                            onClick={() => setSearchTerm('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                        >
                            <X size={13} />
                        </button>
                    )}
                </div>

                {/* Filter Popover & View Toggle */}
                <div className="flex items-center gap-2.5 shrink-0 justify-between sm:justify-end">
                    {/* Category Selector */}
                    <div className="relative">
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="appearance-none rounded-xl border border-stone-200 bg-white pl-3.5 pr-8 py-2 text-xs font-bold text-stone-700 hover:border-stone-300 focus:border-clay-500 focus:ring-1 focus:ring-clay-500 shadow-2xs cursor-pointer"
                        >
                            <option value="All">All Categories ({categories.length})</option>
                            {categories.filter(c => c !== 'All').map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex items-center rounded-xl border border-stone-200 bg-stone-100 p-0.5">
                        <button
                            type="button"
                            onClick={() => setViewMode('table')}
                            className={`rounded-lg p-1.5 transition-colors ${viewMode === 'table' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-500 hover:text-stone-900'}`}
                            title="Table View"
                            aria-label="Table View"
                        >
                            <LayoutList size={14} />
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('cards')}
                            className={`rounded-lg p-1.5 transition-colors ${viewMode === 'cards' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-500 hover:text-stone-900'}`}
                            title="Compact Grid"
                            aria-label="Compact Grid"
                        >
                            <LayoutGrid size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Active Filter Chips */}
            {selectedCategory !== 'All' && (
                <div className="px-4 py-2 bg-stone-100/60 border-b border-stone-200 flex items-center gap-2 text-xs text-stone-600">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Filtered by:</span>
                    <span className="inline-flex items-center gap-1 bg-white border border-stone-200 rounded-md px-2 py-0.5 text-[11px] font-bold text-stone-800">
                        {selectedCategory}
                        <button type="button" onClick={() => setSelectedCategory('All')} className="text-stone-400 hover:text-stone-700">
                            <X size={11} />
                        </button>
                    </span>
                </div>
            )}

            {/* Empty State */}
            {filteredItems.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                    <Package size={36} className="mx-auto text-stone-300" />
                    <h4 className="text-sm font-bold text-stone-800">No Peer Supplies Found</h4>
                    <p className="text-xs text-stone-500 max-w-sm mx-auto">
                        No raw materials or blanks match your current search criteria.
                    </p>
                </div>
            ) : viewMode === 'table' ? (
                /* Desktop Dense Data Table */
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-stone-600">
                        <thead className="border-b border-stone-200 bg-stone-50/80 font-bold uppercase tracking-wider text-stone-500 text-[10px]">
                            <tr>
                                <th className="px-5 py-3.5">Material / Item</th>
                                <th className="px-4 py-3.5">Supplier Workshop</th>
                                <th className="px-4 py-3.5">MOQ & Weight</th>
                                <th className="px-4 py-3.5">Pricing & Volume Tiers</th>
                                <th className="px-4 py-3.5">Courier Vehicle</th>
                                <th className="px-4 py-3.5">Available Stock</th>
                                <th className="px-5 py-3.5 text-right">Procure / Order</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-150 font-medium">
                            {filteredItems.map((item) => {
                                const qty = getItemQty(item);
                                const hasDiscount = item.wholesale_price && item.wholesale_min_qty && qty >= item.wholesale_min_qty;
                                const unitPrice = hasDiscount ? item.wholesale_price : item.effective_price;
                                const totalWeight = Math.round((qty * (item.weight || 1.0) * 1.10) * 10) / 10;

                                return (
                                    <tr key={item.id} className="hover:bg-stone-50/50 transition-colors">
                                        {/* Material & Mini Thumbnail */}
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-stone-100 flex items-center justify-center text-stone-400">
                                                    {item.img ? (
                                                        <img
                                                            src={item.img}
                                                            alt={item.name}
                                                            className="h-full w-full object-cover"
                                                            onError={(e) => { e.target.onerror = null; e.target.src = '/images/placeholder.svg'; }}
                                                        />
                                                    ) : (
                                                        <Package size={16} className="text-stone-400" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-stone-900 line-clamp-1">{item.name}</p>
                                                    <span className="inline-flex items-center rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold text-stone-600 mt-0.5">
                                                        {item.category}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Supplier Workshop */}
                                        <td className="px-4 py-3.5">
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-1 font-bold text-stone-900">
                                                    <Store size={12} className="text-clay-600 shrink-0" />
                                                    <span className="truncate max-w-[140px]">{item.seller.shop_name}</span>
                                                    {item.seller.is_verified && (
                                                        <ShieldCheck size={12} className="text-blue-600 shrink-0" />
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-stone-400 flex items-center gap-0.5">
                                                    <MapPin size={10} />
                                                    {item.seller.city}
                                                </p>
                                            </div>
                                        </td>

                                        {/* MOQ & Weight */}
                                        <td className="px-4 py-3.5">
                                            <div className="space-y-0.5">
                                                <p className="font-bold text-stone-900">
                                                    MOQ: <span className="text-clay-700">{item.moq} {item.supply_unit}</span>
                                                </p>
                                                <p className="text-[10px] text-stone-400">
                                                    {item.weight} kg / {item.supply_unit}
                                                </p>
                                            </div>
                                        </td>

                                        {/* Pricing & Volume Tier */}
                                        <td className="px-4 py-3.5">
                                            <div className="space-y-0.5">
                                                <p className="font-bold text-stone-900">
                                                    {formatCurrency(item.effective_price)} <span className="text-[10px] font-normal text-stone-400">/{item.supply_unit}</span>
                                                </p>
                                                {item.wholesale_price && item.wholesale_min_qty ? (
                                                    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                                                        hasDiscount ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'
                                                    }`}>
                                                        {formatCurrency(item.wholesale_price)} for {item.wholesale_min_qty}+
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-stone-400">Standard rate</span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Courier Vehicle */}
                                        <td className="px-4 py-3.5">
                                            <div className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-2 py-1 text-[10px] font-bold text-stone-700">
                                                {totalWeight > 200 ? (
                                                    <Truck size={11} className="text-clay-600" />
                                                ) : totalWeight > 20 ? (
                                                    <Car size={11} className="text-amber-600" />
                                                ) : (
                                                    <Bike size={11} className="text-stone-500" />
                                                )}
                                                <span>{item.vehicle_preview.label} ({totalWeight}kg)</span>
                                            </div>
                                        </td>

                                        {/* Stock */}
                                        <td className="px-4 py-3.5 font-bold text-stone-800">
                                            {item.stock} {item.supply_unit}
                                        </td>

                                        {/* Stepper & Actions */}
                                        <td className="px-5 py-3.5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {/* Stepper */}
                                                <div className="flex items-center rounded-lg border border-stone-200 bg-white">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleQtyChange(item, qty - 1)}
                                                        disabled={qty <= (item.moq || 1)}
                                                        className="px-2 py-1 text-stone-600 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed"
                                                    >
                                                        <Minus size={11} />
                                                    </button>
                                                    <span className="px-2 text-xs font-bold text-stone-900 w-7 text-center">{qty}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleQtyChange(item, qty + 1)}
                                                        disabled={qty >= item.stock}
                                                        className="px-2 py-1 text-stone-600 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed"
                                                    >
                                                        <Plus size={11} />
                                                    </button>
                                                </div>

                                                {/* Add to Cart */}
                                                <button
                                                    type="button"
                                                    onClick={() => handleAddToCart(item)}
                                                    className="rounded-lg border border-stone-200 bg-white p-1.5 text-stone-700 hover:bg-stone-50 hover:border-stone-300 transition-colors shadow-2xs"
                                                    title="Add to Procurement Cart"
                                                >
                                                    <ShoppingCart size={13} />
                                                </button>

                                                {/* 1-Click Wholesale Checkout */}
                                                <button
                                                    type="button"
                                                    onClick={() => handleQuickOrder(item)}
                                                    className="inline-flex items-center gap-1 rounded-lg bg-clay-600 px-2.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-clay-700 transition-colors"
                                                >
                                                    <span>Buy</span>
                                                    <ArrowUpRight size={12} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                /* Compact Card Grid */
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredItems.map((item) => {
                        const qty = getItemQty(item);
                        const hasDiscount = item.wholesale_price && item.wholesale_min_qty && qty >= item.wholesale_min_qty;
                        const unitPrice = hasDiscount ? item.wholesale_price : item.effective_price;
                        const totalWeight = Math.round((qty * (item.weight || 1.0) * 1.10) * 10) / 10;

                        return (
                            <div key={item.id} className="rounded-xl border border-stone-200 bg-white p-4 space-y-3 shadow-2xs flex flex-col justify-between">
                                <div className="space-y-2.5">
                                    <div className="flex items-start gap-3">
                                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-stone-100 flex items-center justify-center text-stone-400">
                                            {item.img ? (
                                                <img
                                                    src={item.img}
                                                    alt={item.name}
                                                    className="h-full w-full object-cover"
                                                    onError={(e) => { e.target.onerror = null; e.target.src = '/images/placeholder.svg'; }}
                                                />
                                            ) : (
                                                <Package size={20} className="text-stone-400" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-bold text-stone-900 text-xs line-clamp-1">{item.name}</p>
                                            <p className="text-[10px] text-stone-400 mt-0.5">{item.category}</p>
                                            <div className="flex items-center gap-1 text-[10px] text-stone-600 font-semibold mt-1">
                                                <Store size={10} className="text-clay-600" />
                                                <span className="truncate">{item.seller.shop_name}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Specs & Pricing Pill */}
                                    <div className="rounded-lg bg-stone-50 border border-stone-200/70 p-2 text-xs space-y-1">
                                        <div className="flex justify-between font-bold text-stone-900">
                                            <span>Price:</span>
                                            <span>{formatCurrency(unitPrice)} / {item.supply_unit}</span>
                                        </div>
                                        <div className="flex justify-between text-[10px] text-stone-500">
                                            <span>MOQ: {item.moq} {item.supply_unit}</span>
                                            <span>Courier: {item.vehicle_preview.label}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-150">
                                    <div className="flex items-center rounded-lg border border-stone-200 bg-white">
                                        <button
                                            type="button"
                                            onClick={() => handleQtyChange(item, qty - 1)}
                                            disabled={qty <= (item.moq || 1)}
                                            className="px-2 py-1 text-stone-600 hover:bg-stone-50 disabled:opacity-30"
                                        >
                                            <Minus size={11} />
                                        </button>
                                        <span className="px-1.5 text-xs font-bold text-stone-900 w-6 text-center">{qty}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleQtyChange(item, qty + 1)}
                                            disabled={qty >= item.stock}
                                            className="px-2 py-1 text-stone-600 hover:bg-stone-50 disabled:opacity-30"
                                        >
                                            <Plus size={11} />
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => handleAddToCart(item)}
                                            className="rounded-lg border border-stone-200 bg-white p-1.5 text-stone-700 hover:bg-stone-50 shadow-2xs"
                                            title="Add to Cart"
                                        >
                                            <ShoppingCart size={13} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleQuickOrder(item)}
                                            className="rounded-lg bg-clay-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-clay-700"
                                        >
                                            Buy
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
