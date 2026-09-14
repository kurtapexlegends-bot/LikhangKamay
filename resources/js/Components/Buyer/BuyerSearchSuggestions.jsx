import React from 'react';
import { Link, router } from '@inertiajs/react';
import { Crown, Sparkles } from 'lucide-react';

export default function BuyerSearchSuggestions({
    showSuggestions,
    term,
    isLoadingSuggestions,
    suggestions = { products: [], artisans: [] },
    onClose
}) {
    if (!showSuggestions || term.length < 2) return null;

    const hasResults = (suggestions.products?.length > 0) || (suggestions.artisans?.length > 0);

    return (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-[60] animate-in fade-in slide-in-from-top-2 duration-200">
            {isLoadingSuggestions ? (
                <div className="p-4 flex items-center justify-center text-gray-400">
                    <div className="w-5 h-5 border-2 border-clay-500 border-t-transparent rounded-full animate-spin mr-3"></div>
                    <span className="text-xs font-medium">Looking for matches...</span>
                </div>
            ) : hasResults ? (
                <div className="p-2 space-y-3">
                    {suggestions.products?.length > 0 && (
                        <div>
                            <p className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Products</p>
                            {suggestions.products.map(p => (
                                <Link 
                                    key={p.id} 
                                    href={route('product.show', p.slug)} 
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        if (onClose) onClose();
                                        router.visit(route('product.show', p.slug));
                                    }}
                                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-xl transition-colors group cursor-pointer"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                                        <img 
                                            src={p.image || '/images/no-image.png'} 
                                            alt={p.name} 
                                            className="w-full h-full object-cover" 
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = '/images/no-image.png';
                                            }}
                                        />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-bold text-gray-900 truncate group-hover:text-clay-600 transition-colors">{p.name}</p>
                                        <p className="text-[10px] text-gray-500 font-medium truncate">{p.seller} • ₱{p.price}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                    {suggestions.artisans?.length > 0 && (
                        <div>
                            <p className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Artisans</p>
                            {suggestions.artisans.map(a => (
                                <Link 
                                    key={a.id} 
                                    href={route('shop.seller', a.slug)} 
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        if (onClose) onClose();
                                        router.visit(route('shop.seller', a.slug));
                                    }}
                                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-xl transition-colors group cursor-pointer"
                                >
                                    <div className={`relative w-10 h-10 rounded-full bg-clay-100 text-clay-700 font-bold uppercase text-xs flex items-center justify-center flex-shrink-0 border border-clay-200/60 shadow-sm ${
                                        a.plan === 'super_premium' ? 'ring-2 ring-violet-500 ring-offset-1' : a.plan === 'premium' ? 'ring-2 ring-amber-500 ring-offset-1' : ''
                                    }`}>
                                        {a.plan === 'premium' && (
                                            <div className="absolute -top-1 -right-1 z-10 text-amber-500 bg-white rounded-full p-0.5 shadow-xs" title="Premium Artisan">
                                                <Crown size={12} strokeWidth={2.5} className="fill-amber-400" />
                                            </div>
                                        )}
                                        {a.plan === 'super_premium' && (
                                            <div className="absolute -top-1 -right-1 z-10 text-violet-500 bg-white rounded-full p-0.5 shadow-xs" title="Elite Artisan">
                                                <Sparkles size={11} strokeWidth={2.5} className="fill-violet-400" />
                                            </div>
                                        )}
                                        <span>{(a.name || 'A').charAt(0)}</span>
                                        {a.avatar && (
                                            <img 
                                                src={a.avatar} 
                                                alt={a.name} 
                                                className="absolute inset-0 w-full h-full object-cover rounded-full" 
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                }}
                                            />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-bold text-gray-900 truncate group-hover:text-clay-600 transition-colors">{a.name}</p>
                                        <p className="text-[10px] text-gray-500 font-medium truncate">{a.location}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="p-8 text-center">
                    <p className="text-sm font-bold text-gray-900">No results found</p>
                    <p className="text-xs text-gray-500 mt-1">Try a different keyword</p>
                </div>
            )}
            <div className="bg-gray-50 px-4 py-2 border-t border-gray-100 flex justify-between items-center">
                <span className="text-[10px] text-gray-400 font-medium">Press ENTER to see all results</span>
                <Link href={route('shop.index', { search: term })} className="text-[10px] font-bold text-clay-600 hover:underline">View Shop</Link>
            </div>
        </div>
    );
}
