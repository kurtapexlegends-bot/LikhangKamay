import React from 'react';
import { Link } from '@inertiajs/react';
import { Search, X } from 'lucide-react';
import BuyerNavLinks from '@/Components/Buyer/BuyerNavLinks';

export default function BuyerMobileSearchSheet({
    isOpen,
    onClose,
    term,
    setTerm,
    onSearch,
    suggestions = { products: [], artisans: [] }
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-stone-950/50 backdrop-blur-sm flex flex-col justify-end transition-all duration-300">
            {/* Underlay tap-to-close click-shield */}
            <div className="absolute inset-0 z-0" onClick={onClose}></div>
            
            {/* Search Drawer Container */}
            <div className="relative z-10 w-full max-w-lg mx-auto bg-[#FAF7F2] rounded-t-[2rem] border-t border-stone-200/60 px-4 pt-2 pb-8 shadow-[0_-15px_30px_rgba(0,0,0,0.15)] flex flex-col animate-in slide-in-from-bottom duration-300">
                
                {/* Bottom Sheet Pill Drag Indicator Accent */}
                <div className="w-12 h-1 bg-stone-300/80 rounded-full mx-auto mb-4 mt-1"></div>

                <div className="flex items-center gap-3">
                    <form 
                        onSubmit={(e) => { 
                            e.preventDefault(); 
                            onClose(); 
                            onSearch(e); 
                        }} 
                        className="relative flex-1"
                    >
                        <input
                            type="text"
                            placeholder="Search pottery, vases, artisans..."
                            className="w-full bg-white border border-stone-200 rounded-full pl-10 pr-10 py-2.5 text-sm focus:border-clay-400 focus:ring-1 focus:ring-clay-100 shadow-sm placeholder-stone-400 text-stone-800"
                            value={term}
                            onChange={(e) => setTerm(e.target.value)}
                            autoFocus
                        />
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
                        {term && (
                            <button
                                type="button"
                                onClick={() => setTerm('')}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5"
                                aria-label="Clear Search"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </form>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-stone-500 hover:text-stone-950 text-xs font-black uppercase tracking-wider px-1.5 py-1"
                    >
                        Cancel
                    </button>
                </div>

                {/* Trending Ceramics Chips */}
                <BuyerNavLinks 
                    onSelectCategory={(item) => {
                        setTerm(item);
                        onClose();
                        onSearch(null, item);
                    }}
                />

                {/* Search Suggestions */}
                {term.length >= 2 && (suggestions.products?.length > 0 || suggestions.artisans?.length > 0) && (
                    <div className="mt-5 max-h-[40vh] overflow-y-auto divide-y divide-stone-100/85 pr-1">
                        {suggestions.products?.map(p => (
                            <Link 
                                key={p.id} 
                                href={route('product.show', p.slug)} 
                                onClick={onClose}
                                className="flex items-center gap-3 py-3 hover:bg-stone-100/40 px-1 rounded-xl transition-colors"
                            >
                                <div className="w-10 h-10 rounded-lg bg-stone-100 overflow-hidden flex-shrink-0 border border-stone-200/55">
                                    <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-stone-950 truncate leading-snug">{p.name}</p>
                                    <p className="text-[10px] text-stone-500 font-medium truncate mt-0.5">₱{p.price}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
