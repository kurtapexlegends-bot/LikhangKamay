import React, { useEffect, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import ShopLayout from '@/Layouts/ShopLayout';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import UserAvatar from '@/Components/UserAvatar';
import { getFollowedShops, getRecentlyViewedProducts, getWishlistedProducts } from '@/utils/buyerSignals';
import { Heart, History, Store } from 'lucide-react';

const tabButtonClass = (active) => (
    `rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
        active
            ? 'border-clay-200 bg-clay-50 text-clay-700'
            : 'border-stone-200 bg-white text-stone-500 hover:bg-stone-50'
    }`
);

const formatPrice = (value) => Number(value || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

export default function Saved() {
    const [activeTab, setActiveTab] = useState('wishlist');
    const [wishlistedProducts, setWishlistedProducts] = useState([]);
    const [followedShops, setFollowedShops] = useState([]);
    const [recentlyViewed, setRecentlyViewed] = useState([]);

    useEffect(() => {
        const syncSignals = () => {
            setWishlistedProducts(getWishlistedProducts());
            setFollowedShops(getFollowedShops());
            setRecentlyViewed(getRecentlyViewedProducts());
        };

        syncSignals();
        window.addEventListener('storage', syncSignals);
        window.addEventListener('focus', syncSignals);

        return () => {
            window.removeEventListener('storage', syncSignals);
            window.removeEventListener('focus', syncSignals);
        };
    }, []);

    return (
        <ShopLayout>
            <Head title="Saved" />

            <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold tracking-tight text-stone-900">Saved</h1>
                    <p className="mt-1 text-sm text-stone-500">Your wishlist, followed shops, and recently viewed items.</p>
                </div>

                <div className="mb-6 flex flex-wrap gap-2">
                    <button type="button" onClick={() => setActiveTab('wishlist')} className={tabButtonClass(activeTab === 'wishlist')}>
                        Wishlist
                    </button>
                    <button type="button" onClick={() => setActiveTab('following')} className={tabButtonClass(activeTab === 'following')}>
                        Followed Shops
                    </button>
                    <button type="button" onClick={() => setActiveTab('recent')} className={tabButtonClass(activeTab === 'recent')}>
                        Recently Viewed
                    </button>
                </div>

                {activeTab === 'wishlist' && (
                    wishlistedProducts.length > 0 ? (
                        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
                            {wishlistedProducts.map((product) => (
                                <Link
                                    key={product.id}
                                    href={route('product.show', product.slug)}
                                    className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:border-stone-300 hover:shadow-md"
                                >
                                    <div className="aspect-square bg-stone-50 p-4">
                                        <img
                                            src={product.image || '/images/no-image.png'}
                                            alt={product.name}
                                            className="h-full w-full object-contain"
                                            onError={(event) => {
                                                event.target.src = '/images/no-image.png';
                                            }}
                                        />
                                    </div>
                                    <div className="space-y-2 border-t border-stone-100 p-4">
                                        <p className="line-clamp-2 text-sm font-semibold text-stone-900">{product.name}</p>
                                        <p className="text-xs text-stone-500">{product.sellerName}</p>
                                        <p className="text-base font-bold text-stone-900">PHP {formatPrice(product.price)}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <WorkspaceEmptyState
                            icon={Heart}
                            title="No wishlisted products"
                            description="Save products from any product page and they will appear here."
                            actionLabel="Browse Shop"
                            actionHref={route('shop.index')}
                        />
                    )
                )}

                {activeTab === 'following' && (
                    followedShops.length > 0 ? (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {followedShops.map((shop) => (
                                <Link
                                    key={shop.id}
                                    href={route('shop.seller', shop.slug)}
                                    className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-stone-300 hover:shadow-md"
                                >
                                    <div className="flex items-center gap-3">
                                        <UserAvatar user={{ ...shop, shop_name: shop.name, name: shop.name }} className="h-14 w-14 border border-stone-200" />
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-stone-900">{shop.name}</p>
                                            <p className="text-xs text-stone-500">{shop.location}</p>
                                            {shop.joinedAt && (
                                                <p className="mt-1 text-[11px] text-stone-400">Joined {shop.joinedAt}</p>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <WorkspaceEmptyState
                            icon={Store}
                            title="No followed shops"
                            description="Use Follow Shop on a seller page to keep that shop here."
                            actionLabel="Browse Shops"
                            actionHref={route('shop.index')}
                        />
                    )
                )}

                {activeTab === 'recent' && (
                    recentlyViewed.length > 0 ? (
                        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
                            {recentlyViewed.map((product) => (
                                <Link
                                    key={product.id}
                                    href={route('product.show', product.slug)}
                                    className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:border-stone-300 hover:shadow-md"
                                >
                                    <div className="aspect-square bg-stone-50 p-4">
                                        <img
                                            src={product.image || '/images/no-image.png'}
                                            alt={product.name}
                                            className="h-full w-full object-contain"
                                            onError={(event) => {
                                                event.target.src = '/images/no-image.png';
                                            }}
                                        />
                                    </div>
                                    <div className="space-y-2 border-t border-stone-100 p-4">
                                        <p className="line-clamp-2 text-sm font-semibold text-stone-900">{product.name}</p>
                                        <p className="text-xs text-stone-500">{product.sellerName}</p>
                                        <p className="text-base font-bold text-stone-900">PHP {formatPrice(product.price)}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <WorkspaceEmptyState
                            icon={History}
                            title="No recently viewed products"
                            description="Products you open will appear here for faster return visits."
                            actionLabel="Browse Shop"
                            actionHref={route('shop.index')}
                        />
                    )
                )}
            </div>
        </ShopLayout>
    );
}
