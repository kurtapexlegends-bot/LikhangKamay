import React from 'react';
import { Link } from '@inertiajs/react';
import { Star, Award } from 'lucide-react';
import { hasRating, formatRating } from '@/utils/rating';
import { trackSponsorshipEvent } from '@/utils/sponsorshipTracking';

export default function ProductCard({ product, sponsoredPlacement }) {
    return (
        <Link 
            href={route('product.show', product.slug)} 
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
            {/* Image */}
            <div className="aspect-square relative overflow-hidden bg-stone-100">
                <img
                    loading="lazy"
                    src={product.image ? (product.image.startsWith('http') || product.image.startsWith('/storage') ? product.image : `/storage/${product.image}`) : '/images/no-image.png'}
                    alt={product.name}
                    className="absolute inset-0 block h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    onError={(e) => { e.target.src = '/images/no-image.png'; }}
                />
                {product.is_sponsored ? (
                    <span className="absolute top-1.5 left-1.5 bg-amber-100 text-amber-700 text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1 border border-amber-200 animate-in fade-in zoom-in-50 duration-300">
                        <Award size={9} /> Sponsored
                    </span>
                ) : product.is_new ? (
                    <span className="absolute top-1.5 left-1.5 bg-clay-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase animate-in fade-in zoom-in-50 duration-300">New</span>
                ) : null}
            </div>
            {/* Content */}
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
                    <div className="flex items-center justify-between">
                        <span className={`text-sm font-black ${product.is_sponsored ? 'text-amber-700' : 'text-clay-600'}`}>
                            &#8369;{Number(product.price).toLocaleString('en-PH')}
                        </span>
                        {hasRating(product.rating) && (
                            <div className="flex items-center gap-0.5 text-[10px] font-bold text-gray-600">
                                {formatRating(product.rating)} <Star size={10} className="fill-amber-400 text-amber-400" />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
}
