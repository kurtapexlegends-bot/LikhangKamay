import React from 'react';
import { Link } from '@inertiajs/react';
import { Heart } from 'lucide-react';
import DiscountCountdownBadge from '@/Components/Consumer/DiscountCountdownBadge';

export default React.memo(function ProductCard({ image, title, price, category, originalPrice, hasDiscount, discountInfo, endAt }) {
    const countdownEndAt = discountInfo?.end_at || endAt;

    return (
        <div className="group relative bg-white rounded-xl p-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-clay-900/5 border border-transparent hover:border-clay-100 animate-in fade-in duration-500">
            <div className="aspect-[4/5] w-full overflow-hidden rounded-lg bg-gray-100 relative shadow-sm">
                <img 
                    src={image} 
                    alt={title} 
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-in-out"
                />

                {/* Top Left Overlay: Compact Live Countdown Badge */}
                {hasDiscount && countdownEndAt && (
                    <div className="absolute top-2 left-2 z-10">
                        <DiscountCountdownBadge endAt={countdownEndAt} compact />
                    </div>
                )}

                {/* Top Right Overlay: Percentage Badge */}
                {hasDiscount && (
                    <span className="absolute top-2 right-2 bg-rose-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase shadow-sm z-10">
                        {discountInfo?.percentage_off ? `-${discountInfo.percentage_off}% OFF` : 'SALE'}
                    </span>
                )}

                {/* Secondary Actions Overlay */}
                <div className="absolute inset-x-0 bottom-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex justify-center gap-2 bg-gradient-to-t from-black/60 to-transparent">
                    <button className="flex-1 bg-white text-gray-900 px-4 py-2 rounded-xl shadow-md text-sm font-medium transition-all duration-300 hover:bg-clay-600 hover:text-white active:scale-95 text-center">
                        Quick View
                    </button>
                    <button className="bg-white/90 backdrop-blur text-gray-900 p-2 rounded-xl shadow-md transition-all duration-300 hover:bg-rose-500 hover:text-white active:scale-95" title="Add to Wishlist">
                        <Heart className="w-5 h-5" strokeWidth={1.5} />
                    </button>
                </div>
            </div>
            <div className="mt-4 flex justify-between items-start">
                <div>
                    <p className="text-xs text-clay-600 mb-1">{category}</p>
                    <h3 className="text-lg font-serif font-medium text-gray-900">
                        <Link href="#">
                            <span aria-hidden="true" className="absolute inset-0" />
                            {title}
                        </Link>
                    </h3>
                </div>
                <div className="text-right">
                    <p className="text-sm font-bold text-clay-700">{price}</p>
                    {hasDiscount && originalPrice && (
                        <p className="text-xs text-gray-400 line-through">{originalPrice}</p>
                    )}
                </div>
            </div>
        </div>
    );
});
