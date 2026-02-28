import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import BuyerNavbar from '@/Components/BuyerNavbar';
import { 
    MapPin, Instagram, Facebook, Twitter, Star, ArrowRight,
    Utensils, Coffee, Flower2, Sprout, Home, ChefHat, Gift, Package
} from 'lucide-react';

// Category icons mapping (Lucide Components)
const CATEGORY_ICONS = {
    'Tableware': Utensils,
    'Drinkware': Coffee,
    'Vases & Jars': Flower2, // Abstract representation
    'Planters & Pots': Sprout,
    'Home Decor': Home,
    'Kitchenware': ChefHat,
    'Artisan Sets': Gift,
    'default': Package,
};

export default function Welcome({ featuredProducts = [], categories = [] }) {
    const { auth, cartCount } = usePage().props;
    const user = auth?.user;

    // Format sold count
    const formatSold = (sold) => {
        if (sold >= 1000) return `${(sold / 1000).toFixed(1)}k`;
        return sold?.toString() || '0';
    };

    return (
        <div className="min-h-screen bg-[#FDFBF9] font-sans text-gray-800">
            <Head title="LikhangKamay - Artisan Marketplace" />

            {/* Use consistent BuyerNavbar */}
            <BuyerNavbar />

            {/* --- MAIN CONTENT --- */}
            <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-10">
                
                {/* HERO BANNER */}
                <div className="w-full h-[280px] md:h-[360px] rounded-xl overflow-hidden relative group shadow-lg">
                    <img 
                        src="https://images.unsplash.com/photo-1493106641515-6b5631de4bb9?auto=format&fit=crop&q=80&w=1600" 
                        alt="Handcrafted Pottery" 
                        className="w-full h-full object-cover transform group-hover:scale-105 transition duration-700" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent flex flex-col justify-end p-6 md:p-10">
                        <h1 className="text-3xl md:text-4xl font-serif font-bold text-white mb-2">The Art of Clay</h1>
                        <p className="text-white/80 text-sm md:text-base mb-5 max-w-lg">
                            Discover handcrafted masterpieces from Cavite's finest artisans. Support local, buy authentic.
                        </p>
                        <Link 
                            href={route('shop.index')} 
                            className="bg-white text-gray-800 px-6 py-2.5 rounded-sm text-sm font-medium w-fit hover:bg-clay-50 transition shadow flex items-center gap-2"
                        >
                            Shop Collection <ArrowRight size={16} />
                        </Link>
                    </div>
                </div>

                {/* CATEGORIES */}
                {categories.length > 0 && (
                    <div>
                        <h2 className="text-xl font-serif font-bold text-gray-900 mb-6 flex items-center gap-3">
                            Browse by Category
                        </h2>
                        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                                {categories.map((cat, idx) => {
                                    const Icon = CATEGORY_ICONS[cat] || CATEGORY_ICONS['default'];
                                    return (
                                        <Link 
                                            href={`${route('shop.index')}?category=${encodeURIComponent(cat)}`} 
                                            key={idx} 
                                            className="flex flex-col items-center justify-center gap-3 p-4 rounded-xl hover:bg-clay-50 hover:border-clay-200 border border-transparent transition-all duration-300 group"
                                        >
                                            <div className="w-12 h-12 rounded-full bg-clay-100 text-clay-600 flex items-center justify-center group-hover:bg-clay-600 group-hover:text-white transition-colors duration-300">
                                                <Icon size={24} strokeWidth={1.5} />
                                            </div>
                                            <span className="text-sm font-medium text-gray-600 group-hover:text-clay-800 text-center leading-tight">
                                                {cat}
                                            </span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* FEATURED PRODUCTS */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                            <span className="w-1 h-5 bg-clay-600 rounded-full"></span>
                            Featured Products
                        </h2>
                        <Link 
                            href={route('shop.index')} 
                            className="text-xs text-clay-600 font-medium hover:underline flex items-center gap-1"
                        >
                            View All <ArrowRight size={12} />
                        </Link>
                    </div>

                    {featuredProducts.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            {featuredProducts.map((product) => (
                                <Link 
                                    href={route('product.show', product.slug)} 
                                    key={product.id} 
                                    className="bg-white rounded-lg hover:shadow-lg hover:-translate-y-0.5 transition duration-200 border border-gray-100 overflow-hidden flex flex-col group"
                                >
                                    <div className="aspect-square relative bg-gray-100 overflow-hidden">
                                        <img 
                                            src={product.img ? (product.img.startsWith('http') || product.img.startsWith('/storage') ? product.img : `/storage/${product.img}`) : '/images/no-image.png'} 
                                            alt={product.name} 
                                            className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                                            onError={(e) => { e.target.src = '/images/no-image.png'; }}
                                        />
                                        {product.rating > 0 && (
                                            <div className="absolute top-1.5 right-1.5 bg-white/90 backdrop-blur text-gray-800 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                                {product.rating.toFixed(1)} <Star size={10} className="fill-amber-400 text-amber-400" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-3 flex flex-col flex-1">
                                        <h3 className="text-xs font-medium text-gray-800 line-clamp-2 mb-2 group-hover:text-clay-600 transition leading-tight">
                                            {product.name}
                                        </h3>
                                        <div className="mt-auto">
                                            <p className="text-[10px] text-gray-400 mb-1 flex items-center gap-0.5">
                                                <MapPin size={9} /> {product.location}
                                            </p>
                                            <div className="flex items-center justify-between">
                                                <span className="text-clay-600 text-sm font-bold">
                                                    ₱{Number(product.price).toLocaleString()}
                                                </span>
                                                {product.sold > 0 && (
                                                    <span className="text-[10px] text-gray-400">
                                                        {formatSold(product.sold)} sold
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg border border-gray-100 p-12 text-center">
                            <p className="text-gray-500 text-sm">No products available yet. Check back soon!</p>
                        </div>
                    )}

                    {featuredProducts.length > 0 && (
                        <div className="py-8 flex justify-center">
                            <Link 
                                href={route('shop.index')}
                                className="border border-clay-600 text-clay-600 px-8 py-2.5 rounded-sm hover:bg-clay-600 hover:text-white transition text-sm font-medium"
                            >
                                View All Products
                            </Link>
                        </div>
                    )}
                </div>

            </main>

            {/* --- FOOTER --- */}
            <footer className="bg-white border-t border-gray-100 mt-10">
                <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                        <div className="max-w-sm">
                            <div className="flex items-center gap-2 mb-3">
                                <img src="/images/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
                                <span className="font-serif text-lg font-bold text-gray-900">LikhangKamay</span>
                            </div>
                            <p className="text-gray-500 text-sm leading-relaxed mb-4">
                                LikhangKamay is a digital marketplace dedicated to the talented potters and artisans of Cavite.
                            </p>
                            <div className="flex gap-3">
                                <a href="#" className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-clay-600 hover:text-white transition">
                                    <Facebook size={14} />
                                </a>
                                <a href="#" className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-clay-600 hover:text-white transition">
                                    <Instagram size={14} />
                                </a>
                                <a href="#" className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-clay-600 hover:text-white transition">
                                    <Twitter size={14} />
                                </a>
                            </div>
                        </div>
                        <div className="flex gap-12">
                            <div>
                                <h4 className="font-semibold text-gray-900 text-xs uppercase tracking-wider mb-3">Marketplace</h4>
                                <ul className="space-y-2 text-sm text-gray-500">
                                    <li><Link href={route('shop.index')} className="hover:text-clay-600 transition">All Products</Link></li>
                                    <li><Link href="#" className="hover:text-clay-600 transition">Featured Artisans</Link></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-900 text-xs uppercase tracking-wider mb-3">Support</h4>
                                <ul className="space-y-2 text-sm text-gray-500">
                                    <li><Link href="/artisan/register" className="hover:text-clay-600 transition">Seller Centre</Link></li>
                                    <li><Link href="#" className="hover:text-clay-600 transition">FAQs</Link></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="border-t border-gray-100">
                    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4 text-center text-xs text-gray-400">
                        © 2026 LikhangKamay. Connecting Cavite's artisans with the world.
                    </div>
                </div>
            </footer>
        </div>
    );
}