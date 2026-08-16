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
        <div className="flex md:grid overflow-x-auto md:overflow-visible snap-x md:snap-none -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide pb-2 md:pb-0 gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
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
                    className="snap-start shrink-0 w-[155px] sm:w-[175px] md:w-auto group flex flex-col overflow-hidden rounded-xl border border-amber-100/50 bg-white transition-all duration-300 hover:border-amber-300 hover:shadow-md active:scale-[0.98] min-h-[44px]"
                >
                    <div className="relative bg-stone-50 overflow-hidden aspect-square">
                        <img
                            src={product.img ? (product.img.startsWith('http') || product.img.startsWith('/storage') || product.img.startsWith('/img') ? product.img : `/storage/${product.img}`) : '/images/no-image.png'}
                            alt={product.name}
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                            onError={(e) => { e.target.onerror = null; e.target.src = '/images/no-image.png'; }}
                        />
                         <div className="absolute left-1.5 top-1.5 rounded-md bg-white/90 backdrop-blur-xs px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-amber-700 shadow-2xs border border-amber-200/40">
                            Sponsored
                        </div>
                    </div>

                    <div className="flex flex-1 flex-col p-2.5 sm:p-3">
                        <h3 className="font-semibold leading-snug text-stone-850 transition-colors group-hover:text-amber-800 line-clamp-2 text-xs mb-1">
                            {product.name}
                        </h3>

                        <div className="mt-auto pt-2 flex items-end justify-between gap-1 border-t border-stone-100/80">
                            <div className="flex flex-col gap-0.5 pt-0.5">
                                <span className="text-xs font-black text-clay-700">
                                    &#8369;{Number(product.price).toLocaleString()}
                                </span>
                                <span className="flex items-center gap-0.5 text-[9px] text-stone-400 font-medium">
                                    <MapPin size={8} className="shrink-0" />
                                    <span className="truncate max-w-[75px] sm:max-w-[85px]">{product.location}</span>
                                </span>
                            </div>
                            {hasRating(product.rating) && (
                                <span className="inline-flex items-center gap-0.5 rounded-md border border-amber-100/60 bg-amber-50/90 px-1 py-0.5 text-[9px] font-bold text-amber-700">
                                    {formatRating(product.rating)} <Star size={8} className="fill-amber-400 text-amber-400 drop-shadow-2xs" />
                                </span>
                            )}
                        </div>
                    </div>
                </Link>
            ))}
        </div>
    );
}
