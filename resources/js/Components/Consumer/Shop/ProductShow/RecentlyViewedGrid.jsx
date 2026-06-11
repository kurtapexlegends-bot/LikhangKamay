import React from 'react';
import { Link } from '@inertiajs/react';
import { History } from 'lucide-react';

export default function RecentlyViewedGrid({ recentlyViewed }) {
    if (!recentlyViewed || recentlyViewed.length === 0) return null;

    return (
        <div className="max-w-6xl mx-auto px-4 pt-2">
            <div className="mb-4 flex items-center gap-2">
                <History size={16} className="text-clay-600" />
                <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-stone-500">Recently Viewed</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 snap-x flex-nowrap overflow-y-hidden md:grid md:grid-cols-2 lg:grid-cols-4 md:overflow-visible md:pb-0 md:mx-0 md:px-0">
                {recentlyViewed.map((entry) => (
                    <Link
                        key={entry.id}
                        href={route('product.show', entry.slug)}
                        className="group flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm transition hover:border-clay-300 hover:shadow-md min-w-[200px] flex-shrink-0 snap-center md:min-w-0"
                    >
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-stone-50">
                            <img
                                src={entry.image}
                                alt={entry.name}
                                className="h-full w-full object-cover"
                                onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = '/images/no-image.png'; }}
                            />
                        </div>
                        <div className="min-w-0">
                            <p className="line-clamp-2 text-xs font-semibold text-stone-900 transition group-hover:text-clay-700">{entry.name}</p>
                            <p className="mt-1 text-[11px] text-stone-500">{entry.sellerName}</p>
                            <p className="mt-1 text-xs font-bold text-clay-700">PHP {Number(entry.price || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
