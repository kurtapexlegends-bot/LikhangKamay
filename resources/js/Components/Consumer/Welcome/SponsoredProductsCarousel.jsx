import React from 'react';
import { Link } from '@inertiajs/react';
import { Star, MapPin } from 'lucide-react';
import { hasRating, formatRating } from '@/utils/rating';
import { trackSponsorshipEvent } from '@/utils/sponsorshipTracking';

export default function SponsoredProductsCarousel({ 
    sponsoredProducts = [], 
    sponsoredPlacement = 'home_sponsored', 
    formatSold 
}) {
    if (sponsoredProducts.length === 0) return null;

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {sponsoredProducts.map((product) => (
                <Link
                    href={route('product.show', product.slug)}
                    key={product.id}
                    data-sponsored-placement={sponsoredPlacement}
                    data-sponsored-product-id={product.id}
                    onClick={() => trackSponsorshipEvent({
                        productId: product.id,
                        eventType: 'click',
                        placement: sponsoredPlacement,
                        oncePerSession: true,
                    })}
                    className="group flex flex-col overflow-hidden rounded-xl border border-amber-100/40 bg-white transition-all duration-300 hover:border-amber-300/80 hover:shadow-[0_4px_12px_-4px_rgba(217,119,6,0.15)] hover:-translate-y-0.5 min-h-[44px]"
                >
                    <div className="relative bg-gray-50 overflow-hidden aspect-square">
                        <img
                            src={product.img ? (product.img.startsWith('http') || product.img.startsWith('/storage') || product.img.startsWith('/img') ? product.img : `/storage/${product.img}`) : '/images/no-image.png'}
                            alt={product.name}
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                            onError={(e) => { e.target.onerror = null; e.target.src = '/images/no-image.png'; }}
                        />
                         <div className="absolute left-1.5 top-1.5 rounded-md bg-white/80 backdrop-blur-md px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-amber-700 shadow-sm border border-white/60">
                            Sponsored
                        </div>
                    </div>

                    <div className="flex flex-1 flex-col p-3">
                        <h3 className="font-semibold leading-snug text-gray-800 transition-colors group-hover:text-amber-700 line-clamp-2 text-xs mb-1">
                            {product.name}
                        </h3>

                        <div className="mt-auto pt-2 flex items-end justify-between gap-1 border-t border-gray-50/50">
                            <div className="flex flex-col gap-0.5 pt-0.5">
                                <span className="text-xs font-black text-clay-700">
                                    &#8369;{Number(product.price).toLocaleString()}
                                </span>
                                <span className="flex items-center gap-0.5 text-[9px] text-gray-400 font-medium">
                                    <MapPin size={8} className="shrink-0" />
                                    <span className="truncate max-w-[80px]">{product.location}</span>
                                </span>
                            </div>
                            {hasRating(product.rating) && (
                                <span className="inline-flex items-center gap-0.5 rounded-md border border-amber-100/50 bg-amber-50/80 px-1 py-0.5 text-[9px] font-bold text-amber-700">
                                    {formatRating(product.rating)} <Star size={8} className="fill-amber-400 text-amber-400 drop-shadow-sm" />
                                </span>
                            )}
                        </div>
                    </div>
                </Link>
            ))}
        </div>
    );
}
