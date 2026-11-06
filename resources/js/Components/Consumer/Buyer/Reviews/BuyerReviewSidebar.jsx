import React from 'react';
import UserAvatar from '@/Components/UserAvatar';
import { Package, ShieldAlert, MessageSquare } from 'lucide-react';

export default function BuyerReviewSidebar({
    currentUser,
    stats,
    filterTabs = [],
    selectedFilter,
    onSelectFilter,
    reviewsWithReplies = [],
    onSelectReplyReview,
}) {
    return (
        <aside className="hidden lg:flex flex-col w-full lg:w-64 shrink-0 lg:sticky lg:top-24 self-start bg-white border border-stone-200 rounded-2xl shadow-xs divide-y divide-stone-100">
            {/* Account Profile Section */}
            <div className="p-4 sm:p-5">
                <div className="flex items-center gap-3">
                    <UserAvatar user={currentUser} className="w-11 h-11 shadow-2xs border border-stone-100" />
                    <div className="min-w-0 flex-1">
                        <h2 className="text-sm font-bold text-stone-900 truncate">{currentUser?.name || 'My Account'}</h2>
                        <p className="text-[10px] text-stone-500 font-semibold truncate mt-0.5">{currentUser?.email}</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5 text-center mt-3.5">
                    <div className="bg-stone-50/70 border border-stone-100 rounded-xl p-2">
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Reviews</p>
                        <p className="text-sm font-black text-clay-700 mt-0.5">{stats.total}</p>
                    </div>
                    <div className="bg-stone-50/70 border border-stone-100 rounded-xl p-2">
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Average</p>
                        <p className="text-sm font-black text-clay-700 mt-0.5">{stats.average}</p>
                    </div>
                </div>

                {/* Content Safety Alert Notice in Sidebar if any moderated review exists */}
                {stats.moderated > 0 && (
                    <button
                        type="button"
                        onClick={() => onSelectFilter('moderation')}
                        className={`w-full mt-3 p-2 rounded-xl border text-left text-xs transition-colors flex items-center justify-between gap-1.5 ${
                            selectedFilter === 'moderation'
                                ? 'bg-amber-100/70 border-amber-300 text-amber-900 font-bold'
                                : 'bg-amber-50/70 border-amber-200/80 text-amber-800 hover:bg-amber-100/50'
                        }`}
                    >
                        <span className="flex items-center gap-1.5 min-w-0 truncate">
                            <ShieldAlert size={13} className="text-amber-600 shrink-0" />
                            <span className="truncate">{stats.moderated} in safety review</span>
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-200/80 text-amber-900 shrink-0">
                            {stats.moderated}
                        </span>
                    </button>
                )}
            </div>

            {/* Filter Navigation Tabs */}
            <nav className="p-2.5 flex flex-col gap-1 w-full" aria-label="Review Filters">
                {filterTabs.map((tab) => {
                    const count = tab.count;
                    const isActive = selectedFilter === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => onSelectFilter(tab.id)}
                            className={`flex items-center justify-between px-3 py-2 text-left text-xs rounded-xl transition-all w-full select-none ${
                                isActive 
                                    ? 'bg-clay-50 text-clay-700 font-bold' 
                                    : 'text-stone-600 font-medium hover:text-clay-700 hover:bg-stone-50'
                            }`}
                        >
                            <span className="truncate">{tab.label}</span>
                            {count > 0 && (
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold leading-none ${
                                    isActive ? 'bg-clay-600 text-white' : 'bg-stone-100 text-stone-500'
                                }`}>
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* Artisan Replies Section (Compact) */}
            <div className="p-3">
                <div className="flex items-center justify-between px-1 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                        Artisan Replies
                    </span>
                    {reviewsWithReplies.length > 0 && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-clay-100 text-clay-700">
                            {reviewsWithReplies.length}
                        </span>
                    )}
                </div>

                {reviewsWithReplies.length > 0 ? (
                    <div className="space-y-1.5">
                        {reviewsWithReplies.slice(0, 3).map((r) => (
                            <button
                                key={r.id}
                                type="button"
                                onClick={() => onSelectReplyReview(r)}
                                className="w-full text-left p-2 rounded-xl bg-stone-50/80 hover:bg-clay-50/70 border border-stone-200/60 transition-colors group"
                            >
                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                    <span className="text-[11px] font-bold text-stone-800 truncate group-hover:text-clay-700">
                                        {r.product?.workshop_name || 'Artisan'}
                                    </span>
                                    <span className="text-[9px] text-stone-400 shrink-0 font-medium">{r.seller_reply_date || r.date}</span>
                                </div>
                                <p className="text-[11px] text-stone-600 line-clamp-2 italic leading-relaxed">
                                    "{r.seller_reply}"
                                </p>
                                <div className="flex items-center gap-1 mt-1 text-[10px] font-medium text-stone-400 group-hover:text-clay-600 truncate">
                                    <Package size={10} className="shrink-0" />
                                    <span className="truncate">{r.product?.name}</span>
                                </div>
                            </button>
                        ))}

                        {reviewsWithReplies.length > 3 && (
                            <button
                                type="button"
                                onClick={() => onSelectFilter('replied')}
                                className="w-full py-1 text-center text-[10px] font-semibold text-clay-600 hover:text-clay-700 hover:underline"
                            >
                                View all {reviewsWithReplies.length} replies
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="p-2.5 rounded-xl bg-stone-50/60 border border-stone-100 text-center">
                        <div className="inline-flex p-1.5 rounded-full bg-stone-100 text-stone-400 mb-1">
                            <MessageSquare size={13} />
                        </div>
                        <p className="text-[11px] font-medium text-stone-500">No replies yet</p>
                        <p className="text-[10px] text-stone-400 mt-0.5">Artisan responses will appear here.</p>
                    </div>
                )}
            </div>
        </aside>
    );
}
