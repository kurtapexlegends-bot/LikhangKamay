import React, { useState, useMemo } from 'react';
import { ArrowLeft, Star, Package, MessageSquare, Store, Search, X, Image as ImageIcon } from 'lucide-react';
import CompactPagination from '@/Components/CompactPagination';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import ReviewListItem from '@/Components/Seller/Chat/ReviewListItem';

export default function ProductReviewFeedPane({
    selectedProduct = null,
    overallStats = {},
    reviews = [],
    onBackToDirectory,
    auth,
    canEditReviews,
    replyingTo,
    replyText,
    setReplyText,
    openReply,
    openEditReply,
    onCancelReply,
    onSubmitReply,
    onTogglePin,
    onQuickReply,
    onOpenDispute,
    onConfirmDeleteDispute,
    onConfirmDeleteReply,
    quickReplies = []
}) {
    const [filter, setFilter] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Calculate rating stats for currently scoped reviews
    const stats = useMemo(() => {
        if (!selectedProduct && overallStats?.total !== undefined) {
            return {
                total: overallStats.total || 0,
                avg: overallStats.average || 0,
                stars: overallStats.stars || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
                unreplied: reviews.filter(r => !r.seller_reply || !r.seller_reply.trim()).length,
                hidden: reviews.filter(r => r.is_hidden_from_marketplace).length,
                withPhotos: reviews.filter(r => r.photos && r.photos.length > 0).length,
            };
        }

        const total = reviews.length;
        const avg = total > 0 ? reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / total : 0;
        const stars = {
            5: reviews.filter(r => r.rating === 5).length,
            4: reviews.filter(r => r.rating === 4).length,
            3: reviews.filter(r => r.rating === 3).length,
            2: reviews.filter(r => r.rating === 2).length,
            1: reviews.filter(r => r.rating === 1).length,
        };
        const unreplied = reviews.filter(r => !r.seller_reply || !r.seller_reply.trim()).length;
        const hidden = reviews.filter(r => r.is_hidden_from_marketplace).length;
        const withPhotos = reviews.filter(r => r.photos && r.photos.length > 0).length;

        return { total, avg, stars, unreplied, hidden, withPhotos };
    }, [selectedProduct, overallStats, reviews]);

    const filteredReviews = useMemo(() => {
        return reviews.filter((review) => {
            const matchesFilter = filter === 'All'
                ? true
                : filter === 'Hidden'
                    ? review.is_hidden_from_marketplace
                    : filter === 'Needs Reply'
                        ? (!review.seller_reply || !review.seller_reply.trim())
                        : filter === 'Photos'
                            ? (review.photos && review.photos.length > 0)
                            : review.rating === parseInt(filter, 10);

            if (!matchesFilter) return false;

            if (!searchTerm.trim()) return true;

            const q = searchTerm.toLowerCase();
            return (
                review.customer?.toLowerCase().includes(q) ||
                review.comment?.toLowerCase().includes(q) ||
                review.product_name?.toLowerCase().includes(q)
            );
        });
    }, [reviews, filter, searchTerm]);

    const sortedReviews = useMemo(() => {
        return [...filteredReviews].sort((a, b) => {
            if (a.is_pinned && !b.is_pinned) return -1;
            if (!a.is_pinned && b.is_pinned) return 1;
            return 0;
        });
    }, [filteredReviews]);

    const totalPages = Math.max(1, Math.ceil(sortedReviews.length / itemsPerPage));
    const paginatedReviews = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedReviews.slice(startIndex, startIndex + itemsPerPage);
    }, [currentPage, sortedReviews]);

    React.useEffect(() => {
        setCurrentPage(1);
    }, [filter, searchTerm, selectedProduct?.id]);

    const reviewTabs = [
        { key: 'All', label: 'All', count: stats.total },
        { key: 'Needs Reply', label: 'Needs Reply', count: stats.unreplied },
        { key: 'Photos', label: 'With Photos', count: stats.withPhotos },
        { key: 'Hidden', label: 'Hidden', count: stats.hidden },
        { key: '5', label: '5', count: stats.stars[5] || 0, isRating: true },
        { key: '4', label: '4', count: stats.stars[4] || 0, isRating: true },
        { key: '3', label: '3', count: stats.stars[3] || 0, isRating: true },
        { key: '2', label: '2', count: stats.stars[2] || 0, isRating: true },
        { key: '1', label: '1', count: stats.stars[1] || 0, isRating: true },
    ];

    const roundedRating = Math.round(stats.avg || 0);

    return (
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs flex flex-col h-[740px] overflow-hidden">
            {/* 1. Header: Scope Info & Compact Rating Breakdown (Content Safety Style) */}
            <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-stone-200/80 bg-[#FAF9F6] shrink-0">
                {/* Mobile Back Button */}
                <div className="md:hidden mb-2.5">
                    <button
                        type="button"
                        onClick={onBackToDirectory}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-900"
                    >
                        <ArrowLeft size={14} />
                        Back to Products
                    </button>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                    {/* Left: Product or Store Info */}
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-white border border-stone-200 overflow-hidden shrink-0 flex items-center justify-center shadow-2xs">
                            {selectedProduct ? (
                                selectedProduct.cover_photo_path ? (
                                    <img
                                        src={selectedProduct.cover_photo_path}
                                        alt={selectedProduct.name}
                                        className="h-full w-full object-cover"
                                        onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                ) : (
                                    <Package size={20} className="text-stone-400" />
                                )
                            ) : (
                                <Store size={20} className="text-stone-700" />
                            )}
                        </div>

                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider bg-stone-100 text-stone-700 border border-stone-200/60">
                                    {selectedProduct ? (selectedProduct.category || 'Product') : 'Store Wide'}
                                </span>
                                {selectedProduct && (
                                    <span className="text-[10px] font-medium text-stone-400">
                                        ID: #{selectedProduct.id}
                                    </span>
                                )}
                            </div>
                            <h2 className="text-sm sm:text-base font-bold text-stone-900 truncate mt-0.5 max-w-xs sm:max-w-md">
                                {selectedProduct ? selectedProduct.name : 'All Store Reviews'}
                            </h2>
                        </div>
                    </div>

                    {/* Right: Score & Compact Star Bars */}
                    <div className="flex items-center gap-3.5 self-stretch sm:self-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2.5 sm:pt-0 border-stone-200/60 shrink-0">
                        <div className="text-left sm:text-right">
                            <div className="flex items-baseline justify-start sm:justify-end gap-1.5">
                                <span className="text-2xl font-black text-stone-900 leading-none">
                                    {stats.avg > 0 ? stats.avg.toFixed(1) : '0.0'}
                                </span>
                                <div className="flex items-center gap-0.5">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                            key={star}
                                            size={12}
                                            className={
                                                stats.avg > 0 && star <= roundedRating
                                                    ? 'fill-amber-400 text-amber-400'
                                                    : 'text-stone-200 fill-stone-100'
                                            }
                                        />
                                    ))}
                                </div>
                            </div>
                            <p className="text-[10px] text-stone-400 font-medium mt-0.5">
                                {stats.total} {stats.total === 1 ? 'review' : 'reviews'}
                            </p>
                        </div>

                        {/* 5-to-1 Compact Micro Bars (or empty notice if 0 reviews) */}
                        {stats.total > 0 ? (
                            <div className="w-24 space-y-1 text-[9px]">
                                {[5, 4, 3, 2, 1].map((s) => {
                                    const count = stats.stars[s] || 0;
                                    const pct = (count / stats.total) * 100;
                                    const starStr = s.toString();
                                    const isCurrent = filter === starStr;

                                    return (
                                        <div
                                            key={s}
                                            onClick={() => setFilter(isCurrent ? 'All' : starStr)}
                                            className={`flex items-center gap-1.5 cursor-pointer hover:opacity-85 transition-opacity ${
                                                isCurrent ? 'font-bold text-clay-700' : 'text-stone-500'
                                            }`}
                                            title={`Filter by ${s} star reviews`}
                                        >
                                            <span className="w-3 text-right font-medium flex items-center justify-end gap-0.5">
                                                {s}
                                                <Star size={9} className="fill-amber-400 text-amber-400 shrink-0" />
                                            </span>
                                            <div className="flex-1 h-1.5 bg-stone-200 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-300 ${
                                                        isCurrent ? 'bg-clay-600' : 'bg-amber-400'
                                                    }`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                            <span className="w-3 text-right text-[8px] text-stone-400">{count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-[10px] text-stone-400 font-medium px-2 py-1 rounded bg-stone-100/70">
                                No rating history
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. Filter & Search Strip (Content Safety Style) */}
            <div className="px-3.5 py-2.5 border-b border-stone-200/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white shrink-0">
                {/* Content Safety Pill Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5 sm:pb-0">
                    {reviewTabs.map((tab) => {
                        const isSelected = filter === tab.key;

                        return (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setFilter(tab.key)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all shrink-0 cursor-pointer ${
                                    isSelected
                                        ? 'bg-clay-700 text-white shadow-2xs'
                                        : 'bg-white border border-stone-200/80 text-stone-600 hover:bg-stone-50'
                                }`}
                            >
                                {tab.isRating ? (
                                    <span className="inline-flex items-center gap-0.5">
                                        <span>{tab.label}</span>
                                        <Star size={9} className={isSelected ? 'fill-white text-white' : 'fill-amber-400 text-amber-400'} />
                                    </span>
                                ) : (
                                    <span>{tab.label}</span>
                                )}
                                <span
                                    className={`inline-flex items-center justify-center px-1.5 py-0.2 rounded-md text-[9px] font-black ${
                                        isSelected
                                            ? 'bg-white/20 text-white'
                                            : tab.count > 0 ? 'bg-stone-100 text-stone-700' : 'bg-stone-100/60 text-stone-400'
                                    }`}
                                >
                                    {tab.count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Comment Search Input */}
                <div className="relative w-full sm:w-52 shrink-0">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search comments..."
                        className="w-full rounded-xl border border-stone-200 bg-white py-1 pl-8 pr-7 text-xs font-medium text-stone-900 placeholder-stone-400 focus:border-clay-500 focus:ring-1 focus:ring-clay-500 shadow-2xs h-[32px]"
                    />
                    {searchTerm && (
                        <button
                            type="button"
                            onClick={() => setSearchTerm('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                        >
                            <X size={11} />
                        </button>
                    )}
                </div>
            </div>

            {/* 3. Review Cards Stream */}
            <div className="flex-1 overflow-y-auto divide-y divide-stone-100 custom-scrollbar">
                {paginatedReviews.length > 0 ? (
                    paginatedReviews.map((review) => (
                        <ReviewListItem
                            key={review.id}
                            review={review}
                            auth={auth}
                            canEditReviews={canEditReviews}
                            replyingTo={replyingTo}
                            replyText={replyText}
                            setReplyText={setReplyText}
                            openReply={openReply}
                            openEditReply={openEditReply}
                            onCancelReply={onCancelReply}
                            onSubmitReply={onSubmitReply}
                            onTogglePin={onTogglePin}
                            onQuickReply={onQuickReply}
                            onOpenDispute={onOpenDispute}
                            onConfirmDeleteDispute={onConfirmDeleteDispute}
                            onConfirmDeleteReply={onConfirmDeleteReply}
                            quickReplies={quickReplies}
                        />
                    ))
                ) : (
                    <div className="p-12 text-center">
                        <WorkspaceEmptyState
                            compact
                            icon={MessageSquare}
                            title="No reviews found"
                            description={
                                reviews.length === 0
                                    ? selectedProduct
                                        ? "This item hasn't received any customer feedback yet."
                                        : "Your store hasn't received any customer reviews yet."
                                    : "There are no reviews matching your current filter or search criteria."
                            }
                        />
                    </div>
                )}
            </div>

            {/* 4. Compact Pagination Footer */}
            {totalPages > 1 && (
                <div className="shrink-0 border-t border-stone-100 bg-[#FAF9F6]">
                    <CompactPagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={sortedReviews.length}
                        itemsPerPage={itemsPerPage}
                        itemLabel="reviews"
                        onPageChange={setCurrentPage}
                    />
                </div>
            )}
        </div>
    );
}
