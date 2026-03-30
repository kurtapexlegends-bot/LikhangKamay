import React, { useEffect, useMemo, useState } from 'react';
import { Link, router } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import {
    Clock, Eye, CheckCircle, XCircle, 
    FileText, Phone, MapPin, AlertTriangle, X, Download
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
    const [viewingArtisan, setViewingArtisan] = useState(null);
    const [viewingDoc, setViewingDoc] = useState(null);
    const [rejectingArtisan, setRejectingArtisan] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [processing, setProcessing] = useState(false);
    const [approvalError, setApprovalError] = useState('');
    const [viewedDocumentsByArtisan, setViewedDocumentsByArtisan] = useState(() => buildViewedDocumentMap(artisans));

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
                console.error('Failed to mark artisan document as viewed:', error);
            });
    };

    const currentDocuments = useMemo(
        () => (viewingArtisan ? getArtisanDocuments(viewingArtisan) : []),
        [viewingArtisan, viewedDocumentsByArtisan],
    );

    const submittedDocuments = currentDocuments.filter((document) => document.url);
    const viewedSubmittedCount = submittedDocuments.filter((document) => document.viewed).length;
    const canApproveCurrentArtisan = submittedDocuments.every((document) => document.viewed);

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
                setApprovalError(errors.documents ?? 'Approval failed. Open every submitted document before approving this shop.');
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
                console.error('Rejection failed:', errors);
                addToast(errors.reason ?? 'Rejection failed. Please review the form and try again.', 'error');
            },
        });
    };

    return (
        <AdminLayout title="Pending Artisans">

            {artisans.length === 0 ? (
                <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-8 sm:p-16 text-center">
                    <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={48} className="text-green-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">All Caught Up!</h3>
                    <p className="text-gray-500 max-w-md mx-auto">There are no pending artisan applications at the moment. Great job keeping the queue clean!</p>
                    <Link href={route('admin.dashboard')} className="inline-block mt-8 px-6 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition">
                        Return to Dashboard
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {artisans.map(artisan => (
                        <div key={artisan.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow group">
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <div className="flex items-center gap-4 w-full md:w-auto">
                                    <div className="w-14 h-14 bg-clay-500 text-white rounded-xl flex items-center justify-center text-xl font-bold shadow-md shadow-clay-200 shrink-0 overflow-hidden">
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
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-gray-900 text-lg">{artisan.shop_name}</h3>
                                            <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-sm">
                                                <Clock size={10} /> Pending
                                            </span>
                                        </div>
                                        <p className="text-gray-500 flex items-center gap-2 text-sm">
                                            <span className="font-medium text-gray-900">{artisan.name}</span> • {artisan.email}
                                        </p>
                                        
                                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                                            <span className="flex items-center gap-1 text-gray-500 bg-stone-50 px-2 py-1 rounded border border-stone-100">
                                                <Phone size={12} /> {artisan.phone_number}
                                            </span>
                                            <span className="flex items-center gap-1 text-gray-500 bg-stone-50 px-2 py-1 rounded border border-stone-100">
                                                <MapPin size={12} /> {artisan.address}
                                            </span>
                                            <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100 font-medium">
                                                <Clock size={12} /> {artisan.submitted_at}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto mt-3 md:mt-0 pt-3 md:pt-0 border-t md:border-none border-stone-100">
                                    <button
                                        onClick={() => openReviewModal(artisan)}
                                        className="flex-1 md:flex-none px-4 py-2 bg-stone-100 text-gray-700 rounded-lg font-bold text-sm hover:bg-stone-200 transition flex items-center justify-center gap-1.5"
                                    >
                                        <Eye size={16} /> Review
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* View Documents Modal */}
            <Modal show={!!viewingArtisan} onClose={() => !viewingDoc && setViewingArtisan(null)} maxWidth="2xl">
                {viewingArtisan && (
                    <div className="p-0 overflow-hidden">
                        <div className="bg-white px-6 py-4 border-b border-stone-100 flex items-center justify-between sticky top-0 z-20 shadow-sm">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">{viewingArtisan.shop_name}</h3>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Application Documents</p>
                            </div>
                            <button onClick={() => setViewingArtisan(null)} className="p-1.5 hover:bg-stone-100 rounded-full transition text-gray-400 hover:text-gray-600">
                                <X size={18} />
                            </button>
                        </div>
                        
                        <div className="p-4 sm:p-6 bg-stone-50 max-h-[60vh] overflow-y-auto no-scrollbar">
                            <style>{`
                                .no-scrollbar::-webkit-scrollbar {
                                    display: none;
                                }
                                .no-scrollbar {
                                    -ms-overflow-style: none;
                                    scrollbar-width: none;
                                }
                            `}</style>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {currentDocuments.map(doc => (
                                    <div 
                                        key={doc.key}
                                        onClick={() => openDocumentPreview(doc)}
                                        className={`bg-white border border-stone-200 rounded-2xl p-5 transition-all group relative overflow-hidden ${doc.url ? 'hover:border-clay-300 hover:shadow-lg cursor-pointer' : 'opacity-70'}`}
                                    >
                                        
                                        <div className="flex items-center justify-between mb-4 relative z-10">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 bg-stone-50 rounded-xl group-hover:bg-clay-50 transition-colors border border-stone-100 group-hover:border-clay-100">
                                                    <doc.icon size={20} className="text-gray-400 group-hover:text-clay-600 transition-colors" />
                                                </div>
                                                <div>
                                                    <span className="font-bold text-gray-800 block">{doc.label}</span>
                                                    <span className="text-xs text-gray-400 font-medium">
                                                        {doc.url ? (doc.viewed ? 'Viewed' : 'Click to Preview') : 'Missing File'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {doc.viewed && (
                                                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                                                        <CheckCircle size={10} /> Viewed
                                                    </span>
                                                )}
                                                {doc.url && (
                                                    <a 
                                                        href={doc.url} 
                                                        download 
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="text-gray-400 hover:text-clay-600 transition p-2 hover:bg-stone-50 rounded-full"
                                                    >
                                                        <Download size={18} />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {doc.url ? (
                                            <div className="block w-full aspect-video bg-stone-100 rounded-xl overflow-hidden border border-stone-200 group-hover:ring-4 group-hover:ring-clay-50/50 transition-all relative shadow-inner">
                                                {doc.url.endsWith('.pdf') ? (
                                                    <div className="w-full h-full flex flex-col items-center justify-center bg-stone-50 text-gray-500 gap-2">
                                                        <FileText size={48} className="text-clay-200" />
                                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">PDF Document</span>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <img src={doc.url} alt={doc.label} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 backdrop-blur-[2px]">
                                                            <span className="bg-white text-gray-900 px-4 py-2 rounded-full text-xs font-bold shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 flex items-center gap-2">
                                                                <Eye size={14} /> Preview
                                                            </span>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="w-full aspect-video bg-stone-50 rounded-xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center text-gray-400 gap-2">
                                                <XCircle size={32} className="text-stone-300" />
                                                <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Not Uploaded</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white px-4 sm:px-8 py-4 sm:py-5 border-t border-stone-100 flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center sticky bottom-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                             <div className="space-y-1">
                                <div className="text-sm text-gray-500 font-medium">
                                    Reviewing <span className="text-gray-900 font-bold">{viewingArtisan.shop_name}</span>
                                </div>
                                <div className="text-xs font-medium text-gray-500">
                                    Viewed {viewedSubmittedCount} of {submittedDocuments.length} submitted documents
                                </div>
                                {approvalError && (
                                    <p className="text-xs font-semibold text-red-600">{approvalError}</p>
                                )}
                                {!approvalError && !canApproveCurrentArtisan && (
                                    <p className="text-xs font-semibold text-amber-700">Open every submitted document preview to enable approval.</p>
                                )}
                             </div>
                             <div className="flex w-full sm:w-auto flex-col sm:flex-row gap-3">
                                <button
                                    onClick={() => {
                                        setApprovalError('');
                                        setRejectingArtisan(viewingArtisan);
                                    }}
                                    className="px-6 py-2.5 bg-white text-red-600 border border-gray-200 rounded-xl font-bold hover:bg-red-50 hover:border-red-200 transition text-sm flex items-center gap-2"
                                >
                                    <XCircle size={16} /> Reject
                                </button>
                                <button
                                    onClick={confirmApprove}
                                    disabled={processing || !canApproveCurrentArtisan}
                                    className="px-6 py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition shadow-lg shadow-green-200 text-sm flex items-center gap-2 disabled:cursor-not-allowed disabled:bg-green-300 disabled:shadow-none"
                                >
                                    <CheckCircle size={16} /> {processing ? 'Approving...' : 'Approve'}
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
                                    className="w-full h-full rounded-lg shadow-2xl bg-white"
                                    title={viewingDoc.label}
                                />
                            ) : (
                                <img 
                                    src={viewingDoc.url} 
                                    alt={viewingDoc.label} 
                                    className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                                />
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            {/* Reject Modal */}
            <Modal show={!!rejectingArtisan} onClose={() => setRejectingArtisan(null)} maxWidth="lg">
                {rejectingArtisan && (
                    <div className="p-6 sm:p-8">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6">
                            <AlertTriangle size={32} className="text-red-500" />
                        </div>
                        
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Reject Application</h3>
                        <p className="text-gray-500 text-sm mb-6">
                            Please explain why you are rejecting <span className="font-bold">{rejectingArtisan.shop_name}</span>. This will be sent to the artisan.
                        </p>

                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="E.g., The business permit uploaded is expired. Please upload a valid 2024 permit..."
                            className="w-full h-32 bg-stone-50 border-stone-200 rounded-xl p-4 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none text-sm"
                        />
                        <div className="flex justify-between items-center mt-2 mb-6">
                            <span className={`text-xs font-bold ${rejectReason.length < 10 ? 'text-red-500' : 'text-green-600'}`}>
                                {rejectReason.length} chars (min 10)
                            </span>
                        </div>

                        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
                            <button
                                onClick={() => setRejectingArtisan(null)}
                                className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={rejectArtisan}
                                disabled={processing || rejectReason.length < 10}
                                className="px-5 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-200"
                            >
                                {processing ? 'Rejecting...' : 'Confirm Rejection'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </AdminLayout>
    );
}
