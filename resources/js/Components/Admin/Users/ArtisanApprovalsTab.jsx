import React, { useState, useEffect, useMemo, useDeferredValue, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { router } from '@inertiajs/react';
import { Phone, MapPin, AlertTriangle, Calendar, FileText, CheckCircle, Eye, XCircle } from 'lucide-react';

import Checkbox from '@/Components/Checkbox';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import CompactPagination from '@/Components/CompactPagination';
import { TableSkeleton } from '@/Components/Skeleton';
import BulkActionPill, { ActionTooltip } from '@/Components/Admin/Layout/BulkActionPill';
import ArtisanVerificationDrawer from '@/Components/Admin/Users/ArtisanVerificationDrawer';
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
                                        const submittedCount = ARTISAN_DOCUMENTS.filter(doc => !!artisan[doc.key]).length;
                                        const isReady = submittedCount > 0 && viewedCount >= submittedCount;
                                        const isSelected = selectedArtisans.includes(artisan.id);
                                        return (
                                            <div
                                                key={artisan.id}
                                                className="grid grid-cols-1 gap-4 px-4 py-4 transition-all duration-200 hover:bg-stone-50/60 sm:px-6 md:grid-cols-12 md:items-center relative group"
                                            >
                                                {/* Hover Accent */}
                                                <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-clay-500 scale-y-0 group-hover:scale-y-100 transition-transform origin-center" />

                                                <div className="col-span-4 flex items-center gap-4">
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onChange={() => toggleArtisanSelection(artisan.id)}
                                                    />
                                                    <div className="flex items-center gap-4 min-w-0">
                                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-clay-100 bg-clay-50/50 text-base font-bold text-clay-700 shadow-sm transition-transform group-hover:scale-105">
                                                            {artisan.avatar ? (
                                                                <img
                                                                    src={artisan.avatar.startsWith('http') ? artisan.avatar : `/storage/${artisan.avatar}`}
                                                                    alt={artisan.name}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                artisan.name?.charAt(0).toUpperCase()
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h3 className="font-bold text-[14px] text-stone-900 leading-tight truncate group-hover:text-clay-800 transition-colors">{artisan.shop_name}</h3>
                                                            <p className="text-stone-500 text-[11px] font-medium truncate mt-0.5">{artisan.name}</p>
                                                            <div className="flex items-center gap-1.5 mt-1">
                                                                <Calendar size={10} className="text-stone-300" />
                                                                <span className="text-[10px] text-stone-400 font-medium">Submitted {artisan.submitted_at}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="col-span-3">
                                                    <div className="flex flex-col gap-1.5">
                                                        <div className="flex items-center gap-2 group/contact">
                                                            <div className="p-1 rounded-md bg-stone-100/50 text-stone-400 group-hover/contact:bg-clay-50 group-hover/contact:text-clay-500 transition-colors">
                                                                <Phone size={10} />
                                                            </div>
                                                            <span className="text-[11px] font-semibold text-stone-600 truncate">{artisan.phone_number}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 group/contact">
                                                            <div className="p-1 rounded-md bg-stone-100/50 text-stone-400 group-hover/contact:bg-clay-50 group-hover/contact:text-clay-500 transition-colors">
                                                                <MapPin size={10} />
                                                            </div>
                                                            <span className="text-[11px] text-stone-500 truncate leading-relaxed">{artisan.address}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="col-span-2">
                                                    <div className="rounded-2xl border border-stone-100 bg-stone-50/40 p-2.5 transition-colors group-hover:bg-white group-hover:border-stone-200">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-[9px] font-black uppercase tracking-[0.1em] text-stone-400">Progress</span>
                                                            <span className={`text-[10px] font-black ${isReady ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                                {viewedCount} <span className="text-stone-300">/</span> {submittedCount}
                                                            </span>
                                                        </div>
                                                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-200/50 ring-1 ring-inset ring-black/5">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{
                                                                    width: `${submittedCount > 0 ? Math.min(100, (viewedCount / submittedCount) * 100) : 0}%`
                                                                }}
                                                                className={`h-full rounded-full transition-all duration-700 ${isReady ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'bg-amber-400'}`}
                                                            />
                                                        </div>
                                                        <p className={`mt-2 text-[9px] font-bold leading-tight ${isReady ? 'text-emerald-600' : 'text-stone-400'}`}>
                                                            {isReady ? 'Ready for approval' : 'Preview all submitted files first'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="col-span-2 flex flex-col items-start md:items-center gap-1">
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-50/50 border border-amber-200/30 px-2 py-0.5 rounded-full">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Pending
                                                    </span>
                                                    {Object.values(artisan.document_flags || {}).some(flags => flags.length > 0) && (
                                                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 border border-rose-200/30 px-2 py-0.5 rounded-full mt-1">
                                                            <AlertTriangle size={9} /> Flagged
                                                        </span>
                                                    )}
                                                    {isReady && (
                                                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50/50 border border-emerald-200/30 px-2 py-0.5 rounded-full">
                                                            <CheckCircle size={9} /> Verified
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="col-span-1 flex justify-start md:justify-end">
                                                    <button
                                                        onClick={() => openReviewModal(artisan)}
                                                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 text-[11px] font-bold text-stone-700 shadow-sm transition-all hover:border-clay-300 hover:bg-stone-50 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 min-h-[44px]"
                                                    >
                                                        <Eye size={13} className="text-clay-500" />
                                                        <span>Review</span>
                                                    </button>
                                                </div>
                                            </div>
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
                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-600 active:scale-90 min-h-[44px]"
                    >
                        <CheckCircle size={20} />
                    </button>
                </ActionTooltip>

                <ActionTooltip text="Reject Selected">
                    <button
                        onClick={() => {
                            if (selectedArtisans.length > 0) {
                                setRejectingArtisan(localArtisans.find(a => a.id === selectedArtisans[0]));
                            }
                        }}
                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500 text-white shadow-lg shadow-rose-500/20 transition-all hover:bg-rose-600 active:scale-90 min-h-[44px]"
                    >
                        <XCircle size={20} />
                    </button>
                </ActionTooltip>
            </BulkActionPill>
        </div>
    );
}
