import React, { useMemo, useState, useEffect } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import ReadOnlyCapabilityNotice from '@/Components/Seller/Shared/ReadOnlyCapabilityNotice';
import { ShieldAlert, AlertTriangle } from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import useFlashToast from '@/hooks/useFlashToast';
import useSellerModuleAccess from '@/hooks/useSellerModuleAccess';
import SellerHeader from '@/Layouts/SellerHeader';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';

// Subcomponents & Helpers
import ReviewDisputeModal from '@/Components/Seller/Chat/ReviewDisputeModal';
import ConfirmationModal from '@/Components/ConfirmationModal';
import ProductDirectorySidebar from '@/Components/Seller/Chat/ProductDirectorySidebar';
import ProductReviewFeedPane from '@/Components/Seller/Chat/ProductReviewFeedPane';

export default function Reviews({ auth, reviews = [], products = [], stats = {}, flash }) {
    const { addToast } = useToast();
    const { canEdit: canEditReviews, isReadOnly: isReviewsReadOnly } = useSellerModuleAccess('reviews');
    const { openSidebar } = useSellerWorkspaceShell();

    const currentUrl = usePage().url;
    const initialProduct = useMemo(() => {
        const params = new URLSearchParams(currentUrl.includes('?') ? currentUrl.substring(currentUrl.indexOf('?')) : '');
        const p = params.get('product');
        if (!p || p === 'all') return 'all';
        return parseInt(p, 10);
    }, [currentUrl]);

    const [selectedProductId, setSelectedProductId] = useState(initialProduct);
    const [mobilePane, setMobilePane] = useState(() => (initialProduct !== 'all' ? 'feed' : 'directory'));

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

    // Sync state on browser back/forward
    useEffect(() => {
        const params = new URLSearchParams(currentUrl.includes('?') ? currentUrl.substring(currentUrl.indexOf('?')) : '');
        const p = params.get('product');
        const parsed = !p || p === 'all' ? 'all' : parseInt(p, 10);
        setSelectedProductId(parsed);
        if (parsed !== 'all') {
            setMobilePane('feed');
        }
    }, [currentUrl]);

    useFlashToast(flash, addToast);

    const QUICK_REPLIES = [
        "Thank you for your purchase and your kind words! We truly appreciate your support and hope to serve you again.",
        "We are thrilled to hear that you are satisfied with your order! Please don't hesitate to reach out if you need anything else.",
        "Thank you for sharing your feedback. We are always striving to improve and your input is incredibly valuable to us."
    ];

    const handleSelectProduct = (productId) => {
        setSelectedProductId(productId);
        setMobilePane('feed');
        router.get(route('reviews.index'), { product: productId }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handleBackToDirectory = () => {
        setMobilePane('directory');
    };

    const selectedProduct = useMemo(() => {
        if (!selectedProductId || selectedProductId === 'all') return null;
        return products.find(p => String(p.id) === String(selectedProductId)) || null;
    }, [products, selectedProductId]);

    const scopedReviews = useMemo(() => {
        if (!selectedProduct) return reviews;
        return reviews.filter(r => String(r.product_id) === String(selectedProduct.id));
    }, [reviews, selectedProduct]);

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
                const flashData = page?.props?.flash ?? {};

                if (flashData?.success) {
                    setDisputeModal({ open: false, review: null, mode: 'create' });
                    setDisputeReason('Misleading review');
                    setDisputeDetails('');
                    setDisputeErrors({});
                    setDisputeFeedback('');
                    return;
                }

                if (flashData?.error) {
                    setDisputeFeedback(flashData.error);
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
            <Head title={selectedProduct ? `Reviews: ${selectedProduct.name}` : "Customer Ratings & Reviews"} />

            <SellerHeader 
                title="Customer Ratings"
                subtitle="Review store and item feedback, reply to buyers, and curate reviews."
                auth={auth}
                onMenuClick={openSidebar}
            />

            <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {isReviewsReadOnly && (
                    <ReadOnlyCapabilityNotice label="Reviews are read only for your account. Reply, pin, and moderation actions are disabled." />
                )}

                {/* Master-Detail Split View Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                    {/* Left Pane: Product Directory (hidden on mobile when viewing review feed) */}
                    <div className={`md:col-span-5 lg:col-span-4 ${mobilePane === 'feed' ? 'hidden md:block' : 'block'}`}>
                        <ProductDirectorySidebar
                            products={products}
                            selectedProductId={selectedProductId}
                            onSelectProduct={handleSelectProduct}
                            overallStats={stats}
                        />
                    </div>

                    {/* Right Pane: Review Feed (hidden on mobile when viewing directory) */}
                    <div className={`md:col-span-7 lg:col-span-8 ${mobilePane === 'directory' ? 'hidden md:block' : 'block'}`}>
                        <ProductReviewFeedPane
                            selectedProduct={selectedProduct}
                            overallStats={stats}
                            reviews={scopedReviews}
                            onBackToDirectory={handleBackToDirectory}
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
                    </div>
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
                title="Withdraw moderation request?"
                message="This will withdraw the open review moderation request so it no longer appears in the admin queue."
                icon={ShieldAlert}
                iconBg="bg-rose-100 text-rose-600"
                confirmText="Withdraw Request"
                confirmColor="bg-rose-600 hover:bg-rose-700"
                processing={false}
                isHighRisk={true}
            />

            {/* Delete reply confirmation modal */}
            <ConfirmationModal
                isOpen={confirmingDelete !== null}
                onClose={() => setConfirmingDelete(null)}
                onConfirm={deleteReply}
                title="Remove Reply?"
                message="Are you sure you want to clear your reply to this customer review?"
                icon={AlertTriangle}
                iconBg="bg-rose-100 text-rose-600"
                confirmText="Remove Reply"
                confirmColor="bg-rose-600 hover:bg-rose-700"
                processing={false}
            />
        </>
    );
}

Reviews.layout = page => <SellerWorkspaceLayout active="reviews">{page}</SellerWorkspaceLayout>;
