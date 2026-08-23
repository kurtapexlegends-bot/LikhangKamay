import React from 'react';
import Modal from '@/Components/Modal';
import { X, Layers, AlertCircle, ShieldCheck } from 'lucide-react';

const formatCurrency = (val) => `₱${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ConfigureWholesaleModal({
    show = false,
    onClose,
    product,
    data,
    setData,
    onSubmit,
    processing,
    errors,
    availableUnits = {},
}) {
    if (!product) return null;

    return (
        <Modal show={show} onClose={onClose} maxWidth="lg">
            <div className="bg-white rounded-2xl p-6 space-y-5">
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-stone-150 pb-3">
                    <div className="space-y-0.5">
                        <h3 className="text-base font-bold text-stone-900 tracking-tight">Configure B2B Wholesale Listing</h3>
                        <p className="text-xs text-stone-500 truncate max-w-sm">{product.name}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors"
                        aria-label="Close dialog"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={onSubmit} className="space-y-4 text-xs">
                    {/* Toggle Published */}
                    <div className="flex items-center justify-between rounded-xl border border-stone-200 p-3.5 bg-stone-50/70">
                        <div className="space-y-0.5">
                            <label htmlFor="publish-toggle" className="font-bold text-stone-900 cursor-pointer">
                                Publish in B2B Supply Hub
                            </label>
                            <p className="text-[11px] text-stone-500">
                                Make this material visible for peer artisans to purchase in bulk.
                            </p>
                        </div>
                        <input
                            id="publish-toggle"
                            type="checkbox"
                            checked={data.is_b2b_supply}
                            onChange={(e) => setData('is_b2b_supply', e.target.checked)}
                            className="h-5 w-5 rounded border-stone-300 text-clay-600 focus:ring-clay-500 cursor-pointer"
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
                                        className="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs text-stone-900 focus:border-clay-500 focus:ring-1 focus:ring-clay-500 shadow-2xs"
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
                                        className="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs text-stone-900 focus:border-clay-500 focus:ring-1 focus:ring-clay-500 shadow-2xs"
                                        placeholder="e.g. 4"
                                    />
                                    {errors.moq && <p className="text-red-600 text-[10px] mt-0.5">{errors.moq}</p>}
                                </div>
                            </div>

                            {/* Tiered Wholesale Price */}
                            <div className="grid grid-cols-2 gap-3 pt-1">
                                <div>
                                    <label className="block font-bold text-stone-700 mb-1">Wholesale Unit Price (₱)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={data.wholesale_price}
                                        onChange={(e) => setData('wholesale_price', e.target.value)}
                                        className="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs text-stone-900 focus:border-clay-500 focus:ring-1 focus:ring-clay-500 shadow-2xs"
                                        placeholder={`Base: ${formatCurrency(product.price)}`}
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
                                        className="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs text-stone-900 focus:border-clay-500 focus:ring-1 focus:ring-clay-500 shadow-2xs"
                                        placeholder="e.g. 10"
                                    />
                                    {errors.wholesale_min_qty && <p className="text-red-600 text-[10px] mt-0.5">{errors.wholesale_min_qty}</p>}
                                </div>
                            </div>

                            <p className="text-[11px] text-stone-500 italic bg-stone-50 p-2 rounded-lg border border-stone-200/60">
                                When a peer artisan orders {data.wholesale_min_qty || 'X'}+ units, the price drops automatically to {data.wholesale_price ? formatCurrency(data.wholesale_price) : 'wholesale rate'}.
                            </p>
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-stone-150">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="rounded-xl bg-clay-600 px-5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-clay-700 transition-colors disabled:opacity-50"
                        >
                            {processing ? 'Saving...' : 'Save Settings'}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}
