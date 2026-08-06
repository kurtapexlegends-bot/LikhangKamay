import React from 'react';
import { Head, Link } from '@inertiajs/react';
import BuyerNavbar from '@/Layouts/BuyerNavbar';
import ImpersonationBanner from '@/Layouts/ImpersonationBanner';
import Footer from '@/Layouts/Footer';
import { Award, ArrowRight, Package } from 'lucide-react';
import { useSponsoredImpressionTracking } from '@/utils/sponsorshipTracking';
import { formatSold } from '@/utils/catalog';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import ProductCard from '@/Pages/Consumer/Shop/Partials/ProductCard';

// Subcomponents imported from domain directory
import HeroSection from '@/Components/Consumer/Welcome/HeroSection';
import CategoryPillTabs from '@/Components/Consumer/Welcome/CategoryPillTabs';
import SponsoredProductsCarousel from '@/Components/Consumer/Welcome/SponsoredProductsCarousel';
import TopArtisansGrid from '@/Components/Consumer/Welcome/TopArtisansGrid';

export default function Welcome({ featuredProducts = [], sponsoredProducts = [], topSellers = [], categories = [] }) {
    const sponsoredPlacement = 'home_sponsored';

    useSponsoredImpressionTracking(sponsoredProducts, sponsoredPlacement);

    return (
        <div className="min-h-screen bg-[#FDFBF9] font-sans text-gray-800">
            <Head title="LikhangKamay - Artisan Marketplace" />

            <ImpersonationBanner />
            <BuyerNavbar />

            {/* --- MAIN CONTENT --- */}
            <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6 flex flex-col gap-10">
                
                <HeroSection />

                {/* SPONSORED PRODUCTS SECTION */}
                {sponsoredProducts.length > 0 && (
                    <section className="order-1 relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-50/60 via-white to-clay-50/30 border border-amber-100/50 p-4 shadow-sm flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-amber-100 to-amber-50 text-amber-700 shadow-sm border border-amber-200/50">
                                <Award size={14} className="drop-shadow-sm" />
                            </span>
                            <div>
                                <h2 className="text-base font-serif font-bold text-gray-900 leading-none">Sponsored Collection</h2>
                                <p className="text-[10px] text-gray-500 font-medium mt-1">Curated selections from our finest artisans</p>
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

                {/* FEATURED PRODUCTS */}
                <section className="order-3">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                            <span className="w-1 h-5 bg-clay-600 rounded-full"></span>
                            Featured Products
                        </h2>
                        <Link 
                            href={route('shop.index')} 
                            className="text-xs text-clay-600 font-medium hover:underline flex items-center gap-1 min-h-[44px]"
                        >
                            View All <ArrowRight size={12} />
                        </Link>
                    </div>

                    {featuredProducts.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
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
                        <div className="py-8 flex justify-center">
                            <Link 
                                href={route('shop.index')}
                                className="border border-clay-600 text-clay-600 px-8 py-3 rounded-sm hover:bg-clay-600 hover:text-white transition text-sm font-medium min-h-[44px] flex items-center justify-center"
                            >
                                View All Products
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
