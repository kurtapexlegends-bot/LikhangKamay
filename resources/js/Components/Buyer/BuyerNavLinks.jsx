import React from 'react';
import { router } from '@inertiajs/react';

const DEFAULT_COLLECTIONS = ['Planter', 'Vase', 'Mug', 'Tableware', 'Plate'];

export default function BuyerNavLinks({ 
    collections = DEFAULT_COLLECTIONS, 
    onSelectCategory,
    className = ''
}) {
    const handleCategoryClick = (item) => {
        if (onSelectCategory) {
            onSelectCategory(item);
        } else {
            router.get(route('shop.index'), { search: item });
        }
    };

    return (
        <div className={className || 'mt-5'}>
            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2.5">
                Trending Collections
            </p>
            <div className="flex flex-wrap gap-2">
                {collections.map((item) => (
                    <button
                        key={item}
                        type="button"
                        onClick={() => handleCategoryClick(item)}
                        className="text-xs font-bold text-clay-700 bg-clay-50/80 hover:bg-clay-100 border border-clay-100/50 px-3.5 py-1.5 rounded-full transition-all active:scale-95"
                    >
                        {item}
                    </button>
                ))}
            </div>
        </div>
    );
}
