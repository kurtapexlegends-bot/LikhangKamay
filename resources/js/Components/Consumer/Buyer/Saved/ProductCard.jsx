import React from 'react';
import { Link } from '@inertiajs/react';
import { Heart, ShoppingBag, X } from 'lucide-react';

const formatPrice = (value) => Number(value || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

export default function ProductCard({
    product,
    showHeart,
    isBulkEdit,
    isSelected,
    onToggleSelect,
    onRemoveWishlist,
    onQuickView,
}) {
    return (
        <Link
            href={route('product.show', product.slug)}
            onClick={(e) => {
                if (isBulkEdit) onToggleSelect(e, product.id);
            }}
            className={`group flex flex-col overflow-hidden rounded-[24px] border bg-stone-50/45 transition-all duration-500 hover:bg-white hover:-translate-y-1 hover:shadow-xl hover:shadow-stone-200/80 ${
                isBulkEdit && isSelected 
                    ? 'border-clay-500 ring-2 ring-clay-200' 
                    : 'border-stone-100/80 hover:border-clay-200'
            }`}
        >
            <div className="relative aspect-[4/3] bg-stone-50 overflow-hidden rounded-t-[23px] select-none">
                <img
                    src={product.image || '/images/no-image.png'}
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    onError={(event) => {
                        event.target.src = '/images/no-image.png';
                    }}
                />
                
                {/* Visual dark overlay on hover */}
                <div className="absolute inset-0 bg-stone-900/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />

                {/* Bulk selection checkbox / Cancel marker */}
                {isBulkEdit ? (
                    <div className="absolute top-3 right-3 z-10 animate-in fade-in duration-200">
                        <div className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${
                            isSelected 
                                ? 'bg-clay-600 border-clay-600 text-white' 
                                : 'bg-white/90 border-stone-300'
                        }`}>
                            {isSelected && <X size={12} strokeWidth={3} />}
                        </div>
                    </div>
                ) : showHeart && (
                    <div className="absolute top-3 right-3 z-10 animate-in fade-in duration-200">
                        <button 
                            type="button"
                            onClick={(e) => onRemoveWishlist(e, product)}
                            className="group/heart rounded-full bg-white/80 p-2.5 text-rose-500 shadow-sm backdrop-blur-md transition-all hover:scale-110 hover:bg-white min-h-[40px] min-w-[40px] flex items-center justify-center"
                            title="Remove from wishlist"
                        >
                            <Heart size={15} className="fill-rose-500 text-rose-500 transition-colors group-hover/heart:fill-transparent group-hover/heart:text-rose-500" />
                        </button>
                    </div>
                )}

                {/* Slide-up Quick View button on hover */}
                {!isBulkEdit && (
                    <div className="absolute inset-x-0 bottom-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-20">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onQuickView(product);
                            }}
                            className="w-full py-2.5 rounded-xl bg-white/90 backdrop-blur-sm text-stone-800 hover:bg-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-95 border border-stone-100"
                        >
                            <ShoppingBag size={13} /> Quick View
                        </button>
                    </div>
                )}
            </div>
            
            <div className="flex flex-col flex-1 p-5">
                <p className="text-[9px] font-bold uppercase tracking-widest text-clay-600 mb-1.5">{product.sellerName}</p>
                <h3 className="line-clamp-2 text-sm font-bold leading-snug text-stone-800 group-hover:text-clay-800 transition-colors mb-4">{product.name}</h3>
                
                <div className="mt-auto pt-2 flex items-center justify-between border-t border-stone-100/50">
                    <span className="text-sm font-medium text-stone-400">Price</span>
                    <p className="text-base font-black text-stone-900 tracking-tight">PHP {formatPrice(product.price)}</p>
                </div>
            </div>
        </Link>
    );
}
