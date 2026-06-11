import React from 'react';
import { Link } from '@inertiajs/react';
import { Star } from 'lucide-react';
import { hasRating, formatRating } from '@/utils/rating';

export default function RelatedProductsGrid({ relatedProducts }) {
    if (!relatedProducts || relatedProducts.length === 0) return null;

    return (
        <div className="max-w-6xl mx-auto px-4 py-6 mb-8">
            <h2 className="text-xl font-bold tracking-tight text-stone-900 sm:text-2xl mb-4 flex flex-col items-center gap-2 text-center">
                <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-clay-500">Related Pieces</span>
                You Might Also Like
            </h2>
            <div className="flex overflow-x-auto flex-nowrap overflow-y-hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-8 pb-4 md:pb-0 snap-x snap-mandatory">
                {relatedProducts.map((related) => (
                    <Link 
                        href={route('product.show', related.slug)} 
                        key={related.id} 
                        className="group flex flex-col overflow-hidden rounded-[1.25rem] border border-stone-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-clay-300 hover:shadow-md min-w-[200px] md:min-w-0 snap-center animate-fadeIn"
                    >
                        <div className="aspect-square relative overflow-hidden bg-[#FDFBF9]">
                            <img 
                                src={related.image ? (related.image.startsWith('http') || related.image.startsWith('/storage') ? related.image : `/storage/${related.image}`) : '/images/no-image.png'} 
                                alt={related.name}
                                className="absolute inset-0 block h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                                onError={(e) => { e.target.src = '/images/no-image.png'; }}
                            />
                            {hasRating(related.rating) && (
                                <div className="absolute top-3 right-3 bg-white/95 backdrop-blur shadow-sm text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 border border-stone-100">
                                    {formatRating(related.rating)} <Star size={10} className="fill-amber-400 text-amber-400" />
                                </div>
                            )}
                        </div>
                        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between border-t border-stone-100/50">
                            <h3 className="text-[13px] font-medium text-stone-800 line-clamp-2 leading-snug group-hover:text-clay-700 transition">
                                {related.name}
                            </h3>
                            <div className="flex flex-wrap items-center justify-between gap-1 mt-3 pt-3 border-t border-stone-100/60">
                                <span className="text-clay-800 font-bold text-sm sm:text-[15px]">
                                    PHP {Number(related.price).toLocaleString()}
                                </span>
                                {related.sold > 0 && (
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-stone-400 bg-stone-50 px-1.5 py-0.5 rounded">{related.sold} sold</span>
                                )}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
