import React, { useDeferredValue, useEffect, useMemo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, router } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import SlideOverDrawer from '@/Components/SlideOverDrawer';
import BulkActionPill, { ActionTooltip } from '@/Components/BulkActionPill';
import Checkbox from '@/Components/Checkbox';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import WorkspaceLoadingState from '@/Components/WorkspaceLoadingState';
import CompactPagination from '@/Components/CompactPagination';
import {
    Clock, Eye, CheckCircle, XCircle, Calendar,
    FileText, Phone, MapPin, AlertTriangle, X, Download, LoaderCircle
} from 'lucide-react';
import AdminLayout from '@/Layouts/AdminLayout';
import { useToast } from '@/Components/ToastContext';
import { TableSkeleton } from '@/Components/Skeleton';



const ARTISAN_DOCUMENTS = [
    { key: 'business_permit', label: 'Business Permit', icon: FileText },
    { key: 'dti_registration', label: 'DTI Registration', icon: FileText },
    { key: 'valid_id', label: 'Valid ID', icon: FileText },
    { key: 'tin_id', label: 'TIN ID', icon: FileText },
];

const buildViewedDocumentMap = (artisanRows) =>
    artisanRows.reduce((carry, artisan) => {
        carry[artisan.id] = artisan.viewed_document_keys ?? [];
        return carry;
    }, {});

