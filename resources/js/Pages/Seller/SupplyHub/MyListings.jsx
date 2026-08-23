import React, { useState } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import SellerWorkspaceLayout from '@/Layouts/SellerWorkspaceLayout';
import { 
    Layers, Truck, Plus, Check, X, Edit3, ArrowLeft,
    Package, Sparkles, AlertCircle, ShieldCheck, Tag
} from 'lucide-react';
import { useToast } from '@/Components/ToastContext';

const peso = (val) => `PHP ${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function MyListings({ products = [], availableCategories = [], availableUnits = {} }) {
    const { addToast } = useToast();
    const [editingProduct, setEditingProduct] = useState(null);

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
                    message: 'Wholesale supply listing updated successfully!',
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

    return (
        <>
            <Head title="My Wholesale Supply Listings" />

            <div className="space-y-6 pb-12">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Link
                                href={route('seller.supply-hub.index')}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-stone-500 hover:text-stone-900 transition-colors"
                            >
                                <ArrowLeft size={13} />
                                <span>Back to Supply Hub</span>
                            </Link>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-stone-900 font-serif">
                            My Wholesale Supply Listings
                        </h1>
                        <p className="text-xs text-stone-500">
                            Offer surplus raw materials, processed clay sacks, glazes, or unfinished blanks to peer artisan studios.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 shadow-xs">
                            Published to B2B Hub: <span className="font-bold text-clay-600 ml-1">{publishedCount} / {products.length}</span>
                        </div>
                        <Link
                            href={route('products.index')}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-clay-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-clay-700 transition-colors"
                        >
                            <Plus size={14} />
                            <span>Add New Product / Material</span>
                        </Link>
                    </div>
                </div>

                {/* Table of Listings */}
                <div className="rounded-2xl border border-stone-200 bg-white shadow-xs overflow-hidden">
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
                                {products.map((product) => (
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
                                        <td className="px-4 py-3.5 font-bold text-stone-900">{peso(product.price)}</td>
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
                                                    <p className="font-bold text-emerald-700">{peso(product.wholesale_price)}</p>
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
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Edit Modal */}
                {editingProduct && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
                        <div className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-6 shadow-xl space-y-5 animate-scale-up">
                            <div className="flex items-center justify-between border-b border-stone-150 pb-3">
                                <div>
                                    <h3 className="text-base font-bold text-stone-900">Configure B2B Wholesale Listing</h3>
                                    <p className="text-xs text-stone-400">{editingProduct.name}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setEditingProduct(null)}
                                    className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleSave} className="space-y-4 text-xs">
                                {/* Toggle Published */}
                                <div className="flex items-center justify-between rounded-xl border border-stone-200 p-3.5 bg-stone-50/60">
                                    <div className="space-y-0.5">
                                        <label className="font-bold text-stone-900">Publish in B2B Supply Hub</label>
                                        <p className="text-[11px] text-stone-500">Make this material available for peer artisans to purchase in bulk.</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={data.is_b2b_supply}
                                        onChange={(e) => setData('is_b2b_supply', e.target.checked)}
                                        className="h-5 w-5 rounded border-stone-300 text-clay-600 focus:ring-clay-500"
                                    />
                                </div>

                                {data.is_b2b_supply && (
                                    <div className="space-y-3.5 pt-1">
                                        {/* Supply Unit & MOQ */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block font-bold text-stone-700 mb-1">Unit of Measure</label>
                                                <select
                                                    value={data.supply_unit}
                                                    onChange={(e) => setData('supply_unit', e.target.value)}
                                                    className="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs text-stone-900 focus:border-clay-500 focus:ring-1 focus:ring-clay-500"
                                                >
                                                    {Object.entries(availableUnits).map(([key, label]) => (
                                                        <option key={key} value={key}>{label}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block font-bold text-stone-700 mb-1">Minimum Order Qty (MOQ)</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={data.moq}
                                                    onChange={(e) => setData('moq', parseInt(e.target.value) || 1)}
                                                    className="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs text-stone-900 focus:border-clay-500 focus:ring-1 focus:ring-clay-500"
                                                    placeholder="e.g. 4"
                                                />
                                                {errors.moq && <p className="text-red-600 text-[10px] mt-0.5">{errors.moq}</p>}
                                            </div>
                                        </div>

                                        {/* Tiered Wholesale Price */}
                                        <div className="grid grid-cols-2 gap-3 pt-1">
                                            <div>
                                                <label className="block font-bold text-stone-700 mb-1">Wholesale Unit Price (PHP)</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={data.wholesale_price}
                                                    onChange={(e) => setData('wholesale_price', e.target.value)}
                                                    className="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs text-stone-900 focus:border-clay-500 focus:ring-1 focus:ring-clay-500"
                                                    placeholder={`Base: ${editingProduct.price}`}
                                                />
                                                {errors.wholesale_price && <p className="text-red-600 text-[10px] mt-0.5">{errors.wholesale_price}</p>}
                                            </div>

                                            <div>
                                                <label className="block font-bold text-stone-700 mb-1">Wholesale Threshold Qty</label>
                                                <input
                                                    type="number"
                                                    min="2"
                                                    value={data.wholesale_min_qty}
                                                    onChange={(e) => setData('wholesale_min_qty', e.target.value)}
                                                    className="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs text-stone-900 focus:border-clay-500 focus:ring-1 focus:ring-clay-500"
                                                    placeholder="e.g. 10"
                                                />
                                                {errors.wholesale_min_qty && <p className="text-red-600 text-[10px] mt-0.5">{errors.wholesale_min_qty}</p>}
                                            </div>
                                        </div>

                                        <p className="text-[11px] text-stone-400 italic">
                                            When an artisan orders {data.wholesale_min_qty || 'X'}+ units, the price drops automatically to {data.wholesale_price ? peso(data.wholesale_price) : 'wholesale rate'}.
                                        </p>
                                    </div>
                                )}

                                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-stone-150">
                                    <button
                                        type="button"
                                        onClick={() => setEditingProduct(null)}
                                        className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="rounded-xl bg-clay-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-clay-700 transition-colors disabled:opacity-50"
                                    >
                                        {processing ? 'Saving...' : 'Save Settings'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

MyListings.layout = (page) => <SellerWorkspaceLayout active="supply-hub">{page}</SellerWorkspaceLayout>;
