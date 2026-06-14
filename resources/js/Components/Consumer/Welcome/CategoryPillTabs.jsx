import React from 'react';
import { Link } from '@inertiajs/react';
import {
    Utensils, Coffee, Flower2, Sprout, Home, ChefHat, Gift, Package
} from 'lucide-react';

const CATEGORY_ICONS = {
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
        <section className="order-2">
            <h2 className="text-xl font-serif font-bold text-gray-900 mb-6 flex items-center gap-3">
                Browse by Category
            </h2>
            <div className="bg-white rounded-2xl p-4 md:p-6 border border-gray-100 shadow-sm overflow-hidden">
                {/* Desktop/Tablet View: Grid */}
                <div className="hidden md:grid md:grid-cols-4 lg:grid-cols-7 gap-4">
                    {categories.map((cat, idx) => {
                        const Icon = CATEGORY_ICONS[cat] || CATEGORY_ICONS['default'];
                        return (
                            <Link 
                                href={`${route('shop.index')}?category=${encodeURIComponent(cat)}`} 
                                key={idx} 
                                className="flex flex-col items-center justify-center gap-3 p-4 rounded-xl hover:bg-clay-50/60 hover:border-clay-200 border border-transparent transition-all duration-300 group bg-transparent min-h-[44px]"
                            >
                                <div className="w-12 h-12 rounded-full bg-clay-100 text-clay-600 flex items-center justify-center group-hover:bg-clay-600 group-hover:text-white transition-colors duration-300">
                                    <Icon size={22} strokeWidth={1.5} />
                                </div>
                                <span className="text-sm font-bold text-stone-600 group-hover:text-clay-800 text-center leading-tight">
                                    {cat}
                                </span>
                            </Link>
                        );
                    })}
                </div>

                {/* Mobile View: Horizontal Scroll */}
                <div className="flex md:hidden overflow-x-auto gap-3 pb-2 -mx-4 px-4 scrollbar-hide snap-x">
                    {categories.map((cat, idx) => {
                        const Icon = CATEGORY_ICONS[cat] || CATEGORY_ICONS['default'];
                        return (
                            <Link 
                                href={`${route('shop.index')}?category=${encodeURIComponent(cat)}`} 
                                key={idx} 
                                className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border border-stone-100 transition-all duration-300 group min-w-[100px] snap-center bg-stone-50/40 min-h-[44px]"
                            >
                                <div className="w-10 h-10 rounded-full bg-clay-100 text-clay-600 flex items-center justify-center">
                                    <Icon size={20} strokeWidth={1.5} />
                                </div>
                                <span className="text-[11px] font-bold text-stone-600 text-center leading-tight">
                                    {cat}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
