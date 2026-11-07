/* global route */
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import ShopLayout from '@/Layouts/ShopLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { 
    MessageSquare, 
    Search, 
    X,
    ShoppingBag,
    Trash2,
    User
} from 'lucide-react';
import Modal from '@/Components/Modal';
import ConfirmationModal from '@/Components/ConfirmationModal';
import CompactPagination from '@/Components/CompactPagination';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';

import BuyerReviewSidebar from '@/Components/Consumer/Buyer/Reviews/BuyerReviewSidebar';
import BuyerReviewCard from '@/Components/Consumer/Buyer/Reviews/BuyerReviewCard';
import EditReviewModal from '@/Components/Consumer/Buyer/Reviews/EditReviewModal';

export default function Reviews({ auth, reviews = [] }) {
    const page = usePage();
    const currentUser = auth?.user || page.props?.auth?.user;
    const activeReviews = useMemo(() => (Array.isArray(reviews) ? reviews : []), [reviews]);

    // Filter and search state
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFilter, setSelectedFilter] = useState('all');

    // Highlighted review ID for focusing from sidebar artisan replies or notification links
    const [highlightedReviewId, setHighlightedReviewId] = useState(null);

    // Edit modal state
    const [editModal, setEditModal] = useState({ isOpen: false, review: null });
    const [editProcessing, setEditProcessing] = useState(false);

    // Delete modal state
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, review: null });
    const [deleteProcessing, setDeleteProcessing] = useState(false);

    // Lightbox image preview state
    const [activeImagePreview, setActiveImagePreview] = useState(null);

    // Summary statistics
    const stats = useMemo(() => {
        const total = activeReviews.length;
        if (total === 0) {
            return { 
                total: 0, 
                average: '0.0', 
                withReplies: 0, 
                moderated: 0,
                fiveStar: 0, 
                fourStar: 0, 
                threeStar: 0, 
                twoStar: 0, 
                oneStar: 0 
            };
        }
        
        const sum = activeReviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
        const avg = (sum / total).toFixed(1);
        const withReplies = activeReviews.filter((r) => Boolean(r.seller_reply)).length;
        const moderated = activeReviews.filter((r) => 
            Boolean(r.moderation?.is_hidden) || 
            (r.moderation?.has_dispute && ['pending', 'under_review'].includes(r.moderation?.dispute_status))
        ).length;

        const fiveStar = activeReviews.filter((r) => Number(r.rating) === 5).length;
        const fourStar = activeReviews.filter((r) => Number(r.rating) === 4).length;
        const threeStar = activeReviews.filter((r) => Number(r.rating) === 3).length;
        const twoStar = activeReviews.filter((r) => Number(r.rating) === 2).length;
        const oneStar = activeReviews.filter((r) => Number(r.rating) === 1).length;

        return {
            total,
            average: avg,
            withReplies,
            moderated,
            fiveStar,
            fourStar,
            threeStar,
            twoStar,
            oneStar,
        };
    }, [activeReviews]);

    // Reviews that have artisan replies, sorted chronologically with most recent reply first
    const reviewsWithReplies = useMemo(() => {
        return activeReviews
            .filter((r) => Boolean(r.seller_reply))
            .sort((a, b) => {
                const timeA = a.seller_reply_raw ? new Date(a.seller_reply_raw).getTime() : 0;
                const timeB = b.seller_reply_raw ? new Date(b.seller_reply_raw).getTime() : 0;
                return timeB - timeA;
            });
    }, [activeReviews]);

    // Filter definitions matching sidebar navigation
    const filterTabs = useMemo(() => {
        const tabs = [
            { id: 'all', label: 'All Reviews', count: activeReviews.length },
        ];

        if (stats.withReplies > 0) {
            tabs.push({ id: 'replied', label: 'Artisan Replied', count: stats.withReplies });
        }

        if (stats.moderated > 0) {
            tabs.push({ id: 'moderation', label: 'Safety / Moderated', count: stats.moderated });
        }

        tabs.push(
            { id: '5', label: '5 Stars', count: stats.fiveStar },
            { id: '4', label: '4 Stars', count: stats.fourStar },
            { id: '3', label: '3 Stars', count: stats.threeStar },
            { id: '2', label: '2 Stars', count: stats.twoStar },
            { id: '1', label: '1 Star', count: stats.oneStar },
        );

        return tabs;
    }, [activeReviews.length, stats]);

    // Filtered reviews calculation
    const filteredReviews = useMemo(() => {
        return activeReviews.filter((review) => {
            // Replied filter
            if (selectedFilter === 'replied' && !review.seller_reply) {
                return false;
            }

            // Moderation / safety filter
            if (selectedFilter === 'moderation') {
                const isUnderReview = Boolean(
                    review.moderation?.has_dispute && 
                    ['pending', 'under_review'].includes(review.moderation?.dispute_status)
                );
                const isHidden = Boolean(review.moderation?.is_hidden);
                if (!isUnderReview && !isHidden) {
                    return false;
                }
            }

            // Star rating filter
            if (['5', '4', '3', '2', '1'].includes(selectedFilter)) {
                if (String(review.rating) !== selectedFilter) {
                    return false;
                }
            }

            // Search filter
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                const productName = (review.product?.name || '').toLowerCase();
                const workshopName = (review.product?.workshop_name || '').toLowerCase();
                const comment = (review.comment || '').toLowerCase();
                const reply = (review.seller_reply || '').toLowerCase();

                return productName.includes(query) || workshopName.includes(query) || comment.includes(query) || reply.includes(query);
            }

            return true;
        });
    }, [activeReviews, selectedFilter, searchQuery]);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCurrentPage(1);
    }, [selectedFilter, searchQuery]);

    const totalPages = Math.ceil(filteredReviews.length / itemsPerPage);
    const paginatedReviews = filteredReviews.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Focus and scroll to specific review (from sidebar reply click or notification URL ?review=ID)
    const focusReview = useCallback((targetId) => {
        const target = activeReviews.find((r) => r.id === targetId);
        if (!target) return;

        // Reset search query if it would hide target review
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const matchesSearch = 
                (target.product?.name || '').toLowerCase().includes(q) ||
                (target.product?.workshop_name || '').toLowerCase().includes(q) ||
                (target.comment || '').toLowerCase().includes(q) ||
                (target.seller_reply || '').toLowerCase().includes(q);
            if (!matchesSearch) {
                setSearchQuery('');
            }
        }

        // Adjust selected filter tab if target review is excluded
        let effectiveFilter = selectedFilter;
        if (selectedFilter === 'replied' && !target.seller_reply) {
            effectiveFilter = 'all';
            setSelectedFilter('all');
        } else if (selectedFilter === 'moderation') {
            const isMod = Boolean(target.moderation?.is_hidden) || 
                (target.moderation?.has_dispute && ['pending', 'under_review'].includes(target.moderation?.dispute_status));
            if (!isMod) {
                effectiveFilter = 'all';
                setSelectedFilter('all');
            }
        } else if (['1', '2', '3', '4', '5'].includes(selectedFilter) && String(target.rating) !== selectedFilter) {
            effectiveFilter = 'all';
            setSelectedFilter('all');
        }

        // Compute the target page in the candidate filter slice
        const candidateList = activeReviews.filter((review) => {
            if (effectiveFilter === 'replied' && !review.seller_reply) return false;
            if (effectiveFilter === 'moderation') {
                const isUnderReview = Boolean(
                    review.moderation?.has_dispute && 
                    ['pending', 'under_review'].includes(review.moderation?.dispute_status)
                );
                const isHidden = Boolean(review.moderation?.is_hidden);
                if (!isUnderReview && !isHidden) return false;
            }
            if (['5', '4', '3', '2', '1'].includes(effectiveFilter) && String(review.rating) !== effectiveFilter) {
                return false;
            }
            return true;
        });

        const targetIndex = candidateList.findIndex((r) => r.id === targetId);
        if (targetIndex !== -1) {
            const targetPage = Math.floor(targetIndex / itemsPerPage) + 1;
            setCurrentPage(targetPage);
        }

        // Trigger highlight ring
        setHighlightedReviewId(targetId);

        // Smooth scroll to target card
        setTimeout(() => {
            const el = document.getElementById(`review-${targetId}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 120);

        // Clear highlight ring after 3.5s
        setTimeout(() => {
            setHighlightedReviewId((prev) => (prev === targetId ? null : prev));
        }, 3500);
    }, [activeReviews, searchQuery, selectedFilter]);

    // Deep-link auto-focus when arriving from notification (?review={id})
    useEffect(() => {
        if (typeof window === 'undefined' || activeReviews.length === 0) return;
        const params = new URLSearchParams(window.location.search);
        const reviewParam = params.get('review');
        if (reviewParam) {
            const targetId = parseInt(reviewParam, 10);
            if (!isNaN(targetId)) {
                // eslint-disable-next-line react-hooks/set-state-in-effect
                focusReview(targetId);
            }
        }
    }, [activeReviews, focusReview]);

    // Open edit modal
    const handleOpenEdit = (review) => {
        setEditModal({ isOpen: true, review });
    };

    // Save edited review
    const handleSaveEdit = (reviewId, rating, comment) => {
        setEditProcessing(true);
        router.patch(
            route('reviews.update', reviewId),
            {
                rating,
                comment: comment.trim() || null,
            },
            {
                preserveScroll: true,
                onFinish: () => setEditProcessing(false),
                onSuccess: () => setEditModal({ isOpen: false, review: null }),
            }
        );
    };

    // Open delete confirmation
    const handleOpenDelete = (review) => {
        setDeleteModal({ isOpen: true, review });
    };

    // Confirm delete review
    const handleConfirmDelete = () => {
        if (!deleteModal.review) return;

        setDeleteProcessing(true);
        router.delete(route('reviews.destroy', deleteModal.review.id), {
            preserveScroll: true,
            onFinish: () => setDeleteProcessing(false),
            onSuccess: () => setDeleteModal({ isOpen: false, review: null }),
        });
    };

    return (
        <ShopLayout>
            <Head title="My Product Reviews - LikhangKamay" />

            <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-6 min-w-0 flex-1">
                <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 items-start">
                    {/* Left Column: Account Profile & Navigation (Desktop sidebar, compact artisan replies) */}
                    <BuyerReviewSidebar
                        currentUser={currentUser}
                        stats={stats}
                        filterTabs={filterTabs}
                        selectedFilter={selectedFilter}
                        onSelectFilter={setSelectedFilter}
                        reviewsWithReplies={reviewsWithReplies}
                        onSelectReplyReview={(r) => focusReview(r.id)}
                    />

                    {/* Right Column: Main Reviews Feed Area */}
                    <div className="flex-1 min-w-0 w-full">
                        {/* Page Header (Desktop) */}
                        <div className="hidden lg:flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <h1 className="text-xl font-black tracking-tight text-stone-900">My Reviews</h1>
                                <span className="text-xs bg-clay-100 text-clay-700 px-2.5 py-0.5 rounded-full font-bold">
                                    {filteredReviews.length} {filteredReviews.length === 1 ? 'Review' : 'Reviews'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Link
                                    href={route('profile.edit')}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 bg-white text-xs font-semibold text-stone-700 hover:text-stone-900 hover:border-stone-300 hover:bg-stone-50 transition-colors shadow-2xs"
                                >
                                    <User size={13} className="text-stone-400" />
                                    <span>Profile</span>
                                </Link>
                                <Link
                                    href={route('my-orders.index')}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 bg-white text-xs font-semibold text-stone-700 hover:text-stone-900 hover:border-stone-300 hover:bg-stone-50 transition-colors shadow-2xs"
                                >
                                    <ShoppingBag size={13} className="text-stone-400" />
                                    <span>My Purchases</span>
                                </Link>
                            </div>
                        </div>

                        {/* Mobile Header */}
                        <div className="mb-3.5 lg:hidden flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                                <h1 className="text-lg font-black tracking-tight text-stone-900 truncate">My Reviews</h1>
                                <span className="text-[10px] bg-clay-100 text-clay-700 px-2 py-0.5 rounded-full font-bold shrink-0">
                                    {filteredReviews.length}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <Link
                                    href={route('profile.edit')}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-stone-200 bg-white text-xs font-semibold text-stone-700 hover:text-stone-900 shadow-2xs active:scale-95 transition-all shrink-0 min-h-[34px]"
                                >
                                    <User size={12} className="text-stone-400" />
                                    <span>Profile</span>
                                </Link>
                                <Link
                                    href={route('my-orders.index')}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-stone-200 bg-white text-xs font-semibold text-stone-700 hover:text-stone-900 shadow-2xs active:scale-95 transition-all shrink-0 min-h-[34px]"
                                >
                                    <span>Purchases</span>
                                </Link>
                            </div>
                        </div>

                        {/* Mobile Tabs Slider */}
                        <div className="lg:hidden mb-3.5 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-2xs">
                            <div className="flex overflow-x-auto scrollbar-hide">
                                {filterTabs.map((tab) => {
                                    const count = tab.count;
                                    const isActive = selectedFilter === tab.id;
                                    return (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => setSelectedFilter(tab.id)}
                                            className={`relative flex min-w-[85px] flex-1 items-center justify-center gap-1.5 px-2.5 py-2.5 text-center text-xs font-bold transition-all whitespace-nowrap focus:outline-none ${
                                                isActive 
                                                    ? 'text-clay-700 bg-clay-50/70' 
                                                    : 'text-stone-500 hover:text-clay-600 hover:bg-stone-50'
                                            }`}
                                        >
                                            <span className="truncate">{tab.label}</span>
                                            {count > 0 && (
                                                <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                                                    isActive ? 'bg-clay-600 text-white' : 'bg-stone-100 text-stone-500'
                                                }`}>
                                                    {count}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Search Bar Input */}
                        <div className="mb-3.5 relative">
                            <input
                                type="text"
                                placeholder="Search by item name, workshop, or feedback..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-8 py-2 bg-white border border-stone-200 rounded-xl text-xs sm:text-sm placeholder-stone-400 focus:outline-none focus:border-clay-500 transition-colors shadow-2xs"
                            />
                            <Search className="absolute left-3 top-2.5 text-stone-400 w-4 h-4" />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
                                    title="Clear search"
                                >
                                    <X size={13} />
                                </button>
                            )}
                        </div>

                        {/* Reviews List Feed */}
                        {filteredReviews.length === 0 ? (
                            <WorkspaceEmptyState
                                icon={MessageSquare}
                                title={searchQuery ? "No reviews found" : "No reviews in this category"}
                                description={
                                    searchQuery
                                        ? `We couldn't find any reviews matching "${searchQuery}". Try a different keyword.`
                                        : activeReviews.length === 0
                                            ? "You haven't written any reviews yet. Your reviews on purchased artisan items will appear here."
                                            : "There are no reviews matching the selected filter."
                                }
                                actionHref={activeReviews.length === 0 ? route('my-orders.index') : undefined}
                                actionLabel={activeReviews.length === 0 ? "View My Purchases" : undefined}
                                secondaryActionLabel={searchQuery || selectedFilter !== 'all' ? "Reset Filter" : undefined}
                                onSecondaryAction={() => {
                                    setSearchQuery('');
                                    setSelectedFilter('all');
                                }}
                            />
                        ) : (
                            <div className="space-y-3">
                                {paginatedReviews.map((review) => (
                                    <BuyerReviewCard
                                        key={review.id}
                                        review={review}
                                        onOpenEdit={handleOpenEdit}
                                        onOpenDelete={handleOpenDelete}
                                        onPreviewImage={setActiveImagePreview}
                                        isHighlighted={highlightedReviewId === review.id}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Compact Pagination */}
                        <CompactPagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={filteredReviews.length}
                            itemsPerPage={itemsPerPage}
                            onPageChange={setCurrentPage}
                            itemLabel="reviews"
                            className="mt-5 rounded-xl border border-stone-200 bg-white"
                        />
                    </div>
                </div>
            </div>

            {/* Edit Review Modal */}
            <EditReviewModal
                isOpen={editModal.isOpen}
                review={editModal.review}
                onClose={() => !editProcessing && setEditModal({ isOpen: false, review: null })}
                onSubmit={handleSaveEdit}
                processing={editProcessing}
            />

            {/* Delete Review Confirmation Modal */}
            {deleteModal.isOpen && deleteModal.review && (
                <ConfirmationModal
                    isOpen={deleteModal.isOpen}
                    onClose={() => !deleteProcessing && setDeleteModal({ isOpen: false, review: null })}
                    onConfirm={handleConfirmDelete}
                    title="Withdraw Review"
                    message={`Are you sure you want to delete your review for "${deleteModal.review.product?.name || 'this item'}"? Your rating and feedback will be removed from the artisan's storefront.`}
                    icon={Trash2}
                    iconBg="bg-rose-50 text-rose-600 border border-rose-100"
                    confirmText={deleteProcessing ? 'Deleting...' : 'Yes, Delete Review'}
                    confirmColor="bg-rose-600 hover:bg-rose-700 text-white shadow-2xs"
                    processing={deleteProcessing}
                    isHighRisk={false}
                />
            )}

            {/* Image Lightbox Preview Modal */}
            {activeImagePreview && (
                <Modal
                    show={Boolean(activeImagePreview)}
                    onClose={() => setActiveImagePreview(null)}
                    maxWidth="2xl"
                >
                    <div className="p-4 bg-stone-950 rounded-2xl flex flex-col items-center">
                        <div className="w-full flex justify-end pb-2">
                            <button
                                type="button"
                                onClick={() => setActiveImagePreview(null)}
                                className="p-1.5 text-stone-400 hover:text-white rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <img
                            src={activeImagePreview}
                            alt="Full-size review image"
                            className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
                        />
                    </div>
                </Modal>
            )}
        </ShopLayout>
    );
}
