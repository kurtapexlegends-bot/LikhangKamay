import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import BuyerNavbar from '@/Components/BuyerNavbar';
import { 
    MapPin, Instagram, Facebook, Twitter, Star, ArrowRight, Trophy, Crown, Store,
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

export default function Welcome({ featuredProducts = [], topSellers = [], categories = [], sponsoredProducts = [] }) {
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

                {/* TOP STORES - DSS Dashboard */}
                {topSellers.length > 0 && (
                    <div>
                        <h2 className="text-xl font-serif font-bold text-gray-900 mb-6 flex items-center gap-3">
                            <Trophy size={20} className="text-amber-500" />
                            Top Selling Stores
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
                            {/* Use original array order and CSS order to layout: #2, #1, #3 on desktop, and #1, #2, #3 on mobile */}
                            {topSellers.map((store, originalIdx) => {
                                const isFirst = originalIdx === 0;
                                const isSecond = originalIdx === 1;
                                
                                // On mobile, 1st shows on top. On desktop, 1st shows in the middle (order-2), 2nd shows left (order-1), 3rd shows right (order-3)
                                const orderClass = isFirst ? 'order-1 md:order-2' : isSecond ? 'order-2 md:order-1' : 'order-3 md:order-3';
                                
                                return (
                                    <div key={store.store_slug || originalIdx} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all hover:shadow-lg flex flex-col ${orderClass} ${
                                        isFirst ? 'border-amber-200 ring-2 ring-amber-100 relative z-10' : 'border-gray-100'
                                    }`}>
                                        {/* Store Header - CENTERED */}
                                        <div className={`p-3 flex flex-col items-center text-center gap-2 border-b ${isFirst ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-100' : 'bg-gray-50 border-gray-100'}`}>
                                            <div className="relative">
                                                <div className={`w-12 h-12 rounded-full overflow-hidden border-2 flex-shrink-0 mx-auto ${isFirst ? 'border-amber-300 shadow-md' : 'border-gray-200'}`}>
                                                    {store.store_avatar ? (
                                                        <img 
                                                            src={store.store_avatar.startsWith('http') ? store.store_avatar : `/storage/${store.store_avatar}`}
                                                            alt={store.store_name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className={`w-full h-full flex items-center justify-center font-bold text-xl ${isFirst ? 'bg-amber-100 text-amber-700' : 'bg-clay-100 text-clay-700'}`}>
                                                            {(store.store_name || 'S').charAt(0)}
                                                        </div>
                                                    )}
                                                </div>
                                                {isFirst && (
                                                    <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-amber-400 border-2 border-white rounded-full flex items-center justify-center shadow">
                                                        <Crown size={12} className="text-white" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 w-full flex flex-col items-center">
                                                <Link href={route('shop.seller', store.store_slug)} className="font-bold text-gray-900 hover:text-clay-600 transition text-base line-clamp-1 block">
                                                    {store.store_name}
                                                </Link>
                                                <div className="flex items-center gap-2 text-xs text-gray-500 justify-center mt-1.5 border border-gray-200 bg-white px-3 py-1 rounded-full shadow-sm">
                                                    <span className={`font-bold flex items-center gap-1.5 ${isFirst ? 'text-amber-600' : 'text-gray-700'}`}>
                                                        {isFirst ? <Trophy size={14} className="text-amber-500" /> : <span className="text-gray-400">#</span>}
                                                        {originalIdx + 1}
                                                    </span>
                                                    <span className="w-px h-3 bg-gray-300"></span>
                                                    <span className="font-medium text-gray-600">{formatSold(store.total_sold)} sold</span>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Store Products - Podium Layout */}
                                        <div className={`flex-1 p-3 flex flex-col items-center justify-center relative bg-gradient-to-b ${isFirst ? 'from-amber-50/20 to-transparent' : 'from-gray-50/30 to-transparent'}`}>
                                            {/* Product 1 (Top Center) */}
                                            {store.products && store.products[0] && (
                                                <Link 
                                                    href={route('product.show', store.products[0].slug)}
                                                    className="group flex flex-col items-center text-center w-full max-w-[120px] z-10"
                                                >
                                                    <div className={`w-24 h-24 md:w-28 md:h-28 rounded-2xl overflow-hidden border-2 relative shadow-md transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1 ${isFirst ? 'border-amber-300 shadow-amber-100/50 group-hover:border-amber-400' : 'border-clay-200 group-hover:border-clay-400'}`}>
                                                        <img 
                                                            src={store.products[0].img ? (store.products[0].img.startsWith('http') || store.products[0].img.startsWith('/storage') ? store.products[0].img : `/storage/${store.products[0].img}`) : '/images/no-image.png'}
                                                            alt={store.products[0].name}
                                                            className="w-full h-full object-cover transition duration-700 group-hover:scale-110"
                                                            onError={(e) => { e.target.src = '/images/no-image.png'; }}
                                                        />
                                                        <div className="absolute top-0 right-0 py-1 px-2 mb-1 bg-gray-900/80 backdrop-blur rounded-bl-xl text-white shadow-sm">
                                                            <span className="text-[10px] font-bold flex items-center gap-1"><Star size={10} className="fill-amber-400 text-amber-400"/> {store.products[0].rating > 0 ? store.products[0].rating.toFixed(1) : 'New'}</span>
                                                        </div>
                                                        <div className="absolute bottom-2 inset-x-0 flex justify-center">
                                                           <span className={`text-[10px] uppercase tracking-wide font-black px-3 py-1 rounded-full border text-white shadow-md ${isFirst ? 'bg-gradient-to-r from-amber-500 to-orange-500 border-amber-200' : 'bg-clay-600 border-clay-400'}`}>#1 Product</span>
                                                        </div>
                                                    </div>
                                                    <div className="mt-2 flex flex-col items-center">
                                                        <p className="text-sm font-bold text-gray-800 line-clamp-1 group-hover:text-clay-600 transition leading-snug">{store.products[0].name}</p>
                                                        <span className="text-[10px] text-gray-500 mt-1 font-medium bg-gray-100 px-2 py-0.5 rounded-md">{formatSold(store.products[0].sold)} sold</span>
                                                    </div>
                                                </Link>
                                            )}

                                            {/* Products 2 & 3 (Bottom Left & Right) */}
                                            <div className="flex w-full justify-around items-end px-2 md:px-0 mt-3 relative z-0">
                                                {/* Connecting line background visual */}
                                                <div className="absolute top-8 left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent -z-10"></div>

                                                {/* Product 2 */}
                                                {store.products && store.products[1] ? (
                                                    <Link 
                                                        href={route('product.show', store.products[1].slug)}
                                                        className="group flex flex-col items-center text-center max-w-[80px]"
                                                    >
                                                        <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl overflow-hidden border border-gray-200 relative shadow-sm group-hover:border-clay-300 transition-all duration-300 group-hover:shadow-lg group-hover:-translate-y-1 bg-white">
                                                            <img 
                                                                src={store.products[1].img ? (store.products[1].img.startsWith('http') || store.products[1].img.startsWith('/storage') ? store.products[1].img : `/storage/${store.products[1].img}`) : '/images/no-image.png'}
                                                                alt={store.products[1].name}
                                                                className="w-full h-full object-cover transition duration-700 group-hover:scale-110"
                                                                onError={(e) => { e.target.src = '/images/no-image.png'; }}
                                                            />
                                                            <div className="absolute top-0 left-0 bg-white/95 backdrop-blur text-gray-600 text-[10px] font-black px-2 py-0.5 rounded-br-xl shadow-sm border-b border-r border-gray-100">
                                                               #2
                                                            </div>
                                                        </div>
                                                        <div className="mt-2.5 flex flex-col items-center">
                                                            <p className="text-xs font-semibold text-gray-700 line-clamp-2 group-hover:text-clay-600 transition leading-snug mb-1">{store.products[1].name}</p>
                                                        </div>
                                                    </Link>
                                                ) : <div className="w-16 md:w-20"></div>}

                                                {/* Product 3 */}
                                                {store.products && store.products[2] ? (
                                                    <Link 
                                                        href={route('product.show', store.products[2].slug)}
                                                        className="group flex flex-col items-center text-center max-w-[80px]"
                                                    >
                                                        <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl overflow-hidden border border-gray-200 relative shadow-sm group-hover:border-clay-300 transition-all duration-300 group-hover:shadow-lg group-hover:-translate-y-1 bg-white">
                                                            <img 
                                                                src={store.products[2].img ? (store.products[2].img.startsWith('http') || store.products[2].img.startsWith('/storage') ? store.products[2].img : `/storage/${store.products[2].img}`) : '/images/no-image.png'}
                                                                alt={store.products[2].name}
                                                                className="w-full h-full object-cover transition duration-700 group-hover:scale-110"
                                                                onError={(e) => { e.target.src = '/images/no-image.png'; }}
                                                            />
                                                            <div className="absolute top-0 right-0 bg-white/95 backdrop-blur text-gray-600 text-[10px] font-black px-2 py-0.5 rounded-bl-xl shadow-sm border-b border-l border-gray-100">
                                                               #3
                                                            </div>
                                                        </div>
                                                        <div className="mt-2.5 flex flex-col items-center">
                                                            <p className="text-xs font-semibold text-gray-700 line-clamp-2 group-hover:text-clay-600 transition leading-snug mb-1">{store.products[2].name}</p>
                                                        </div>
                                                    </Link>
                                                ) : <div className="w-16 md:w-20"></div>}
                                            </div>
                                        </div>
                                        {/* View Store */}
                                        <div className="px-3 pb-3">
                                            <Link 
                                                href={route('shop.seller', store.store_slug)}
                                                className={`block text-center text-xs font-bold py-2 rounded-lg transition ${
                                                    isFirst ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                                }`}
                                            >
                                                View Store →
                                            </Link>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

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

                {/* PROMOTED PRODUCTS */}
                {sponsoredProducts && sponsoredProducts.length > 0 && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-base font-semibold text-amber-700 flex items-center gap-2">
                                <Crown size={20} className="text-amber-500" />
                                Premium Finds
                            </h2>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            {sponsoredProducts.map((product) => (
                                <Link 
                                    href={route('product.show', product.slug)} 
                                    key={product.id} 
                                    className="bg-white rounded-lg hover:shadow-lg hover:-translate-y-0.5 transition duration-200 border border-amber-200 overflow-hidden flex flex-col group relative"
                                >
                                    <div className="aspect-square relative flex items-center justify-center bg-amber-50/30 overflow-hidden border-b border-amber-100">
                                        <img 
                                            src={product.img ? (product.img.startsWith('http') || product.img.startsWith('/storage') ? product.img : `/storage/${product.img}`) : '/images/no-image.png'} 
                                            alt={product.name} 
                                            className="w-full h-full object-contain mix-blend-multiply transition duration-300 group-hover:scale-105"
                                            onError={(e) => { e.target.src = '/images/no-image.png'; }}
                                        />
                                        <div className="absolute top-1.5 left-1.5 flex gap-1 z-10">
                                            <span className="bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm uppercase tracking-wider">Promoted</span>
                                        </div>
                                        {product.rating > 0 && (
                                            <div className="absolute top-1.5 right-1.5 bg-white/90 backdrop-blur text-gray-800 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow-sm">
                                                {Number(product.rating).toFixed(1)} <Star size={10} className="fill-amber-400 text-amber-400" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-3 flex flex-col flex-1">
                                        <h3 className="text-xs font-medium text-gray-800 line-clamp-2 mb-2 group-hover:text-amber-700 transition leading-tight">
                                            {product.name}
                                        </h3>
                                        <div className="mt-auto">
                                            <p className="text-[10px] text-gray-500 mb-1 flex items-center gap-1 font-medium truncate">
                                                <Store size={10} className="text-gray-400" /> {product.seller_name}
                                            </p>
                                            <div className="flex items-center justify-between mt-1">
                                                <span className="text-amber-700 text-sm font-bold">
                                                    ₱{Number(product.price).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
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