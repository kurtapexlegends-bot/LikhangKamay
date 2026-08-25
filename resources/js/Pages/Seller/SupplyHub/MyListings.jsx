import React, { useState, useMemo } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import SellerHeader from '@/Layouts/SellerHeader';
import { useToast } from '@/Components/ToastContext';
import { 
    Layers, Plus, Check, Edit3, ArrowLeft,
    Package, Sparkles, Tag, ShieldCheck, Store, Search, X, RotateCcw, Truck, ShoppingCart, Boxes
} from 'lucide-react';
import ConfigureWholesaleModal from '@/Components/Seller/SupplyHub/ConfigureWholesaleModal';
import FilterToolbarHeader from '@/Components/Seller/Shared/FilterToolbarHeader';

const formatCurrency = (val) => `₱${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function MyListings({ products = [], availableCategories = [], availableUnits = {}, activeOrdersCount = 0, cartCount = 0 }) {
    const { addToast } = useToast();
    const { openSidebar } = useSellerWorkspaceShell();
    const [editingProduct, setEditingProduct] = useState(null);

    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'b2b', 'retail'
    const [categoryFilter, setCategoryFilter] = useState('all');

    const { data, setData, post, processing, errors, reset } = useForm({
        is_b2b_supply: false,
        moq: 1,
        wholesale_price: '',
        wholesale_min_qty: '',
        supply_unit: 'pcs',
    });

    const openEditModal = (product) => {
        setEditingProduct(product);
        setData({
            is_b2b_supply: Boolean(product.is_b2b_supply),
            moq: product.moq || 1,
            wholesale_price: product.wholesale_price || '',
            wholesale_min_qty: product.wholesale_min_qty || '',
            supply_unit: product.supply_unit || 'pcs',
        });
    };

    const handleSave = (e) => {
        e.preventDefault();
        if (!editingProduct) return;

        post(route('seller.supply-hub.toggle', editingProduct.id), {
            preserveScroll: true,
            onSuccess: () => {
                addToast({
                    type: 'success',
                    message: 'Wholesale supply listing updated successfully.',
                });
                setEditingProduct(null);
                reset();
            },
            onError: () => {
                addToast({
                    type: 'error',
                    message: 'Failed to update listing. Please verify inputs.',
                });
            },
        });
    };

    const publishedCount = products.filter(p => p.is_b2b_supply).length;
    const retailCount = products.length - publishedCount;

    // Filtered products list
    const filteredProducts = useMemo(() => {
        return products.filter((p) => {
            // Status match
            if (statusFilter === 'b2b' && !p.is_b2b_supply) return false;
            if (statusFilter === 'retail' && p.is_b2b_supply) return false;

            // Category match
            if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;

            // Search match
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                const nameMatch = p.name?.toLowerCase().includes(query);
                const skuMatch = p.sku?.toLowerCase().includes(query);
                const catMatch = p.category?.toLowerCase().includes(query);
                if (!nameMatch && !skuMatch && !catMatch) return false;
            }

            return true;
        });
    }, [products, statusFilter, categoryFilter, searchQuery]);

    const distinctCategories = useMemo(() => {
        return Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    }, [products]);

    return (
        <>
            <Head title="My Wholesale Supply Listings" />
            <SellerHeader
                title="Supply Hub"
                subtitle="Source bulk raw materials, clay sacks, timber, and glazes directly from verified peer studios."
                onMenuClick={openSidebar}
                badge={{ label: 'Wholesale Sourcing', iconColor: 'text-clay-500' }}
            />

            <div className="p-4 sm:p-6 lg:p-8 space-y-6 pb-12">
                {/* Studio Workspace Tab Navigation */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-3">
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
                        <Link
                            href={route('seller.supply-hub.index')}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 hover:border-stone-300 transition-colors shadow-2xs shrink-0"
                        >
                            <Store size={13} className="text-clay-600" />
                            <span>Browse Peer Supplies</span>
                        </Link>
                        <Link
                            href={route('seller.supply-hub.my-listings')}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-3.5 py-2 text-xs font-bold text-white shadow-2xs shrink-0"
                        >
                            <Layers size={13} />
                            <span>My Wholesale Listings</span>
                            {publishedCount > 0 && (
                                <span className="rounded-full bg-stone-700 text-stone-200 px-1.5 py-0.2 text-[10px] font-extrabold">
                                    {publishedCount}
                                </span>
                            )}
                        </Link>
                        <Link
                            href={route('seller.supply-hub.orders')}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 hover:border-stone-300 transition-colors shadow-2xs shrink-0"
                        >
                            <Truck size={13} className="text-clay-600" />
                            <span>Inbound Material Orders</span>
                            {activeOrdersCount > 0 && (
                                <span className="rounded-full bg-clay-600 text-white px-1.5 py-0.2 text-[10px] font-black">
                                    {activeOrdersCount}
                                </span>
                            )}
                        </Link>
                    </div>

                    {/* Sourcing Cart & Studio Inventory Icon Shortcuts */}
                    <div className="flex items-center gap-2 shrink-0">
                        <Link
                            href={route('products.index')}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-clay-600 px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-clay-700 transition-colors"
                        >
                            <Plus size={13} />
                            <span>Create Product</span>
                        </Link>

                        <Link
                            href={route('procurement.index')}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 hover:border-stone-300 transition-colors shadow-2xs"
                            title="Studio Inventory"
                        >
                            <Boxes size={14} className="text-stone-500" />
                            <span className="hidden md:inline">Studio Inventory</span>
                        </Link>

                        <Link
                            href={route('seller.supply-hub.cart')}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-bold text-stone-800 hover:bg-stone-50 hover:border-stone-300 transition-colors shadow-2xs"
                            title="View Sourcing Cart"
                        >
                            <ShoppingCart size={14} className="text-clay-600" />
                            <span className="hidden md:inline">View Cart</span>
                            {cartCount > 0 && (
                                <span className="rounded-full bg-clay-600 text-white px-1.5 py-0.2 text-[10px] font-black">
                                    {cartCount}
                                </span>
                            )}
                        </Link>
                    </div>
                </div>

                {/* Filter & Search Toolbar using Standard FilterToolbarHeader */}
                <FilterToolbarHeader
                    tabs={[
                        { key: 'all', label: 'All Items', count: products.length },
                        { key: 'b2b', label: 'Listed for Peer Studios', count: publishedCount },
                        { key: 'retail', label: 'Retail Only', count: retailCount },
                    ]}
                    activeTab={statusFilter}
                    onTabChange={setStatusFilter}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    searchPlaceholder="Search products or SKU..."
                    activeFiltersCount={categoryFilter !== 'all' ? 1 : 0}
                    activeFilterTags={categoryFilter !== 'all' ? [{
                        key: 'category',
                        label: `Category: ${categoryFilter}`,
                        onRemove: () => setCategoryFilter('all')
                    }] : []}
                    filterPopoverTitle="Filter Listings"
                    filterPopoverFields={
                        <div className="space-y-3">
                            <div>
                                <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block mb-1.5">
                                    Product Category
                                </label>
                                <select
                                    value={categoryFilter}
                                    onChange={(e) => setCategoryFilter(e.target.value)}
                                    className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3 py-2 text-xs text-stone-800 focus:border-clay-500 focus:ring-1 focus:ring-clay-500"
                                >
                                    <option value="all">All Categories</option>
                                    {distinctCategories.map((c) => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    }
                    onResetFilters={() => {
                        setCategoryFilter('all');
                        setSearchQuery('');
                        setStatusFilter('all');
                    }}
                />

                {/* Table of Listings */}
                <div className="rounded-2xl border border-stone-200 bg-white shadow-2xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-stone-600">
                            <thead className="border-b border-stone-200 bg-stone-50/80 font-bold uppercase tracking-wider text-stone-500 text-[10px]">
                                <tr>
                                    <th className="px-5 py-3.5">Material / Item</th>
                                    <th className="px-4 py-3.5">Category</th>
                                    <th className="px-4 py-3.5">Standard Price</th>
                                    <th className="px-4 py-3.5">Supply Status</th>
                                    <th className="px-4 py-3.5">Min. Order</th>
                                    <th className="px-4 py-3.5">Bulk Discount</th>
                                    <th className="px-4 py-3.5">Stock</th>
                                    <th className="px-5 py-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-150 font-medium">
                                {filteredProducts.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-5 py-12 text-center text-stone-500">
                                            <Package size={32} className="mx-auto text-stone-300 mb-2" />
                                            <p className="font-bold text-stone-800 text-sm">No products found</p>
                                            <p className="text-xs text-stone-400 mt-1">
                                                No items match your active search or status filter.
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredProducts.map((product) => (
                                        <tr key={product.id} className="hover:bg-stone-50/50 transition-colors">
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
                                                        <img
                                                            src={product.img || '/images/placeholder.svg'}
                                                            alt={product.name}
                                                            className="h-full w-full object-cover"
                                                            onError={(e) => { e.target.onerror = null; e.target.src = '/images/placeholder.svg'; }}
                                                        />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-stone-900 line-clamp-1">{product.name}</p>
                                                        <p className="text-[10px] text-stone-400 font-mono mt-0.5">SKU: {product.sku || 'N/A'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 text-stone-700">{product.category}</td>
                                            <td className="px-4 py-3.5 font-bold text-stone-900">{formatCurrency(product.price)}</td>
                                            <td className="px-4 py-3.5">
                                                {product.is_b2b_supply ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                                        <Check size={10} />
                                                        Listed in B2B
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center rounded-full bg-stone-100 border border-stone-200 px-2 py-0.5 text-[10px] font-semibold text-stone-500">
                                                        Retail Only
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5 text-stone-800 font-semibold">
                                                {product.is_b2b_supply ? `${product.moq} ${product.supply_unit}` : '—'}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                {product.is_b2b_supply && product.wholesale_price && product.wholesale_min_qty ? (
                                                    <div className="space-y-0.5">
                                                        <p className="font-bold text-emerald-700">{formatCurrency(product.wholesale_price)}</p>
                                                        <p className="text-[10px] text-stone-400">Min. {product.wholesale_min_qty} {product.supply_unit}</p>
                                                    </div>
                                                ) : (
                                                    <span className="text-stone-400 text-[11px]">No volume discount</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5 font-semibold text-stone-800">
                                                {product.stock} {product.supply_unit || 'pcs'}
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => openEditModal(product)}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-50 hover:border-clay-300 transition-colors shadow-2xs"
                                                >
                                                    <Edit3 size={12} />
                                                    <span>Configure B2B</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Configure Wholesale Modal */}
                <ConfigureWholesaleModal
                    show={Boolean(editingProduct)}
                    onClose={() => setEditingProduct(null)}
                    product={editingProduct}
                    data={data}
                    setData={setData}
                    onSubmit={handleSave}
                    processing={processing}
                    errors={errors}
                    availableUnits={availableUnits}
                />
            </div>
        </>
    );
}

MyListings.layout = (page) => <SellerWorkspaceLayout active="supply-hub">{page}</SellerWorkspaceLayout>;
