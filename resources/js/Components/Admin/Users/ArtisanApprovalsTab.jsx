import React, { useState, useEffect, useMemo, useDeferredValue, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { router } from '@inertiajs/react';
import { FileText, CheckCircle, XCircle } from 'lucide-react';

import Checkbox from '@/Components/Checkbox';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import CompactPagination from '@/Components/CompactPagination';
import { TableSkeleton } from '@/Components/Skeleton';
import BulkActionPill, { ActionTooltip } from '@/Components/Admin/Layout/BulkActionPill';
import ArtisanVerificationDrawer from '@/Components/Admin/Users/ArtisanVerificationDrawer';
import ArtisanApprovalRow from '@/Components/Admin/Users/Partials/ArtisanApprovalRow';
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
    const [selectedArtisans, setSelectedArtisans] = useState([]);

    const deferredSearchQuery = useDeferredValue(searchQuery);
    const pendingOperations = useRef({});

    useEffect(() => {
        setLocalArtisans(artisans);
    }, [artisans]);

    useEffect(() => {
        setViewedDocumentsByArtisan(buildViewedDocumentMap(artisans));
    }, [artisans]);

    const toggleArtisanSelection = (id) => {
        setSelectedArtisans(prev =>
            prev.includes(id) ? prev.filter(aId => aId !== id) : [...prev, id]
        );
    };

    const toggleAllCurrentPage = () => {
        const pageIds = paginatedArtisans.map(a => a.id);
        const allSelected = pageIds.every(id => selectedArtisans.includes(id));
        if (allSelected) {
            setSelectedArtisans(prev => prev.filter(id => !pageIds.includes(id)));
        } else {
            setSelectedArtisans(prev => [...new Set([...prev, ...pageIds])]);
        }
    };

    const clearSelection = () => setSelectedArtisans([]);

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

    const bulkApprove = () => {
        if (selectedArtisans.length === 0) return;

        const idsToApprove = [...selectedArtisans];
        const originalArtisans = [...localArtisans];
        const prevSelected = [...selectedArtisans];

        try {
            const timerId = setTimeout(() => {
                router.post(route('admin.artisan.bulk-approve'), { ids: idsToApprove }, {
                    onSuccess: () => addToast(`Batch of ${idsToApprove.length} approved.`, 'success'),
                    onError: () => {
                        setLocalArtisans(originalArtisans);
                        addToast('Bulk approval failed. Reverting...', 'error');
                    }
                });
                delete pendingOperations.current[timerId];
            }, 5000);

            pendingOperations.current[timerId] = {
                restore: () => {
                    clearTimeout(timerId);
                    setLocalArtisans(originalArtisans);
                    setSelectedArtisans(prevSelected);
                }
            };

            addToast(`Approving ${idsToApprove.length} applications...`, 'info', 5000, () => {
                if (pendingOperations.current[timerId]) {
                    pendingOperations.current[timerId].restore();
                    delete pendingOperations.current[timerId];
                }
            });

            setLocalArtisans(prev => prev.filter(a => !idsToApprove.includes(a.id)));
            setSelectedArtisans([]);
        } catch (e) {
            console.error("Undo System Error: Bulk operation aborted.", e);
            setLocalArtisans(originalArtisans);
        }
    };

    useEffect(() => {
        return () => {
            Object.values(pendingOperations.current).forEach(op => op.restore());
        };
    }, []);

    return (
        <div className="space-y-6">
            {/* Approvals tab filters and search bar */}
            <div className="flex flex-col gap-3 border-b border-stone-100 bg-[#FDFBF9] px-4 py-3 sm:px-6 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-stone-200">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 flex-nowrap no-scrollbar">
                    <button
                        type="button"
                        onClick={() => setReviewFilter('all')}
                        className={`whitespace-nowrap rounded-full border px-4 py-2 text-[11px] font-bold transition-colors min-h-[44px] flex items-center justify-center ${
                            reviewFilter === 'all'
                                ? 'border-clay-200 bg-clay-50 text-clay-700'
                                : 'border-stone-200 bg-white text-stone-500 hover:bg-stone-50'
                        }`}
                    >
                        All queue
                    </button>
                    <button
                        type="button"
                        onClick={() => setReviewFilter('ready')}
                        className={`whitespace-nowrap rounded-full border px-4 py-2 text-[11px] font-bold transition-colors min-h-[44px] flex items-center justify-center ${
                            reviewFilter === 'ready'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-stone-200 bg-white text-stone-500 hover:bg-stone-50'
                        }`}
                    >
                        Ready to approve
                    </button>
                    <button
                        type="button"
                        onClick={() => setReviewFilter('needs_preview')}
                        className={`whitespace-nowrap rounded-full border px-4 py-2 text-[11px] font-bold transition-colors min-h-[44px] flex items-center justify-center ${
                            reviewFilter === 'needs_preview'
                                ? 'border-amber-200 bg-amber-50 text-amber-700'
                                : 'border-stone-200 bg-white text-stone-500 hover:bg-stone-50'
                        }`}
                    >
                        Needs preview
                    </button>
                </div>
                <div className="relative w-full sm:w-72">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search shop, owner name, phone, or region..."
                        className="w-full rounded-full border border-stone-200 bg-white py-3 pl-3 pr-10 text-sm font-medium text-stone-900 placeholder-stone-400 transition-all focus:border-clay-300 focus:ring-2 focus:ring-clay-500/20 min-h-[44px]"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-stone-400 transition-colors hover:text-stone-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
                            aria-label="Clear artisan search"
                        >
                            <XCircle size={16} />
                        </button>
                    )}
                </div>
            </div>

            <div className="mt-6 space-y-6">
                {localArtisans.length === 0 ? (
                    <WorkspaceEmptyState
                        icon={CheckCircle}
                        title="Queue is Empty"
                        description="There are no pending artisan applications at the moment."
                    />
                ) : (
                    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
                        {/* Header Row */}
                        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-2.5 bg-stone-50 border-b border-stone-100/80 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                            <div className="col-span-4 flex items-center gap-4">
                                <Checkbox
                                    checked={paginatedArtisans.length > 0 && paginatedArtisans.every(a => selectedArtisans.includes(a.id))}
                                    onChange={toggleAllCurrentPage}
                                />
                                <span>Artisan Shop</span>
                            </div>
                            <div className="col-span-3">Contact & Location</div>
                            <div className="col-span-2">Review Progress</div>
                            <div className="col-span-2 text-center">Status</div>
                            <div className="col-span-1 text-right">Action</div>
                        </div>

                        <div className="divide-y divide-stone-100/80">
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
                                        const isSelected = selectedArtisans.includes(artisan.id);
                                        return (
                                            <ArtisanApprovalRow
                                                key={artisan.id}
                                                artisan={artisan}
                                                isSelected={isSelected}
                                                toggleArtisanSelection={toggleArtisanSelection}
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

            {/* Bulk Actions Bar */}
            <BulkActionPill selectedCount={selectedArtisans.length} onClear={clearSelection}>
                <ActionTooltip text="Approve Selected">
                    <button
                        onClick={bulkApprove}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50/40 text-emerald-600 hover:bg-emerald-100/60 hover:text-emerald-700 transition-all duration-205 active:scale-90 shadow-sm"
                    >
                        <CheckCircle size={18} />
                    </button>
                </ActionTooltip>

                <ActionTooltip text="Reject Selected">
                    <button
                        onClick={() => {
                            if (selectedArtisans.length > 0) {
                                setRejectingArtisan(localArtisans.find(a => a.id === selectedArtisans[0]));
                            }
                        }}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-rose-100 bg-rose-50/40 text-rose-600 hover:bg-rose-100/60 hover:text-rose-700 transition-all duration-205 active:scale-90 shadow-sm"
                    >
                        <XCircle size={18} />
                    </button>
                </ActionTooltip>
            </BulkActionPill>
        </div>
    );
}
