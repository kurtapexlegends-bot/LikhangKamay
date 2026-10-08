import React, { useState, useEffect } from 'react';
import { Link } from '@inertiajs/react';
import { Heart, ShoppingBag, ShoppingCart, X, Plus, Minus, ArrowRight } from 'lucide-react';
import Modal from '@/Components/Modal';
import SlideOverDrawer from '@/Components/SlideOverDrawer';
import { resolveImageUrl } from '@/lib/media';

const formatPrice = (value) => Number(value || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

export default function QuickViewModal({ product, onClose, onRemoveWishlist, onAddToCart }) {
    const [isMobile, setIsMobile] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 1024);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        setQuantity(1);
    }, [product]);

    if (!product) return null;

    const handleAddToCart = async () => {
        if (!onAddToCart || isAdding) return;
        setIsAdding(true);
        try {
            await onAddToCart(product, quantity);
            onClose();
        } finally {
            setIsAdding(false);
        }
    };

    const content = (
        <div className="flex flex-col md:flex-row gap-6 p-1">
            {/* Gallery Image */}
            <div className="w-full md:w-1/2 aspect-square rounded-2xl bg-stone-100 border border-stone-200/80 overflow-hidden shrink-0 flex items-center justify-center select-none relative">
                <img
                    src={resolveImageUrl(product.image || product.img)}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    onError={(event) => {
                        event.target.onerror = null;
                        event.target.src = '/images/placeholder.svg';
                    }}
                />
                {product.category && (
                    <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider">
                        {product.category}
                    </span>
                )}
            </div>

            {/* Product Meta Details */}
            <div className="w-full md:w-1/2 flex flex-col justify-between py-1">
                <div>
                    {product.sellerSlug ? (
                        <Link
                            href={route('shop.seller', product.sellerSlug)}
                            className="text-[11px] font-extrabold uppercase tracking-widest text-clay-700 hover:text-clay-800 transition-colors block mb-1"
                        >
                            {product.sellerName}
                        </Link>
                    ) : (
                        <span className="text-[11px] font-extrabold uppercase tracking-widest text-clay-700 block mb-1">
                            {product.sellerName}
                        </span>
                    )}

                    <h3 className="text-xl font-bold text-stone-900 leading-snug tracking-tight mb-3">
                        {product.name}
                    </h3>

                    <div className="mb-5">
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                            Price
                        </span>
                        <p className="text-2xl font-black text-stone-900 tracking-tight">
                            PHP {formatPrice(product.price)}
                        </p>
                    </div>

                    {/* Quantity Picker */}
                    <div className="space-y-1.5 mb-6">
                        <span className="text-[11px] font-bold text-stone-700 uppercase tracking-wider block">
                            Quantity
                        </span>
                        <div className="inline-flex items-center rounded-xl border border-stone-200 bg-stone-50 p-1">
                            <button
                                type="button"
                                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                                disabled={quantity <= 1}
                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-stone-700 hover:bg-stone-100 disabled:opacity-40 transition-colors"
                            >
                                <Minus size={13} />
                            </button>
                            <span className="w-12 text-center text-xs font-bold text-stone-900">
                                {quantity}
                            </span>
                            <button
                                type="button"
                                onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-stone-700 hover:bg-stone-100 transition-colors"
                            >
                                <Plus size={13} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Call To Actions */}
                <div className="space-y-2.5 mt-auto pt-4 border-t border-stone-100">
                    <button
                        type="button"
                        onClick={handleAddToCart}
                        disabled={isAdding}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-clay-600 hover:bg-clay-700 px-4 py-3 text-sm font-bold text-white transition-all shadow-xs active:scale-95 disabled:opacity-60"
                    >
                        {isAdding ? (
                            <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>
                        ) : (
                            <ShoppingCart size={16} />
                        )}
                        <span>Add to Cart • PHP {formatPrice(product.price * quantity)}</span>
                    </button>

                    <div className="flex items-center gap-2">
                        <Link
                            href={route('product.show', product.slug)}
                            onClick={onClose}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 px-3 py-2.5 text-xs font-bold text-stone-700 transition-colors"
                        >
                            <span>View Product Page</span>
                            <ArrowRight size={13} />
                        </Link>

                        <button
                            type="button"
                            onClick={(e) => {
                                onRemoveWishlist(e, product);
                                onClose();
                            }}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 px-3 py-2.5 text-xs font-bold text-rose-600 transition-colors"
                            title="Remove from wishlist"
                        >
                            <Heart size={14} className="fill-rose-500 text-rose-500" />
                            <span className="hidden sm:inline">Remove</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    if (isMobile) {
        return (
            <SlideOverDrawer
                show={Boolean(product)}
                onClose={onClose}
                title="Quick View"
                position="bottom"
                heightClass="max-h-[90vh]"
                widthClass="max-w-xl"
                bodyClassName="relative flex-1 overflow-y-auto px-5 py-4 pb-8"
            >
                {content}
            </SlideOverDrawer>
        );
    }

    return (
        <Modal show={Boolean(product)} onClose={onClose} maxWidth="2xl">
            <div className="p-6 relative">
                <div className="flex items-center justify-between mb-4 border-b border-stone-100 pb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Quick View</span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-xl text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors"
                        title="Close"
                    >
                        <X size={16} />
                    </button>
                </div>
                {content}
            </div>
        </Modal>
    );
}
