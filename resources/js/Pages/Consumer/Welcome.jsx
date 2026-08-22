import React from 'react';
import { Head, Link } from '@inertiajs/react';
import BuyerNavbar from '@/Layouts/BuyerNavbar';
import Footer from '@/Layouts/Footer';
import { Award, ArrowRight, Package, Store } from 'lucide-react';
import { useSponsoredImpressionTracking } from '@/utils/sponsorshipTracking';
import { formatSold } from '@/utils/catalog';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import ProductCard from '@/Pages/Consumer/Shop/Partials/ProductCard';

// Subcomponents imported from domain directory
import HeroSection from '@/Components/Consumer/Welcome/HeroSection';
import CategoryPillTabs from '@/Components/Consumer/Welcome/CategoryPillTabs';
import SponsoredProductsCarousel from '@/Components/Consumer/Welcome/SponsoredProductsCarousel';
import TopArtisansGrid from '@/Components/Consumer/Welcome/TopArtisansGrid';

export default function Welcome({ featuredProducts = [], sponsoredProducts = [], followedProducts = [], topSellers = [], categories = [] }) {
    const sponsoredPlacement = 'home_sponsored';

    useSponsoredImpressionTracking(sponsoredProducts, sponsoredPlacement);

    return (
        <div className="min-h-screen bg-[#FDFBF9] font-sans text-gray-800">
            <Head title="LikhangKamay - Artisan Marketplace" />

            <BuyerNavbar />

            {/* --- MAIN CONTENT --- */}
            <main className="w-full min-w-0 max-w-7xl mx-auto px-4 lg:px-8 py-5 sm:py-6 flex flex-col gap-6 sm:gap-8 overflow-x-hidden">
                
                <HeroSection />

                {/* SPONSORED PRODUCTS SECTION */}
                {sponsoredProducts.length > 0 && (
                    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-50/60 via-white to-clay-50/30 border border-amber-100/50 p-3.5 sm:p-4 shadow-xs flex flex-col gap-3 sm:gap-4">
                        <div className="flex items-center gap-2.5 sm:gap-3">
                            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-amber-100 to-amber-50 text-amber-700 shadow-2xs border border-amber-200/50 shrink-0">
                                <Award size={14} className="drop-shadow-2xs" />
                            </span>
                            <div>
                                <h2 className="text-sm sm:text-base font-serif font-bold text-stone-900 leading-none">Sponsored Collection</h2>
                                <p className="text-[10px] text-stone-500 font-medium mt-0.5 sm:mt-1">Curated selections from our finest artisans</p>
                            </div>
                        </div>

                        <SponsoredProductsCarousel 
                            sponsoredProducts={sponsoredProducts} 
                            sponsoredPlacement={sponsoredPlacement} 
                            formatSold={formatSold}
                            data-sponsored-placement={sponsoredPlacement}
                        />
                    </section>
                )}

                {/* CATEGORIES */}
                <CategoryPillTabs categories={categories} />

                {/* 3. FROM STUDIOS YOU FOLLOW (COMPACT) */}
                {followedProducts.length > 0 && (
                    <section className="relative rounded-2xl bg-stone-50/40 border border-stone-200/70 p-3.5 sm:p-4 shadow-xs flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="flex items-center justify-center w-6 h-6 rounded-md bg-clay-50 text-clay-700 border border-clay-100/80 shrink-0">
                                    <Store size={12} />
                                </span>
                                <div>
                                    <h2 className="text-sm sm:text-base font-serif font-bold text-stone-900 leading-none">From Studios You Follow</h2>
                                    <p className="text-[10px] text-stone-500 font-medium mt-0.5">Fresh releases from your favorite artisan workshops</p>
                                </div>
                            </div>
                            <Link 
                                href={route('shop.index', { followed_only: 1 })} 
                                className="text-[11px] text-clay-700 font-semibold hover:underline flex items-center gap-1 min-h-[36px]"
                            >
                                View Feed <ArrowRight size={11} />
                            </Link>
                        </div>

                        <div className="flex md:grid overflow-x-auto md:overflow-visible snap-x md:snap-none -mx-3.5 px-3.5 md:mx-0 md:px-0 scrollbar-hide pb-1 md:pb-0 gap-2.5 sm:gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                            {followedProducts.map((product) => (
                                <div key={`followed-${product.id}`} className="snap-start shrink-0 w-[150px] sm:w-[170px] md:w-auto">
                                    <ProductCard
                                        product={{
                                            ...product,
                                            image: product.img || product.image,
                                            seller: product.seller || product.seller_name,
                                            location: product.location || 'Philippines',
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* FEATURED PRODUCTS */}
                <section>
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <h2 className="text-base sm:text-lg font-serif font-bold text-stone-900 flex items-center gap-2">
                            <span className="w-1 h-4 sm:h-5 bg-clay-600 rounded-full"></span>
                            Featured Products
                        </h2>
                        <Link 
                            href={route('shop.index')} 
                            className="text-xs text-clay-700 font-semibold hover:underline flex items-center gap-1 min-h-[44px]"
                        >
                            View All <ArrowRight size={12} />
                        </Link>
                    </div>

                    {featuredProducts.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2.5 sm:gap-3 lg:gap-3.5">
                            {featuredProducts.map((product) => (
                                <ProductCard
                                    key={product.id}
                                    product={{
                                        ...product,
                                        image: product.img || product.image,
                                        seller: product.seller || product.seller_name,
                                        location: product.location || 'Philippines',
                                    }}
                                />
                            ))}
                        </div>
                    ) : (
                        <WorkspaceEmptyState
                            icon={Package}
                            title="No products available yet"
                            description="Check back soon to see Cavite's finest handcrafted pottery!"
                            compact={true}
                        />
                    )}

                    {featuredProducts.length > 0 && (
                        <div className="py-6 sm:py-8 flex justify-center">
                            <Link 
                                href={route('shop.index')}
                                className="border border-stone-300 hover:border-stone-800 bg-white hover:bg-stone-900 text-stone-800 hover:text-white px-8 py-3 rounded-xl transition-all shadow-2xs active:scale-95 text-xs sm:text-sm font-bold min-h-[44px] flex items-center justify-center gap-2"
                            >
                                <span>View All Products</span>
                                <ArrowRight size={14} />
                            </Link>
                        </div>
                    )}
                </section>

                {/* TOP STORES - DSS Dashboard */}
                <TopArtisansGrid topSellers={topSellers} formatSold={formatSold} />

            </main>

            <Footer />
        </div>
    );
}
