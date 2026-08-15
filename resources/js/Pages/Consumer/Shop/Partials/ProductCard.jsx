import React from 'react';
import { Link } from '@inertiajs/react';
import { Star, Award } from 'lucide-react';
import { hasRating, formatRating } from '@/utils/rating';
import { trackSponsorshipEvent } from '@/utils/sponsorshipTracking';
import { formatPrice } from '@/utils/money';
import DiscountCountdownBadge from '@/Components/Consumer/DiscountCountdownBadge';

export default function ProductCard({ product, sponsoredPlacement, previewOnly = false }) {
    const hasActiveDiscount = (product.has_discount || Boolean(product.discount_info)) && product.discount_info?.end_at;
    const targetUrl = previewOnly
        ? route('products.index', { search: product.name })
        : route('product.show', product.slug);

    return (
        <Link 
            href={targetUrl} 
            data-sponsored-placement={product.is_sponsored ? sponsoredPlacement : undefined}
            data-sponsored-product-id={product.is_sponsored ? product.id : undefined}
            onClick={() => {
                if (!product.is_sponsored) {
                    return;
                }

                trackSponsorshipEvent({
                    productId: product.id,
                    eventType: 'click',
                    placement: sponsoredPlacement,
                    oncePerSession: true,
                });
            }}
            className={`group bg-white rounded-xl border transition-[border-color,box-shadow] duration-300 flex flex-col overflow-hidden active:scale-95 transition-all ${
                product.is_sponsored 
                    ? 'border-amber-200 shadow-sm shadow-amber-50 hover:border-amber-400 hover:shadow-md' 
                    : 'border-gray-100 hover:border-gray-200 hover:shadow-md'
            }`}
        >
            {/* Image Container */}
            <div className="aspect-square relative overflow-hidden bg-stone-100">
                <img
                    loading="lazy"
                    src={
                        !product.image
                            ? '/images/no-image.png'
                            : (product.image.startsWith('http') || product.image.startsWith('/') || product.image.startsWith('data:') || product.image.startsWith('blob:'))
                                ? product.image
                                : `/storage/${product.image}`
                    }
                    alt={product.name}
                    className="absolute inset-0 block h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    onError={(e) => { e.target.onerror = null; e.target.src = '/images/no-image.png'; }}
                />

                {/* Top Left Overlay: Countdown Badge (Compact Mode) or Status Badges */}
                <div className="absolute top-2 left-2 z-10">
                    {hasActiveDiscount ? (
                        <DiscountCountdownBadge endAt={product.discount_info.end_at} compact />
                    ) : product.is_sponsored ? (
                        <span className="bg-amber-100 text-amber-700 text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1 border border-amber-200 animate-in fade-in zoom-in-50 duration-300">
                            <Award size={9} /> Sponsored
                        </span>
                    ) : product.is_new ? (
                        <span className="bg-clay-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase animate-in fade-in zoom-in-50 duration-300">
                            New
                        </span>
                    ) : null}
                </div>

                {/* Top Right Overlay: Percentage Off Badge */}
                {product.has_discount || product.discount_info ? (
                    <span className={`absolute top-2 right-2 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase shadow-sm z-10 animate-in fade-in zoom-in-50 duration-300 ${
                        product.discount_info?.is_followers_only ? 'bg-sky-800' : 'bg-rose-600'
                    }`}>
                        {product.discount_info?.is_followers_only 
                            ? (product.discount_info?.percentage_off ? `-${product.discount_info.percentage_off}% Followers` : 'Followers Deal')
                            : (product.discount_info?.percentage_off ? `-${product.discount_info.percentage_off}% OFF` : 'SALE')}
                    </span>
                ) : null}
            </div>

            {/* Card Body Content */}
            <div className={`p-3 flex flex-col flex-1 ${product.is_sponsored ? 'bg-amber-50/10' : ''}`}>
                <h3 className={`text-xs font-bold line-clamp-2 leading-tight mb-1 transition ${product.is_sponsored ? 'text-amber-900 group-hover:text-amber-600' : 'text-gray-800 group-hover:text-clay-600'}`}>
                    {product.name}
                </h3>
                <div className="mt-auto">
                    <div className="flex items-center gap-1 mb-1.5">
                        <span className="text-[10px] text-gray-400 truncate">{product.seller}</span>
                        <span className="text-gray-300">·</span>
                        <span className="text-[10px] text-gray-400 truncate">{product.location}</span>
                    </div>
                    <div className="flex items-end justify-between gap-1">
                        <div>
                            {product.has_discount || product.discount_info ? (
                                <div className="flex items-baseline gap-1.5 flex-wrap">
                                    <span className="text-sm font-black text-clay-700">
                                        &#8369;{formatPrice(product.price)}
                                    </span>
                                    <span className="text-[10px] text-gray-400 line-through">
                                        &#8369;{formatPrice(product.original_price || product.discount_info?.original_price)}
                                    </span>
                                </div>
                            ) : (
                                <span className={`text-sm font-black ${product.is_sponsored ? 'text-amber-700' : 'text-clay-600'}`}>
                                    &#8369;{formatPrice(product.price)}
                                </span>
                            )}
                        </div>
                        {hasRating(product.rating) && (
                            <div className="flex items-center gap-0.5 text-[10px] font-bold text-gray-600 shrink-0">
                                {formatRating(product.rating)} <Star size={10} className="fill-amber-400 text-amber-400" />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
}
