import React, { useState, useEffect, useMemo, useDeferredValue, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { router } from '@inertiajs/react';
import { FileText, CheckCircle } from 'lucide-react';

import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import CompactPagination from '@/Components/CompactPagination';
import { TableSkeleton } from '@/Components/Skeleton';
import ArtisanVerificationDrawer from '@/Components/Admin/Users/ArtisanVerificationDrawer';
import ArtisanApprovalRow from '@/Components/Admin/Users/Partials/ArtisanApprovalRow';
import FilterToolbarHeader from '@/Components/Seller/Shared/FilterToolbarHeader';
import {
    ARTISAN_DOCUMENTS,
    buildViewedDocumentMap
} from '@/utils/userManagerHelpers';

const ITEMS_PER_PAGE = 5;

export default function ArtisanApprovalsTab({ artisans, addToast }) {
    const [localArtisans, setLocalArtisans] = useState(artisans);
    const [searchQuery, setSearchQuery] = useState('');
    const [reviewFilter, setReviewFilter] = useState('all');
    const [viewingArtisan, setViewingArtisan] = useState(null);
    const [viewingDoc, setViewingDoc] = useState(null);
    const [rejectingArtisan, setRejectingArtisan] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [processing, setProcessing] = useState(false);
    const [approvalError, setApprovalError] = useState('');
    const [viewedDocumentsByArtisan, setViewedDocumentsByArtisan] = useState(() => buildViewedDocumentMap(artisans));
    const [documentPreviewingKey, setDocumentPreviewingKey] = useState(null);

    const deferredSearchQuery = useDeferredValue(searchQuery);
    const pendingOperations = useRef({});

    useEffect(() => {
        setLocalArtisans(artisans);
    }, [artisans]);

    useEffect(() => {
        setViewedDocumentsByArtisan(buildViewedDocumentMap(artisans));
    }, [artisans]);

    const getArtisanDocuments = (artisan) =>
        ARTISAN_DOCUMENTS.map((document) => ({
            ...document,
            url: artisan?.[document.key] ?? null,
            viewed: (viewedDocumentsByArtisan[artisan?.id] ?? []).includes(document.key),
            flags: artisan?.document_flags?.[document.key] ?? [],
        }));

    const openReviewModal = (artisan) => {
        setViewingArtisan(artisan);
        setViewingDoc(null);
        setApprovalError('');
    };

    const openDocumentPreview = (doc) => {
        if (!viewingArtisan || !doc.url) return;

        setViewingDoc(doc);
        setApprovalError('');
        setDocumentPreviewingKey(doc.key);

        window.axios
            .post(route('admin.artisan.documents.viewed', viewingArtisan.id), {
                document: doc.key,
            })
            .then(({ data }) => {
                const viewedDocumentKeys = data?.viewed_document_keys || data?.viewed || [];
                setViewedDocumentsByArtisan((previous) => ({
                    ...previous,
                    [viewingArtisan.id]: viewedDocumentKeys,
                }));
            })
            .catch((error) => {
                const message = error?.response?.data?.message || 'Document preview opened, but review progress could not be saved.';
                setApprovalError(message);
                addToast(message, 'error');
            })
            .finally(() => {
                setDocumentPreviewingKey(null);
            });
    };

    const currentDocuments = useMemo(
        () => (viewingArtisan ? getArtisanDocuments(viewingArtisan) : []),
        [viewingArtisan, viewedDocumentsByArtisan]
    );

    const filteredArtisans = useMemo(() => {
        const query = deferredSearchQuery.trim().toLowerCase();
        return localArtisans.filter((artisan) => {
            if (reviewFilter === 'ready' && !artisan.documents_ready_for_approval) {
                const viewed = viewedDocumentsByArtisan[artisan.id] ?? [];
                const submittedCount = ARTISAN_DOCUMENTS.filter(doc => !!artisan[doc.key]).length;
                if (submittedCount === 0 || viewed.length < submittedCount) return false;
            }
            if (reviewFilter === 'needs_preview') {
                const viewed = viewedDocumentsByArtisan[artisan.id] ?? [];
                const submittedCount = ARTISAN_DOCUMENTS.filter(doc => !!artisan[doc.key]).length;
                if (submittedCount > 0 && viewed.length >= submittedCount) return false;
            }
            if (!query) return true;

            return [
                artisan.shop_name,
                artisan.name,
                artisan.phone_number,
                artisan.address,
            ].some((value) => String(value || '').toLowerCase().includes(query));
        });
    }, [localArtisans, deferredSearchQuery, reviewFilter, viewedDocumentsByArtisan]);

    const [currentPage, setCurrentPage] = useState(1);
    const totalPages = Math.max(1, Math.ceil(filteredArtisans.length / ITEMS_PER_PAGE));
    const paginatedArtisans = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredArtisans.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredArtisans, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [deferredSearchQuery, reviewFilter]);

    const viewedDocumentsCount = viewingArtisan ? (viewedDocumentsByArtisan[viewingArtisan.id] ?? []).length : 0;
    const submittedDocumentsCount = viewingArtisan?.submitted_document_count ?? currentDocuments.filter((doc) => !!doc.url).length;
    const allSubmittedDocumentsViewed = submittedDocumentsCount > 0 && viewedDocumentsCount >= submittedDocumentsCount;

    const readyCount = useMemo(() => {
        return localArtisans.filter((artisan) => {
            if (artisan.documents_ready_for_approval) return true;
            const viewed = viewedDocumentsByArtisan[artisan.id] ?? [];
            const submittedCount = ARTISAN_DOCUMENTS.filter(doc => !!artisan[doc.key]).length;
            return submittedCount > 0 && viewed.length >= submittedCount;
        }).length;
    }, [localArtisans, viewedDocumentsByArtisan]);

    const needsPreviewCount = useMemo(() => {
        return localArtisans.filter((artisan) => {
            if (artisan.documents_ready_for_approval) return false;
            const viewed = viewedDocumentsByArtisan[artisan.id] ?? [];
            const submittedCount = ARTISAN_DOCUMENTS.filter(doc => !!artisan[doc.key]).length;
            return submittedCount === 0 || viewed.length < submittedCount;
        }).length;
    }, [localArtisans, viewedDocumentsByArtisan]);

    const tabs = useMemo(() => [
        { key: 'all', label: 'All Queue', count: localArtisans.length },
        { key: 'ready', label: 'Ready to Approve', count: readyCount },
        { key: 'needs_preview', label: 'Needs Preview', count: needsPreviewCount },
    ], [localArtisans.length, readyCount, needsPreviewCount]);

    const confirmApprove = () => {
        if (!viewingArtisan) return;

        const artisanToApprove = viewingArtisan;
        const originalArtisans = [...localArtisans];

        setLocalArtisans(prev => prev.filter(a => a.id !== artisanToApprove.id));
        setViewingArtisan(null);
        setViewingDoc(null);

        router.post(route('admin.artisan.approve', artisanToApprove.id), {}, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                addToast(`${artisanToApprove.shop_name} has been approved.`, 'success');
            },
            onError: (errors) => {
                setLocalArtisans(originalArtisans);
                addToast(errors.documents ?? 'Approval failed. Reverting changes...', 'error');
            }
        });
    };

    const handleRejectArtisan = () => {
        if (!rejectingArtisan || rejectReason.length < 10) return;

        setProcessing(true);
        router.post(route('admin.artisan.reject', rejectingArtisan.id), { reason: rejectReason }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setViewingDoc(null);
                setViewingArtisan(null);
                setRejectingArtisan(null);
                setRejectReason('');
                addToast('Artisan application has been rejected.', 'success');
            },
            onFinish: () => {
                setProcessing(false);
            },
            onError: (errors) => {
                addToast(errors.reason ?? 'Rejection failed. Please review the form and try again.', 'error');
            },
        });
    };

    return (
        <div className="space-y-4">
            {/* Standardized FilterToolbarHeader */}
            <FilterToolbarHeader
                tabs={tabs}
                activeTab={reviewFilter}
                onTabChange={setReviewFilter}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search shop, owner name, phone, or region..."
                onResetFilters={() => {
                    setReviewFilter('all');
                    setSearchQuery('');
                }}
            />

            <div className="space-y-4">
                {localArtisans.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-stone-200/80 p-8 sm:p-12 shadow-2xs">
                        <WorkspaceEmptyState
                            icon={CheckCircle}
                            title="Queue is Empty"
                            description="There are no pending artisan applications at the moment."
                        />
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-2xs">
                        {/* Header Row */}
                        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-[#FDFBF9] border-b border-stone-200/80 text-[10px] font-extrabold uppercase tracking-wider text-stone-500">
                            <div className="col-span-4">
                                <span>Artisan Shop</span>
                            </div>
                            <div className="col-span-3">Contact & Location</div>
                            <div className="col-span-2">Review Progress</div>
                            <div className="col-span-2 text-center">Status</div>
                            <div className="col-span-1 text-right">Action</div>
                        </div>

                        <div className="divide-y divide-stone-100">
                            {searchQuery !== deferredSearchQuery ? (
                                <TableSkeleton rows={ITEMS_PER_PAGE} />
                            ) : filteredArtisans.length === 0 ? (
                                <div className="px-6 py-10">
                                    <WorkspaceEmptyState
                                        compact
                                        icon={FileText}
                                        title="No matching applications"
                                        description="Try another search or switch the queue filter."
                                    />
                                </div>
                            ) : (
                                <AnimatePresence initial={false}>
                                    {paginatedArtisans.map((artisan) => {
                                        const viewedCount = (viewedDocumentsByArtisan[artisan.id] ?? []).length;
                                        return (
                                            <ArtisanApprovalRow
                                                key={artisan.id}
                                                artisan={artisan}
                                                viewedCount={viewedCount}
                                                openReviewModal={openReviewModal}
                                            />
                                        );
                                    })}
                                </AnimatePresence>
                            )}
                        </div>

                        {totalPages > 1 && (
                            <CompactPagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                totalItems={filteredArtisans.length}
                                itemsPerPage={ITEMS_PER_PAGE}
                                onPageChange={setCurrentPage}
                                itemLabel="applications"
                            />
                        )}
                    </div>
                )}
            </div>

            {/* Artisan Onboarding Review Drawer */}
            <ArtisanVerificationDrawer
                viewingArtisan={viewingArtisan}
                onClose={() => setViewingArtisan(null)}
                currentDocuments={currentDocuments}
                viewedDocumentsCount={viewedDocumentsCount}
                submittedDocumentsCount={submittedDocumentsCount}
                allSubmittedDocumentsViewed={allSubmittedDocumentsViewed}
                confirmApprove={confirmApprove}
                processing={processing}
                approvalError={approvalError}
                documentPreviewingKey={documentPreviewingKey}
                openDocumentPreview={openDocumentPreview}
                viewingDoc={viewingDoc}
                setViewingDoc={setViewingDoc}
                rejectingArtisan={rejectingArtisan}
                setRejectingArtisan={setRejectingArtisan}
                rejectReason={rejectReason}
                setRejectReason={setRejectReason}
                handleRejectArtisan={handleRejectArtisan}
            />
        </div>
    );
}
