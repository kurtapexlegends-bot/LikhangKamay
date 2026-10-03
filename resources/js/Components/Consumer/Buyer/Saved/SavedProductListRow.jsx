import React, { useState } from 'react';
import { Link } from '@inertiajs/react';
import { ShoppingCart, Eye, Trash2, Check } from 'lucide-react';

const formatPrice = (value) => Number(value || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const resolveProductImage = (image) => {
    if (!image) return '/images/no-image.png';
    if (image.startsWith('http') || image.startsWith('/') || image.startsWith('data:') || image.startsWith('blob:')) {
        return image;
    }
    return `/storage/${image}`;
};

export default function SavedProductListRow({
    product,
    isBulkEdit = false,
    isSelected = false,
    onToggleSelect,
    onRemoveWishlist,
    onQuickView,
    onAddToCart,
}) {
    const [isAdding, setIsAdding] = useState(false);

    const handleAddToCartClick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isAdding || !onAddToCart) return;
        setIsAdding(true);
        try {
            await onAddToCart(product);
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <div
            onClick={(e) => {
                if (isBulkEdit) onToggleSelect(e, product.id);
            }}
            className={`flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-xl border bg-white shadow-2xs transition-all ${
                isBulkEdit && isSelected
                    ? 'border-clay-600 ring-2 ring-clay-200 cursor-pointer'
                    : isBulkEdit
                    ? 'border-stone-200 cursor-pointer hover:border-stone-300'
                    : 'border-stone-200/80 hover:border-stone-300'
            }`}
        >
            {/* Left: Checkbox / Thumbnail & Details */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
                {isBulkEdit && (
                    <div className="shrink-0">
                        <div className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all ${
                            isSelected
                                ? 'bg-clay-600 border-clay-600 text-white'
                                : 'bg-white border-stone-300 text-transparent hover:border-clay-400'
                        }`}>
                            <Check size={11} strokeWidth={3} />
                        </div>
                    </div>
                )}

                <Link
                    href={route('product.show', product.slug)}
                    className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-stone-100 overflow-hidden shrink-0 block"
                >
                    <img
                        src={resolveProductImage(product.image)}
                        alt={product.name}
                        loading="lazy"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/images/no-image.png';
                        }}
                    />
                </Link>

                <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-semibold text-clay-700 block truncate">
                        {product.sellerName}
                    </span>
                    <Link
                        href={route('product.show', product.slug)}
                        className="text-xs font-bold text-stone-900 hover:text-clay-800 transition-colors line-clamp-1"
                    >
                        {product.name}
                    </Link>
                    {product.category && (
                        <span className="inline-block text-[9px] font-medium text-stone-500 bg-stone-100 px-1.5 py-0.2 rounded mt-0.5">
                            {product.category}
                        </span>
                    )}
                </div>
            </div>

            {/* Right: Price & Quick Actions */}
            <div className="flex items-center gap-3 shrink-0">
                <p className="text-xs sm:text-sm font-black text-clay-700 tracking-tight whitespace-nowrap">
                    &#8369;{formatPrice(product.price)}
                </p>

                {!isBulkEdit && (
                    <div className="flex items-center gap-1.5">
                        {onQuickView && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onQuickView(product);
                                }}
                                className="hidden sm:inline-flex h-7 w-7 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-500 hover:text-stone-800 hover:bg-stone-50 transition-colors shadow-2xs"
                                title="Quick View"
                            >
                                <Eye size={12} />
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={handleAddToCartClick}
                            disabled={isAdding}
                            className="inline-flex h-7 w-7 sm:h-7.5 sm:w-7.5 items-center justify-center rounded-lg bg-stone-900 hover:bg-clay-600 text-white transition-all shadow-2xs active:scale-95 disabled:opacity-50"
                            title="Add to Cart"
                        >
                            {isAdding ? (
                                <svg className="animate-spin w-3 h-3 text-white" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                </svg>
                            ) : (
                                <ShoppingCart size={12} />
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={(e) => onRemoveWishlist(e, product)}
                            className="h-7 w-7 inline-flex items-center justify-center rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Remove"
                        >
                            <Trash2 size={13} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
