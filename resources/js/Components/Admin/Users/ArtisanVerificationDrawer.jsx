import React from 'react';
import { motion } from 'framer-motion';
import { X, CheckCircle, XCircle, FileText, Eye, AlertTriangle, Download, LoaderCircle } from 'lucide-react';
import Modal from '@/Components/Modal';
import SlideOverDrawer from '@/Components/SlideOverDrawer';
import WorkspaceLoadingState from '@/Components/WorkspaceLoadingState';
import { ActionTooltip } from '@/Components/Admin/Layout/BulkActionPill';

export default function ArtisanVerificationDrawer({
    viewingArtisan,
    onClose,
    currentDocuments,
    viewedDocumentsCount,
    submittedDocumentsCount,
    allSubmittedDocumentsViewed,
    confirmApprove,
    processing,
    approvalError,
    documentPreviewingKey,
    openDocumentPreview,
    viewingDoc,
    setViewingDoc,
    rejectingArtisan,
    setRejectingArtisan,
    rejectReason,
    setRejectReason,
    handleRejectArtisan,
}) {
    const renderFooter = () => {
        if (!viewingArtisan) return null;
        return (
            <div className="flex gap-3">
                <button
                    onClick={() => setRejectingArtisan(viewingArtisan)}
                    disabled={processing}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white py-3 text-sm font-bold text-stone-600 hover:bg-red-50 hover:text-red-700 hover:border-red-100 transition min-h-[44px]"
                >
                    <XCircle size={18} /> Reject
                </button>
                <button
                    onClick={confirmApprove}
                    disabled={processing || !allSubmittedDocumentsViewed}
                    className="flex-[2] flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 disabled:bg-stone-200 disabled:shadow-none transition min-h-[44px]"
                >
                    {processing ? <LoaderCircle size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                    {processing ? 'Processing...' : 'Approve Application'}
                </button>
            </div>
        );
    };

    return (
        <>
            <SlideOverDrawer
                show={!!viewingArtisan}
                onClose={() => !viewingDoc && onClose()}
                title={viewingArtisan ? `${viewingArtisan.shop_name} Verification` : 'Review Application'}
                widthClass="max-w-2xl"
                footer={renderFooter()}
            >
                {viewingArtisan && (
                    <div className="space-y-6">
                        <div className="rounded-2xl bg-stone-50 p-4 border border-stone-100">
                            <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-clay-100 bg-clay-50 text-lg font-bold text-clay-700 shadow-sm shrink-0">
                                    {viewingArtisan.shop_name?.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-sm font-bold text-stone-900 truncate">{viewingArtisan.shop_name}</h4>
                                    <p className="text-xs text-stone-500 font-medium truncate mt-0.5">{viewingArtisan.name} • {viewingArtisan.email}</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">Submitted Documents</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {currentDocuments.map(doc => (
                                    <div
                                        key={doc.key}
                                        onClick={() => documentPreviewingKey !== doc.key && openDocumentPreview(doc)}
                                        className={`group relative overflow-hidden rounded-xl border border-stone-200 p-4.5 transition min-h-[120px] flex flex-col justify-between ${
                                            doc.url 
                                                ? 'cursor-pointer bg-white hover:border-clay-300 hover:shadow-md' 
                                                : 'bg-stone-50/50 opacity-60'
                                        } ${documentPreviewingKey === doc.key ? 'pointer-events-none' : ''}`}
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="p-2 bg-stone-50 rounded-lg group-hover:bg-clay-50 border border-stone-50 group-hover:border-clay-100 flex items-center gap-2">
                                                <doc.icon size={16} className="text-stone-400 group-hover:text-clay-600" />
                                                {doc.flags.length > 0 && (
                                                    <ActionTooltip text={`Automated check: ${doc.flags.join(', ').replace(/_/g, ' ')}`}>
                                                        <AlertTriangle size={14} className="text-amber-500 fill-amber-50" />
                                                    </ActionTooltip>
                                                )}
                                            </div>
                                            {doc.viewed && <CheckCircle size={16} className="text-emerald-500" />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-[12px] text-stone-850 truncate mb-1">{doc.label}</p>
                                            
                                            {doc.url ? (
                                                <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-stone-100 bg-stone-50 mt-2">
                                                    {doc.url.endsWith('.pdf') ? (
                                                        <div className="w-full h-full flex items-center justify-center bg-white"><FileText size={24} className="text-clay-200" /></div>
                                                    ) : (
                                                        <img src={doc.url} alt={doc.label} className="w-full h-full object-cover" />
                                                    )}
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 group-hover:bg-black/10 group-hover:opacity-100 transition duration-200">
                                                        <Eye size={20} className="text-white drop-shadow-md" />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="aspect-video w-full rounded-lg border border-dashed border-stone-200 bg-stone-50 flex items-center justify-center mt-2"><X size={16} className="text-stone-300" /></div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-2xl bg-stone-50 border border-stone-100 p-5 space-y-3">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-stone-400">Review Status</h4>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs font-bold">
                                    <span className="text-stone-600">Verification Progress</span>
                                    <span className={allSubmittedDocumentsViewed ? 'text-emerald-600' : 'text-amber-600'}>
                                        {viewedDocumentsCount} / {submittedDocumentsCount}
                                    </span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-stone-200">
                                    <div
                                        className={`h-full transition-all duration-500 ${allSubmittedDocumentsViewed ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'bg-amber-400'}`}
                                        style={{ width: `${submittedDocumentsCount > 0 ? (viewedDocumentsCount / submittedDocumentsCount) * 100 : 0}%` }}
                                    />
                                </div>
                            </div>
                            <p className={`text-xs font-bold leading-tight ${allSubmittedDocumentsViewed ? 'text-emerald-600' : 'text-stone-400'}`}>
                                {allSubmittedDocumentsViewed ? 'All documents reviewed. Ready for approval.' : 'Review all submitted files before approving.'}
                            </p>
                        </div>
                        {approvalError && <p className="text-center text-xs font-bold text-red-600 mt-2">{approvalError}</p>}
                    </div>
                )}
            </SlideOverDrawer>

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
                                    className="p-2 hover:bg-white/10 rounded-full transition text-stone-400 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
                                    title="Download"
                                >
                                    <Download size={20} />
                                </a>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setViewingDoc(null); }}
                                    className="p-2 hover:bg-white/10 rounded-full transition text-stone-400 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
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

            {/* Rejection Reasons Modal */}
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
                            <button onClick={() => setRejectingArtisan(null)} className="rounded border border-stone-200 bg-white p-2 text-stone-400 transition hover:bg-stone-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/30 min-h-[36px] min-w-[36px] flex items-center justify-center">
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
                                className="rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-[12px] font-bold text-stone-600 transition hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/30 min-h-[40px] flex items-center"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRejectArtisan}
                                disabled={processing || rejectReason.length < 10}
                                className="flex items-center gap-1.5 rounded-lg bg-red-600 px-5 py-2.5 text-[12px] font-bold text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/20 disabled:cursor-not-allowed disabled:opacity-50 min-h-[40px]"
                            >
                                {processing ? <LoaderCircle size={14} className="animate-spin" /> : <XCircle size={14} />}
                                {processing ? 'Rejecting...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </>
    );
}
