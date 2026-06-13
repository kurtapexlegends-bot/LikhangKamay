import React from 'react';
import { Link } from '@inertiajs/react';
import { UserMinus, Store, ArrowRight } from 'lucide-react';
import UserAvatar from '@/Components/UserAvatar';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';

export default function FollowedShopsList({ shops, onUnfollowShop }) {
    if (!shops.length) {
        return (
            <WorkspaceEmptyState
                icon={Store}
                title="No followed shops"
                description="Use Follow Shop on a seller page to keep that shop here."
                actionLabel="Browse Shops"
                actionHref={route('shop.index')}
                className="py-16"
            />
        );
    }

    return (
        <div className="grid gap-4 sm:grid-cols-2 animate-in fade-in duration-500">
            {shops.map((shop) => (
                <Link
                    key={shop.id}
                    href={route('shop.seller', shop.slug)}
                    className="group relative rounded-[24px] border border-stone-100/80 bg-stone-50/45 p-5 shadow-sm transition-all duration-300 hover:bg-white hover:border-clay-200 hover:shadow-lg hover:shadow-stone-200/80 flex flex-col justify-between min-h-[140px]"
                >
                    <div className="flex items-start gap-4">
                        <div className="relative shrink-0 select-none">
                            <UserAvatar 
                                user={{ ...shop, shop_name: shop.name, name: shop.name }} 
                                className="h-16 w-16 border border-stone-100 shadow-sm ring-2 ring-stone-100/50 ring-offset-2" 
                            />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h4 className="truncate text-base font-bold text-stone-900 pr-10 tracking-tight group-hover:text-clay-800 transition-colors">
                                {shop.name}
                            </h4>
                            <p className="text-xs font-semibold text-stone-500 mt-0.5">{shop.location}</p>
                            {shop.joinedAt && (
                                <p className="mt-1.5 text-[10px] text-stone-400 font-medium">Joined {shop.joinedAt}</p>
                            )}
                        </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-stone-100/60 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-clay-700">
                            View Studio
                            <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
                        </span>
                    </div>

                    {/* Unfollow button placed inside card but styled as a clear touch-target */}
                    <button 
                        type="button"
                        onClick={(e) => onUnfollowShop(e, shop)}
                        className="absolute right-4 top-4 rounded-full p-2.5 text-stone-400 hover:bg-rose-50 hover:text-rose-600 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center shadow-sm sm:shadow-none bg-white sm:bg-transparent"
                        title="Unfollow Shop"
                    >
                        <UserMinus size={16} />
                    </button>
                </Link>
            ))}
        </div>
    );
}
