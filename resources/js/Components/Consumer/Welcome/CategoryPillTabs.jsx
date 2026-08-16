import React from 'react';
import { Link } from '@inertiajs/react';
import {
    Utensils, Coffee, Flower2, Sprout, Home, ChefHat, Gift, Package, Sparkles, Hammer, Heart, Tag, Flame
} from 'lucide-react';

const CATEGORY_ICONS = {
    // Icon Name Mapping
    'Utensils': Utensils,
    'Coffee': Coffee,
    'Flower2': Flower2,
    'Sprout': Sprout,
    'Home': Home,
    'ChefHat': ChefHat,
    'Gift': Gift,
    'Package': Package,
    'Sparkles': Sparkles,
    'Hammer': Hammer,
    'Heart': Heart,
    'Tag': Tag,
    'Flame': Flame,

    // Legacy Name Mapping
    'Tableware': Utensils,
    'Drinkware': Coffee,
    'Vases & Jars': Flower2,
    'Planters & Pots': Sprout,
    'Home Decor': Home,
    'Kitchenware': ChefHat,
    'Artisan Sets': Gift,
    'default': Package,
};

export default function CategoryPillTabs({ categories = [] }) {
    if (categories.length === 0) return null;

    return (
        <section>
            <h2 className="text-base sm:text-lg md:text-xl font-serif font-bold text-stone-900 mb-3 sm:mb-4 flex items-center gap-2">
                Browse by Category
            </h2>
            <div className="bg-white rounded-2xl p-3 sm:p-4 md:p-6 border border-stone-200/60 shadow-xs overflow-hidden">
                {/* Desktop/Tablet View: Grid */}
                <div className="hidden md:grid md:grid-cols-4 lg:grid-cols-7 gap-3 lg:gap-4">
                    {categories.map((cat, idx) => {
                        const catName = typeof cat === 'object' ? cat.name : cat;
                        const catIcon = typeof cat === 'object' ? cat.icon : null;
                        const Icon = CATEGORY_ICONS[catIcon] || CATEGORY_ICONS[catName] || CATEGORY_ICONS['default'];
                        return (
                            <Link 
                                href={`${route('shop.index')}?category=${encodeURIComponent(catName)}`} 
                                key={idx} 
                                className="flex flex-col items-center justify-center gap-2.5 p-3.5 rounded-xl hover:bg-clay-50/70 hover:border-clay-200 border border-transparent transition-all duration-200 group bg-transparent active:scale-95 min-h-[44px]"
                            >
                                <div className="w-11 h-11 rounded-full bg-clay-100/70 text-clay-700 flex items-center justify-center group-hover:bg-clay-600 group-hover:text-white transition-colors duration-200">
                                    <Icon size={20} strokeWidth={1.5} />
                                </div>
                                <span className="text-xs font-bold text-stone-700 group-hover:text-clay-900 text-center leading-tight">
                                    {catName}
                                </span>
                            </Link>
                        );
                    })}
                </div>

                {/* Mobile View: Horizontal Scroll */}
                <div className="flex md:hidden overflow-x-auto gap-2.5 pb-1 -mx-3 px-3 scrollbar-hide snap-x">
                    {categories.map((cat, idx) => {
                        const catName = typeof cat === 'object' ? cat.name : cat;
                        const catIcon = typeof cat === 'object' ? cat.icon : null;
                        const Icon = CATEGORY_ICONS[catIcon] || CATEGORY_ICONS[catName] || CATEGORY_ICONS['default'];
                        return (
                            <Link 
                                href={`${route('shop.index')}?category=${encodeURIComponent(catName)}`} 
                                key={idx} 
                                className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border border-stone-100 transition-all duration-200 group min-w-[88px] snap-center bg-stone-50/50 active:scale-[0.96] min-h-[44px]"
                            >
                                <div className="w-9 h-9 rounded-full bg-clay-100 text-clay-700 flex items-center justify-center">
                                    <Icon size={18} strokeWidth={1.5} />
                                </div>
                                <span className="text-[11px] font-bold text-stone-700 text-center leading-tight truncate max-w-[80px]">
                                    {catName}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
