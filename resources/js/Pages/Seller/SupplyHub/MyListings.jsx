import React, { useState, useMemo } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import SellerHeader from '@/Layouts/SellerHeader';
import { useToast } from '@/Components/ToastContext';
import { 
    Layers, Plus, Check, Edit3, ArrowLeft,
    Package, Sparkles, Tag, ShieldCheck, Store, Search, X, RotateCcw
} from 'lucide-react';
import ConfigureWholesaleModal from '@/Components/Seller/SupplyHub/ConfigureWholesaleModal';

const formatCurrency = (val) => `₱${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function MyListings({ products = [], availableCategories = [], availableUnits = {} }) {
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
                title="Wholesale Supply Listings"
                subtitle="Offer surplus raw materials, processed clay sacks, glazes, or unfinished blanks to peer artisan studios."
                onMenuClick={openSidebar}
                breadcrumbs={[
                    { label: 'Supply Hub', href: route('seller.supply-hub.index') },
                    { label: 'My Listings' }
                ]}
                badge={{ label: 'Wholesale B2B', iconColor: 'text-clay-500' }}
            />

            <div className="p-4 sm:p-6 lg:p-8 space-y-6 pb-12">
                {/* Studio Workspace Tab Navigation */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-3">
                    <div className="flex items-center gap-2">
                        <Link
                            href={route('seller.supply-hub.index')}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 hover:border-stone-300 transition-colors shadow-2xs"
                        >
                            <Store size={13} className="text-clay-600" />
                            <span>Browse Peer Supplies</span>
                        </Link>
                        <Link
                            href={route('seller.supply-hub.my-listings')}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-3.5 py-2 text-xs font-bold text-white shadow-2xs"
                        >
                            <Layers size={13} />
                            <span>My Wholesale Listings</span>
                            {publishedCount > 0 && (
                                <span className="rounded-full bg-stone-700 text-stone-200 px-1.5 py-0.2 text-[10px] font-extrabold">
                                    {publishedCount}
                                </span>
                            )}
                        </Link>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <Link
                            href={route('products.index')}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-clay-600 px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-clay-700 transition-colors"
                        >
                            <Plus size={13} />
                            <span>Create Material / Product</span>
                        </Link>
                    </div>
                </div>

                {/* Filter & Search Toolbar */}
                <div className="bg-white rounded-2xl border border-stone-200 p-3 sm:p-4 shadow-2xs space-y-3">
                    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                        {/* Status Pills */}
                        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs font-bold">
                            <button
                                type="button"
                                onClick={() => setStatusFilter('all')}
                                className={`px-3 py-1.5 rounded-lg transition-colors ${
                                    statusFilter === 'all'
                                        ? 'bg-white text-stone-900 shadow-2xs font-extrabold'
                                        : 'text-stone-600 hover:text-stone-900'
                                }`}
                            >
                                All Items ({products.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('b2b')}
                                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                                    statusFilter === 'b2b'
                                        ? 'bg-white text-emerald-800 shadow-2xs font-extrabold'
                                        : 'text-stone-600 hover:text-stone-900'
                                }`}
                            >
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                <span>Listed in B2B ({publishedCount})</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('retail')}
                                className={`px-3 py-1.5 rounded-lg transition-colors ${
                                    statusFilter === 'retail'
                                        ? 'bg-white text-stone-900 shadow-2xs font-extrabold'
                                        : 'text-stone-600 hover:text-stone-900'
                                }`}
                            >
                                Retail Only ({retailCount})
                            </button>
                        </div>

                        {/* Search & Category Select */}
                        <div className="flex items-center gap-2.5">
                            {distinctCategories.length > 0 && (
                                <select
                                    value={categoryFilter}
                                    onChange={(e) => setCategoryFilter(e.target.value)}
                                    className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 focus:border-clay-500 focus:ring-1 focus:ring-clay-500 shadow-2xs"
                                >
                                    <option value="all">All Categories</option>
                                    {distinctCategories.map((cat) => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            )}

                            <div className="relative flex-1 md:w-64">
                                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search products or SKU..."
                                    className="w-full rounded-xl border border-stone-200 bg-stone-50/60 pl-8 pr-7 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-clay-500 focus:ring-1 focus:ring-clay-500"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table of Listings */}
                <div className="rounded-2xl border border-stone-200 bg-white shadow-2xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-stone-600">
                            <thead className="border-b border-stone-200 bg-stone-50/80 font-bold uppercase tracking-wider text-stone-500 text-[10px]">
                                <tr>
                                    <th className="px-5 py-3.5">Material / Item</th>
                                    <th className="px-4 py-3.5">Category</th>
                                    <th className="px-4 py-3.5">Standard Price</th>
                                    <th className="px-4 py-3.5">B2B Status</th>
                                    <th className="px-4 py-3.5">MOQ</th>
                                    <th className="px-4 py-3.5">Wholesale Tier</th>
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