export default function PendingArtisans({ artisans }) {
    const { addToast } = useToast();
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
        if (!viewingArtisan || !doc.url) {
            return;
        }

        setViewingDoc(doc);
        setApprovalError('');
        setDocumentPreviewingKey(doc.key);

        window.axios
            .post(route('admin.artisan.documents.viewed', viewingArtisan.id), {
                document: doc.key,
            })
            .then(({ data }) => {
                const viewedDocumentKeys = data?.viewed_document_keys ?? [];

                setViewedDocumentsByArtisan((previous) => ({
                    ...previous,
                    [viewingArtisan.id]: viewedDocumentKeys,
                }));
            })
            .catch((error) => {
                const message =
                    error?.response?.data?.message ||
                    'Document preview opened, but review progress could not be saved.';

                setApprovalError(message);
                addToast(message, 'error');
            })
            .finally(() => {
                setDocumentPreviewingKey(null);
            });
    };

    const currentDocuments = useMemo(
        () => (viewingArtisan ? getArtisanDocuments(viewingArtisan) : []),
        [viewingArtisan, viewedDocumentsByArtisan],
    );
    const filteredArtisans = useMemo(() => {
        const query = deferredSearchQuery.trim().toLowerCase();

        return localArtisans.filter((artisan) => {
            if (reviewFilter === 'ready' && !artisan.documents_ready_for_approval) {
                return false;
            }

            if (reviewFilter === 'needs_preview' && artisan.documents_ready_for_approval) {
                return false;
            }

            if (!query) {
                return true;
            }

            return [
                artisan.shop_name,
                artisan.name,
                artisan.phone_number,
                artisan.address,
            ].some((value) => String(value || '').toLowerCase().includes(query));
        });
    }, [artisans, deferredSearchQuery, reviewFilter]);

    const ITEMS_PER_PAGE = 5;
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
        if (!viewingArtisan) {
            return;
        }

        const artisanToApprove = viewingArtisan;
        const originalArtisans = [...localArtisans];

        // OPTIMISTIC UPDATE
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
                // ROLLBACK
                setLocalArtisans(originalArtisans);
                addToast(errors.documents ?? 'Approval failed. Reverting changes...', 'error');
            }
        });
    };

    const rejectArtisan = () => {
        if (!rejectingArtisan || rejectReason.length < 10) {
            return;
        }

        setProcessing(true);
        router.post(route('admin.artisan.reject', rejectingArtisan.id), { reason: rejectReason }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setViewingDoc(null);
                setViewingArtisan(null);
                setRejectingArtisan(null);
                setRejectReason('');
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

            // SAFETY: Attempt to show toast FIRST.
            addToast(`Approving ${idsToApprove.length} applications...`, 'info', 5000, () => {
                if (pendingOperations.current[timerId]) {
                    pendingOperations.current[timerId].restore();
                    delete pendingOperations.current[timerId];
                }
            });

            // OPTIMISTIC REMOVE
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
        <>

            {artisans.length === 0 ? (
                <div className="mt-6 rounded-3xl border border-stone-200 bg-white p-8 text-center sm:p-16">
                    <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50">
                        <CheckCircle size={32} className="text-emerald-500" />
                    </div>
                    <h3 className="text-xl font-bold tracking-tight text-stone-900 mb-2">Queue is Empty</h3>
                    <p className="mx-auto max-w-sm text-[13px] text-stone-500">There are no pending artisan applications at the moment.</p>
                    <Link href={route('admin.dashboard')} className="mt-6 inline-block rounded-xl bg-stone-900 px-6 py-2.5 text-[13px] font-bold text-white transition hover:bg-stone-800">
                        Return to Dashboard
                    </Link>
                </div>
            ) : (
                <div className="mt-6 overflow-hidden rounded-2xl border border-stone-200 bg-white">
                    <div className="flex flex-col gap-3 border-b border-stone-100 bg-[#FDFBF9] px-4 py-3 sm:px-6 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                            <button
                                type="button"
                                onClick={() => setReviewFilter('all')}
                                className={`whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-bold transition-colors ${
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
                                className={`whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-bold transition-colors ${
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
                                className={`whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-bold transition-colors ${
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
                                placeholder="Search shop, owner, phone, or location"
                                className="w-full rounded-full border border-stone-200 bg-white py-2 pl-3 pr-9 text-sm font-medium text-stone-900 placeholder-stone-400 transition-all focus:border-clay-300 focus:ring-2 focus:ring-clay-500/20"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded text-stone-400 transition-colors hover:text-stone-600"
                                    aria-label="Clear artisan search"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                    {/* Header Row */}
                    <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-2.5 bg-stone-50 border-b border-stone-100/80 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                        <div className="col-span-4">Artisan Shop</div>
                        <div className="col-span-3">Contact & Location</div>
                        <div className="col-span-2">Review Progress</div>
                        <div className="col-span-2 text-center">Status</div>
                        <div className="col-span-1 text-right">Action</div>
                    </div>
                    <div className="divide-y divide-stone-100/80">
                        {searchQuery !== deferredSearchQuery ? (
                            <TableSkeleton rows={ITEMS_PER_PAGE} />
                        ) : filteredArtisans.length === 0 ? (
                            <div className="px-6 py-10 text-center">
                                <WorkspaceEmptyState
                                    compact
                                    icon={FileText}
                                    title="No matching applications"
                                    description="Try another search or switch the queue filter."
                                />
                            </div>
                        ) : (
                            <AnimatePresence initial={false}>
                                {paginatedArtisans.map(artisan => {
                                    const viewedCount = (viewedDocumentsByArtisan[artisan.id] ?? []).length;
                                    const isReady = artisan.submitted_document_count > 0 && viewedCount === artisan.submitted_document_count;

                                    return (
                                        <div 
                                            key={artisan.id} 
                                            className="grid grid-cols-1 gap-4 px-4 py-4 transition-all duration-200 hover:bg-stone-50/60 sm:px-6 md:grid-cols-12 md:items-center relative group"
                                        >
                                            {/* Hover Accent */}
                                            <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-clay-500 scale-y-0 group-hover:scale-y-100 transition-transform origin-center" />

                                            <div className="col-span-4 flex items-center gap-4">
                                                <Checkbox 
                                                    checked={selectedArtisans.includes(artisan.id)}
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
                                                            {viewedCount} <span className="text-stone-300">/</span> {artisan.submitted_document_count}
                                                        </span>
                                                    </div>
                                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-200/50 ring-1 ring-inset ring-black/5">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ 
                                                                width: `${artisan.submitted_document_count > 0
                                                                    ? Math.min(100, (viewedCount / artisan.submitted_document_count) * 100)
                                                                    : 0}%`
                                                            }}
                                                            className={`h-full rounded-full transition-all duration-700 ${isReady ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'bg-amber-400'}`}
                                                        />
                                                    </div>
                                                    <p className={`mt-2 text-[9px] font-bold leading-tight ${isReady ? 'text-emerald-600' : 'text-stone-400'}`}>
                                                        {isReady
                                                            ? 'Ready for approval'
                                                            : 'Preview all submitted files first'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="col-span-2 flex flex-col items-start md:items-center gap-1">
                                                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-amber-600/80 bg-amber-50/50 border border-amber-200/30 px-2 py-0.5 rounded-full">
                                                    <div className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" /> Pending
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
                                                    className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 text-[11px] font-bold text-stone-700 shadow-sm transition-all hover:border-clay-300 hover:bg-stone-50 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
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
                    <CompactPagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={filteredArtisans.length}
                        itemsPerPage={ITEMS_PER_PAGE}
                        onPageChange={setCurrentPage}
                        itemLabel="applications"
                    />
                </div>
            )}

            {/* Artisan Review Modal */}
            <Modal
                show={!!viewingArtisan}
                onClose={() => !viewingDoc && setViewingArtisan(null)}
                maxWidth="2xl"
                bottomSheet
            >
                {viewingArtisan && (
                    <div className="p-6 bg-white">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-clay-100 bg-clay-50 text-lg font-bold text-clay-700 shadow-sm">
                                    {viewingArtisan.shop_name?.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-lg font-bold text-stone-900 leading-tight truncate">{viewingArtisan.shop_name}</h3>
                                    <p className="text-xs font-medium text-stone-500 truncate">{viewingArtisan.name} • {viewingArtisan.email}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setViewingArtisan(null)}
                                className="p-2 text-stone-400 hover:text-stone-600 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>


                        
                        <div className="min-h-[400px]">
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-3">
                                    {currentDocuments.map(doc => (
                                        <div 
                                            key={doc.key}
                                            onClick={() => documentPreviewingKey !== doc.key && openDocumentPreview(doc)}
                                            className={`group relative overflow-hidden rounded-xl border border-stone-200 p-3 transition ${doc.url ? 'cursor-pointer bg-white hover:border-clay-300 hover:shadow-sm' : 'bg-stone-50/50 opacity-60'} ${documentPreviewingKey === doc.key ? 'pointer-events-none' : ''}`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="p-1.5 bg-stone-50 rounded-lg group-hover:bg-clay-50 border border-stone-50 group-hover:border-clay-100 flex items-center gap-2">
                                                    <doc.icon size={14} className="text-stone-400 group-hover:text-clay-600" />
                                                    {doc.flags.length > 0 && (
                                                        <ActionTooltip text={`Automated check: ${doc.flags.join(', ').replace(/_/g, ' ')}`}>
                                                            <AlertTriangle size={12} className="text-amber-500 fill-amber-50" />
                                                        </ActionTooltip>
                                                    )}
                                                </div>
                                                {doc.viewed && <CheckCircle size={14} className="text-emerald-500" />}
                                            </div>
                                            <p className="font-bold text-[11px] text-stone-800 truncate mb-1">{doc.label}</p>
                                            
                                            {doc.url ? (
                                                <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-stone-100 bg-stone-50">
                                                    {doc.url.endsWith('.pdf') ? (
                                                        <div className="w-full h-full flex items-center justify-center bg-white"><FileText size={20} className="text-clay-200" /></div>
                                                    ) : (
                                                        <img src={doc.url} alt={doc.label} className="w-full h-full object-cover" />
                                                    )}
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 group-hover:bg-black/10 group-hover:opacity-100 transition">
                                                        <Eye size={16} className="text-white drop-shadow-md" />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="aspect-video w-full rounded-lg border border-dashed border-stone-200 bg-stone-50 flex items-center justify-center"><X size={16} className="text-stone-300" /></div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="rounded-2xl bg-stone-50 border border-stone-100 p-4 space-y-3">
                                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-stone-400">Review Status</h4>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-[13px] font-bold">
                                            <span className="text-stone-600">Verification Progress</span>
                                            <span className={allSubmittedDocumentsViewed ? 'text-emerald-600' : 'text-amber-600'}>
                                                {viewedDocumentsCount} / {submittedDocumentsCount}
                                            </span>
                                        </div>
                                        <div className="h-2 w-full overflow-hidden rounded-full bg-stone-200">
                                            <div 
                                                className={`h-full transition-all duration-500 ${allSubmittedDocumentsViewed ? 'bg-emerald-500' : 'bg-amber-400'}`}
                                                style={{ width: `${(viewedDocumentsCount / submittedDocumentsCount) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => setRejectingArtisan(viewingArtisan)}
                                        disabled={processing}
                                        className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white py-3 text-sm font-bold text-stone-600 hover:bg-red-50 hover:text-red-700 hover:border-red-100 transition"
                                    >
                                        <XCircle size={18} /> Reject
                                    </button>
                                    <button
                                        onClick={confirmApprove}
                                        disabled={processing || !allSubmittedDocumentsViewed}
                                        className="flex-[2] flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 disabled:bg-stone-200 disabled:shadow-none transition"
                                    >
                                        {processing ? <LoaderCircle size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                                        {processing ? 'Processing...' : 'Approve Application'}
                                    </button>
                                </div>
                                {approvalError && <p className="text-center text-xs font-bold text-red-600 mt-2">{approvalError}</p>}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Document Preview Modal */}
            <Modal show={!!viewingDoc} onClose={() => setViewingDoc(null)} maxWidth="7xl">
                {viewingDoc && (
                    <div className="h-[85vh] flex flex-col bg-stone-900">
                        <div className="bg-black/50 backdrop-blur-md px-4 sm:px-6 py-4 flex items-center justify-between border-b border-white/10 shrink-0">
                            <div>
                                <h3 className="text-lg font-bold text-white">{viewingDoc.label}</h3>
                                <p className="text-xs text-stone-400 mt-0.5">Document Preview</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <a 
                                    href={viewingDoc.url} 
                                    download 
                                    className="p-2 hover:bg-white/10 rounded-full transition text-stone-400 hover:text-white"
                                    title="Download"
                                >
                                    <Download size={20} />
                                </a>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setViewingDoc(null); }}
                                    className="p-2 hover:bg-white/10 rounded-full transition text-stone-400 hover:text-white"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-hidden flex items-center justify-center bg-stone-900/50 p-4">
                            {viewingDoc.url.endsWith('.pdf') ? (
                                <iframe 
                                    src={viewingDoc.url} 
                                    className="h-full w-full rounded-lg bg-white"
                                    title={viewingDoc.label}
                                />
                            ) : (
                                <img 
                                    src={viewingDoc.url} 
                                    alt={viewingDoc.label} 
                                    className="max-h-full max-w-full rounded-lg object-contain"
                                />
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            {/* Reject Modal */}
            <Modal 
                show={!!rejectingArtisan} 
                onClose={() => setRejectingArtisan(null)} 
                maxWidth="lg"
                bottomSheet
            >
                {rejectingArtisan && (
                    <div className="p-5 sm:p-6 bg-[#FDFBF9]">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-red-50 text-red-600 border border-red-100 rounded-xl flex items-center justify-center shrink-0">
                                    <AlertTriangle size={20} />
                                </div>
                                <div>
                                    <h3 className="text-[15px] font-bold text-stone-900 leading-tight">Reject Application</h3>
                                    <p className="text-stone-500 text-[11px]">Specify a reason for <span className="font-bold text-stone-700">{rejectingArtisan.shop_name}</span></p>
                                </div>
                            </div>
                            <button onClick={() => setRejectingArtisan(null)} className="rounded border border-stone-200 bg-white p-1 px-1.5 text-stone-400 transition hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/30">
                                <X size={14} />
                            </button>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-stone-600 ml-1">Rejection Reason</label>
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="E.g., The uploaded business permit belongs to a different entity. Please upload..."
                                className="h-28 w-full resize-none rounded-xl border border-stone-200 bg-white p-3 text-[13px] focus:border-red-400 focus:ring-2 focus:ring-red-500/20"
                            />
                            <div className="flex justify-between items-center px-1">
                                <p className="text-[10px] text-stone-400">This will be shared with the artisan.</p>
                                <span className={`text-[10px] font-bold ${rejectReason.length < 10 ? 'text-red-500' : 'text-emerald-600'}`}>
                                    {rejectReason.length} chars (min 10)
                                </span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-5">
                            {processing && (
                                <WorkspaceLoadingState
                                    label="Submitting rejection"
                                    detail="Sending reason to applicant"
                                    className="mr-auto"
                                />
                            )}
                            <button
                                onClick={() => setRejectingArtisan(null)}
                                disabled={processing}
                                  className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-[12px] font-bold text-stone-600 transition hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/30"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={rejectArtisan}
                                disabled={processing || rejectReason.length < 10}
                                  className="flex items-center gap-1.5 rounded-lg bg-red-600 px-5 py-2 text-[12px] font-bold text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {processing ? <LoaderCircle size={14} className="animate-spin" /> : <XCircle size={14} />}
                                {processing ? 'Rejecting...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            <BulkActionPill selectedCount={selectedArtisans.length} onClear={clearSelection}>
                <ActionTooltip text="Approve Selected">
                    <button
                        onClick={bulkApprove}
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-600 active:scale-90"
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
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500 text-white shadow-lg shadow-rose-500/20 transition-all hover:bg-rose-600 active:scale-90"
                    >
                        <XCircle size={20} />
                    </button>
                </ActionTooltip>
            </BulkActionPill>
        </>
    );
}

PendingArtisans.layout = page => <AdminLayout title="Pending Artisans">{page}</AdminLayout>;
