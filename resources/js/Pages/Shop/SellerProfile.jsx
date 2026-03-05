import React from 'react';
import { Head, Link } from '@inertiajs/react';
import BuyerNavbar from '@/Components/BuyerNavbar';
import Footer from '@/Components/Footer';
import { 
    MapPin, Calendar, Star, Package, Trophy, Crown, Flame,
    ShoppingCart, Check, Loader2, ArrowLeft, Filter 
} from 'lucide-react';

export default function SellerProfile({ seller, products, bestSellers = [], stats }) {
    // Format price helper
    const formatPrice = (price) => Number(price).toLocaleString('en-PH');

    return (
        <div className="min-h-screen bg-[#FDFBF9] font-sans text-gray-800">
            <Head title={`${seller.name} - LikhangKamay Store`} />
            <BuyerNavbar />

            <main className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
                
                {/* BACK BUTTON */}
                <Link href={route('shop.index')} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-clay-600 mb-6 transition">
                    <ArrowLeft size={16} /> Back to Marketplace
                </Link>

                {/* --- SELLER HEADER --- */}
                <div className="bg-white rounded-[24px] border border-stone-100 overflow-hidden shadow-sm mb-10">
                    
                    {/* Cover Banner (Custom Image or Premium Fallback) */}
                    <div className="h-48 md:h-64 relative overflow-hidden bg-stone-100 group">
                        {seller.banner_image ? (
                            <img 
                                src={seller.banner_image.startsWith('http') || seller.banner_image.startsWith('/storage') ? seller.banner_image : `/storage/${seller.banner_image}`} 
                                alt={`${seller.name} Banner`} 
                                className="w-full h-full object-cover" 
                                onError={(e) => { e.target.style.display = 'none'; }}
                            />
                        ) : (
                            // Premium Fallback Pattern
                            <div className="absolute inset-0 bg-stone-800">
                                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_2px_2px,#fff_1px,transparent_0)] bg-[length:32px_32px]"></div>
                                <div className="absolute top-0 right-0 w-96 h-96 bg-clay-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                                <div className="absolute bottom-0 left-0 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4"></div>
                            </div>
                        )}
                        {/* Soft overlay gradient to ensure text readability if overlaid later */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                    </div>

                    {/* Profile Details Section */}
                    <div className="px-6 md:px-10 pb-8 flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10 -mt-20">
                        
                        {/* Avatar */}
                        <div className="w-36 h-36 rounded-full border-4 border-white bg-white shadow-lg flex items-center justify-center overflow-hidden flex-none aspect-square relative z-20">
                            {seller.avatar ? (
                                <img src={seller.avatar.startsWith('http') || seller.avatar.startsWith('/storage') ? seller.avatar : `/storage/${seller.avatar}`} alt={seller.name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                            ) : (
                                <div className="w-full h-full bg-stone-100 text-stone-600 flex items-center justify-center text-5xl font-bold uppercase">
                                    {seller.name.charAt(0)}
                                </div>
                            )}
                        </div>

                        {/* Info & Stats */}
                        <div className="flex-1 flex flex-col md:flex-row justify-between w-full md:mt-20 gap-8">
                            
                            {/* Profile Info */}
                            <div className="text-center md:text-left">
                                <div className="flex flex-col md:flex-row items-center gap-3 mb-2">
                                    <h1 className="text-2xl md:text-3xl font-bold text-stone-900 tracking-tight">{seller.name}</h1>
                                    <div className="flex gap-2">
                                        <span className="text-[10px] uppercase font-bold tracking-widest bg-orange-100 text-orange-700 px-2.5 py-0.5 rounded-full">
                                            Verified Artisan
                                        </span>
                                        {seller.subscription_tier && seller.subscription_tier !== 'standard' && (
                                            <span className="text-[10px] uppercase font-bold tracking-widest bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                                <Crown size={10} /> Premium
                                            </span>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 md:gap-5 text-[13px] text-stone-500 font-medium">
                                    <span className="flex items-center gap-1.5"><MapPin size={15} className="text-stone-400" /> {seller.location}</span>
                                    <span className="flex items-center gap-1.5"><Calendar size={15} className="text-stone-400" /> Joined {seller.joined_at}</span>
                                </div>

                                <p className="mt-4 text-stone-600 max-w-2xl text-[14px] leading-relaxed">
                                    {seller.bio}
                                </p>
                            </div>

                            {/* Connected Stats Block */}
                            <div className="flex bg-stone-50 rounded-2xl border border-stone-100 p-1.5 self-center md:self-start overflow-hidden">
                                <div className="px-5 py-2 text-center border-r border-stone-200">
                                    <p className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-0.5">Products</p>
                                    <p className="text-xl font-bold text-stone-900">{stats.products}</p>
                                </div>
                                <div className="px-5 py-2 text-center border-r border-stone-200">
                                    <p className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-0.5">Sales</p>
                                    <p className="text-xl font-bold text-stone-900">{stats.sales}</p>
                                </div>
                                <div className="px-5 py-2 text-center">
                                    <p className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-0.5">Rating</p>
                                    <div className="flex items-center justify-center gap-1 text-xl font-bold text-stone-900">
                                        {stats.rating} <Star size={14} className="fill-amber-400 text-amber-400 -mt-0.5" />
                                    </div>
                                </div>
                            </div>
                            
                        </div>
                    </div>
                </div>

                {/* --- BEST SELLERS --- */}
                {bestSellers.length > 0 && (
                    <div className="mb-10">
                        <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2 mb-5">
                            <Trophy size={22} className="text-amber-500" />
                            Store Best Sellers
                        </h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                            {bestSellers.map((product, idx) => {
                                const isTop = idx === 0;
                                return (
                                    <Link 
                                        href={route('product.show', product.slug)}
                                        key={product.id}
                                        className={`group bg-white rounded-2xl border overflow-hidden transition-all duration-300 hover:shadow-lg flex flex-col ${
                                            isTop ? 'border-amber-200 ring-2 ring-amber-100 shadow-md' : 'border-stone-200/60 shadow-sm hover:border-stone-300'
                                        }`}
                                    >
                                        <div className={`aspect-square relative overflow-hidden flex items-center justify-center p-3 ${isTop ? 'bg-amber-50/30' : 'bg-stone-50'}`}>
                                            <img 
                                                src={product.image ? (product.image.startsWith('http') || product.image.startsWith('/storage') ? product.image : `/storage/${product.image}`) : '/images/no-image.png'}
                                                alt={product.name}
                                                className="w-full h-full object-contain mix-blend-multiply transition duration-500 group-hover:scale-110"
                                                onError={(e) => { e.target.src = '/images/no-image.png'; }}
                                            />
                                            {/* Rank Badge */}
                                            <div className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow ${
                                                isTop ? 'bg-amber-400 text-white' : 'bg-stone-600 text-white'
                                            }`}>
                                                {isTop ? <Crown size={12} /> : `#${idx + 1}`}
                                            </div>
                                            {product.rating > 0 && (
                                                <div className="absolute top-2 right-2 bg-white/95 backdrop-blur-sm shadow-sm text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 text-stone-700">
                                                    {Number(product.rating).toFixed(1)} <Star size={10} className="fill-amber-400 text-amber-400" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-3 flex flex-col flex-1">
                                            <h3 className={`text-xs font-semibold line-clamp-2 leading-snug mb-2 transition ${
                                                isTop ? 'text-amber-800 group-hover:text-amber-600' : 'text-stone-800 group-hover:text-orange-600'
                                            }`}>
                                                {product.name}
                                            </h3>
                                            <div className="flex items-end justify-between mt-auto">
                                                <span className="font-bold text-sm text-stone-900">₱{formatPrice(product.price)}</span>
                                                <span className="text-[10px] text-stone-500 font-medium flex items-center gap-0.5">
                                                    <Flame size={9} className="text-orange-400" />
                                                    {product.sold} sold
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* --- PRODUCTS SECTION --- */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                        <Package size={22} className="text-orange-600" />
                        Products Collection
                    </h2>
                    
                    {/* Placeholder for future filtering within shop */}
                    <button className="text-xs font-semibold text-stone-600 flex items-center gap-2 bg-white border border-stone-200 hover:border-stone-300 hover:bg-stone-50 transition px-4 py-2 rounded-full shadow-sm">
                        <Filter size={14} /> Filter & Sort
                    </button>
                </div>

                {products.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {products.map((product) => (
                            <Link 
                                href={route('product.show', product.slug)} 
                                key={product.id} 
                                className={`group bg-white rounded-2xl border transition-all duration-300 flex flex-col overflow-hidden ${
                                    product.is_sponsored ? 'border-amber-300 shadow-amber-100 hover:shadow-lg' : 'border-stone-200/60 shadow-sm hover:border-stone-300 hover:shadow-md'
                                }`}
                            >
                                {/* Image */}
                                <div className={`aspect-square relative border-b border-stone-100 overflow-hidden flex items-center justify-center p-4 ${
                                    product.is_sponsored ? 'bg-amber-50/30' : 'bg-stone-50'
                                }`}>
                                    <img 
                                        src={product.image ? (product.image.startsWith('http') || product.image.startsWith('/storage') ? product.image : `/storage/${product.image}`) : '/images/no-image.png'} 
                                        alt={product.name} 
                                        className="w-full h-full object-contain mix-blend-multiply transition duration-500 group-hover:scale-110"
                                        onError={(e) => { e.target.src = '/images/no-image.png'; }}
                                    />
                                    {product.is_sponsored ? (
                                        <div className="absolute top-2 left-2 flex gap-1">
                                            <span className="bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider shadow-sm">Promoted</span>
                                            {product.is_new && <span className="bg-orange-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider shadow-sm">New</span>}
                                        </div>
                                    ) : product.is_new ? (
                                        <span className="absolute top-2 left-2 bg-orange-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider shadow-sm">New</span>
                                    ) : null}
                                    {product.rating > 0 && (
                                        <div className="absolute top-2 right-2 bg-white/95 backdrop-blur-sm shadow-sm text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 text-stone-700">
                                            {Number(product.rating).toFixed(1)} <Star size={10} className="fill-amber-400 text-amber-400 -mt-0.5" />
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="p-4 flex flex-col justify-between flex-1 bg-white">
                                    <h3 className="text-xs font-semibold text-stone-800 line-clamp-2 group-hover:text-orange-600 transition leading-snug mb-2">
                                        {product.name}
                                    </h3>

                                    <div className="flex items-end justify-between mt-auto">
                                        <div className="font-bold text-sm text-stone-900 tracking-tight">
                                            ₱{formatPrice(product.price)}
                                        </div>
                                        {product.sold > 0 && (
                                            <span className="text-[10px] text-stone-500 font-medium bg-stone-100 px-1.5 py-0.5 rounded-md">{product.sold} sold</span>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                            <Package size={32} />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No products yet</h3>
                        <p className="text-gray-500 text-sm mt-1">This artisan hasn't added any products to their shop.</p>
                    </div>
                )}

            </main>
            <Footer />
        </div>
    );
}

