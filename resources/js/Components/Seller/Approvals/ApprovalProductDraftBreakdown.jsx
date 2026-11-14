import React from 'react';
import { FileText, ArrowRight } from 'lucide-react';

const formatMoney = (amount) => {
    if (amount === undefined || amount === null || isNaN(amount)) return '₱0.00';
    return `₱${Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function ApprovalProductDraftBreakdown({ approval, payload = {} }) {
    const oldPrice = payload.old_price !== undefined && payload.old_price !== null ? Number(payload.old_price) : null;
    const proposedPrice = Number(payload.proposed_price ?? payload.price ?? 0);
    const oldCost = payload.old_cost_price !== undefined && payload.old_cost_price !== null ? Number(payload.old_cost_price) : null;
    const proposedCost = payload.proposed_cost_price !== undefined && payload.proposed_cost_price !== null ? Number(payload.proposed_cost_price) : null;
    const actionType = payload.action_type || payload.action || 'publish';
    const isPriceChange = actionType === 'price_change';
    const coverPhoto = payload.cover_photo_url || payload.cover_photo;

    return (
        <div className="space-y-4">
            {/* Product Hero Summary */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex items-center gap-3.5">
                {coverPhoto ? (
                    <img
                        src={coverPhoto}
                        alt={payload.product_name || approval.title}
                        className="w-16 h-16 rounded-xl object-cover border border-stone-200 bg-white shrink-0"
                        onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = '/images/placeholder.svg';
                        }}
                    />
                ) : (
                    <div className="w-14 h-14 rounded-xl bg-white border border-stone-200 flex items-center justify-center shrink-0">
                        <FileText size={24} className="text-stone-400" />
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border mb-1 ${
                        isPriceChange
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-stone-900 text-white border-stone-900'
                    }`}>
                        {isPriceChange ? 'Price / Cost Change' : 'Publish Draft'}
                    </span>
                    <h4 className="text-sm font-black text-stone-900 leading-snug">
                        {payload.product_name || approval.title}
                    </h4>
                    {payload.sku && (
                        <span className="text-[11px] font-mono text-stone-500">{payload.sku}</span>
                    )}
                </div>
            </div>

            {/* Before / After Pricing & Margin Comparison */}
            <div className="p-4 rounded-2xl border border-stone-200 bg-white space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                    Retail Price Comparison
                </span>
                <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-100">
                    <div>
                        <span className="text-[10px] text-stone-400 uppercase font-bold block">
                            {oldPrice !== null ? 'Current Selling Price' : 'Previous Price'}
                        </span>
                        <span className={`text-sm font-bold ${oldPrice !== null && oldPrice !== proposedPrice ? 'text-stone-500 line-through' : 'text-stone-700'}`}>
                            {oldPrice !== null ? formatMoney(oldPrice) : 'New Listing'}
                        </span>
                    </div>
                    <ArrowRight size={18} className="text-stone-400 shrink-0" />
                    <div className="text-right">
                        <span className="text-[10px] text-stone-400 uppercase font-bold block">Proposed Price</span>
                        <span className="text-lg font-black text-stone-900">
                            {formatMoney(proposedPrice)}
                        </span>
                    </div>
                </div>

                {(oldCost !== null || proposedCost !== null) && (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50/70 border border-stone-100 text-xs">
                        <span className="text-stone-500 font-medium">Unit Production Cost:</span>
                        <div className="flex items-center gap-2 font-bold text-stone-800">
                            {oldCost !== null && oldCost !== proposedCost && (
                                <>
                                    <span className="text-stone-400 line-through">{formatMoney(oldCost)}</span>
                                    <ArrowRight size={13} className="text-stone-400" />
                                </>
                            )}
                            <span>{formatMoney(proposedCost ?? oldCost ?? 0)}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Metadata & Transition */}
            <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-2.5 text-xs">
                {(payload.old_status || payload.new_status) && (
                    <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                        <span className="text-stone-500 font-medium">Listing Visibility Transition:</span>
                        <div className="flex items-center gap-1.5 font-bold">
                            <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200">
                                {payload.old_status || 'Draft'}
                            </span>
                            <ArrowRight size={13} className="text-stone-400" />
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                                {payload.new_status || 'Active'}
                            </span>
                        </div>
                    </div>
                )}

                {payload.cost_margin && (
                    <div className="flex items-center justify-between">
                        <span className="text-stone-500 font-medium">Estimated Production Margin:</span>
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {payload.cost_margin}
                        </span>
                    </div>
                )}

                {payload.category && (
                    <div className="flex items-center justify-between">
                        <span className="text-stone-500 font-medium">Category:</span>
                        <span className="font-semibold text-stone-800">{payload.category}</span>
                    </div>
                )}

                {payload.stock !== undefined && payload.stock !== null && (
                    <div className="flex items-center justify-between">
                        <span className="text-stone-500 font-medium">Current Stock:</span>
                        <span className="font-bold text-stone-800">{payload.stock} units</span>
                    </div>
                )}
            </div>

            {payload.notes && (
                <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 text-xs text-stone-700">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1">Staff Notes</span>
                    <p className="leading-relaxed">{payload.notes}</p>
                </div>
            )}
        </div>
    );
}
