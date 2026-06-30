import React, { useMemo, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import CompactPagination from '@/Components/CompactPagination';
import ReadOnlyCapabilityNotice from '@/Components/Seller/Shared/ReadOnlyCapabilityNotice';
import { ShieldAlert, AlertTriangle, MessageSquare, X, Search } from 'lucide-react';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import { useToast } from '@/Components/ToastContext';
import useFlashToast from '@/hooks/useFlashToast';
import useSellerModuleAccess from '@/hooks/useSellerModuleAccess';
import SellerHeader from '@/Layouts/SellerHeader';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';

// Subcomponents & Helpers
import ReviewsMetrics from '@/Components/Seller/Chat/ReviewsMetrics';
import ReviewListItem from '@/Components/Seller/Chat/ReviewListItem';
import ReviewDisputeModal from '@/Components/Seller/Chat/ReviewDisputeModal';
import ConfirmationModal from '@/Components/ConfirmationModal';

export default function Reviews({ auth, reviews, stats, flash }) {
    const { addToast } = useToast();
    const { canEdit: canEditReviews, isReadOnly: isReviewsReadOnly } = useSellerModuleAccess('reviews');
    const { filters = {} } = usePage().props;
    const { openSidebar } = useSellerWorkspaceShell();
    const [filter, setFilter] = useState('All');
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [replyingTo, setReplyingTo] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [confirmingDelete, setConfirmingDelete] = useState(null);
    const [disputeModal, setDisputeModal] = useState({ open: false, review: null, mode: 'create' });
    const [disputeReason, setDisputeReason] = useState('Misleading review');
    const [disputeDetails, setDisputeDetails] = useState('');
    const [disputeErrors, setDisputeErrors] = useState({});
    const [disputeFeedback, setDisputeFeedback] = useState('');
    const [submittingDispute, setSubmittingDispute] = useState(false);
    const [confirmingDisputeRemoval, setConfirmingDisputeRemoval] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);

    // Sync search from URL (for Global Search support)
    React.useEffect(() => {
        if (filters.search && filters.search !== searchTerm) {
            setSearchTerm(filters.search);
        }
    }, [filters.search]);

    useFlashToast(flash, addToast);

    const QUICK_REPLIES = [
        "Thank you for your purchase and your kind words! We truly appreciate your support and hope to serve you again.",
        "We are thrilled to hear that you are satisfied with your order! Please don't hesitate to reach out if you need anything else.",
        "Thank you for sharing your feedback. We are always striving to improve and your input is incredibly valuable to us."
    ];

    const filteredReviews = reviews.filter((review) => {
        const matchesFilter = filter === 'All'
            ? true
            : filter === 'Hidden'
                ? review.is_hidden_from_marketplace
                : review.rating === parseInt(filter);

        if (!matchesFilter) return false;

        if (!searchTerm.trim()) return true;

        const search = searchTerm.toLowerCase();
        return (
            review.customer?.toLowerCase().includes(search) ||
            review.comment?.toLowerCase().includes(search) ||
            review.product_name?.toLowerCase().includes(search)
        );
    });

    // Sort: pinned first, then by date (already sorted by latest from backend)
    const sortedReviews = [...filteredReviews].sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return 0;
    });

    const itemsPerPage = 10;
    const totalPages = Math.max(1, Math.ceil(sortedReviews.length / itemsPerPage));
    const paginatedReviews = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedReviews.slice(startIndex, startIndex + itemsPerPage);
    }, [currentPage, sortedReviews]);

    React.useEffect(() => {
        setCurrentPage(1);
    }, [filter]);

    React.useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const openReply = (reviewId) => {
        setReplyingTo(reviewId);
        setReplyText('');
        setTimeout(() => {
            const formElement = document.getElementById(`reply-form-${reviewId}`);
            if (formElement) {
                formElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 50);
    };

    const openEditReply = (reviewId, text) => {
        setReplyingTo(reviewId);
        setReplyText(text);
        setTimeout(() => {
            const formElement = document.getElementById(`reply-form-${reviewId}`);
            if (formElement) {
                formElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 50);
    };

    const submitReply = (reviewId) => {
        if (!canEditReviews) return;
        if (!replyText.trim()) return;
        router.post(route('reviews.reply', reviewId), { seller_reply: replyText }, {
            preserveScroll: true,
            onSuccess: () => {
                setReplyingTo(null);
                setReplyText('');
            }
        });
    };

    const togglePin = (reviewId) => {
        if (!canEditReviews) return;
        router.post(route('reviews.toggle-pin', reviewId), {}, { preserveScroll: true });
    };

    const handleQuickReply = (reviewId, text) => {
        if (!canEditReviews) return;
        router.post(route('reviews.reply', reviewId), { seller_reply: text }, {
            preserveScroll: true,
        });
    };

    const deleteReply = () => {
        if (!canEditReviews) return;
        if (confirmingDelete) {
            router.delete(route('reviews.destroy-reply', confirmingDelete), {
                preserveScroll: true,
                onSuccess: () => setConfirmingDelete(null),
            });
        }
    };

    const openDisputeModal = (review, mode = 'create') => {
        setDisputeModal({ open: true, review, mode });
        setDisputeReason(mode === 'edit' ? (review.dispute?.reason || 'Misleading review') : 'Misleading review');
        setDisputeDetails(mode === 'edit' ? (review.dispute?.details || '') : '');
        setDisputeErrors({});
        setDisputeFeedback('');
    };

    const submitDispute = () => {
        if (!canEditReviews || !disputeModal.review || submittingDispute) return;

        setSubmittingDispute(true);
        setDisputeErrors({});
        setDisputeFeedback('');

        const endpoint = disputeModal.mode === 'edit'
            ? route('review-disputes.update', disputeModal.review.dispute.id)
            : route('reviews.dispute', disputeModal.review.id);
        const method = disputeModal.mode === 'edit' ? 'patch' : 'post';

        router[method](endpoint, {
            reason: disputeReason,
            details: disputeDetails,
        }, {
            preserveScroll: true,
            onError: (errors) => {
                setDisputeErrors(errors);
                setDisputeFeedback(errors.reason || errors.details || errors.review || 'We could not submit that moderation request yet.');
            },
            onSuccess: (page) => {
                const flash = page?.props?.flash ?? {};

                if (flash?.success) {
                    setDisputeModal({ open: false, review: null, mode: 'create' });
                    setDisputeReason('Misleading review');
                    setDisputeDetails('');
                    setDisputeErrors({});
                    setDisputeFeedback('');
                    return;
                }

                if (flash?.error) {
                    setDisputeFeedback(flash.error);
                }
            },
            onFinish: () => setSubmittingDispute(false),
        });
    };

    const removeDispute = () => {
        if (!canEditReviews || !confirmingDisputeRemoval) return;

        router.delete(route('review-disputes.destroy', confirmingDisputeRemoval.id), {
            preserveScroll: true,
            onSuccess: () => setConfirmingDisputeRemoval(null),
        });
    };

    return (
        <>
            <Head title="Shop Reviews" />

            <SellerHeader 
                title="Customer Ratings"
                subtitle="Manage customer reviews and feedback."
                auth={auth}
                onMenuClick={openSidebar}
            />

                <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                    {isReviewsReadOnly && (
                        <ReadOnlyCapabilityNotice label="Reviews are read only for your account. Reply, pin, and moderation actions are disabled." />
                    )}

                    {/* Stats Overview */}
                    <ReviewsMetrics stats={stats} filter={filter} setFilter={setFilter} />

                    {/* Reviews List */}
                    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 mt-4 relative z-10">
                        <div className="p-5 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex-1 max-w-sm">
                                <h3 className="text-base font-bold text-stone-900">Recent Customer Reviews</h3>
                                <div className="mt-2 relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                                    <input 
                                        type="text" 
                                        placeholder="Search reviews..." 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-10 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:ring-clay-500 focus:border-clay-500 transition-all"
                                    />
                                    {searchTerm && (
                                        <button 
                                            onClick={() => setSearchTerm('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex bg-stone-100 p-1 rounded-lg overflow-x-auto no-scrollbar flex-nowrap">
                                {['All', 'Hidden', '5', '4', '3', '2', '1'].map((option) => (
                                    <button
                                        key={option}
                                        onClick={() => setFilter(option)}
                                        className={`px-4 py-1.5 whitespace-nowrap rounded-md text-xs font-bold transition-all ${filter === option
                                            ? 'bg-white text-clay-900 shadow-sm'
                                            : 'text-stone-500 hover:text-stone-700'
                                            }`}
                                    >
                                        {option === 'All' ? 'All Reviews' : option === 'Hidden' ? 'Hidden' : `${option} Star`}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col divide-y divide-stone-50 md:grid md:grid-cols-2 md:gap-4 md:divide-y-0 md:p-4 lg:block lg:divide-y lg:divide-stone-50 lg:p-0">
                            {paginatedReviews.length > 0 ? (
                                paginatedReviews.map((review, index) => (
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
                                        onCancelReply={() => { setReplyingTo(null); setReplyText(''); }}
                                        onSubmitReply={submitReply}
                                        onTogglePin={togglePin}
                                        onQuickReply={handleQuickReply}
                                        onOpenDispute={openDisputeModal}
                                        onConfirmDeleteDispute={(dispute) => setConfirmingDisputeRemoval(dispute)}
                                        onConfirmDeleteReply={(reviewId) => setConfirmingDelete(reviewId)}
                                        quickReplies={QUICK_REPLIES}
                                    />
                                ))
                            ) : (
                                <WorkspaceEmptyState
                                    icon={MessageSquare}
                                    title="No reviews found"
                                    description="There are no reviews matching your current filter."
                                    compact={true}
                                />
                            )}
                        </div>

                        {totalPages > 1 && (
                            <CompactPagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                totalItems={sortedReviews.length}
                                itemsPerPage={itemsPerPage}
                                itemLabel="reviews"
                                onPageChange={setCurrentPage}
                            />
                        )}
                    </div>
                </main>

            {/* Request Review Moderation Modal */}
            <ReviewDisputeModal
                isOpen={disputeModal.open}
                review={disputeModal.review}
                mode={disputeModal.mode}
                disputeReason={disputeReason}
                setDisputeReason={setDisputeReason}
                disputeDetails={disputeDetails}
                setDisputeDetails={setDisputeDetails}
                disputeFeedback={disputeFeedback}
                disputeErrors={disputeErrors}
                submitting={submittingDispute}
                onClose={() => {
                    setDisputeModal({ open: false, review: null, mode: 'create' });
                    setDisputeErrors({});
                    setDisputeFeedback('');
                    setSubmittingDispute(false);
                }}
                onConfirm={submitDispute}
                canEditReviews={canEditReviews}
            />

            {/* Delete dispute request confirmation modal */}
            <ConfirmationModal
                isOpen={confirmingDisputeRemoval !== null}
                onClose={() => setConfirmingDisputeRemoval(null)}
                onConfirm={removeDispute}
                title="Remove moderation request?"
                message="This will withdraw the open review moderation request so it no longer appears in the admin queue."
                icon={ShieldAlert}
                iconBg="bg-rose-100 text-rose-600"
                confirmText="Remove Request"
                confirmColor="bg-rose-600 hover:bg-rose-700"
                processing={false}
                isHighRisk={true}
            />

            {/* Delete reply confirmation modal */}
            <ConfirmationModal
                isOpen={confirmingDelete !== null}
                onClose={() => setConfirmingDelete(null)}
                onConfirm={deleteReply}
                title="Delete Reply?"
                message="Are you sure you want to delete your reply? This action cannot be undone."
                icon={AlertTriangle}
                iconBg="bg-rose-100 text-rose-600"
                confirmText="Delete"
                confirmColor="bg-rose-600 hover:bg-rose-700"
                processing={false}
            />
        </>
    );
}

Reviews.layout = page => <SellerWorkspaceLayout active="reviews">{page}</SellerWorkspaceLayout>;
