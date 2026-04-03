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
    const canApproveCurrentArtisan = true;

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
                console.error('Rejection failed:', errors);
                addToast(errors.reason ?? 'Rejection failed. Please review the form and try again.', 'error');
            },
        });
    };

    return (
        <AdminLayout title="Pending Artisans">

            {artisans.length === 0 ? (
                <div className="bg-[#FDFBF9] rounded-3xl shadow-sm border border-stone-200/60 p-8 sm:p-16 text-center mt-6">
                    <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner border border-emerald-100/50">
                        <CheckCircle size={32} className="text-emerald-500" />
                    </div>
                    <h3 className="text-xl font-bold tracking-tight text-stone-900 mb-2">Queue is Empty</h3>
                    <p className="text-stone-500 text-[13px] max-w-sm mx-auto">There are no pending artisan applications at the moment. Great job keeping the queue clean!</p>
                    <Link href={route('admin.dashboard')} className="inline-block mt-6 px-6 py-2.5 bg-stone-900 text-white rounded-xl text-[13px] font-bold hover:bg-stone-800 transition shadow-md shadow-stone-200 hover:-translate-y-0.5">
                        Return to Dashboard
                    </Link>
                </div>
            ) : (
                <div className="mt-6 bg-[#FDFBF9] rounded-2xl shadow-[0_2px_4px_rgba(0,0,0,0.02)] border border-stone-200/60 overflow-hidden">
                    {/* Header Row */}
                    <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-stone-50 border-b border-stone-100/80 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                        <div className="col-span-5">Artisan Shop</div>
                        <div className="col-span-4">Contact & Location</div>
                        <div className="col-span-2 text-center">Status</div>
                        <div className="col-span-1 text-right">Action</div>
                    </div>
                    <div className="divide-y divide-stone-100/80">
                        {artisans.map(artisan => (
                            <div key={artisan.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center px-4 sm:px-6 py-4 hover:bg-stone-50/50 transition">
                                <div className="col-span-5 flex items-center gap-3.5">
                                    <div className="w-10 h-10 bg-clay-50 border border-clay-100 text-clay-700 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden shadow-sm">
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
                                        <h3 className="font-bold text-[13px] text-stone-900 truncate">{artisan.shop_name}</h3>
                                        <p className="text-stone-500 text-[12px] truncate">{artisan.name}</p>
                                    </div>
                                </div>

                                <div className="col-span-4 flex flex-col gap-1.5 text-[11px] text-stone-500">
                                    <div className="flex items-center gap-1.5 truncate">
                                        <div className="w-4 h-4 rounded bg-white border border-stone-200 flex items-center justify-center text-stone-400 shrink-0"><Phone size={9} /></div>
                                        <span className="truncate font-medium">{artisan.phone_number}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 truncate">
                                        <div className="w-4 h-4 rounded bg-white border border-stone-200 flex items-center justify-center text-stone-400 shrink-0"><MapPin size={9} /></div>
                                        <span className="truncate">{artisan.address}</span>
                                    </div>
                                </div>

                                <div className="col-span-2 flex justify-start md:justify-center">
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200/50 px-2.5 py-1 rounded-md">
                                        <Clock size={10} /> Pending
                                    </span>
                                </div>

                                <div className="col-span-1 flex justify-start md:justify-end mt-1 md:mt-0">
                                    <button
                                        onClick={() => openReviewModal(artisan)}
                                        className="inline-flex px-3.5 py-1.5 bg-white border border-stone-200 text-stone-700 rounded-lg text-[11px] font-bold hover:bg-stone-50 hover:border-clay-300 transition items-center gap-1.5 shadow-sm"
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
                        <div className="bg-white px-5 sm:px-6 py-4 border-b border-stone-100 flex items-center justify-between sticky top-0 z-20 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-clay-50 border border-clay-100 text-clay-700 rounded-xl flex items-center justify-center text-sm font-bold shadow-sm">
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
                                        onClick={() => openDocumentPreview(doc)}
                                        className={`bg-white border border-stone-200 rounded-xl p-4 transition-all group relative overflow-hidden ${doc.url ? 'hover:border-clay-300 hover:shadow-md cursor-pointer' : 'opacity-60 bg-stone-50/50'}`}
                                    >
                                        
                                        <div className="flex items-center justify-between mb-3 relative z-10">
                                            <div className="flex items-center gap-2.5">
                                                <div className="p-2 bg-stone-50 rounded-lg group-hover:bg-clay-50 transition-colors border border-stone-100 group-hover:border-clay-100">
                                                    <doc.icon size={16} className="text-stone-400 group-hover:text-clay-600 transition-colors" />
                                                </div>
                                                <div>
                                                    <span className="font-bold text-[12px] text-stone-800 block">{doc.label}</span>
                                                    <span className="text-[10px] text-stone-400 font-medium">
                                                        {doc.url ? (doc.viewed ? 'Viewed' : 'Click to Preview') : 'Missing File'}
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
                                            <div className="block w-full aspect-video bg-stone-100 rounded-lg overflow-hidden border border-stone-200 group-hover:ring-2 group-hover:ring-clay-100 transition-all relative shadow-inner">
                                                {doc.url.endsWith('.pdf') ? (
                                                    <div className="w-full h-full flex flex-col items-center justify-center bg-[#FDFBF9] text-stone-400 gap-1.5">
                                                        <FileText size={32} className="text-clay-200" />
                                                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">PDF Document</span>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <img src={doc.url} alt={doc.label} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 backdrop-blur-[1px]">
                                                            <span className="bg-white/90 text-stone-900 px-3 py-1.5 rounded-full text-[10px] font-bold shadow-sm transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 flex items-center gap-1.5">
                                                                <Eye size={12} /> Preview
                                                            </span>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="w-full aspect-video bg-stone-50 rounded-lg border focus-within:ring-2 border-dashed border-stone-200 flex flex-col items-center justify-center text-stone-400 gap-1.5 shadow-inner">
                                                <XCircle size={24} className="text-stone-300" />
                                                <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400">Not Uploaded</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white px-5 sm:px-6 py-4 border-t border-stone-100 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center sticky bottom-0 z-20">
                             <div className="space-y-0.5">
                                <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                                    Application Documents Ready
                                </div>
                                {approvalError && (
                                    <p className="text-[10px] font-semibold text-red-600">{approvalError}</p>
                                )}
                             </div>
                             <div className="flex w-full sm:w-auto flex-col sm:flex-row gap-2">
                                <button
                                    onClick={() => {
                                        setApprovalError('');
                                        setRejectingArtisan(viewingArtisan);
                                    }}
                                    className="px-4 py-2 bg-white text-stone-600 border border-stone-200 rounded-lg font-bold hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition text-[12px] flex items-center justify-center gap-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                                >
                                    <XCircle size={14} /> Reject
                                </button>
                                <button
                                    onClick={confirmApprove}
                                    disabled={processing}
                                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition shadow-sm shadow-emerald-200/50 text-[12px] flex items-center justify-center gap-1.5 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500 disabled:shadow-none"
                                >
                                    <CheckCircle size={14} /> {processing ? 'Approving...' : 'Approve Application'}
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
                            <button onClick={() => setRejectingArtisan(null)} className="p-1 px-1.5 bg-white border border-stone-200 rounded hover:bg-stone-50 transition text-stone-400">
                                <X size={14} />
                            </button>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-stone-600 ml-1">Rejection Reason</label>
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="E.g., The uploaded business permit belongs to a different entity. Please upload..."
                                className="w-full h-28 bg-white border border-stone-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500/20 focus:border-red-400 resize-none text-[13px] shadow-inner"
                            />
                            <div className="flex justify-between items-center px-1">
                                <p className="text-[10px] text-stone-400">This will be shared with the artisan.</p>
                                <span className={`text-[10px] font-bold ${rejectReason.length < 10 ? 'text-red-500' : 'text-emerald-600'}`}>
                                    {rejectReason.length} chars (min 10)
                                </span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-5">
                            <button
                                onClick={() => setRejectingArtisan(null)}
                                className="px-4 py-2 bg-white border border-stone-200 text-stone-600 rounded-lg text-[12px] font-bold hover:bg-stone-50 transition shadow-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={rejectArtisan}
                                disabled={processing || rejectReason.length < 10}
                                className="px-5 py-2 bg-red-600 text-white rounded-lg text-[12px] font-bold hover:bg-red-700 transition shadow-sm shadow-red-200/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                            >
                                <XCircle size={14} /> {processing ? 'Rejecting...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </AdminLayout>
    );
}
