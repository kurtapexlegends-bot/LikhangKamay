import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link, router } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import WorkspaceLoadingState from '@/Components/WorkspaceLoadingState';
import {
    Clock, Eye, CheckCircle, XCircle, 
    FileText, Phone, MapPin, AlertTriangle, X, Download, LoaderCircle
} from 'lucide-react';
import AdminLayout from '@/Layouts/AdminLayout';
import { useToast } from '@/Components/ToastContext';

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

    useEffect(() => {
        setViewedDocumentsByArtisan(buildViewedDocumentMap(artisans));
    }, [artisans]);

    const getArtisanDocuments = (artisan) =>
        ARTISAN_DOCUMENTS.map((document) => ({
            ...document,
            url: artisan?.[document.key] ?? null,
            viewed: (viewedDocumentsByArtisan[artisan?.id] ?? []).includes(document.key),
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

        return artisans.filter((artisan) => {
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
    const viewedDocumentsCount = viewingArtisan ? (viewedDocumentsByArtisan[viewingArtisan.id] ?? []).length : 0;
    const submittedDocumentsCount = viewingArtisan?.submitted_document_count ?? currentDocuments.filter((doc) => !!doc.url).length;
    const allSubmittedDocumentsViewed = submittedDocumentsCount > 0 && viewedDocumentsCount >= submittedDocumentsCount;

    const confirmApprove = () => {
        if (!viewingArtisan) {
            return;
        }

        setProcessing(true);
        setApprovalError('');

        router.post(route('admin.artisan.approve', viewingArtisan.id), {}, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setViewingDoc(null);
                setViewingArtisan(null);
                setRejectingArtisan(null);
                setApprovalError('');
            },
            onError: (errors) => {
                setApprovalError(errors.documents ?? 'Approval failed. Please try again.');
            },
            onFinish: () => {
                setProcessing(false);
            },
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

    return (
        <AdminLayout title="Pending Artisans">

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
                    <div className="flex flex-col gap-3 border-b border-stone-100 bg-[#FDFBF9] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setReviewFilter('all')}
                                className={`rounded-full border px-3 py-1 text-[11px] font-bold transition-colors ${
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
                                className={`rounded-full border px-3 py-1 text-[11px] font-bold transition-colors ${
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
                                className={`rounded-full border px-3 py-1 text-[11px] font-bold transition-colors ${
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
                        {filteredArtisans.length === 0 && (
                            <div className="px-6 py-10 text-center">
                                <WorkspaceEmptyState
                                    compact
                                    icon={FileText}
                                    title="No matching applications"
                                    description="Try another search or switch the queue filter."
                                />
                            </div>
                        )}
                        {filteredArtisans.map(artisan => (
                            <div key={artisan.id} className="grid grid-cols-1 gap-4 px-4 py-3.5 transition hover:bg-stone-50/40 sm:px-6 md:grid-cols-12 md:items-center">
                                <div className="col-span-4 flex items-center gap-3.5">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-clay-100 bg-clay-50 text-sm font-bold text-clay-700">
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
                                        <h3 className="font-semibold text-[13px] text-stone-900 truncate">{artisan.shop_name}</h3>
                                        <p className="text-stone-500 text-[12px] truncate">{artisan.name}</p>
                                        <p className="text-[10px] text-stone-400 mt-0.5">Submitted {artisan.submitted_at}</p>
                                    </div>
                                </div>

                                <div className="col-span-3 rounded-xl border border-stone-100 bg-stone-50/60 p-3 md:rounded-none md:border-0 md:bg-transparent md:p-0">
                                    <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-stone-400 md:hidden">Contact</p>
                                    <div className="flex flex-col gap-1.5 text-[11px] text-stone-500">
                                    <div className="flex items-center gap-1.5 truncate">
                                        <div className="w-4 h-4 rounded bg-white border border-stone-200 flex items-center justify-center text-stone-400 shrink-0"><Phone size={9} /></div>
                                        <span className="truncate font-medium">{artisan.phone_number}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 truncate">
                                        <div className="w-4 h-4 rounded bg-white border border-stone-200 flex items-center justify-center text-stone-400 shrink-0"><MapPin size={9} /></div>
                                        <span className="truncate">{artisan.address}</span>
                                    </div>
                                </div>
                                </div>

                                <div className="col-span-2">
                                    <div className="rounded-xl border border-stone-200 bg-stone-50/70 px-3 py-2">
                                        <div className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wider">
                                            <span className="text-stone-500">Documents</span>
                                            <span className={artisan.documents_ready_for_approval ? 'text-emerald-700' : 'text-amber-700'}>
                                                {artisan.viewed_document_count}/{artisan.submitted_document_count}
                                            </span>
                                        </div>
                                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                                            <div
                                                className={`h-full rounded-full transition-[width] ${artisan.documents_ready_for_approval ? 'bg-emerald-500' : 'bg-amber-400'}`}
                                                style={{
                                                    width: `${artisan.submitted_document_count > 0
                                                        ? Math.min(100, (artisan.viewed_document_count / artisan.submitted_document_count) * 100)
                                                        : 0}%`,
                                                }}
                                            />
                                        </div>
                                        <p className="mt-2 text-[10px] text-stone-500">
                                            {artisan.documents_ready_for_approval
                                                ? 'Ready for approval'
                                                : 'Preview all submitted files first'}
                                        </p>
                                    </div>
                                </div>

                                <div className="col-span-2 flex justify-start md:justify-center">
                                    <div className="flex flex-col gap-1">
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200/50 px-2 py-0.5 rounded-md">
                                            <Clock size={10} /> Pending
                                        </span>
                                        {artisan.documents_ready_for_approval && (
                                            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md">
                                                <CheckCircle size={9} /> Review Complete
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="col-span-1 mt-1 flex justify-start md:mt-0 md:justify-end">
                                    <button
                                        onClick={() => openReviewModal(artisan)}
                                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-[11px] font-bold text-stone-700 transition hover:border-clay-300 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/30 md:w-auto md:rounded-lg md:py-1.5"
                                      >
                                        <Eye size={12} className="text-clay-500" /> Review
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* View Documents Modal */}
            <Modal show={!!viewingArtisan} onClose={() => !viewingDoc && setViewingArtisan(null)} maxWidth="2xl">
                {viewingArtisan && (
                    <div className="p-0 overflow-hidden bg-[#FDFBF9]">
                        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-stone-100 bg-white px-5 py-4 sm:px-6">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-clay-100 bg-clay-50 text-sm font-bold text-clay-700">
                                    {viewingArtisan.shop_name?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="text-[15px] font-bold text-stone-900 leading-tight">{viewingArtisan.shop_name}</h3>
                                    <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider mt-0.5">Application Documents</p>
                                </div>
                            </div>
                            <button onClick={() => setViewingArtisan(null)} className="p-1.5 bg-stone-50 hover:bg-stone-100 border border-stone-100 rounded-full transition text-stone-400 hover:text-stone-600">
                                <X size={16} />
                            </button>
                        </div>
                        
                        <div className="p-4 sm:p-5 max-h-[60vh] overflow-y-auto no-scrollbar">
                            <style>{`
                                .no-scrollbar::-webkit-scrollbar {
                                    display: none;
                                }
                                .no-scrollbar {
                                    -ms-overflow-style: none;
                                    scrollbar-width: none;
                                }
                            `}</style>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                {currentDocuments.map(doc => (
                                    <div 
                                        key={doc.key}
                                        onClick={() => documentPreviewingKey !== doc.key && openDocumentPreview(doc)}
                                        className={`group relative overflow-hidden rounded-xl border border-stone-200 p-3.5 transition ${doc.url ? 'cursor-pointer bg-white hover:border-clay-300 hover:bg-stone-50/60' : 'bg-stone-50/50 opacity-60'} ${documentPreviewingKey === doc.key ? 'pointer-events-none opacity-75' : ''}`}
                                    >
                                        
                                        <div className="flex items-center justify-between mb-3 relative z-10">
                                            <div className="flex items-center gap-2.5">
                                                <div className="p-2 bg-stone-50 rounded-lg group-hover:bg-clay-50 transition-colors border border-stone-100 group-hover:border-clay-100">
                                                    <doc.icon size={16} className="text-stone-400 group-hover:text-clay-600 transition-colors" />
                                                </div>
                                                <div>
                                                    <span className="font-bold text-[12px] text-stone-800 block">{doc.label}</span>
                                                    <span className="text-[10px] text-stone-400 font-medium">
                                                        {doc.url ? (documentPreviewingKey === doc.key ? 'Saving review...' : (doc.viewed ? 'Viewed' : 'Click to Preview')) : 'Missing File'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                {doc.viewed && (
                                                    <span className="inline-flex items-center gap-1 rounded border border-emerald-200/50 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700">
                                                        <CheckCircle size={8} /> OK
                                                    </span>
                                                )}
                                                {doc.url && (
                                                    <a 
                                                        href={doc.url} 
                                                        download 
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="text-stone-300 hover:text-clay-600 transition p-1 hover:bg-stone-50 rounded-full"
                                                    >
                                                        <Download size={14} />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {doc.url ? (
                                            <div className="relative block aspect-video w-full overflow-hidden rounded-lg border border-stone-200 bg-stone-100 transition group-hover:ring-1 group-hover:ring-clay-100">
                                                {doc.url.endsWith('.pdf') ? (
                                                    <div className="w-full h-full flex flex-col items-center justify-center bg-[#FDFBF9] text-stone-400 gap-1.5">
                                                        <FileText size={32} className="text-clay-200" />
                                                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">PDF Document</span>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <img src={doc.url} alt={doc.label} className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/5 group-hover:opacity-100">
                                                            <span className="flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-bold text-stone-900 transition">
                                                                <Eye size={12} /> Preview
                                                            </span>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex aspect-video w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-stone-200 bg-stone-50 text-stone-400">
                                                <XCircle size={24} className="text-stone-300" />
                                                <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400">Not Uploaded</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="sticky bottom-0 z-20 flex flex-col gap-3 border-t border-stone-100 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                            <div className="space-y-0.5">
                                <p className="text-[10px] font-medium text-stone-400">
                                    Approve once all submitted documents are previewed and reviewed as needed.
                                </p>
                                <p className={`text-[10px] font-bold ${allSubmittedDocumentsViewed ? 'text-emerald-600' : 'text-amber-600'}`}>
                                    Review progress: {viewedDocumentsCount}/{submittedDocumentsCount} submitted documents previewed
                                </p>
                                {approvalError && (
                                    <p className="text-[10px] font-semibold text-red-600">{approvalError}</p>
                                )}
                             </div>
                             <div className="flex w-full sm:w-auto flex-col sm:flex-row gap-2">
                                {processing && (
                                    <WorkspaceLoadingState
                                        label="Saving review"
                                        detail="Updating application status"
                                    />
                                )}
                                <button
                                    onClick={() => {
                                        setApprovalError('');
                                        setRejectingArtisan(viewingArtisan);
                                    }}
                                    disabled={processing}
                                      className="flex items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-white px-4 py-2 text-[12px] font-bold text-stone-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/20"
                                >
                                    <XCircle size={14} /> Reject
                                </button>
                                <button
                                    onClick={confirmApprove}
                                    disabled={processing || !allSubmittedDocumentsViewed}
                                      className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-[12px] font-bold text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500"
                                >
                                    {processing ? <LoaderCircle size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                    {processing ? 'Approving...' : !allSubmittedDocumentsViewed ? 'Preview All Documents First' : 'Approve Application'}
                                </button>
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
            <Modal show={!!rejectingArtisan} onClose={() => setRejectingArtisan(null)} maxWidth="lg">
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
        </AdminLayout>
    );
}
