import React from 'react';
import { Link } from '@inertiajs/react';
import { Store, MapPin, ArrowRight, UserMinus } from 'lucide-react';
import UserAvatar from '@/Components/UserAvatar';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';

export default function FollowedShopsList({ shops = [], onUnfollowShop }) {
    if (!shops || shops.length === 0) {
        return (
            <WorkspaceEmptyState
                icon={Store}
                title="No followed artisan studios"
                description="Follow craft studios on their shop page to keep track of their updates."
                actionLabel="Explore Studios"
                actionHref={route('shop.index')}
                className="py-16"
            />
        );
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3 animate-in fade-in duration-200">
            {shops.map((shop) => (
                <div
                    key={shop.id}
                    className="group relative flex flex-col justify-between rounded-xl border border-stone-200/80 bg-white p-2.5 sm:p-3.5 shadow-2xs hover:shadow-md hover:border-stone-300 transition-all"
                >
                    <div>
                        {/* Top: Avatar, Name, Location, Unfollow */}
                        <div className="flex items-start justify-between gap-1.5 sm:gap-2.5">
                            <Link href={route('shop.seller', shop.slug)} className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                                <div className="relative shrink-0 select-none">
                                    <UserAvatar
                                        user={{ ...shop, shop_name: shop.name, name: shop.name }}
                                        className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl border border-stone-100 shadow-2xs"
                                    />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="truncate text-xs sm:text-sm font-bold text-stone-900 group-hover:text-clay-800 transition-colors">
                                        {shop.name}
                                    </h4>
                                    <p className="flex items-center gap-0.5 text-[9px] sm:text-[10px] font-medium text-stone-500 mt-0.5 truncate">
                                        <MapPin size={9} className="text-clay-600 shrink-0" />
                                        <span className="truncate">{shop.location || 'Philippines'}</span>
                                    </p>
                                </div>
                            </Link>

                            {/* Unfollow Button */}
                            <button
                                type="button"
                                onClick={(e) => onUnfollowShop(e, shop)}
                                className="h-6 w-6 sm:h-7 sm:w-7 flex items-center justify-center rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 active:scale-95"
                                title={`Unfollow ${shop.name}`}
                                aria-label={`Unfollow ${shop.name}`}
                            >
                                <UserMinus size={12} />
                            </button>
                        </div>

                        {shop.joinedAt && (
                            <p className="mt-2 text-[9px] sm:text-[10px] font-medium text-stone-400 hidden sm:block">
                                Partner since {shop.joinedAt}
                            </p>
                        )}
                    </div>

                    {/* Bottom Action: Visit Studio */}
                    <div className="mt-2.5 sm:mt-3 pt-2 sm:pt-2.5 border-t border-stone-100 flex items-center justify-end">
                        <Link
                            href={route('shop.seller', shop.slug)}
                            className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg bg-stone-50 hover:bg-stone-900 text-stone-700 hover:text-white text-[10px] sm:text-[11px] font-bold transition-all shadow-2xs border border-stone-200/70 active:scale-95"
                        >
                            <span>Visit</span>
                            <ArrowRight size={10} className="transition-transform group-hover:translate-x-0.5" />
                        </Link>
                    </div>
                </div>
            ))}
        </div>
    );
}
