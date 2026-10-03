import React, { useState } from 'react';
import { Link } from '@inertiajs/react';
import { Heart, ShoppingCart, Eye, Check } from 'lucide-react';

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

export default function SavedProductCard({
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
            className={`group relative flex flex-col overflow-hidden rounded-xl border bg-white shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                isBulkEdit && isSelected
                    ? 'border-clay-600 ring-2 ring-clay-200 cursor-pointer'
                    : isBulkEdit
                    ? 'border-stone-200 cursor-pointer hover:border-stone-300'
                    : 'border-stone-200/80 hover:border-stone-300'
            }`}
        >
            {/* Square Image Thumbnail Container */}
            <div className="relative aspect-square w-full bg-stone-100 overflow-hidden select-none">
                <Link href={route('product.show', product.slug)} className="block w-full h-full">
                    <img
                        src={resolveProductImage(product.image)}
                        alt={product.name}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/images/no-image.png';
                        }}
                    />
                </Link>

                {/* Top-Left Category Badge */}
                {product.category && (
                    <div className="absolute top-2 left-2 z-10 pointer-events-none">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white text-[9px] font-bold uppercase tracking-wider">
                            {product.category}
                        </span>
                    </div>
                )}

                {/* Top-Right: Bulk Checkbox or Wishlist Heart Toggle */}
                {isBulkEdit ? (
                    <div className="absolute top-2 right-2 z-10">
                        <div className={`flex h-6 w-6 items-center justify-center rounded-lg border-2 transition-all shadow-xs ${
                            isSelected
                                ? 'bg-clay-600 border-clay-600 text-white'
                                : 'bg-white/95 border-stone-300 text-transparent hover:border-clay-400'
                        }`}>
                            <Check size={12} strokeWidth={3} />
                        </div>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={(e) => onRemoveWishlist(e, product)}
                        className="absolute top-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 backdrop-blur-xs text-rose-500 hover:text-rose-600 hover:bg-white shadow-2xs transition-all hover:scale-110 active:scale-95"
                        title="Remove from wishlist"
                        aria-label="Remove from wishlist"
                    >
                        <Heart size={13} className="fill-rose-500 text-rose-500" />
                    </button>
                )}

                {/* Desktop Quick View Overlay on Hover */}
                {!isBulkEdit && onQuickView && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onQuickView(product);
                        }}
                        className="absolute bottom-2 right-2 z-10 hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/90 backdrop-blur-xs text-stone-800 hover:bg-white text-[10px] font-bold shadow-2xs border border-stone-200/60 opacity-0 group-hover:opacity-100 transition-opacity active:scale-95"
                    >
                        <Eye size={11} />
                        <span>Quick View</span>
                    </button>
                )}
            </div>

            {/* Product Meta & Actions */}
            <div className="flex flex-col flex-1 p-2.5 sm:p-3">
                {/* Artisan Studio */}
                {product.sellerSlug ? (
                    <Link
                        href={route('shop.seller', product.sellerSlug)}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[10px] font-semibold text-clay-700 hover:text-clay-800 transition-colors truncate block mb-0.5"
                    >
                        {product.sellerName}
                    </Link>
                ) : (
                    <span className="text-[10px] font-semibold text-clay-700 truncate block mb-0.5">
                        {product.sellerName}
                    </span>
                )}

                {/* Product Title */}
                <Link
                    href={route('product.show', product.slug)}
                    className="line-clamp-2 text-xs font-bold text-stone-900 group-hover:text-clay-800 transition-colors leading-tight mb-2 min-h-[2rem]"
                >
                    {product.name}
                </Link>

                {/* Price & Compact Cart Action */}
                <div className="mt-auto pt-2 border-t border-stone-100 flex items-center justify-between gap-1.5">
                    <p className="text-xs sm:text-sm font-black text-clay-700 tracking-tight">
                        &#8369;{formatPrice(product.price)}
                    </p>

                    {!isBulkEdit && (
                        <button
                            type="button"
                            onClick={handleAddToCartClick}
                            disabled={isAdding}
                            className="inline-flex h-7 w-7 sm:h-7.5 sm:w-7.5 items-center justify-center rounded-lg bg-stone-900 hover:bg-clay-600 text-white transition-all shadow-2xs active:scale-90 disabled:opacity-50"
                            title="Add to Cart"
                            aria-label="Add to Cart"
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
                    )}
                </div>
            </div>
        </div>
    );
}
