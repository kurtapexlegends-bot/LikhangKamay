/* global route */
import React from 'react';
import { Link } from '@inertiajs/react';
import { Trash2, AlertCircle, Store, Loader2, PackageX, ExternalLink } from 'lucide-react';
import { resolveImageUrl } from '@/lib/media';

/**
 * UnavailableCartItemsSection
 * Displays cart items that are out-of-stock, delisted, or deleted in a dedicated
 * e-commerce section (Shopee/TikTok Shop pattern) with individual and batch removal actions.
 */
export default function UnavailableCartItemsSection({
    items = [],
    onRemove,
    onClearAll,
    isClearing = false,
    removingId = null,
    currency,
}) {
    if (!items || items.length === 0) return null;

    const getCartKey = (item) => item.cart_key || String(item.id);

    return (
        <div className="mt-6 rounded-2xl border border-stone-200/90 bg-white shadow-2xs overflow-hidden">
            {/* Section Header */}
            <div className="px-4 py-3 sm:px-5 sm:py-3.5 bg-stone-50/80 border-b border-stone-200/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-stone-200/80 flex items-center justify-center text-stone-600 shrink-0">
                        <PackageX size={15} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-bold text-stone-900">
                                Unavailable Items
                            </h2>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-200 text-stone-700">
                                {items.length}
                            </span>
                        </div>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                            These handcrafted pieces are currently out of stock or no longer offered.
                        </p>
                    </div>
                </div>

                {/* Batch Clear All Button */}
                <button
                    type="button"
                    onClick={onClearAll}
                    disabled={isClearing}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-stone-700 hover:text-rose-600 border border-stone-200 hover:border-rose-200 bg-white hover:bg-rose-50/60 rounded-xl transition-all shadow-2xs disabled:opacity-50 min-h-[36px]"
                    title="Remove all unavailable items from your cart"
                >
                    {isClearing ? (
                        <Loader2 size={13} className="animate-spin text-stone-500" />
                    ) : (
                        <Trash2 size={13} className="text-stone-400 group-hover:text-rose-600" />
                    )}
                    <span>Clear Unavailable ({items.length})</span>
                </button>
            </div>

            {/* Unavailable Item Rows */}
            <div className="divide-y divide-stone-100">
                {items.map((item) => {
                    const cartKey = getCartKey(item);
                    const isRemoving = removingId === cartKey;
                    const isOutOfStock = Boolean(item.is_out_of_stock);
                    const reason = item.unavailable_reason || (isOutOfStock ? 'Out of stock' : 'Product unavailable');
                    const sellerName = item.shop_name || item.seller || 'Artisan Workshop';

                    return (
                        <div
                            key={cartKey}
                            className={`p-3.5 sm:p-4 bg-stone-50/40 hover:bg-stone-50/70 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                                isRemoving ? 'opacity-40' : ''
                            }`}
                        >
                            {/* Product Info with Status Tag */}
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                                {/* Disabled Checkbox Substitute */}
                                <div className="pt-1 sm:pt-0 shrink-0">
                                    <span
                                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                            isOutOfStock
                                                ? 'bg-stone-200 text-stone-700 border-stone-300'
                                                : 'bg-amber-100/80 text-amber-900 border-amber-200'
                                        }`}
                                    >
                                        {isOutOfStock ? 'Out of Stock' : 'Unavailable'}
                                    </span>
                                </div>

                                {/* Thumbnail */}
                                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-stone-100 border border-stone-200/80 shrink-0 relative opacity-60 grayscale-[35%]">
                                    <img
                                        src={resolveImageUrl(item.img || item.image)}
                                        alt={item.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = '/images/placeholder.svg';
                                        }}
                                    />
                                    <div className="absolute inset-0 bg-stone-900/10 flex items-center justify-center">
                                        <span className="text-[9px] font-extrabold uppercase tracking-tight text-white px-1 py-0.5 bg-stone-900/70 rounded">
                                            {isOutOfStock ? 'Out' : 'Delisted'}
                                        </span>
                                    </div>
                                </div>

                                {/* Title, Meta, and Workshop */}
                                <div className="min-w-0 flex-1 space-y-0.5">
                                    <p className="text-sm font-semibold text-stone-600 line-clamp-1" title={item.name}>
                                        {item.name}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-stone-400">
                                        <span>Variant: {item.variant || 'Standard'}</span>
                                        {item.sku && <span>· SKU: {item.sku}</span>}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
                                        <Store size={12} className="text-stone-400 shrink-0" />
                                        <span className="truncate">{sellerName}</span>
                                    </div>
                                    <div className="pt-0.5">
                                        <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200/80">
                                            <AlertCircle size={11} className="text-amber-600 shrink-0" />
                                            <span>{reason}</span>
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Price, Qty, and Actions */}
                            <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t border-stone-200/50 sm:border-t-0">
                                <div className="text-left sm:text-right">
                                    <span className="text-sm font-semibold text-stone-400 line-through block">
                                        {currency.format(Number(item.price) || 0)}
                                    </span>
                                    <span className="text-[11px] text-stone-400">
                                        Qty: {item.qty}
                                    </span>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                    {item.slug && isOutOfStock && (
                                        <Link
                                            href={typeof route === 'function' ? route('product.show', item.slug) : `/product/${item.slug}`}
                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-clay-700 hover:text-clay-900 hover:bg-clay-50 rounded-lg transition-colors"
                                            title="View handcrafted product details"
                                        >
                                            <ExternalLink size={12} />
                                            <span className="hidden sm:inline">View Piece</span>
                                        </Link>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => onRemove(cartKey)}
                                        disabled={isRemoving}
                                        className="inline-flex items-center justify-center p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all min-h-[40px] min-w-[40px] disabled:opacity-40"
                                        title={`Remove ${item.name} from cart`}
                                        aria-label={`Remove ${item.name} from cart`}
                                    >
                                        {isRemoving ? (
                                            <Loader2 size={16} className="animate-spin text-stone-500" />
                                        ) : (
                                            <Trash2 size={16} />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
