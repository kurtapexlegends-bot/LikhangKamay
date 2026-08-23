import React, { useState, useEffect, useMemo, useDeferredValue, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { router } from '@inertiajs/react';
import { FileText, CheckCircle, ChevronDown } from 'lucide-react';

import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import CompactPagination from '@/Components/CompactPagination';
import { TableSkeleton } from '@/Components/Skeleton';
import ArtisanVerificationDrawer from '@/Components/Admin/Users/ArtisanVerificationDrawer';
import ArtisanApprovalRow from '@/Components/Admin/Users/Partials/ArtisanApprovalRow';
import CaviteCityFilterSelect from '@/Components/Admin/Users/Partials/CaviteCityFilterSelect';
import FilterToolbarHeader from '@/Components/Seller/Shared/FilterToolbarHeader';
import { CAVITE_CITY_OPTIONS, normalizeCaviteAddressText } from '@/lib/caviteAddresses';
import {
    ARTISAN_DOCUMENTS,
    buildViewedDocumentMap
} from '@/utils/userManagerHelpers';

const ITEMS_PER_PAGE = 5;

export default function ArtisanApprovalsTab({ artisans, addToast }) {
    const [localArtisans, setLocalArtisans] = useState(artisans);
    const [searchQuery, setSearchQuery] = useState('');
    const [reviewFilter, setReviewFilter] = useState('all');

    // Advanced Drawer / Popover Filter States
    const [selectedCity, setSelectedCity] = useState('all');
    const [selectedInspectionProgress, setSelectedInspectionProgress] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Staged Draft States
    const [draftCity, setDraftCity] = useState('all');
    const [draftInspectionProgress, setDraftInspectionProgress] = useState('all');
    const [draftStartDate, setDraftStartDate] = useState('');
    const [draftEndDate, setDraftEndDate] = useState('');

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

            // Cavite City / Municipality Filter
            if (selectedCity !== 'all') {
                const artisanCity = normalizeCaviteAddressText(artisan.city || '');
                const artisanAddress = normalizeCaviteAddressText(artisan.address || '');
                const targetCity = normalizeCaviteAddressText(selectedCity);
                if (!artisanCity.includes(targetCity) && !artisanAddress.includes(targetCity)) {
                    return false;
                }
            }

            // Inspection / Review Progress Filter
            if (selectedInspectionProgress !== 'all') {
                const viewed = viewedDocumentsByArtisan[artisan.id] ?? [];
                const viewedCount = viewed.length;
                if (selectedInspectionProgress === 'unopened' && viewedCount !== 0) return false;
                if (selectedInspectionProgress === 'in_review' && (viewedCount === 0 || viewedCount >= 4)) return false;
                if (selectedInspectionProgress === 'fully_reviewed' && viewedCount < 4) return false;
            }

            // Date Range filter
            if (startDate || endDate) {
                const submittedDate = artisan.raw_submitted_at ? new Date(artisan.raw_submitted_at) : (artisan.submitted_at ? new Date(artisan.submitted_at) : null);
                if (submittedDate && !isNaN(submittedDate.getTime())) {
                    if (startDate) {
                        const start = new Date(startDate);
                        start.setHours(0, 0, 0, 0);
                        if (submittedDate < start) return false;
                    }
                    if (endDate) {
                        const end = new Date(endDate);
                        end.setHours(23, 59, 59, 999);
                        if (submittedDate > end) return false;
                    }
                }
            }

            if (!query) return true;

            return [
                artisan.shop_name,
                artisan.name,
                artisan.phone_number,
                artisan.address,
                artisan.city,
                artisan.barangay,
            ].some((value) => String(value || '').toLowerCase().includes(query));
        });
    }, [localArtisans, deferredSearchQuery, reviewFilter, viewedDocumentsByArtisan, selectedCity, selectedInspectionProgress, startDate, endDate]);

    const [currentPage, setCurrentPage] = useState(1);
    const totalPages = Math.max(1, Math.ceil(filteredArtisans.length / ITEMS_PER_PAGE));
    const paginatedArtisans = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredArtisans.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredArtisans, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [deferredSearchQuery, reviewFilter, selectedCity, selectedInspectionProgress, startDate, endDate]);

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

    const activeFilterTags = useMemo(() => {
        const tags = [];
        if (selectedCity !== 'all') {
            tags.push({
                key: 'city',
                label: `City: ${selectedCity}`,
                onRemove: () => {
                    setSelectedCity('all');
                    setDraftCity('all');
                }
            });
        }
        if (selectedInspectionProgress !== 'all') {
            const progressLabels = {
                unopened: 'Unopened (0/4)',
                in_review: 'In Review (1–3/4)',
                fully_reviewed: 'Fully Inspected (4/4)'
            };
            tags.push({
                key: 'inspection',
                label: `Inspection: ${progressLabels[selectedInspectionProgress] || selectedInspectionProgress}`,
                onRemove: () => {
                    setSelectedInspectionProgress('all');
                    setDraftInspectionProgress('all');
                }
            });
        }
        if (startDate || endDate) {
            tags.push({
                key: 'date',
                label: `Submitted: ${startDate || 'Any'} → ${endDate || 'Present'}`,
                onRemove: () => {
                    setStartDate('');
                    setEndDate('');
                    setDraftStartDate('');
                    setDraftEndDate('');
                }
            });
        }
        return tags;
    }, [selectedCity, selectedInspectionProgress, startDate, endDate]);

    const activeFiltersCount = activeFilterTags.length;

    const handleApplyFilters = () => {
        setSelectedCity(draftCity);
        setSelectedInspectionProgress(draftInspectionProgress);
        setStartDate(draftStartDate);
        setEndDate(draftEndDate);
    };

    const handleResetAllFilters = () => {
        setReviewFilter('all');
        setSearchQuery('');
        setSelectedCity('all');
        setSelectedInspectionProgress('all');
        setStartDate('');
        setEndDate('');
        setDraftCity('all');
        setDraftInspectionProgress('all');
        setDraftStartDate('');
        setDraftEndDate('');
    };

    const filterPopoverFields = (
        <div className="space-y-4">
            {/* 1. Date Range Filter */}
            <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 mb-1.5">
                    Application Submitted Date
                </label>
                <div className="flex items-center bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden focus-within:ring-2 focus-within:ring-clay-100 focus-within:border-clay-500 transition-all h-[42px]">
                    <label className="flex flex-1 h-full items-center gap-2 px-3 hover:bg-stone-50 transition cursor-pointer min-h-[42px]">
                        <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-stone-400 shrink-0">From</span>
                        <input
                            type="date"
                            value={draftStartDate}
                            onChange={(e) => setDraftStartDate(e.target.value)}
                            className="flex-1 w-full bg-transparent text-xs font-bold text-stone-700 border-none outline-none focus:ring-0 p-0"
                        />
                    </label>
                    <div className="h-full w-px bg-stone-200 shrink-0"></div>
                    <label className="flex flex-1 h-full items-center gap-2 px-3 hover:bg-stone-50 transition cursor-pointer min-h-[42px]">
                        <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-stone-400 shrink-0">To</span>
                        <input
                            type="date"
                            value={draftEndDate}
                            onChange={(e) => setDraftEndDate(e.target.value)}
                            className="flex-1 w-full bg-transparent text-xs font-bold text-stone-700 border-none outline-none focus:ring-0 p-0"
                        />
                    </label>
                </div>
            </div>

            {/* 2. Cavite City / Municipality Filter */}
            <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 mb-1.5">
                    Cavite City / Municipality
                </label>
                <CaviteCityFilterSelect
                    value={draftCity}
                    onChange={setDraftCity}
                    options={CAVITE_CITY_OPTIONS}
                    placeholder="All Cavite Locations"
                />
            </div>

            {/* 3. Inspection Progress Filter */}
            <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 mb-1.5">
                    Inspection / Review Progress
                </label>
                <div className="relative">
                    <select
                        value={draftInspectionProgress}
                        onChange={(e) => setDraftInspectionProgress(e.target.value)}
                        className="pr-8 text-xs py-2 w-full min-h-[40px] bg-white border border-stone-200 hover:border-stone-300 rounded-xl font-bold text-stone-700 focus:border-clay-500 focus:ring focus:ring-clay-500/10 transition-all cursor-pointer appearance-none px-3"
                    >
                        <option value="all">All Progress Stages</option>
                        <option value="unopened">Unopened (0/4 viewed)</option>
                        <option value="in_review">In Review (1–3/4 viewed)</option>
                        <option value="fully_reviewed">Fully Inspected (4/4 viewed)</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={14} />
                </div>
            </div>
        </div>
    );

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
                activeFiltersCount={activeFiltersCount}
                filterPopoverTitle="Filter Artisan Applications"
                filterPopoverFields={filterPopoverFields}
                onApplyFilters={handleApplyFilters}
                onResetFilters={handleResetAllFilters}
                activeFilterTags={activeFilterTags}
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
