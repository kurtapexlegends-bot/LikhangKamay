import React, { useState, useEffect } from 'react';
import { Link } from '@inertiajs/react';
import { Heart, ShoppingBag, X } from 'lucide-react';
import Modal from '@/Components/Modal';
import SlideOverDrawer from '@/Components/SlideOverDrawer';

const formatPrice = (value) => Number(value || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

export default function QuickViewModal({ product, onClose, onRemoveWishlist }) {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 1024); // lg breakpoint is 1024px
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (!product) return null;

    const content = (
        <div className="flex flex-col md:flex-row gap-6 p-1">
            {/* Gallery Image */}
            <div className="w-full md:w-1/2 aspect-square rounded-2xl bg-stone-50 border border-stone-100 overflow-hidden shrink-0 flex items-center justify-center select-none">
                <img 
                    src={product.image || '/images/no-image.png'} 
                    alt={product.name} 
                    className="w-full h-full object-contain p-4 transition-transform duration-500 hover:scale-102" 
                    onError={(event) => {
                        event.target.src = '/images/no-image.png';
                    }}
                />
            </div>

            {/* Product Meta Details */}
            <div className="w-full md:w-1/2 flex flex-col justify-between py-1">
                <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-clay-600 block mb-1.5">{product.sellerName}</span>
                    <h3 className="text-xl font-bold text-stone-900 leading-snug tracking-tight mb-2.5">{product.name}</h3>
                    <div className="flex flex-col gap-1 mb-6">
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Price</span>
                        <p className="text-2xl font-black text-stone-900 tracking-tight">PHP {formatPrice(product.price)}</p>
                    </div>
                </div>

                {/* Call To Actions */}
                <div className="space-y-3 mt-auto">
                    <Link 
                        href={route('product.show', product.slug)} 
                        onClick={onClose}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-stone-950 hover:bg-black px-4 py-3.5 text-sm font-bold text-white transition-all hover:shadow-md active:scale-95 min-h-[44px]"
                    >
                        <ShoppingBag size={16} /> View Details & Checkout
                    </Link>
                    <button 
                        type="button"
                        onClick={(e) => {
                            onRemoveWishlist(e, product);
                            onClose();
                        }}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3.5 text-sm font-bold text-stone-600 transition-all hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 active:scale-95 min-h-[44px]"
                    >
                        <Heart size={16} className="fill-rose-500 text-rose-500" /> Remove from Wishlist
                    </button>
                </div>
            </div>
        </div>
    );

    if (isMobile) {
        return (
            <SlideOverDrawer 
                show={!!product} 
                onClose={onClose} 
                title={product.name}
                position="bottom"
                heightClass="max-h-[85vh]"
                widthClass="max-w-2xl"
                bodyClassName="relative flex-1 overflow-y-auto px-6 py-4 pb-8"
            >
                {content}
            </SlideOverDrawer>
        );
    }

    return (
        <Modal show={!!product} onClose={onClose} maxWidth="2xl">
            <div className="p-6 relative">
                <div className="flex items-start justify-between mb-6">
                    <h2 className="text-xl font-bold text-stone-900 pr-10">Curated View</h2>
                    <button 
                        type="button"
                        onClick={onClose} 
                        className="absolute right-4 top-4 rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="Close"
                    >
                        <X size={20} />
                    </button>
                </div>
                {content}
            </div>
        </Modal>
    );
}
